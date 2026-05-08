const { Router } = require("express");
const router = Router();

const {
  getCollectibles,
  getCollectiblesBatch,
  upsertSnkrdunkPrice,
  recordSyncStatus,
  getMimoCache,
  upsertMimoCache,
} = require('../db/index.js');
const { fetchExchangeRates } = require('./exchange.js');
const { runWithConcurrency } = require('../lib/concurrency.js');
const { fetchJina, fetchJinaHtml } = require('../lib/jinaFetch.js');
const { analyzeCardImage, getSnkrdunkQueries } = require('../lib/mimo.js');

// ========== Search query cleaning ==========
// SNKRDUNK web search: たね 会导致 0 结果，其余关键词（PSA、方括号、set name）均支持
function cleanSearchQuery(query) {
  let q = query;
  // 1. 移除 variant 关键词（たね 会导致搜索失败）
  //    注意: \b 不适用于日文，用空格边界匹配
  q = q.replace(/(^|\s)(たね)(\s|$)/g, '$1$3');
  // 2. 移除 + 号（SNKRDUNK 搜索不支持，如 sm4+ → sm4）
  q = q.replace(/\+/g, '');
  // 3. 清理多余空格
  q = q.replace(/\s+/g, ' ').trim();
  return q;
}

// ========== Currency to USD rates (realtime, from exchange.ts) ==========
// 1 USD = X foreign currency -> 1 foreign currency = 1/X USD
const FALLBACK_RATES_USD = {
  'USD': 1, 'JPY': 155, 'HKD': 7.8, 'KRW': 1350,
  'TWD': 32, 'CNY': 7.25, 'SGD': 1.35, 'EUR': 0.93, 'GBP': 0.79,
};
let currentRates = {};

function buildToUsdRates(exchangeRates) {
  const result = {};
  for (const [cur, rate] of Object.entries(exchangeRates)) {
    if (rate && rate > 0 && isFinite(rate)) {
      result[cur] = 1 / rate; // 1 foreign currency = (1/rate) USD
    }
  }
  return result;
}

async function refreshRates() {
  try {
    const rates = await fetchExchangeRates();
    currentRates = buildToUsdRates(rates);
    console.log('[Currency] Updated rates:', JSON.stringify(currentRates));
  } catch {
    currentRates = buildToUsdRates(FALLBACK_RATES_USD);
    console.log('[Currency] Using fallback rates');
  }
}

function toUSD(amount, currency) {
  if (!amount || amount <= 0) return 0;
  const cur = (currency || 'USD').toUpperCase();
  if (cur === 'USD') return amount;
  const rate = currentRates[cur];
  if (!rate) {
    console.log(`  [Currency] Unknown currency "${cur}", assuming USD`);
    return amount;
  }
  return amount * rate;
}

