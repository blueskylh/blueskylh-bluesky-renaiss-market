const { Router } = require("express");
const router = Router();

const { batchUpsertCollectibles, recordSyncStatus, markUnlistedCards } = require('../db/index.js');

// Fetch from api.renaiss.xyz marketplace (base data)
async function fetchFromApiRenaiss(offset, limit, listedOnly = true) {
  const url = `https://api.renaiss.xyz/v0/marketplace?limit=${limit}&offset=${offset}&listedOnly=${listedOnly}`;

  console.log(`[API_FETCH] offset=${offset}, limit=${limit}, listedOnly=${listedOnly}`);

  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`api.renaiss.xyz returned ${resp.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await resp.json();
  return data;
}

// Fetch card detail from api.renaiss.xyz (for topOffer)
async function fetchCardDetail(tokenId) {
  const url = `https://api.renaiss.xyz/v0/cards/${tokenId}?verbosePrice=true`;

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!resp.ok) {
      console.log(`[CARD_DETAIL] Failed for ${tokenId.slice(0, 16)}...: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    return data.pricing;
  } catch (e) {
    console.error(`[CARD_DETAIL] Error for ${tokenId.slice(0, 16)}...:`, e);
    return null;
  }
}

// Fetch topOffers concurrently for multiple cards
async function fetchTopOffers(tokenIds, concurrency = 10) {
  const results = new Map();

  console.log(`[TOP_OFFER] Fetching top offers for ${tokenIds.length} cards with concurrency=${concurrency}`);

  // Process in batches with concurrency control
  const batchSize = concurrency;
  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const batch = tokenIds.slice(i, i + batchSize);
    const promises = batch.map(async (tokenId) => {
      const pricing = await fetchCardDetail(tokenId);
      if (pricing) {
        const topOffer = pricing.top_offer ? parseFloat(pricing.top_offer.value) / 1e18 : 0;
        const lastSale = pricing.last_sale ? parseFloat(pricing.last_sale.value) / 1e18 : 0;
        results.set(tokenId, { topOffer, lastSale });
        console.log(`[TOP_OFFER] ${tokenId.slice(0, 12)}... topOffer=${topOffer.toFixed(2)}`);
      }
    });
    await Promise.all(promises);
  }

  console.log(`[TOP_OFFER] Completed: ${results.size}/${tokenIds.length} fetched`);
  return results;
}

// Fetch frontImageUrls from renaiss.xyz trpc endpoint (only for images)
let _cachedFrontImages = null;
let _frontImagesFetchedAt = 0;

async function fetchFrontImageUrls() {
  // Cache for 30 minutes to avoid repeated calls during same sync
  const now = Date.now();
  if (_cachedFrontImages && (now - _frontImagesFetchedAt) < 30 * 60 * 1000) {
    console.log(`[FRONT_IMAGE] Using cached map: ${_cachedFrontImages.size} URLs`);
    return _cachedFrontImages;
  }

  const imageMap = new Map();
  const limit = 100;
  let offset = 0;

  const MAX_PAGES = 60;
  let pageCount = 0;

  try {
    while (pageCount < MAX_PAGES) {
      pageCount++;
      const input = JSON.stringify({
        json: {
          limit,
          offset,
          sortBy: "listDate",
          sortOrder: "desc",
          listedOnly: true,
          characterFilter: "",
          languageFilter: "",
          gradingCompanyFilter: "",
          gradeFilter: "",
          yearRange: "",
          priceRangeFilter: ""
        }
      });

      const url = `https://www.renaiss.xyz/api/trpc/collectible.list?input=${encodeURIComponent(input)}`;

      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!resp.ok) {
        console.log(`[FRONT_IMAGE] Fetch failed: ${resp.status}`);
        break;
      }

      const data = await resp.json();
      const result = data?.result?.data?.json;
      const collection = result?.collection || [];
      const hasMore = result?.pagination?.hasMore || false;

      for (const card of collection) {
        if (card.tokenId && card.frontImageUrl) {
          imageMap.set(card.tokenId, card.frontImageUrl);
        }
      }

      console.log(`[FRONT_IMAGE] Page at offset=${offset}: ${collection.length} cards, total images: ${imageMap.size}, hasMore: ${hasMore}`);

      if (!hasMore || collection.length === 0) break;
      offset += collection.length;
    }

    _cachedFrontImages = imageMap;
    _frontImagesFetchedAt = now;
    console.log(`[FRONT_IMAGE] Complete: ${imageMap.size} image URLs cached`);
  } catch (e) {
    console.error('[FRONT_IMAGE] Error:', e.message);
  }

  return imageMap;
}

