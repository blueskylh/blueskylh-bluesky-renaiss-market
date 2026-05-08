const { Router } = require("express");
const router = Router();

const { getCollectibles } = require('../db/index.js');

// Get arbitrage opportunities
async function getArbitrage(env, threshold = 0.85) {
  // Only consider cards with ask price (listed cards)
  const { data: allCards } = await getCollectibles(env, { limit: 5000, hasAskPrice: true });

  const opportunities = (allCards || []).filter(card => {
    const askPrice = card.askPriceInUSDT;
    if (askPrice <= 0) return false;

    const externalPrice = card.snkrdunkPrice || card.pricechartingLastSale || 0;
    if (externalPrice <= 0) return false;

    const ratio = askPrice / externalPrice;
    return ratio < threshold;
  }).map(card => {
    const askPrice = card.askPriceInUSDT;
    const snkrdunkPrice = card.snkrdunkPrice || 0;
    const pcPrice = card.pricechartingLastSale || 0;
    const bestExternal = Math.max(snkrdunkPrice, pcPrice);
    const profit = bestExternal - askPrice;
    const roi = askPrice > 0 ? (profit / askPrice) * 100 : 0;

    return {
      tokenId: card.tokenId || card.token_id,
      name: card.name,
      askPrice,
      snkrdunkPrice: card.snkrdunkPrice,
      pricechartingPrice: card.pricechartingLastSale,
      bestExternal,
      profit,
      roi: Math.round(roi * 100) / 100,
      imageUrl: card.frontImageUrl,
      grade: card.grade,
    };
  }).sort((a, b) => b.profit - a.profit);

  return {
    success: true,
    count: opportunities.length,
    threshold,
    opportunities: opportunities.slice(0, 50),
    timestamp: new Date().toISOString(),
  };
}

router.get('/', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.85;
    const result = await getArbitrage(req.env, threshold);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.getArbitrage = getArbitrage;