// English -> Japanese Pokemon name mapping for SNKRDUNK search
const POKEMON_JP_NAMES = {
  'Charizard': 'リザードン',
  'Pikachu': 'ピカチュウ',
  'Mewtwo': 'ミュウツー',
  'Mew': 'ミュウ',
  'Gengar': 'ゲンガー',
  'Lugia': 'ルギア',
  'Rayquaza': 'レックウザ',
  'Giratina': 'ギラティナ',
  'Groudon': 'グラードン',
  'Kyogre': 'カイオーガ',
  'Zacian': 'ザシアン',
  'Zamazenta': 'ザマゼンタ',
  'Cinderace': 'エースバーン',
  'Inteleon': 'インテレオン',
  'Rillaboom': 'ゴリランダー',
  'Dragonite': 'カイリュー',
  'Blastoise': 'カメックス',
  'Venusaur': 'フシギバナ',
  'Alakazam': 'ユンゲラー',
  'Gyarados': 'ギャラドス',
  'Lapras': 'ラプラス',
  'Snorlax': 'カビゴン',
  'Articuno': 'フリーザー',
  'Zapdos': 'サンダー',
  'Moltres': 'ファイヤー',
  'Espeon': 'エーフィ',
  'Umbreon': 'ブラッキー',
  'Steelix': 'ハガネール',
  'Salamence': 'ボーマンダ',
  'Metagross': 'メタグロス',
  'Gardevoir': 'サーナイト',
  'Sableye': 'ヤミラミ',
  'Deoxys': 'デオキシス',
  'Shaymin': 'シェイミ',
  'Arceus': 'アルセウス',
  'Reshiram': 'レシラム',
  'Zekrom': 'ゼクロム',
  'Kyurem': 'キュレム',
  'Tornadus': 'トルネロス',
  'Thundurus': 'ボルトロス',
  'Landorus': 'ランドロス',
  'Yveltal': 'イベルタル',
  'Xerneas': 'ゼルネアス',
  'Zygarde': 'ジガルデ',
  'Tapu': 'カプ',
  'Naganadel': 'ナゲナデル',
  'Necrozma': 'ネクロズマ',
  'Magearna': 'マギアナ',
  'Marshadow': 'マーシャドー',
  'Blacephalon': 'ズガドーン',
  'Stakataka': 'トゲデマル',
  'Guzzlord': 'アクジキング',
  'Poipole': 'ポエンド',
  'Nihilego': 'ウツロイド',
  'Pheromosa': 'フェローチェ',
  'Xurkitree': 'ツンデツンデ',
  'Celesteela': 'テッカグヤ',
  'Kartana': 'カミツルギ',
  'Cosmog': 'コスモッグ',
  'Cosmoem': 'コスモウム',
  'Solgaleo': 'ソルガレオ',
  'Lunala': 'ルナアーラ',
  'Zeraora': 'ゼラオラ',
  'Meltan': 'メルタン',
  'Melmetal': 'メルメタル',
  'Eternatus': 'ムゲンダイナ',
  'Kubfu': 'ダクマ',
  'Urshifu': 'ウーラオス',
  'Zarude': 'ザルード',
  'Shedinja': 'ヌケニン',
  'Calyrex': 'コレイク',
  'Enamorus': 'エナモーレス',
  'Wyrdeer': 'アヤシシ',
  'Basculegion': 'イダイナキア',
  'Sneasler': 'オオニューラ',
  'Overqwil': 'ハリーマン',
  'Primeape': 'オコリザル',
  'Passimian': 'ナゲキ',
  'Ogerpon': 'オーガポン',
  'Torchic': 'アチャモ',
  'Blaziken': 'バシャーモ',
  'Swampert': 'ラグラージ',
  'Greninja': 'ゲッコウガ',
  'Lucario': 'ルカリオ',
  'Ditto': 'メタモン',
  'Eevee': 'イーブイ',
};

// Set name mapping (English -> Japanese set code)
const SET_CODE_MAPPING = {
  'UNIVERSE': 'S12A',
  '151': 'SV2A',
  'M-P PROMO': 'M-P',
  'S-P PROMO': 'S-P',
  'XY-P PROMO': 'XY-P',
  'BW-P PROMO': 'BW-P',
  'L-P PROMO': 'L-P',
  'VSTAR': 'S12',
  'VMAX': 'S12',
  'PROMO': '',
};

// Simple English to Japanese Pokemon name translation for search
function translatePokemonName(name) {
  const upper = name.toUpperCase();

  for (const [en, jp] of Object.entries(POKEMON_JP_NAMES)) {
    if (upper.includes(en.toUpperCase())) {
      return jp;
    }
  }
  return '';
}

