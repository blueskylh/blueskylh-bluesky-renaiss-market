require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const path = require('path')

const app = express()
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Basic Auth middleware for sync endpoints
function requireAuth(req, res, next) {
  const expected = process.env.DEBUG_USERNAME && process.env.DEBUG_PASSWORD;
  if (!expected) return next(); // no credentials configured, skip auth

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Sync"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const colonIdx = decoded.indexOf(':');
  const user = colonIdx > 0 ? decoded.slice(0, colonIdx) : '';
  const pass = colonIdx > 0 ? decoded.slice(colonIdx + 1) : '';
  if (user === process.env.DEBUG_USERNAME && pass === process.env.DEBUG_PASSWORD) {
    return next();
  }

  res.status(401).json({ error: 'Invalid credentials' });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API info (non-root, so SPA can serve at /)
app.get('/api', (_req, res) => {
  res.json({
    name: 'Renaiss Market Maker API',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      stats: '/api/stats',
      collectibles: '/api/collectibles',
      sync: { renaiss: '/api/sync/collectibles', combined: '/api/combined/sync-all', snkrdunk: '/api/snkrdunk/sync-all', pricecharting: '/api/pricecharting/sync-all' },
      arbitrage: '/api/arbitrage',
    },
    timestamp: new Date().toISOString(),
  })
})

// ─── Load routes ──────────────────────────────────────────────────────
const db = require('./db/index.js')

// System stats
app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await db.getSystemStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Sync status
app.get('/api/sync/status', async (_req, res) => {
  try {
    const renaissSync = await db.getLastSyncStatus('renaiss')
    const snkrdunkSync = await db.getLastSyncStatus('snkrdunk')
    const pcSync = await db.getLastSyncStatus('pricecharting')
    res.json({
      lastSyncAt: renaissSync?.last_sync_at || null,
      renaiss: renaissSync,
      snkrdunk: snkrdunkSync,
      pricecharting: pcSync,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// List collectibles
app.get('/api/collectibles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const offset = parseInt(req.query.offset) || 0
    const language = req.query.language || undefined
    const search = req.query.search || undefined
    const hasAskPrice = req.query.hasAskPrice !== 'false'
    const status = req.query.status || 'listed'
    const grade = req.query.grade || undefined
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
    const result = await db.getCollectibles(null, { limit, offset, language, search, hasAskPrice, status, grade, minPrice, maxPrice })
    res.json({ collection: result.data, total: result.count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Single collectible
app.get('/api/collectibles/:tokenId', async (req, res) => {
  try {
    const card = await db.getCollectible(null, req.params.tokenId)
    if (!card) return res.status(404).json({ error: 'Not found' })
    res.json(card)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Mount route modules
const syncRoutes = require('./routes/sync.js')
const snkrdunkRoutes = require('./routes/snkrdunk.js')
const pricechartingRoutes = require('./routes/pricecharting.js')
const arbitrageRoutes = require('./routes/arbitrage.js')
const exchangeRoutes = require('./routes/exchange.js')
const combinedRoutes = require('./routes/combined.js')

app.use('/api/sync', requireAuth, syncRoutes)
app.use('/api/snkrdunk', requireAuth, snkrdunkRoutes)
app.use('/api/pricecharting', requireAuth, pricechartingRoutes)
app.use('/api/arbitrage', arbitrageRoutes)
app.use('/api/exchange', exchangeRoutes)
app.use('/api/combined', requireAuth, combinedRoutes)

// Static frontend (production)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(frontendDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' })
  })
})

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message })
})

// ─── Cron jobs ────────────────────────────────────────────────────────
if (process.env.CRON_ENABLED === 'true') {
  const { syncCollectibles } = require('./routes/sync.js')
  const { syncAllCombined, syncIncrementalCombined } = require('./routes/combined.js')

  cron.schedule('0 * * * *', async () => {
    console.log('[CRON-RENAISS] Starting hourly sync...')
    try {
      await syncCollectibles(null);
      console.log('[CRON-RENAISS] Done');
      console.log('[CRON-INCREMENTAL] Starting incremental sync...');
      await syncIncrementalCombined(null, 5000, 2);
      console.log('[CRON-INCREMENTAL] Done');
    } catch (e) { console.error('[CRON-RENAISS] Failed:', e.message) }
  })

  cron.schedule('0 0 * * 1', async () => {
    console.log('[CRON-COMBINED] Starting weekly SNKRDUNK+PriceCharting sync (Monday)...')
    try { await syncAllCombined(null, 5000, 2); console.log('[CRON-COMBINED] Done') }
    catch (e) { console.error('[CRON-COMBINED] Failed:', e.message) }
  })

  console.log('[CRON] Schedules: Renaiss+Incremental=hourly, Combined=weekly(Mon 00:00)')
}

// Start
app.listen(PORT, () => {
  console.log(`[SERVER] Renaiss Market Maker API running on port ${PORT}`)
  console.log(`[DB] PostgreSQL: ${process.env.DATABASE_URL ? 'configured' : 'NOT CONFIGURED'}`)
})

module.exports = app