// Convert API card to DB payload
function cardToPayload(card, extra) {
  // Parse ask price (wei to USDT)
  let askPrice = card.askPriceInUSDT;
  if (!askPrice || askPrice === 'NO-ASK-PRICE') {
    askPrice = '0';
  } else {
    askPrice = String(parseFloat(askPrice) / 1e18);
  }

  // Parse FMV (cents to dollars)
  const fmvInDollars = parseFloat(card.fmvPriceInUSD || '0') / 100;

  // Extract serial from attributes
  let serial = '';
  let language = '';
  if (card.attributes) {
    const serialAttr = card.attributes.find(a => a.trait === 'Serial');
    if (serialAttr?.value) {
      const rawSerial = serialAttr.value;
      if (/^PSA/i.test(rawSerial)) {
        serial = rawSerial.replace(/^PSA/i, '').trim();
      } else if (/^CGC/i.test(rawSerial)) {
        serial = rawSerial.replace(/^CGC/i, '').trim();
      } else if (/^BGS/i.test(rawSerial)) {
        serial = rawSerial.replace(/^BGS/i, '').trim();
      } else {
        serial = rawSerial;
      }
    }

    const langAttr = card.attributes.find(a => a.trait === 'Language');
    if (langAttr?.value) {
      language = langAttr.value;
    }

    // 归一化语言
    if (/simplified/i.test(language)) language = 'Chinese';
    else if (/traditional/i.test(language)) language = 'Chinese';
    else if (/chinese/i.test(language)) language = 'Chinese';
    else if (/japanese/i.test(language)) language = 'Japanese';
    else if (/english/i.test(language)) language = 'English';
    else if (/korean/i.test(language)) language = 'Korean';
  }

  return {
    tokenId: card.tokenId,
    name: card.name,
    setName: card.setName,
    cardNumber: card.cardNumber,
    pokemonName: card.pokemonName,
    ownerAddress: card.ownerAddress,
    askPriceInUSDT: parseFloat(askPrice) || 0,
    fmvPriceInUSD: fmvInDollars,
    buybackBaseValue: fmvInDollars || 0,
    topOffer: extra?.topOffer ?? undefined,
    lastSale: extra?.lastSale ?? undefined,
    frontImageUrl: extra?.frontImageUrl,
    grade: card.grade,
    gradingCompany: card.gradingCompany,
    year: card.year,
    vaultLocation: card.vaultLocation,
    language: language,
    serial: serial,
  };
}

// Sync a single page using api.renaiss.xyz
async function syncPage(env, offset, limit = 100, fetchTopOffer = true) {
  try {
    console.log(`[SYNC_PAGE] Starting sync for offset=${offset}, limit=${limit}`);

    // Step 1: Fetch base data from api.renaiss.xyz
    const { collection, pagination } = await fetchFromApiRenaiss(offset, limit, true);

    // Collect tokenIds
    const tokenIds = collection.map(c => c.tokenId);

    if (collection.length === 0) {
      return {
        success: true,
        offset,
        count: 0,
        hasMore: false,
        updated: 0,
        failed: 0,
        tokenIds,
      };
    }

    console.log(`[SYNC_PAGE] Fetched ${collection.length} cards`);

    // Step 2: Fetch topOffers for listed cards (only if enabled)
    let topOffers = new Map();
    if (fetchTopOffer && tokenIds.length > 0) {
      topOffers = await fetchTopOffers(tokenIds, 10);
    }

    // Step 2b: Fetch frontImageUrls from trpc endpoint (uses cache if available)
    const frontImages = await fetchFrontImageUrls();

    // Step 3: Convert to payloads
    const payloads = collection.map(card => {
      const extra = topOffers.get(card.tokenId);
      const frontImageUrl = frontImages.get(card.tokenId);
      return cardToPayload(card, { ...extra, frontImageUrl });
    });

    // Step 4: Batch upsert
    const result = await batchUpsertCollectibles(env, payloads);

    console.log(`[SYNC_PAGE] Completed: ${result.successCount} updated, ${result.failedCount} failed`);

    return {
      success: true,
      offset,
      count: collection.length,
      hasMore: pagination.hasMore,
      updated: result.successCount,
      failed: result.failedCount,
      tokenIds,
    };
  } catch (e) {
    console.error(`[SYNC_PAGE] Error at offset=${offset}:`, e);
    return {
      success: false,
      offset,
      count: 0,
      hasMore: false,
      updated: 0,
      failed: 0,
      tokenIds: [],
      error: e.message,
    };
  }
}