// Extract variant keywords from card name (fallback when PSA cert lookup fails)
// These variant keywords are used for bonus scoring during SNKRDUNK product matching
const VARIANT_PATTERNS = [
  // Full Art variants
  { pattern: /\bfull\s*art\b/i, keywords: ['FULL ART', 'FA'] },
  { pattern: /\balt\s*art\b/i, keywords: ['ALT ART', 'AA'] },

  // Special card types
  { pattern: /\bcharacter\s*rare\b/i, keywords: ['CHR'] },
  { pattern: /\bhyper\s*rare\b/i, keywords: ['HR'] },
  { pattern: /\bultra\s*rare\b/i, keywords: ['UR'] },
  { pattern: /\brainbow\s*rare\b/i, keywords: ['RRR'] },
  { pattern: /\bgold\s*rare\b/i, keywords: ['GOLD'] },

  // Secret rare
  { pattern: /\bsecret\s*rare\b/i, keywords: ['SECRET'] },

  // 1st Edition
  { pattern: /\b1st\s*edition\b/i, keywords: ['1ST EDITION', ':1ED'] },

  // Ball variants (Master Ball, Monster Ball)
  { pattern: /\bmaster\s*ball\b/i, keywords: ['MASTER BALL', 'MASTERBALL'] },
  { pattern: /\bmonster\s*ball\b/i, keywords: ['MONSTER BALL', 'MONSTERBALL'] },

  // Trainer Gallery
  { pattern: /\btrainer\s*gallery\b/i, keywords: ['TG'] },

  // Reverse Holo / Mirror
  { pattern: /\breverse\s*holo\b/i, keywords: ['MIRROR', 'RH'] },

  // Special version markers
  { pattern: /:\s*(1st\s*edition|1ED)\b/i, keywords: ['1ST EDITION', ':1ED'] },

  // PROMO variants
  { pattern: /\bpromo\b/i, keywords: ['PROMO'] },

  // Stamp/Symbol variants
  { pattern: /\bstamp\b/i, keywords: ['STAMP'] },
];

// Extract variant keywords from card name
function extractVariantsFromName(name) {
  if (!name) return [];

  const found = [];

  for (const { pattern, keywords } of VARIANT_PATTERNS) {
    if (pattern.test(name)) {
      found.push(...keywords);
    }
  }

  // Deduplicate
  return [...new Set(found)];
}

