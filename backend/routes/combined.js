const { Router } = require("express");
const router = Router();

const { getCollectibles, getCollectiblesBatch, getNewCardsNeedingSync, recordSyncStatus } = require('../db/index.js');
const { runWithConcurrency } = require('../lib/concurrency.js');
const { syncSingleSnkrdunk, refreshRates: refreshSnkrRates } = require('./snkrdunk.js');
const { syncSinglePriceCharting } = require('./pricecharting.js');

// 组合同步：每张卡先查 SNKRDUNK 再查 PriceCharting — 分批加载
async function syncAllCombined(env, limit, concurrency) {
  if (limit === undefined) limit = 5000;
  if (concurrency === undefined) concurrency = 2;
  const BATCH_SIZE = 50;

  await refreshSnkrRates();

  let snkrdunkUpdated = 0, snkrdunkFailed = 0;
  let pcUpdated = 0, pcFailed = 0;
  let total = 0;
  const errors = [];
  let cursor = null;

  while (total < limit) {
    const batch = await getCollectiblesBatch(env, cursor, Math.min(BATCH_SIZE, limit - total));
    if (batch.length === 0) break;

    await runWithConcurrency(batch, concurrency, async (card) => {
      const tokenId = card.token_id || card.tokenId || 'unknown';

      try {
        const snkrResult = await syncSingleSnkrdunk(card, env, null);
        if (snkrResult.price || snkrResult.lastSale) snkrdunkUpdated++;
      } catch (err) {
        snkrdunkFailed++;
        errors.push(`SNKRDUNK ${tokenId}: ${err.message}`);
      }

      try {
        const pcResult = await syncSinglePriceCharting(card, env, null);
        if (pcResult.price) pcUpdated++;
      } catch (err) {
        pcFailed++;
        errors.push(`PC ${tokenId}: ${err.message}`);
      }
    });

    total += batch.length;
    cursor = batch[batch.length - 1].token_id || batch[batch.length - 1].tokenId;
    console.log(`[COMBINED] Batch done: ${total} processed`);
  }

  await recordSyncStatus(env, 'combined', total,
    snkrdunkUpdated + pcUpdated, snkrdunkFailed + pcFailed,
    JSON.stringify({ concurrency, snkrdunkUpdated, pcUpdated })
  );

  return {
    success: true,
    total,
    snkrdunk: { updated: snkrdunkUpdated, failed: snkrdunkFailed },
    pricecharting: { updated: pcUpdated, failed: pcFailed },
    errors: errors.slice(0, 10),
  };
}

// 增量同步：只同步新增的卡牌（无 snkrdunk_prices 或 pricecharting_prices 记录）
async function syncIncrementalCombined(env, limit, concurrency) {
  if (limit === undefined) limit = 5000;
  if (concurrency === undefined) concurrency = 2;

  await refreshSnkrRates();

  const cards = await getNewCardsNeedingSync(env, limit);
  console.log(`[INCREMENTAL] Found ${cards.length} new cards needing sync`);

  if (cards.length === 0) {
    return { success: true, total: 0, snkrdunk: { updated: 0, failed: 0 }, pricecharting: { updated: 0, failed: 0 }, errors: [] };
  }

  let snkrdunkUpdated = 0, snkrdunkFailed = 0;
  let pcUpdated = 0, pcFailed = 0;
  const errors = [];

  await runWithConcurrency(cards, concurrency, async (card) => {
    const tokenId = card.token_id || card.tokenId || 'unknown';

    // SNKRDUNK（自行处理 MiMo 缓存）
    try {
      const snkrResult = await syncSingleSnkrdunk(card, env, null);
      if (snkrResult.price || snkrResult.lastSale) {
        snkrdunkUpdated++;
      }
    } catch (err) {
      snkrdunkFailed++;
      errors.push(`SNKRDUNK ${tokenId}: ${err.message}`);
    }

    // PriceCharting（自行处理 MiMo 缓存，命中则跳过 API 调用）
    try {
      const pcResult = await syncSinglePriceCharting(card, env, null);
      if (pcResult.price) {
        pcUpdated++;
      }
    } catch (err) {
      pcFailed++;
      errors.push(`PC ${tokenId}: ${err.message}`);
    }

  });

  await recordSyncStatus(env, 'incremental', cards.length,
    snkrdunkUpdated + pcUpdated, snkrdunkFailed + pcFailed,
    JSON.stringify({ concurrency, snkrdunkUpdated, pcUpdated, newCards: cards.length })
  );

  console.log(`[INCREMENTAL] Done: ${snkrdunkUpdated} SN updated, ${pcUpdated} PC updated`);

  return {
    success: true,
    total: cards.length,
    snkrdunk: { updated: snkrdunkUpdated, failed: snkrdunkFailed },
    pricecharting: { updated: pcUpdated, failed: pcFailed },
    errors: errors.slice(0, 10),
  };
}

router.post('/sync-all', async (req, res) => {
  try {
    const { limit, concurrency } = req.body || {};
    const result = await syncAllCombined(null, limit, concurrency);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync-incremental', async (req, res) => {
  try {
    const { limit, concurrency } = req.body || {};
    const result = await syncIncrementalCombined(null, limit, concurrency);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.syncAllCombined = syncAllCombined;
module.exports.syncIncrementalCombined = syncIncrementalCombined;
