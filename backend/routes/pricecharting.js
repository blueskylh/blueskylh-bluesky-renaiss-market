const { Router } = require("express");
const router = Router();

const {
  getCollectibles,
  upsertPricechartingPrice,
  recordSyncStatus,
  getMimoCache,
  upsertMimoCache,
} = require('../db/index.js');
const { runWithConcurrency } = require('../lib/concurrency.js');
const { fetchJina } = require('../lib/jinaFetch.js');
const { analyzeCardImage, getPCQueries } = require('../lib/mimo.js');

// PriceCharting API config
const PC_API_BASE = 'https://www.pricecharting.com';

// ========== Direct API Rate Limiter (Fallback) ==========
let lastDirectAPICall = 0;
const DIRECT_API_INTERVAL_MS = 5000; // 5s interval
const DIRECT_API_MAX_PER_MIN = 10;   // Max 10 per minute
const directTimestamps = [];
const DIRECT_WINDOW = 60000;

async function waitForDirectSlot() {
  const now = Date.now();

  // 1. Ensure at least 5s interval
  const timeSinceLastCall = now - lastDirectAPICall;
  if (timeSinceLastCall < DIRECT_API_INTERVAL_MS) {
    const waitMs = DIRECT_API_INTERVAL_MS - timeSinceLastCall;
    console.log(`  [Direct API] Waiting ${waitMs}ms for interval...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  // 2. Check per-minute limit (10 RPM)
  const cutoff = now - DIRECT_WINDOW;
  while (directTimestamps.length > 0 && directTimestamps[0] < cutoff) {
    directTimestamps.shift();
  }

  if (directTimestamps.length < DIRECT_API_MAX_PER_MIN) {
    lastDirectAPICall = Date.now();
    directTimestamps.push(lastDirectAPICall);
    return;
  }

  const waitMs = directTimestamps[0] + DIRECT_WINDOW - now;
  console.log(`  [Direct API] Waiting ${Math.ceil(waitMs / 1000)}s for rate limit...`);
  await new Promise(resolve => setTimeout(resolve, waitMs));
  lastDirectAPICall = Date.now();
  directTimestamps.push(lastDirectAPICall);
}

// Call PriceCharting via r.jina.ai (bypass Cloudflare 403)
// Rate limiting is handled internally by fetchJina
async function fetchPriceChartingViaJina(path) {
  const apiUrl = `${PC_API_BASE}${path}`;

  try {
    // fetchJina automatically handles rate limiting and 429 retries
    const text = await fetchJina(apiUrl, {
      timeout: 30000,
      retries: 3,
    });
    return text;
  } catch (error) {
    // 429 is retried internally; only reach here if all retries fail
    if (error.message.includes('429')) {
      console.log(`  [Jina Proxy] Rate limited after retries, falling back to direct API`);
    } else {
      console.log(`  [Jina Proxy] Error: ${error.message}`);
    }
    return null;
  }
}

// Direct PriceCharting call (Fallback: concurrency 1, 5s interval, max 10 RPM)
async function fetchPriceChartingDirect(path, retries) {
  if (retries === undefined) retries = 3;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await waitForDirectSlot();

      const response = await fetch(`${PC_API_BASE}${path}`, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.pricecharting.com/',
        },
      });

      if (response.status === 403) {
        console.log(`  [Direct API] HTTP 403 (Cloudflare blocked)`);
        return null;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
        console.log(`  [Direct API 429] Waiting ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        console.log(`  [Direct API] HTTP ${response.status}`);
        return null;
      }

      const text = await response.text();
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
      }
    }
  }

  console.log(`  [Direct API] Failed after ${retries} retries`);
  return null;
}

// Primary path: Call PriceCharting via r.jina.ai (bypass Cloudflare)
// Falls back to direct API on failure
async function fetchPriceCharting(path) {
  // 1. Try Jina proxy first (bypass Cloudflare)
  const jinaResult = await fetchPriceChartingViaJina(path);
  if (jinaResult !== null) {
    return jinaResult;
  }

  // 2. Jina failed, fall back to direct API (low concurrency usage)
  console.log(`  [Jina failed, trying direct API...]`);
  return fetchPriceChartingDirect(path);
}