// Full sync - optimized version
async function syncCollectibles(env, fetchTopOffer = true) {
  console.log(`[SYNC] Starting sync (fetchTopOffer=${fetchTopOffer})...`);

  let totalUpdated = 0;
  let totalFailed = 0;
  let totalCards = 0;
  let pagesProcessed = 0;
  let offset = 0;
  const limit = 100;
  const allTokenIds = [];
  const MAX_PAGES_PER_INVOCATION = 50;

  while (pagesProcessed < MAX_PAGES_PER_INVOCATION) {
    console.log(`[SYNC] Processing page at offset=${offset} (page ${pagesProcessed + 1}/${MAX_PAGES_PER_INVOCATION})`);

    const result = await syncPage(env, offset, limit, fetchTopOffer);

    if (!result.success) {
      console.error(`[SYNC] Page failed at offset=${offset}:`, result.error);
      totalFailed += limit;
      break;
    }

    totalUpdated += result.updated;
    totalFailed += result.failed;
    totalCards += result.count;
    pagesProcessed++;

    allTokenIds.push(...result.tokenIds);

    if (!result.hasMore || result.count === 0) {
      console.log('[SYNC] No more cards to sync');
      break;
    }

    offset += result.count;

    // Safety limit
    if (totalCards >= 5000) {
      console.log('[SYNC] Reached max card limit (5000)');
      break;
    }
  }

  // Record sync status
  await recordSyncStatus(env, 'renaiss', totalCards, totalUpdated, totalFailed);

  // Sync card statuses: mark cards not in allTokenIds as unlisted
  if (allTokenIds.length > 0) {
    const result = await markUnlistedCards(env, allTokenIds);
    console.log(`[SYNC] Status sync: ${result.markedUnlisted} cards marked as unlisted`);
  }

  console.log(`[SYNC] Complete: ${totalUpdated} updated, ${totalFailed} failed, ${totalCards} total, ${pagesProcessed} pages`);

  const hasMore = pagesProcessed >= MAX_PAGES_PER_INVOCATION && totalCards < 5000;

  return {
    success: true,
    updated: totalUpdated,
    failed: totalFailed,
    total: totalCards,
    pagesProcessed,
    hasMore,
    ...(hasMore ? { continuationToken: offset.toString() } : {}),
  };
}

// Debug: Test sync
async function testUpsert(env) {
  try {
    const result = await syncPage(env, 0, 5, true);

    if (!result.success || result.count === 0) {
      return { success: false, error: result.error || 'No cards returned' };
    }

    return {
      success: result.updated > 0,
      error: result.failed > 0 ? `Failed: ${result.failed}` : undefined,
      details: {
        updated: result.updated,
        failed: result.failed,
        count: result.count,
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Debug: Sync N cards
async function testSyncFew(env, count = 3) {
  try {
    const result = await syncPage(env, 0, count, true);

    return {
      success: result.success,
      updated: result.updated,
      failed: result.failed,
      error: result.error,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Routes
router.post('/collectibles', async (req, res) => {
  try {
    const fetchTopOffer = req.query.fetchTopOffer !== 'false';
    const result = await syncCollectibles(req.env, fetchTopOffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/collectibles/page', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const fetchTopOffer = req.query.fetchTopOffer !== 'false';
    const result = await syncPage(req.env, offset, limit, fetchTopOffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/test-upsert', async (req, res) => {
  try {
    const result = await testUpsert(req.env);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/test-sync-few', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 3;
    const result = await testSyncFew(req.env, count);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.syncCollectibles = syncCollectibles;
module.exports.syncPage = syncPage;
