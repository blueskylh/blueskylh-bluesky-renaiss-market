const { Router } = require("express");
const router = Router();

// Cache for exchange rates
const exchangeRateCache = {
  rates: { USD: 1, CNY: 7.25, JPY: 155, KRW: 1350, HKD: 7.8, TWD: 32, SGD: 1.35, EUR: 0.93, GBP: 0.79, MYR: 4.7 },
  updatedAt: 0,
};

async function fetchExchangeRates() {
  const now = Date.now();

  // Return cached if still valid (5 min cache)
  if (now - exchangeRateCache.updatedAt < 5 * 60 * 1000) {
    return exchangeRateCache.rates;
  }

  try {
    // Try open.er-api.com
    const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
    });

    if (resp.ok) {
      const data = await resp.json();

      if (data.rates) {
        const r = data.rates;
        exchangeRateCache.rates = {
          USD: 1,
          CNY: r.CNY || 7.25,
          JPY: r.JPY || 155,
          KRW: r.KRW || 1350,
          HKD: r.HKD || 7.8,
          TWD: r.TWD || 32,
          SGD: r.SGD || 1.35,
          EUR: r.EUR || 0.93,
          GBP: r.GBP || 0.79,
          MYR: r.MYR || 4.7,
        };
        exchangeRateCache.updatedAt = now;
        return exchangeRateCache.rates;
      }
    }
  } catch (e) {
    console.error('[Exchange] Fetch error:', e);
  }

  // Return fallback rates
  return exchangeRateCache.rates;
}

async function getExchangeRates(_req, res) {
  try {
    const rates = await fetchExchangeRates();
    res.json({
      base: 'USD',
      timestamp: new Date().toISOString(),
      rates,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

router.get('/rates', getExchangeRates);

module.exports = router;
module.exports.fetchExchangeRates = fetchExchangeRates;
module.exports.getExchangeRates = getExchangeRates;