// Build queries for PriceCharting search (like Chrome extension)
// Returns multiple query types for parallel search
function buildPCQueries(cardName, setName) {
  // Extract language from card name or set name
  let language = 'Japanese';
  if (/English|EN-|EN\s/i.test(cardName) || /English|EN-|EN\s/i.test(setName)) {
    language = 'English';
  } else if (/Korean|한국어/i.test(cardName) || /Korean|한국어/i.test(setName)) {
    language = 'Korean';
  } else if (/Chinese|中文|Simplified Chinese|Traditional Chinese/i.test(cardName) || /Chinese|中文|Simplified Chinese|Traditional Chinese/i.test(setName)) {
    language = 'Chinese';
  } else if (/Japanese/i.test(cardName) || /Japanese/i.test(setName)) {
    language = 'Japanese';
  }

  // Extract card number
  const numMatch = cardName.match(/#(\d+[\/\-]?\d*)/);
  const numberRaw = numMatch ? numMatch[1] : '';
  const numberDigits = numberRaw.replace(/[^0-9]/g, '');
  const paddedNumber = numberDigits.padStart(3, '0');

  // Extract card name (after #NUMBER)
  let cardSubject = '';
  if (numMatch) {
    const hashPos = cardName.indexOf('#' + numMatch[1]);
    const afterNumber = cardName.substring(hashPos + numMatch[0].length).trim();
    cardSubject = afterNumber
      .replace(/\s+(VMAX|VSTAR|V-UNION|AR|EX|GX|HR|UR|SR|SSR|CHR|PGRM|Lv\.X)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fallback: last capitalized word
  if (!cardSubject) {
    const words = cardName.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (/^[A-Z][a-z]+$/i.test(word) && word.length > 2) {
        if (!/^(Pokemon|PSA|BGS|CGC|Gem|Mint|Near|Year|Sword|Shield)$/i.test(word)) {
          cardSubject = word;
          break;
        }
      }
    }
  }

  // Clean card subject for URL matching
  cardSubject = cardSubject.replace(/\(.*?\)/g, '').trim();

  // Extract set code for better matching
  let setCode = '';
  if (setName) {
    const codeMatch = setName.match(/\b(sv\d+[a-z]?|s\d+[a-z]?|xy|sm|bw|sw|sh|swsh)\b/i);
    if (codeMatch) setCode = codeMatch[1].toLowerCase();
  }

  // Map set names to codes (like Chrome extension)
  if (!setCode && setName) {
    if (/Universe|VSTAR Universe/i.test(setName)) setCode = 's12a';
    else if (/\b151\b/i.test(setName)) setCode = 'sv2a';
    else if (/Crimson Haze/i.test(setName)) setCode = 'sv5a';
    else if (/Shiny Treasure/i.test(setName)) setCode = 'sv4a';
    else if (/Mega Dream/i.test(setName)) setCode = 'm2a';
    else if (/Promo/i.test(setName)) {
      if (/M-P/i.test(setName)) setCode = 'm-p';
      else if (/S-P/i.test(setName)) setCode = 's-p';
      else if (/XY-P/i.test(setName)) setCode = 'xy-p';
      else if (/BW-P/i.test(setName)) setCode = 'bw-p';
      else if (/L-P/i.test(setName)) setCode = 'l-p';
    }
  }

  // Build queries like Chrome extension
  const queries = [];
  const cleanName = cardSubject.replace(/Lv\.X/gi, '').trim();

  // Generate different query types for parallel search
  const preciseQuery = setCode ? `${setCode} ${numberDigits}`.trim() : '';
  const smartQuery = `${cleanName} ${numberDigits} ${setCode}`.replace(/\s+/g, ' ').trim();
  const leanQuery = `${cleanName} ${numberDigits}`.trim();

  // Add queries in priority order
  if (preciseQuery && setCode) queries.push(preciseQuery);
  if (smartQuery && cleanName && numberDigits) queries.push(smartQuery);
  if (leanQuery && cleanName && numberDigits) queries.push(leanQuery);

  // Language-specific queries
  if (language === 'Japanese' && cleanName && numberDigits) {
    queries.push(`Japanese ${cleanName} ${numberDigits}`);
    if (setCode) queries.push(`Japanese ${cleanName} ${setCode} ${numberDigits}`);
  } else if (language === 'English' && cleanName && numberDigits) {
    queries.push(`${cleanName} ${numberDigits}`);
    if (setCode) queries.push(`${cleanName} ${setCode} ${numberDigits}`);
  }

  // Fallback: name + padded number
  if (cleanName && paddedNumber !== '000') {
    queries.push(`${cleanName} ${paddedNumber}`);
  }

  // Last resort: just the name
  if (cleanName) {
    queries.push(cleanName);
  }

  return {
    queries: [...new Set(queries)].filter(q => q.length >= 2).slice(0, 5), // Limit to 5 like Chrome
    language,
    preciseQuery,
    smartQuery,
    leanQuery,
  };
}

// Parse prices from Jina AI extracted markdown text
// Returns all grade levels: ungraded, grade1-9, grade9.5, psa10, cgc10, bgs10, etc.
function parseJinaPCPrices(text) {
  try {
    const prices = {};

    // Priority: parse from "Full Price Guide" section
    // Format: "Ungraded\t$72.00" or "PSA 10\t$1,942.86"
    const guideMatch = text.match(/Full Price Guide:[\s\S]*?(?=\n\n|\nAll prices|\nCategories)/);
    if (guideMatch) {
      const guideText = guideMatch[0];
      const lines = guideText.split('\n');
      for (const line of lines) {
        const m = line.match(/^(.+?)\t\$?([\d,]+\.?\d*)\s*$/);
        if (m) {
          const label = m[1].trim().toLowerCase();
          const value = parseFloat(m[2].replace(/,/g, ''));
          if (value > 0 && value < 1000000) {
            if (label === 'ungraded') prices.ungraded = value;
            else if (/^grade\s+(\d+\.?\d*)$/.test(label)) {
              const num = label.match(/grade\s+(\d+\.?\d*)/)[1];
              prices[`grade${num.replace('.', '_')}`] = value;
            }
            else if (/^psa\s+(\d+\.?\d*)$/.test(label)) {
              const num = label.match(/psa\s+(\d+\.?\d*)/)[1];
              prices[`psa${num.replace('.', '_')}`] = value;
            }
            else if (/^cgc\s+(\d+\.?\d*)$/.test(label)) {
              const num = label.match(/cgc\s+(\d+\.?\d*)/)[1];
              prices[`cgc${num.replace('.', '_')}`] = value;
            }
            else if (/^bgs\s+(\d+\.?\d*)$/.test(label)) {
              const num = label.match(/bgs\s+(\d+\.?\d*)/)[1];
              prices[`bgs${num.replace('.', '_')}`] = value;
            }
            else if (/^sgc\s+(\d+\.?\d*)$/.test(label)) {
              const num = label.match(/sgc\s+(\d+\.?\d*)/)[1];
              prices[`sgc${num.replace('.', '_')}`] = value;
            }
          }
        }
      }
      // If tab-regex found nothing (single-line format), use matchAll
      if (Object.keys(prices).length === 0) {
        const allRegex = /(Ungraded|Grade\s*\d+\.?\d*|PSA\s*\d+\.?\d*|CGC\s*\d+\.?\d*|BGS\s*\d+[\w\s]*|SGC\s*\d+\.?\d*|Loose)[^\$]*\$([\d,]+\.?\d*)/gi;
        const matches = [...guideText.matchAll(allRegex)];
        for (const m of matches) {
          const label = m[1].trim().toLowerCase().replace(/\s+/g, '');
          const value = parseFloat(m[2].replace(/,/g, ''));
          if (value > 0 && value < 1000000) {
            if (label === 'ungraded' || label === 'loose') prices.ungraded = value;
            else if (/^grade\d+/.test(label)) prices[`grade${label.replace('grade', '').replace('.', '_')}`] = value;
            else if (/^psa\d+/.test(label)) prices[`psa${label.replace('psa', '').replace('.', '_')}`] = value;
            else if (/^cgc\d+/.test(label)) prices[`cgc${label.replace('cgc', '').replace('.', '_')}`] = value;
            else if (/^bgs\d+/.test(label)) prices[`bgs${label.replace('bgs', '').replace('.', '_')}`] = value;
            else if (/^sgc\d+/.test(label)) prices[`sgc${label.replace('sgc', '').replace('.', '_')}`] = value;
          }
        }
      }
      if (Object.keys(prices).length > 0) {
        return prices;
      }
    }

    // Fallback: handle single-line Full Price Guide (Jina often returns it on one line with space separators)
    const priceRegex = /(Ungraded|Grade\s*\d+\.?\d*|PSA\s*\d+\.?\d*|CGC\s*\d+\.?\d*|BGS\s*\d+[\w\s]*|SGC\s*\d+\.?\d*|Loose)[^\$]*\$([\d,]+\.?\d*)/gi;
    const allLines = text.split('\n');
    let guideFound = false;
    for (const line of allLines) {
      // Detect Full Price Guide section
      if (!guideFound && /Full Price Guide:/i.test(line)) {
        guideFound = true;
        const matches = [...line.matchAll(priceRegex)];
        for (const m of matches) {
          const label = m[1].trim().toLowerCase().replace(/\s+/g, '');
          const value = parseFloat(m[2].replace(/,/g, ''));
          if (value > 0 && value < 1000000) {
            if (label === 'ungraded' || label === 'loose') prices.ungraded = value;
            else if (/^grade\d+/.test(label)) prices[`grade${label.replace('grade', '').replace('.', '_')}`] = value;
            else if (/^psa\d+/.test(label)) prices[`psa${label.replace('psa', '').replace('.', '_')}`] = value;
            else if (/^cgc\d+/.test(label)) prices[`cgc${label.replace('cgc', '').replace('.', '_')}`] = value;
            else if (/^bgs\d+/.test(label)) prices[`bgs${label.replace('bgs', '').replace('.', '_')}`] = value;
            else if (/^sgc\d+/.test(label)) prices[`sgc${label.replace('sgc', '').replace('.', '_')}`] = value;
          }
        }
        break;
      }
    }

    // Last resort: line-by-line fallback (skip eBay listings)
    if (Object.keys(prices).length === 0) {
      const lineRegex = /(Ungraded|Grade\s*\d+\.?\d*|PSA\s*\d+\.?\d*|CGC\s*\d+\.?\d*|BGS\s*\d+[\w\s]*|SGC\s*\d+\.?\d*|Loose)[^\$]*\$([\d,]+\.?\d*)/i;
      for (const line of allLines) {
        if (line.includes('[eBay]')) continue;
        const m = line.match(lineRegex);
        if (m) {
          const label = m[1].trim().toLowerCase().replace(/\s+/g, '');
          const value = parseFloat(m[2].replace(/,/g, ''));
          if (value > 0 && value < 1000000) {
            if (label === 'ungraded' || label === 'loose') prices.ungraded = value;
            else if (/^grade\d+/.test(label)) prices[`grade${label.replace('grade', '').replace('.', '_')}`] = value;
            else if (/^psa\d+/.test(label)) prices[`psa${label.replace('psa', '').replace('.', '_')}`] = value;
            else if (/^cgc\d+/.test(label)) prices[`cgc${label.replace('cgc', '').replace('.', '_')}`] = value;
            else if (/^bgs\d+/.test(label)) prices[`bgs${label.replace('bgs', '').replace('.', '_')}`] = value;
            else if (/^sgc\d+/.test(label)) prices[`sgc${label.replace('sgc', '').replace('.', '_')}`] = value;
          }
        }
      }
    }

    if (Object.keys(prices).length > 0) return prices;
    return null;
  } catch (error) {
    console.error('Jina PC price parse error:', error);
    return null;
  }
}

// 从卡名提取评级公司和等级
// 例: "CGC 8.5 NM/Mint+ 2004 ..." → { company: 'cgc', grade: '8.5' }
// 例: "PSA 10 Gem Mint 2002 ..." → { company: 'psa', grade: '10' }
function parseCardGrade(cardName) {
  const m = cardName.match(/^(PSA|CGC|BGS|SGC|ACE|TAG)\s+(\d+\.?\d*)/i);
  if (m) {
    return { company: m[1].toLowerCase(), grade: m[2] };
  }
  return { company: '', grade: '' };
}

// 根据评级信息选择最佳价格
// 优先级: 公司+等级 → Grade+等级 → 向下兼容
function getBestPCPrice(prices, cardName) {
  if (!prices) return 0;

  const { company, grade } = parseCardGrade(cardName);

  // 没有评级信息 → ungraded
  if (!company || !grade) {
    return prices.ungraded || 0;
  }

  const gradeNum = parseFloat(grade);
  const gradeKey = grade.replace('.', '_');

  // 1. 精确匹配公司+等级: PSA 10, CGC 8.5, BGS 9, etc.
  if (prices[`${company}${gradeKey}`]) {
    return prices[`${company}${gradeKey}`];
  }

  // 2. 匹配 Grade + 等级
  if (prices[`grade${gradeKey}`]) {
    return prices[`grade${gradeKey}`];
  }

  // 3. 向下兼容: 从当前等级往下找
  const gradeSteps = [9.5, 9, 8.5, 8, 7, 6, 5, 4, 3, 2, 1];
  for (const g of gradeSteps) {
    if (g < gradeNum) {
      const key = String(g).replace('.', '_');
      // 优先查公司前缀（psa8_5），再查 grade 前缀（grade8_5）
      if (prices[`${company}${key}`]) return prices[`${company}${key}`];
      if (prices[`grade${key}`]) return prices[`grade${key}`];
    }
  }

  // 4. 兜底
  return prices.ungraded || 0;
}

// Find best match from Jina extracted text (search results in markdown table format)
function findBestPCMatchJina(text, cardName, number, paddedNumber, setCode, language) {
  // r.jina.ai returns markdown table format:
  // | [Card Name](url) | Set Name | $price1 | $price2 | $price3 |

  // Extract all product links from markdown table rows
  // Pattern: [Product Name](https://www.pricecharting.com/game/...)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/www\.pricecharting\.com\/game\/[^)]+)\)/g;
  const matches = [];

  let match;
  const seenUrls = new Set();

  while ((match = mdLinkRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const href = match[2];

    if (!seenUrls.has(href)) {
      seenUrls.add(href);
      const slug = href.split('/game/').pop() || '';

      // Extract prices from the same table row (look ahead)
      const rowStart = text.lastIndexOf('|', match.index);
      const rowEnd = text.indexOf('|', match.index + match[0].length);
      const row = text.substring(rowStart, rowEnd + 1);

      // Extract prices from row: | $123.45 | $96.95 | $108.75 |
      const priceMatches = [...row.matchAll(/\$?([\d,]+\.?\d*)/g)];
      const prices = priceMatches.map(m => m[1]);

      matches.push({ href, name, slug: slug.toLowerCase(), prices });
    }
  }

  if (matches.length === 0) return null;

  // Use scoring to find best match
  const setSlug = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lang = (language || 'Japanese').toLowerCase();

  // Extract card subject (Pokemon name) from title
  let cardSubject = '';
  const numMatch = cardName.match(/#(\d+[\/\-]?\d*)/);
  if (numMatch) {
    const hashPos = cardName.indexOf('#' + numMatch[1]);
    const afterNumber = cardName.substring(hashPos + numMatch[0].length).trim();
    cardSubject = afterNumber
      .replace(/\s+(VMAX|VSTAR|V-UNION|AR|EX|GX|HR|UR|SR|SSR|CHR|PGRM|Lv\.X)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cardSubjectSlug = cardSubject.toLowerCase().replace(/[^a-z0-9]/g, '');

  let bestMatch = null;

  for (const { href, name, slug } of matches) {
    let score = 0;
    const slugClean = slug.replace(/-/g, '').replace(/_/g, '').toLowerCase();

    // 1. Check if card number is in slug
    const hasNumber = number && (slugClean.includes(number) || (paddedNumber !== '000' && slugClean.includes(paddedNumber)));
    if (hasNumber) score += 100;

    // 2. Check if set code is in slug
    const hasSet = setSlug.length > 0 && slugClean.includes(setSlug);
    if (hasSet) score += 50;

    // 3. Check if language indicator
    const hasLang = slug.includes('japanese') || slug.includes('jpn') || slug.includes('english');
    if (lang === 'japanese' && (hasLang || !slug.includes('english'))) score += 30;
    else if (lang === 'english' && slug.includes('english')) score += 30;
    else if (lang === 'korean') {
      if (!slug.includes('korean')) continue; // Korean cards only match Korean products
    }

    // 4. Check if card subject (pokemon name) is in slug
    const nameWords = cardSubjectSlug.split(/\s+/).filter(w => w.length > 2);
    let nameMatchCount = 0;
    for (const word of nameWords) {
      if (slugClean.includes(word)) nameMatchCount++;
    }
    if (nameWords.length > 0) {
      score += (nameMatchCount / nameWords.length) * 80;
    } else if (cardSubjectSlug && slugClean.includes(cardSubjectSlug)) {
      score += 80;
    }

    // 5. Exact slug match bonus
    if (slug.includes(cardSubjectSlug.replace(/[^a-z0-9]/g, ''))) {
      score += 30;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { url: href, name, score };
    }
  }

  if (bestMatch && bestMatch.score >= 100) {  // Threshold raised to 100
    return { url: bestMatch.url, name: bestMatch.name };
  }

  // Fallback: return best-scored match if above minimum threshold
  if (bestMatch && bestMatch.score >= 50) {
    return { url: bestMatch.url, name: bestMatch.name };
  }

  return null;
}

// Search PriceCharting via r.jina.ai (primary) or direct (fallback)
async function searchPriceCharting(query, cardName, number, paddedNumber, setCode, language) {
  try {
    // Use URL format that directly lands on product page
    const searchPath = `/search-products?type=prices&ignore-preferences=true&q=${encodeURIComponent(query)}&go=Go`;
    console.log(`  [PC Search] Query: ${query}`);

    const text = await fetchPriceCharting(searchPath);

    if (!text) {
      console.log(`  [PC Search] Failed to fetch`);
      return null;
    }

    // Check if we landed directly on a product page
    const isProductPage = text.includes('Full Price Guide') ||
                          text.includes('Sold Listings');

    if (isProductPage) {
      console.log(`  [PC Search] Direct product page hit`);
      // Language filter: Korean cards must land on Korean product pages
      if (language === 'korean') {
        const pageSlug = (text.match(/pricecharting\.com\/game\/([^\s<]+)/) || [])[1] || '';
        if (!pageSlug.toLowerCase().includes('korean')) {
          console.log(`  [PC Search] Skipping non-Korean product for Korean card`);
          return null;
        }
      }
      const prices = parseJinaPCPrices(text);
      if (prices) {
        // Extract product name from page title
        const nameMatch = text.match(/^(.+?#\d+[\/\-]?\w*)/m) ||
                         text.match(/Trading Cards > .+?>\s*(.+)/);
        const name = nameMatch ? nameMatch[1].trim() : query;

        // Extract actual product URL from canonical link or page
        const urlMatch = text.match(/(https?:\/\/www\.pricecharting\.com\/game\/[^\s<]+)/);
        const productUrl = urlMatch ? urlMatch[1] : `${PC_API_BASE}${searchPath}`;

        return { url: productUrl, name, prices };
      }
    }

    // It's a search results page - find best matching product
    console.log(`  [PC Search] Results page, finding best match...`);
    const bestMatch = findBestPCMatchJina(text, cardName, number, paddedNumber, setCode, language);

    if (!bestMatch) {
      console.log(`  [PC Search] No matching product found in results`);
      return null;
    }

    console.log(`  [PC Search] Best match: ${bestMatch.name}`);

    // Fetch the product page to get prices
    const prices = await getPCProductPrice(bestMatch.url);
    if (!prices) {
      console.log(`  [PC Search] Failed to fetch prices from product page`);
      return null;
    }

    return { url: bestMatch.url, name: bestMatch.name, prices };
  } catch (error) {
    console.error('PriceCharting search error:', error);
    return null;
  }
}

// Get price data for a specific product URL
async function getPCProductPrice(url) {
  try {
    // Ensure URL is absolute
    const fullUrl = url.startsWith('http') ? url : `${PC_API_BASE}${url}`;
    const path = fullUrl.replace(PC_API_BASE, '');

    // Use r.jina.ai to fetch product page (rate limited)
    const text = await fetchPriceCharting(path);

    if (!text) return null;

    const prices = parseJinaPCPrices(text);
    return prices;
  } catch (error) {
    console.error('PriceCharting product fetch error:', error);
    return null;
  }
}

// 从卡牌名称构建简单搜索词
// 例: "PSA 10 ... #005/T Slowbro" → "Slowbro #005/T"
// 例: "PSA 9 ... #166 Reshiram Ex" → "Reshiram Ex #166"
// 例: "... #102 Groudon-Holo" → "Groudon #102"
function buildSimpleQuery(cardName) {
  const hashMatch = cardName.match(/#(.+)$/);
  if (!hashMatch) return null;
  const afterHash = hashMatch[1].trim(); // "005/T Slowbro"
  const spaceIdx = afterHash.indexOf(' ');
  if (spaceIdx < 0) return null;
  const numberPart = afterHash.substring(0, spaceIdx); // "005/T"
  let namePart = afterHash.substring(spaceIdx + 1).trim(); // "Slowbro" or "Groudon-Holo"
  if (!namePart) return null;
  // 清理常见后缀: -Holo, -ex, -EX, -V, -VMAX, -VSTAR 等
  namePart = namePart.replace(/-(holo|ex|vmax|vstar|v|gx|ar|sar|sr|ur|chr|cc|swsh)\b/gi, '').trim();
  if (!namePart) return null;
  return `${namePart} #${numberPart}`; // "Groudon #102"
}

// Sync single card with PriceCharting
// 优先用结构化字段（pokemon_name + card_number + set_name），不行再用 MiMo
async function syncSinglePriceCharting(card, env, mimoResult) {
  const cardName = card.name || '';
  const setName = card.set_name || card.setName || '';
  const tokenId = card.token_id || card.tokenId || '';
  const frontImageUrl = card.front_image_url || card.frontImageUrl || '';
  const fmvPrice = card.fmv_price_in_usd || card.fmvPriceInUSD || 0;

  // 结构化字段
  let pokemonName = (card.pokemon_name || card.pokemonName || '').trim();
  const cardNumber = (card.card_number || card.cardNumber || '').trim();

  console.log(`[PriceCharting] Card: "${cardName}"`);

  if (!cardName) {
    console.log(`  No card name, skipping`);
    if (tokenId) {
      await upsertPricechartingPrice(env, tokenId, {
        pricechartingLastSale: null, pricechartingUrl: null,
        pricechartingUpdatedAt: new Date().toISOString(),
      });
    }
    return {};
  }

  // 清理 pokemon_name 后缀: Groudon-Holo → Groudon
  if (pokemonName) {
    pokemonName = pokemonName.replace(/-(holo|ex|vmax|vstar|v|gx|ar|sar|sr|ur|chr|cc|swsh|rev\.foil)\b/gi, '').trim();
  }

  let queries = [];
  let detectedLanguage = 'Japanese';
  let number = cardNumber;
  let setCode = '';

  // ========== Step 1: 结构化字段构建搜索词 ==========
  if (pokemonName && cardNumber) {
    // 优先: Vivillon #107 Pokemon Japanese Sv8-Super Electric Breaker
    if (setName) {
      const fullQuery = `${pokemonName} #${cardNumber} ${setName}`;
      queries.push(fullQuery);
      console.log(`  Full query: "${fullQuery}"`);
    }
    // 其次: Vivillon #107
    const simpleQuery = `${pokemonName} #${cardNumber}`;
    queries.push(simpleQuery);
    console.log(`  Simple query: "${simpleQuery}"`);
  }

  // 兜底: 从 name 字段提取（结构化字段不可用时）
  if (queries.length === 0) {
    const fallback = buildSimpleQuery(cardName);
    if (fallback) {
      queries.push(fallback);
      console.log(`  Fallback query: "${fallback}"`);
    }
  }

  // ========== Step 2: MiMo 视觉分析 → 英文搜索关键词 ==========
  if (!mimoResult) {
    mimoResult = tokenId ? await getMimoCache(tokenId) : null;
    if (mimoResult) {
      console.log(`  [MiMo] Cache hit for ${tokenId}`);
    } else {
      mimoResult = await analyzeCardImage({
        name: cardName,
        setName: setName,
        pokemonName: pokemonName,
        cardNumber: cardNumber,
        grade: card.grade || '',
        gradingCompany: card.grading_company || card.gradingCompany || '',
        year: card.year || '',
        language: card.language || '',
        serial: card.serial || '',
      }, frontImageUrl);
      if (mimoResult && tokenId) await upsertMimoCache(tokenId, mimoResult);
    }
  }

  if (mimoResult) {
    const pcData = getPCQueries(mimoResult);
    for (const q of pcData.queries) {
      if (!queries.includes(q)) queries.push(q);
    }
    detectedLanguage = pcData.language;
    number = mimoResult.number || number;
    setCode = mimoResult.set_code || setCode;
    console.log(`  MiMo queries (EN): ${pcData.queries.join(' | ')}`);
  }

  // ========== Step 3: Fallback 旧逻辑 ==========
  if (queries.length === 0) {
    console.log('  No queries available, using fallback search');
    const fallbackData = buildPCQueries(cardName, setName);
    queries = fallbackData.queries;
    detectedLanguage = fallbackData.language;
    console.log(`  Fallback queries: ${queries.join(' | ')}`);
  }

  // Extract number and set code (fallback)
  if (!number) {
    const numMatch = cardName.match(/#(\d+[\/\-]?\d*)/);
    number = numMatch ? numMatch[1].replace(/[^0-9]/g, '') : '';
  }
  const paddedNumber = number.padStart(3, '0');

  if (!setCode && setName) {
    const codeMatch = setName.match(/\b(sv\d+[a-z]?|s\d+[a-z]?|xy|sm|bw|sw|sh|swsh)\b/i);
    setCode = codeMatch ? codeMatch[1].toLowerCase() : '';
  }

  // ========== 搜索 PriceCharting ==========
  for (const query of queries) {
    const result = await searchPriceCharting(query, cardName, number, paddedNumber, setCode, detectedLanguage);

    if (!result) {
      console.log(`  Query "${query}" - no match`);
      continue;
    }

    const prices = result.prices;
    if (!prices) {
      console.log(`  No prices found for "${result.name}"`);
      continue;
    }

    console.log(`  Found: ${result.name}`);
    console.log(`  Prices: ${JSON.stringify(prices)}`);

    // Language filter on product URL
    const productSlug = (result.url || '').toLowerCase();
    const lang = (detectedLanguage || 'Japanese').toLowerCase();
    if (lang === 'korean' && !productSlug.includes('korean')) {
      console.log(`  Language mismatch: Korean card matched non-Korean product, skipping`);
      continue;
    }
    if (lang === 'japanese' && productSlug.includes('english')) {
      console.log(`  Language mismatch: Japanese card matched English product, skipping`);
      continue;
    }
    if (lang === 'english' && (productSlug.includes('japanese') || productSlug.includes('jpn'))) {
      console.log(`  Language mismatch: English card matched Japanese product, skipping`);
      continue;
    }

    const price = getBestPCPrice(prices, cardName);
    const { company, grade } = parseCardGrade(cardName);
    console.log(`  Best price for ${company || 'ungraded'} ${grade || ''}: ${price}`);

    if (price <= 0) {
      console.log(`  No valid price, skipping`);
      continue;
    }

    // 价格偏差校验：价格大于 FMV 的 4 倍或小于 1/4，说明匹配错了产品
    if (fmvPrice > 0 && (price > fmvPrice * 4 || price < fmvPrice / 4)) {
      console.log(`  Price mismatch: $${price} vs FMV $${fmvPrice} (ratio ${(price / fmvPrice).toFixed(2)}x), skipping`);
      continue;
    }

    const resultData = {
      price,
      matchedProduct: result.name,
      productUrl: result.url,
    };

    if (tokenId) {
      await upsertPricechartingPrice(env, tokenId, {
        pricechartingLastSale: price,
        pricechartingUrl: result.url,
        pricechartingUpdatedAt: new Date().toISOString(),
      });
    }

    return resultData;
  }

  console.log(`  No results found for any query`);
  if (tokenId) {
    await upsertPricechartingPrice(env, tokenId, {
      pricechartingLastSale: null,
      pricechartingUrl: null,
      pricechartingUpdatedAt: new Date().toISOString(),
    });
  }
  return {};
}

// Sync all cards with PriceCharting
async function syncPriceCharting(env, limit, concurrency) {
  if (limit === undefined) limit = 5000;
  if (concurrency === undefined) concurrency = 2; // Allow moderate concurrency, avoid Cloudflare

  // Only sync cards with ask price > 0 (listed cards)
  const { data: cards } = await getCollectibles(env, { limit, hasAskPrice: true });

  let updated = 0;
  let failed = 0;
  const errors = [];

  // Use concurrency control to process all cards
  await runWithConcurrency(cards || [], concurrency, async (card) => {
    try {
      const result = await syncSinglePriceCharting(card, env);
      if (result.price) {
        updated++;
      } else {
        failed++;
      }
      // Rate limiting handled internally by fetchJina (auto wait, no extra delay needed)
    } catch (err) {
      failed++;
      errors.push(`${card.token_id || 'unknown'}: ${err.message}`);
    }
  });

  await recordSyncStatus(env, 'pricecharting', cards ? cards.length : 0, updated, failed, JSON.stringify({ concurrency }));

  return {
    success: true,
    total: cards ? cards.length : 0,
    updated,
    failed,
    errors: errors.slice(0, 10),
  };
}

// ========== Routes ==========

router.post('/sync-all', async (req, res) => {
  try {
    const { limit, concurrency } = req.body || {};
    const result = await syncPriceCharting(null, limit, concurrency);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.syncPriceCharting = syncPriceCharting;
module.exports.syncSinglePriceCharting = syncSinglePriceCharting;
module.exports.searchPriceCharting = searchPriceCharting;
module.exports.fetchPriceCharting = fetchPriceCharting;
module.exports.findBestPCMatchJina = findBestPCMatchJina;
module.exports.parseJinaPCPrices = parseJinaPCPrices;