// Extract card identity from Renaiss card name
function extractCardIdentity(name, fmvPriceUSD) {
  if (fmvPriceUSD === undefined) fmvPriceUSD = 0;
  const raw = name;

  // Extract year
  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : '';

  // Extract card number
  const numMatch = raw.match(/#(\d+[\/\-]?\d*)/);
  const number = numMatch ? numMatch[1] : '';
  const numberDigits = number.replace(/[^0-9]/g, '');
  const paddedNumber = numberDigits.padStart(3, '0');

  // Extract language
  let language = 'Japanese';
  if (/english/i.test(raw)) language = 'English';
  else if (/korean|한국어/i.test(raw)) language = 'Korean';
  else if (/chinese|中文/i.test(raw)) language = 'Chinese';

  // Extract grader and grade
  const graderMatch = raw.match(/\b(PSA|BGS|CGC)\b/i);
  const grader = graderMatch ? graderMatch[1].toUpperCase() : '';
  const gradeMatch = raw.match(/\b(PSA|BGS|CGC)\s*(\d+(?:\.5)?)\b/i);
  const grade = gradeMatch ? gradeMatch[2] : '';

  // Extract serial number
  const serialMatch = raw.match(/\b(\d{7,10})\b/);
  const serial = serialMatch ? serialMatch[1] : '';

  // Extract set code
  const setCodeMatch = raw.match(/\b(Sv\d+[a-z]?|S\d+[a-z]?|SW|SH|XY|SM|BW|RS|EX)\b/i);
  const setCode = setCodeMatch ? setCodeMatch[1].toUpperCase() : '';

  // Extract Pokemon name
  let cardName = '';
  if (numMatch) {
    const hashPos = raw.indexOf('#' + numMatch[1]);
    const afterNumber = raw.substring(hashPos + numMatch[0].length).trim();
    if (afterNumber) {
      cardName = afterNumber
        .replace(/\s+(VMAX|VSTAR|V-UNION|AR|EX|GX|HR|UR|SR|SSR|CHR|PGRM|Lv\.X)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  // Fallback name extraction
  if (!cardName) {
    const words = raw.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (/^[A-Z][a-z]+$/i.test(word) && word.length > 2) {
        if (!/^(Pokemon|PSA|BGS|CGC|Gem|Mint|Near|Year|Sword|Shield)$/i.test(word)) {
          cardName = word;
          break;
        }
      }
    }
  }

  // Extract set name
  let setName = '';
  if (numMatch) {
    const hashPos = raw.indexOf('#' + numMatch[1]);
    const beforeNumber = raw.substring(0, hashPos).trim();
    setName = beforeNumber
      .replace(/\b(PSA|BGS|CGC)\s*\d+\s*(Gem\s*Mint|Mint|Near\s*Mint|Excellent)?/gi, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      .replace(/\b(Pokemon|One Piece|TCG)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ========== Extract variant keywords from card name ==========
  // Prioritize variant info extracted from card name (more reliable than PSA cert)
  const variantKeywords = extractVariantsFromName(raw);

  return {
    name: cardName,
    number: numberDigits,
    paddedNumber,
    setCode,
    setName,
    year,
    language,
    grade,
    grader,
    serial,
    cleanSerial: serial,
    fmvPriceUSD,
    variantKeywords,
  };
}

// Build search queries - matching Chrome extension logic (max 5 queries, no JP site)
function buildSearchQueries(ident) {
  const queries = [];
  const { name, number, setCode, setName } = ident;

  // Map set names to set codes for better SNKRDUNK matching
  let mappedSetCode = setCode;
  if (!mappedSetCode && setName) {
    if (setName.includes('Universe')) mappedSetCode = 's12a';
    else if (setName.includes('151')) mappedSetCode = 'sv2a';
    else if (setName.toUpperCase().includes('M-P PROMO')) mappedSetCode = 'M-P';
    else if (setName.toUpperCase().includes('S-P PROMO')) mappedSetCode = 'S-P';
    else if (setName.toUpperCase().includes('XY-P PROMO')) mappedSetCode = 'XY-P';
    else if (setName.toUpperCase().includes('BW-P PROMO')) mappedSetCode = 'BW-P';
    else if (setName.toUpperCase().includes('L-P PROMO')) mappedSetCode = 'L-P';
  }

  const cleanName = (name || '').replace(/Lv\.X/gi, '').trim();
  const cleanSetName = mappedSetCode || (setName || '').replace(/PROMO/gi, '').trim();
  const idRaw = number;

  // Generate queries matching Chrome extension priority
  // Priority: Cert Query > Precise Query > Smart Query > Lean Query > idRaw
  const certQuery = ident.cleanSerial || '';
  const preciseQuery = mappedSetCode ? `${mappedSetCode} ${idRaw}`.trim() : '';
  const smartQuery = `${cleanName} ${idRaw} ${cleanSetName}`.replace(/\s+/g, ' ').trim();
  const leanQuery = `${cleanName} ${idRaw}`.trim();

  // Build final queries list (max 5, matching Chrome extension)
  const rawQueries = [certQuery, preciseQuery, smartQuery, leanQuery, idRaw];
  for (const q of rawQueries) {
    if (q && q.length >= 2 && !queries.includes(q)) {
      queries.push(q);
    }
  }

  return {
    certQuery,
    preciseQuery,
    smartQuery,
    leanQuery,
    queries: queries.slice(0, 5), // Limit to 5 queries like Chrome extension
  };
}

// SNKRDUNK API config (for trading-histories)
const SNKR_API_BASE = 'https://snkrdunk.com/en/v1';

// ========== Direct API Rate Limiter ==========
let lastDirectAPICall = 0;
const DIRECT_API_INTERVAL_MS = 5000;
const directTimestamps = [];
const DIRECT_WINDOW = 60000;

async function waitForDirectSlot() {
  const now = Date.now();
  const timeSinceLastCall = now - lastDirectAPICall;
  if (timeSinceLastCall < DIRECT_API_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, DIRECT_API_INTERVAL_MS - timeSinceLastCall));
  }
  const cutoff = Date.now() - DIRECT_WINDOW;
  while (directTimestamps.length > 0 && directTimestamps[0] < cutoff) directTimestamps.shift();
  if (directTimestamps.length >= 10) {
    const waitMs = directTimestamps[0] + DIRECT_WINDOW - Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.max(0, waitMs)));
  }
  lastDirectAPICall = Date.now();
  directTimestamps.push(lastDirectAPICall);
}

// Call SNKRDUNK API via r.jina.ai
async function fetchSnkrdunkViaJina(path) {
  const apiUrl = `${SNKR_API_BASE}${path}`;
  try {
    const text = await fetchJina(apiUrl, { timeout: 30000, retries: 3 });
    try {
      const outer = JSON.parse(text);
      if (outer.code === 200 && outer.data && outer.data.content) return JSON.parse(outer.data.content);
    } catch {}
    try { return JSON.parse(text); } catch {}
    return null;
  } catch (error) {
    console.log(`  [Jina Proxy] Error: ${error.message}`);
    return null;
  }
}

// Direct SNKRDUNK API call (fallback)
async function fetchSnkrdunkDirect(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await waitForDirectSlot();
      const response = await fetch(`${SNKR_API_BASE}${path}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://snkrdunk.com/' },
      });
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  return null;
}

// Primary: Jina → fallback: direct
async function fetchSnkrdunkAPI(path) {
  const jinaResult = await fetchSnkrdunkViaJina(path);
  if (jinaResult !== null) return jinaResult;
  return fetchSnkrdunkDirect(path);
}

// 从 priceFormat 解析币种（如 "US $" → USD, "HK $" → HKD, "¥" → JPY）
function parseCurrency(priceFormat) {
  if (!priceFormat) return 'USD';
  if (priceFormat.includes('US $') || priceFormat.includes('US$')) return 'USD';
  if (priceFormat.includes('HK $') || priceFormat.includes('HK$')) return 'HKD';
  if (priceFormat.includes('NT $') || priceFormat.includes('NT$')) return 'TWD';
  if (priceFormat.includes('¥') && !priceFormat.includes('HK') && !priceFormat.includes('NT')) return 'JPY';
  if (priceFormat.includes('₩')) return 'KRW';
  return 'USD'; // 默认 USD
}

// Get sale history (trading-histories API)
async function getSnkrdunkHistory(productId, pages) {
  if (pages === undefined) pages = 3;
  const allHistories = [];

  for (let page = 1; page <= pages; page++) {
    const data = await fetchSnkrdunkAPI(`/streetwears/${productId}/trading-histories?perPage=100&page=${page}`);
    if (!data || !data.histories || !data.histories.length) break;

    allHistories.push(
      ...data.histories.map(h => ({
        price: h.price || 0,
        priceFormat: h.priceFormat || '',
        currency: parseCurrency(h.priceFormat),
        condition: h.condition || '',
        tradedAt: h.tradedAt || '',
      }))
    );
    if (data.histories.length < 100) break;
  }

  allHistories.sort((a, b) => {
    const da = new Date(a.tradedAt).getTime() || 0;
    const db = new Date(b.tradedAt).getTime() || 0;
    return db - da;
  });
  return allHistories;
}

// 标准化评级字符串用于匹配
function normalizeGrade(s) {
  return (s || '').toUpperCase().replace(/\s+/g, '');
}

// 检查 condition 是否匹配目标评级
function matchesGrade(condition, targetGrade) {
  const norm = normalizeGrade(condition);
  const tgt = normalizeGrade(targetGrade);
  const escaped = tgt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^\\d.])${escaped}(?:[^\\d.]|$)`);
  return re.test(norm) || norm === tgt;
}

// Search products via web search (https://snkrdunk.com/search)
async function searchSnkrdunkProducts(keyword) {
  if (!keyword || keyword.length < 2) return [];

  const searchUrl = `https://snkrdunk.com/search?keywords=${encodeURIComponent(keyword)}`;

  try {
    const html = await fetchJinaHtml(searchUrl, {
      timeout: 30000,
      retries: 2,
    });

    if (!html) return [];

    // 提取产品 ID（链接: apparels/12345/used/xxx）
    const idMatches = [...html.matchAll(/apparels\/(\d+)/g)];
    const ids = [...new Set(idMatches.map(m => m[1]))];

    if (ids.length === 0) return [];

    // 提取产品名（CSS class: productName）
    const nameMatches = [...html.matchAll(/__productName[^>]*>([^<]+)/g)];
    const names = [...new Set(nameMatches.map(m => m[1].trim()))];

    // 按顺序配对: 同一产品的所有 listing 共享同一个名字
    const products = ids.map((id, i) => ({
      id: parseInt(id),
      name: names[i] || names[0] || '',
      minPrice: 0,
      currency: 'JPY',
    }));

    console.log(`  [Web Search] Found ${products.length} products for "${keyword.slice(0, 40)}"`);
    return products;

  } catch (error) {
    console.log(`  [Web Search] Error: ${error.message}`);
    return [];
  }
}

// Sync single card with SNKRDUNK — 用 MiMo 视觉分析生成日文搜索词
async function syncSingleSnkrdunk(card, env, mimoResult) {
  console.log(`[SNKRDUNK] Card: "${card.name}"`);

  // 确保汇率已加载（单独调用时 syncSnkrdunk 不会先调 refreshRates）
  if (Object.keys(currentRates).length === 0) {
    await refreshRates();
  }

  const fmvPrice = card.fmv_price_in_usd || card.fmvPriceInUSD || 0;
  const frontImageUrl = card.front_image_url || card.frontImageUrl || '';

  // ========== Step 1: MiMo 视觉分析 → 日文搜索关键词 ==========
  if (!mimoResult) {
    const tokenId = card.token_id || card.tokenId;
    mimoResult = tokenId ? await getMimoCache(tokenId) : null;
    if (mimoResult) {
      console.log(`  [MiMo] Cache hit for ${tokenId}`);
    } else {
      mimoResult = await analyzeCardImage({
        name: card.name || '',
        setName: card.set_name || card.setName || '',
        pokemonName: card.pokemon_name || card.pokemonName || '',
        cardNumber: card.card_number || card.cardNumber || '',
        grade: card.grade || '',
        gradingCompany: card.grading_company || card.gradingCompany || '',
        year: card.year || '',
        language: card.language || '',
        serial: card.serial || '',
      }, frontImageUrl);
      if (mimoResult && tokenId) await upsertMimoCache(tokenId, mimoResult);
    }
  }

  let searchQueries = [];
  if (mimoResult) {
    searchQueries = getSnkrdunkQueries(mimoResult);
    console.log(`  MiMo queries (JP): ${searchQueries.join(' | ')}`);
  }

  if (searchQueries.length === 0) {
    console.log('  MiMo unavailable, skipping SNKRDUNK search');
    const tokenId = card.token_id || card.tokenId;
    if (tokenId) await upsertSnkrdunkPrice(env, tokenId, {
      snkrdunkPrice: null, snkrdunkLastSale: null, snkrdunkProductId: null,
      snkrdunkProductUrl: null, snkrdunkUpdatedAt: new Date().toISOString(),
    });
    return {};
  }

  // 追加语言标签（非日版卡需要在搜索词中标注语言）
  const cardLang = (card.language || '').toLowerCase();
  let langTag = '';
  if (cardLang.includes('english') || cardLang.includes('英語')) langTag = '【英語版】';
  else if (cardLang.includes('chinese') || cardLang.includes('中国語')) langTag = '【中国語版】';
  else if (cardLang.includes('korean') || cardLang.includes('韓国語')) langTag = '【韓国語版】';

  const gradingCompany = (card.grading_company || '').toUpperCase();
  const gradeRaw = card.grade || '';
  const gradeNum = (gradeRaw.match(/[\d.]+/) || [null])[0];

  // ========== Step 2: 顺序搜索 + 筛选 + 价格校验 ==========
  // 追加语言/评级后缀
  const suffixParts = [];
  if (langTag) suffixParts.push(langTag);
  if (gradingCompany && gradeNum) suffixParts.push(`${gradingCompany} ${gradeNum}`);
  const suffix = suffixParts.length > 0 ? ' ' + suffixParts.join('') : '';

  // 构建 ident（卡号筛选用）
  const fallbackIdent = extractCardIdentity(card.name, fmvPrice);
  const ident = mimoResult ? {
    name: mimoResult.name_en || fallbackIdent.name,
    nameJa: mimoResult.name_ja || '',
    number: (mimoResult.number || '').split('/')[0].replace(/[^0-9]/g, ''),
    setCode: (mimoResult.set_code || '').toLowerCase(),
    setName: mimoResult.set_name || fallbackIdent.setName,
    year: mimoResult.year || fallbackIdent.year,
    language: mimoResult.language || fallbackIdent.language,
    fmvPriceUSD: fmvPrice,
    variantKeywords: fallbackIdent.variantKeywords,
    paddedNumber: (mimoResult.number || '').split('/')[0].replace(/[^0-9]/g, '').padStart(3, '0'),
  } : fallbackIdent;
  console.log(`  ident: name="${ident.name}" num="${ident.number}" set="${ident.setCode}" fmv=${ident.fmvPriceUSD}`);

  const targetGrade = gradingCompany && gradeNum ? `${gradingCompany} ${gradeNum}` : null;

  // 对搜索结果做卡号筛选 + 语言筛选 + 成交价获取 + FMV 校验
  async function tryMatchProducts(products) {
    // 卡号硬筛选
    const candidates = products.filter(p => {
      const bracket = p.name.match(/\[([^\]]+)\]/);
      if (!bracket) return false;
      const numMatch = bracket[1].match(/(\d+)\s*\/\s*\d+/) || bracket[1].match(/(\d+)\s*$/);
      return numMatch && parseInt(numMatch[1], 10) === parseInt(ident.number, 10);
    });
    if (candidates.length === 0) return null;

    // 非日版卡：产品名必须包含语言标签
    const filtered = langTag
      ? candidates.filter(p => p.name.includes(langTag))
      : candidates;
    if (langTag && filtered.length === 0) return null;

    // 遍历候选产品，获取成交价 + FMV 校验
    for (const product of filtered) {
      console.log(`  Checking product ${product.id}: "${product.name.slice(0, 50)}"`);

      const history = await getSnkrdunkHistory(product.id);
      if (history.length === 0) {
        console.log(`    No trading history, skipping`);
        continue;
      }

      let salePrice = null;
      let saleCurrency = 'USD';
      let saleInfo = '';

      if (targetGrade) {
        const gradeSales = history.filter(h => matchesGrade(h.condition, targetGrade));
        if (gradeSales.length > 0) {
          salePrice = gradeSales[0].price;
          saleCurrency = gradeSales[0].currency;
          saleInfo = `${targetGrade} ${gradeSales[0].priceFormat} (${gradeSales[0].tradedAt})`;
        }
      } else {
        salePrice = history[0].price;
        saleCurrency = history[0].currency;
        saleInfo = `${history[0].priceFormat} (${history[0].tradedAt})`;
      }

      if (!salePrice) {
        const reason = targetGrade ? `No ${targetGrade} sale` : 'No sale data';
        console.log(`    ${reason}, skipping`);
        continue;
      }

      const salePriceUSD = toUSD(salePrice, saleCurrency);

      // FMV 校验：价格必须在 0.25~4 倍范围内
      if (fmvPrice > 0) {
        const ratio = salePriceUSD / fmvPrice;
        if (ratio < 0.25 || ratio > 4.0) {
          console.log(`    Rejected: ${saleInfo} = $${salePriceUSD} (FMV ratio ${ratio.toFixed(2)}x outside 0.25~4x)`);
          continue;
        }
      }

      console.log(`    Matched: ${saleInfo} = $${salePriceUSD}`);
      return { product, salePriceUSD };
    }
    return null;
  }

  // 顺序搜索：每个关键词搜完立刻校验，不过换下一个
  let matched = null;
  for (const q of searchQueries) {
    const cleaned = cleanSearchQuery(q + suffix);
    if (!cleaned) continue;
    console.log(`  Search: "${cleaned}"`);
    const products = await searchSnkrdunkProducts(cleaned);
    if (products.length === 0) continue;
    console.log(`  Found ${products.length} products`);

    matched = await tryMatchProducts(products);
    if (matched) break;
  }

  // MiMo 查询都没匹配 → 用 variant + [set_code number] 再搜
  if (!matched && mimoResult) {
    const variant = (mimoResult.variant || '').toUpperCase();
    const setCode = (mimoResult.set_code || '').toLowerCase();
    const num = mimoResult.number || '';
    if (variant && setCode && num) {
      const fallbackQuery = cleanSearchQuery(`${variant}[${setCode} ${num}]${suffix}`);
      console.log(`  No match, trying fallback: ${fallbackQuery}`);
      const products = await searchSnkrdunkProducts(fallbackQuery);
      if (products.length > 0) {
        matched = await tryMatchProducts(products);
      }
    }
  }

  if (!matched) {
    console.log(`  No match found`);
    const tokenId = card.token_id || card.tokenId;
    if (tokenId) await upsertSnkrdunkPrice(env, tokenId, {
      snkrdunkPrice: null, snkrdunkLastSale: null, snkrdunkProductId: null,
      snkrdunkProductUrl: null, snkrdunkUpdatedAt: new Date().toISOString(),
    });
    return {};
  }

  const { product, salePriceUSD } = matched;
  const result = {
    price: salePriceUSD,
    lastSale: salePriceUSD,
    matchedProduct: product.name,
    productId: product.id,
    productUrl: `https://snkrdunk.com/apparels/${product.id}`,
  };

  console.log(`  Result: price=$${salePriceUSD}, product=${product.id}`);

  const tokenId = card.token_id || card.tokenId;
  if (!tokenId) {
    console.log(`  ERROR: No tokenId found on card`);
    return {};
  }

  await upsertSnkrdunkPrice(env, tokenId, {
    snkrdunkPrice: result.price,
    snkrdunkLastSale: salePriceUSD,
    snkrdunkProductId: product.id,
    snkrdunkProductUrl: result.productUrl,
    snkrdunkUpdatedAt: new Date().toISOString(),
  });

  return result;
}

// Sync all cards with SNKRDUNK — 分批加载，避免一次全部加载到内存
async function syncSnkrdunk(env, limit, concurrency) {
  if (limit === undefined) limit = 5000;
  if (concurrency === undefined) concurrency = 2;
  const BATCH_SIZE = 50;

  // Refresh realtime exchange rates
  await refreshRates();

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  let total = 0;
  const errors = [];
  let cursor = null;

  while (total < limit) {
    const batch = await getCollectiblesBatch(env, cursor, Math.min(BATCH_SIZE, limit - total));
    if (batch.length === 0) break;

    await runWithConcurrency(batch, concurrency, async (card) => {
      try {
        const tokenId = card.token_id || card.tokenId || 'unknown';
        const result = await syncSingleSnkrdunk(card, env);
        if (result.price) {
          updated++;
          console.log(`  ✓ ${tokenId.slice(0, 8)}... updated`);
        } else {
          skipped++;
          console.log(`  - ${tokenId.slice(0, 8)}... no match`);
        }
      } catch (err) {
        const tokenId = card.token_id || card.tokenId || 'unknown';
        failed++;
        errors.push(`${tokenId}: ${err.message}`);
        console.error(`  ✗ ${tokenId.slice(0, 8)}... error: ${err.message}`);
      }
    });

    total += batch.length;
    cursor = batch[batch.length - 1].token_id || batch[batch.length - 1].tokenId;
    console.log(`[SNKRDUNK] Batch done: ${total} processed`);
  }

  await recordSyncStatus(env, 'snkrdunk', total, updated, failed, JSON.stringify({ concurrency }));

  return {
    success: true,
    total,
    updated,
    failed,
    skipped,
    errors: errors.slice(0, 10),
  };
}

// ========== Routes ==========

router.post('/sync-all', async (req, res) => {
  try {
    const { limit, concurrency } = req.body || {};
    const result = await syncSnkrdunk(null, limit, concurrency);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.syncSnkrdunk = syncSnkrdunk;
module.exports.syncSingleSnkrdunk = syncSingleSnkrdunk;
module.exports.extractVariantsFromName = extractVariantsFromName;
module.exports.extractCardIdentity = extractCardIdentity;
module.exports.toUSD = toUSD;
module.exports.refreshRates = refreshRates;
module.exports.translatePokemonName = translatePokemonName;
