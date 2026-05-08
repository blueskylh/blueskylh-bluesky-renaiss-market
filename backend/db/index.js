const { Pool } = require('pg')
const crypto = require('crypto')

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/renaiss_market',
})

async function dbQuery(sql, params) {
  const result = await pool.query(sql, params)
  return result.rows
}

// Ensure tables exist on first load
const tablesReady = (async () => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS collectibles (
        id TEXT PRIMARY KEY,
        token_id TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        set_name TEXT DEFAULT '',
        card_number TEXT DEFAULT '',
        pokemon_name TEXT,
        owner_address TEXT DEFAULT '',
        ask_price_in_usdt REAL DEFAULT 0,
        fmv_price_in_usd REAL DEFAULT 0,
        buyback_base_value REAL DEFAULT 0,
        offer_price_in_usdt TEXT,
        top_offer REAL,
        last_sale REAL,
        front_image_url TEXT,
        grade TEXT DEFAULT '',
        grading_company TEXT DEFAULT '',
        year INTEGER DEFAULT 0,
        vault_location TEXT DEFAULT '',
        language TEXT DEFAULT '',
        serial TEXT,
        offers_updated_at TEXT,
        gemrate_id TEXT,
        status TEXT DEFAULT 'listed',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS snkrdunk_prices (
        token_id TEXT PRIMARY KEY,
        snkrdunk_price REAL,
        snkrdunk_last_sale REAL,
        snkrdunk_product_id BIGINT,
        snkrdunk_product_url TEXT,
        snkrdunk_updated_at TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS pricecharting_prices (
        token_id TEXT PRIMARY KEY,
        pricecharting_last_sale REAL,
        pricecharting_url TEXT,
        pricecharting_updated_at TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        source TEXT NOT NULL,
        total_cards INTEGER DEFAULT 0,
        updated_cards INTEGER DEFAULT 0,
        failed_cards INTEGER DEFAULT 0,
        last_sync_at TEXT,
        metadata TEXT
      )
    `)
    try { await dbQuery('CREATE INDEX IF NOT EXISTS idx_collectibles_status ON collectibles(status)') } catch {}
    try { await dbQuery('CREATE INDEX IF NOT EXISTS idx_collectibles_ask_price ON collectibles(ask_price_in_usdt)') } catch {}
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS mimo_cache (
        token_id TEXT PRIMARY KEY,
        mimo_result TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('[DB] Tables ready')
  } catch (err) {
    console.error('[DB] Table init error:', err.message)
  }
})()

function generateUUID() {
  return crypto.randomUUID()
}

// collectibles 表列（不含 SNKRDUNK/PC，这些在独立表中）
const COL_COLUMNS = 'c.id, c.token_id, c.name, c.set_name, c.card_number, c.pokemon_name, c.owner_address, c.ask_price_in_usdt, c.fmv_price_in_usd, c.buyback_base_value, c.offer_price_in_usdt, c.top_offer, c.last_sale, c.front_image_url, c.grade, c.grading_company, c.year, c.vault_location, c.language, c.serial, c.offers_updated_at, c.gemrate_id, c.status, c.created_at, c.updated_at'

// LEFT JOIN 的 SNKRDUNK/PC 列
const SN_COLS = 's.snkrdunk_price, s.snkrdunk_last_sale, s.snkrdunk_product_id, s.snkrdunk_product_url, s.snkrdunk_updated_at'
const PC_COLS = 'p.pricecharting_last_sale, p.pricecharting_url, p.pricecharting_updated_at'

const ALL_COLS = `${COL_COLUMNS}, ${SN_COLS}, ${PC_COLS}`

const JOIN_CLAUSE = 'LEFT JOIN snkrdunk_prices s ON c.token_id = s.token_id LEFT JOIN pricecharting_prices p ON c.token_id = p.token_id'

function rowToCollectible(row) {
  if (!row) return null
  return {
    ...row,
    tokenId: row.token_id,
    setName: row.set_name,
    cardNumber: row.card_number,
    pokemonName: row.pokemon_name,
    ownerAddress: row.owner_address,
    askPriceInUSDT: row.ask_price_in_usdt,
    fmvPriceInUSD: row.fmv_price_in_usd,
    buybackBaseValue: row.buyback_base_value,
    offerPriceInUSDT: row.offer_price_in_usdt,
    topOffer: row.top_offer,
    lastSale: row.last_sale,
    frontImageUrl: row.front_image_url,
    gradingCompany: row.grading_company,
    vaultLocation: row.vault_location,
    snkrdunkPrice: row.snkrdunk_price,
    snkrdunkLastSale: row.snkrdunk_last_sale,
    snkrdunkUpdatedAt: row.snkrdunk_updated_at,
    snkrdunkProductId: row.snkrdunk_product_id,
    snkrdunkProductUrl: row.snkrdunk_product_url,
    pricechartingUrl: row.pricecharting_url,
    pricechartingLastSale: row.pricecharting_last_sale,
    pricechartingUpdatedAt: row.pricecharting_updated_at,
    gemrateId: row.gemrate_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCollectibles(env, options) {
  await tablesReady
  const { limit = 100, offset = 0, language, search, hasAskPrice, status = 'listed', grade, minPrice, maxPrice } = options || {}

  let where = []
  let params = []
  let idx = 1

  if (status !== 'all') { where.push(`c.status = $${idx++}`); params.push(status) }
  if (hasAskPrice) { where.push(`c.ask_price_in_usdt > 0`) }
  if (language) { where.push(`c.language ILIKE $${idx++}`); params.push(`%${language}%`) }
  if (search) { where.push(`c.name ILIKE $${idx++}`); params.push(`%${search}%`) }
  if (grade) { where.push(`c.grade ILIKE $${idx++}`); params.push(`%${grade}%`) }
  if (minPrice !== undefined && minPrice > 0) { where.push(`c.ask_price_in_usdt >= $${idx++}`); params.push(minPrice) }
  if (maxPrice !== undefined && maxPrice > 0) { where.push(`c.ask_price_in_usdt <= $${idx++}`); params.push(maxPrice) }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await dbQuery(`SELECT COUNT(*) as count FROM collectibles c ${whereClause}`, params)
  const count = parseInt(countResult[0]?.count || 0)

  const data = await dbQuery(
    `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE} ${whereClause} ORDER BY c.updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  )

  return { data: data.map(rowToCollectible), count }
}

// 游标分批加载：按 token_id 顺序分批取卡牌，避免一次性全部加载到内存
// 每批返回 batchSize 张，调用方处理完后用最后一条的 token_id 作为 cursor 取下一批
async function getCollectiblesBatch(env, cursor, batchSize) {
  await tablesReady
  if (batchSize === undefined) batchSize = 50
  const rows = cursor
    ? await dbQuery(
        `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE}
         WHERE c.status='listed' AND c.ask_price_in_usdt > 0 AND c.token_id > $1
         ORDER BY c.token_id LIMIT $2`,
        [cursor, batchSize]
      )
    : await dbQuery(
        `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE}
         WHERE c.status='listed' AND c.ask_price_in_usdt > 0
         ORDER BY c.token_id LIMIT $1`,
        [batchSize]
      )
  return rows.map(rowToCollectible)
}

async function getCollectible(env, tokenId) {
  await tablesReady
  const rows = await dbQuery(`SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE} WHERE c.token_id = $1`, [tokenId])
  return rowToCollectible(rows[0]) || null
}

async function getSystemStats() {
  await tablesReady

  const totalResult = await dbQuery(`SELECT COUNT(*) as count FROM collectibles WHERE status = 'listed'`)
  const total = parseInt(totalResult[0]?.count || 0)

  const askResult = await dbQuery(`SELECT COUNT(*) as count FROM collectibles WHERE status = 'listed' AND ask_price_in_usdt > 0`)
  const withAskPrice = parseInt(askResult[0]?.count || 0)

  const valueResult = await dbQuery(`SELECT COALESCE(SUM(ask_price_in_usdt), 0) as total FROM collectibles WHERE status = 'listed' AND ask_price_in_usdt > 0`)
  const totalValue = parseFloat(valueResult[0]?.total || 0)

  const snResult = await dbQuery(`SELECT COUNT(*) as count FROM snkrdunk_prices WHERE snkrdunk_price IS NOT NULL`)
  const snkrdunkCount = parseInt(snResult[0]?.count || 0)

  const syncResult = await dbQuery(`SELECT last_sync_at FROM sync_status WHERE source = 'renaiss' ORDER BY last_sync_at DESC LIMIT 1`)

  return {
    total, totalValue: Math.round(totalValue * 100) / 100, withAskPrice, snkrdunkCount,
    lastSync: syncResult[0]?.last_sync_at,
  }
}

// Renaiss 同步 — 只写 collectibles 表，不碰 SNKRDUNK/PC 数据
async function batchUpsertCollectibles(env, collectibles) {
  await tablesReady
  const batchSize = 200
  let totalSuccess = 0
  let totalFailed = 0
  const allErrors = []

  for (let i = 0; i < collectibles.length; i += batchSize) {
    const batch = collectibles.slice(i, i + batchSize)
    for (const c of batch) {
      try {
        await dbQuery(
          `INSERT INTO collectibles (
            id, token_id, name, set_name, card_number, pokemon_name, owner_address,
            ask_price_in_usdt, fmv_price_in_usd, buyback_base_value,
            offer_price_in_usdt, top_offer, last_sale, front_image_url,
            grade, grading_company, year, vault_location, language, serial,
            status, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'listed',NOW())
          ON CONFLICT (token_id) DO UPDATE SET
            name=EXCLUDED.name, set_name=EXCLUDED.set_name, card_number=EXCLUDED.card_number,
            pokemon_name=EXCLUDED.pokemon_name, owner_address=EXCLUDED.owner_address,
            ask_price_in_usdt=EXCLUDED.ask_price_in_usdt, fmv_price_in_usd=EXCLUDED.fmv_price_in_usd,
            buyback_base_value=EXCLUDED.buyback_base_value, offer_price_in_usdt=EXCLUDED.offer_price_in_usdt,
            top_offer=EXCLUDED.top_offer, last_sale=EXCLUDED.last_sale, front_image_url=EXCLUDED.front_image_url,
            grade=EXCLUDED.grade, grading_company=EXCLUDED.grading_company, year=EXCLUDED.year,
            vault_location=EXCLUDED.vault_location, language=EXCLUDED.language, serial=EXCLUDED.serial,
            status='listed', updated_at=NOW()`,
          [
            c.id || generateUUID(), c.tokenId, c.name || '', c.setName || '', c.cardNumber || '',
            c.pokemonName || null, c.ownerAddress || '',
            c.askPriceInUSDT || 0, c.fmvPriceInUSD || 0, c.buybackBaseValue || 0,
            c.offerPriceInUSDT || null, c.topOffer || null, c.lastSale || null,
            c.frontImageUrl || null, c.grade || '', c.gradingCompany || '',
            c.year || 0, c.vaultLocation || '', c.language || '', c.serial || null,
          ]
        )
        totalSuccess++
      } catch (err) {
        totalFailed++
        if (allErrors.length < 3) allErrors.push(err.message)
      }
    }
  }
  return { successCount: totalSuccess, failedCount: totalFailed, errors: allErrors }
}

// SNKRDUNK 价格 — 写入独立表
async function upsertSnkrdunkPrice(env, tokenId, data) {
  await tablesReady
  try {
    await dbQuery(
      `INSERT INTO snkrdunk_prices (token_id, snkrdunk_price, snkrdunk_last_sale, snkrdunk_product_id, snkrdunk_product_url, snkrdunk_updated_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (token_id) DO UPDATE SET
         snkrdunk_price=EXCLUDED.snkrdunk_price, snkrdunk_last_sale=EXCLUDED.snkrdunk_last_sale,
         snkrdunk_product_id=EXCLUDED.snkrdunk_product_id, snkrdunk_product_url=EXCLUDED.snkrdunk_product_url,
         snkrdunk_updated_at=EXCLUDED.snkrdunk_updated_at,
         updated_at=NOW()`,
      [tokenId, data.snkrdunkPrice ?? null, data.snkrdunkLastSale ?? null,
       data.snkrdunkProductId ?? null, data.snkrdunkProductUrl || null,
       data.snkrdunkUpdatedAt || null]
    )
    return true
  } catch (err) {
    console.error('upsertSnkrdunkPrice error:', err.message)
    return false
  }
}

// PriceCharting 价格 — 写入独立表
async function upsertPricechartingPrice(env, tokenId, data) {
  await tablesReady
  try {
    await dbQuery(
      `INSERT INTO pricecharting_prices (token_id, pricecharting_last_sale, pricecharting_url, pricecharting_updated_at, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (token_id) DO UPDATE SET
         pricecharting_last_sale=EXCLUDED.pricecharting_last_sale, pricecharting_url=EXCLUDED.pricecharting_url,
         pricecharting_updated_at=EXCLUDED.pricecharting_updated_at,
         updated_at=NOW()`,
      [tokenId, data.pricechartingLastSale ?? null, data.pricechartingUrl || null,
       data.pricechartingUpdatedAt || null]
    )
    return true
  } catch (err) {
    console.error('upsertPricechartingPrice error:', err.message)
    return false
  }
}

async function recordSyncStatus(env, source, totalCards, updatedCards, failedCards, metadata) {
  await tablesReady
  try {
    await dbQuery(
      `INSERT INTO sync_status (id, source, total_cards, updated_cards, failed_cards, last_sync_at, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [generateUUID(), source, totalCards, updatedCards, failedCards, new Date().toISOString(), metadata || null]
    )
  } catch (err) { console.error('[SYNC_STATUS] Error:', err.message) }
}

async function getLastSyncStatus(source) {
  await tablesReady
  const rows = await dbQuery(`SELECT * FROM sync_status WHERE source = $1 ORDER BY last_sync_at DESC LIMIT 1`, [source])
  return rows[0] || null
}

async function getCardsWithSnkrdunkMatch(env, limit = 500) {
  await tablesReady
  return (await dbQuery(
    `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE} WHERE c.status='listed' AND s.snkrdunk_product_id IS NOT NULL LIMIT $1`,
    [limit]
  )).map(rowToCollectible)
}

async function getCardsNeedingSnkrdunk(env, limit = 500) {
  await tablesReady
  return (await dbQuery(
    `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE} WHERE c.status='listed' AND s.snkrdunk_price IS NULL LIMIT $1`,
    [limit]
  )).map(rowToCollectible)
}

async function getCardsNeedingPricecharting(env, limit = 200) {
  await tablesReady
  return (await dbQuery(
    `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE} WHERE c.status='listed' AND p.pricecharting_last_sale IS NULL LIMIT $1`,
    [limit]
  )).map(rowToCollectible)
}

async function getNewCardsNeedingSync(env, limit = 500) {
  await tablesReady
  // 找出没有 snkrdunk_prices 或没有 pricecharting_prices 记录的已上市卡牌
  // 只查 ask_price > 0 的（有挂牌价的）
  return (await dbQuery(
    `SELECT ${ALL_COLS} FROM collectibles c ${JOIN_CLAUSE}
     WHERE c.status='listed' AND c.ask_price_in_usdt > 0
       AND (s.token_id IS NULL OR p.token_id IS NULL)
     LIMIT $1`,
    [limit]
  )).map(rowToCollectible)
}

async function markUnlistedCards(env, listedTokenIds) {
  await tablesReady
  if (listedTokenIds.length === 0) return { markedUnlisted: 0 }
  try {
    // 单条 SQL：标记所有不在 listedTokenIds 中的已上市卡牌为 unlisted
    const result = await dbQuery(
      `UPDATE collectibles SET status='unlisted', updated_at=NOW()
       WHERE status='listed' AND token_id != ALL($1)`,
      [listedTokenIds]
    )
    return { markedUnlisted: result.length || 0 }
  } catch (err) {
    console.error('[MARK_UNLISTED] Error:', err.message)
    return { markedUnlisted: 0 }
  }
}

// MiMo 缓存 — 查
async function getMimoCache(tokenId) {
  await tablesReady
  try {
    const rows = await dbQuery('SELECT mimo_result FROM mimo_cache WHERE token_id = $1', [tokenId])
    if (rows.length > 0 && rows[0].mimo_result) {
      return JSON.parse(rows[0].mimo_result)
    }
  } catch (err) {
    console.error('getMimoCache error:', err.message)
  }
  return null
}

// MiMo 缓存 — 写
async function upsertMimoCache(tokenId, mimoResult) {
  await tablesReady
  try {
    await dbQuery(
      `INSERT INTO mimo_cache (token_id, mimo_result, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (token_id) DO UPDATE SET
         mimo_result = EXCLUDED.mimo_result,
         updated_at = NOW()`,
      [tokenId, JSON.stringify(mimoResult)]
    )
    return true
  } catch (err) {
    console.error('upsertMimoCache error:', err.message)
    return false
  }
}

module.exports = {
  dbQuery, tablesReady, pool,
  getCollectibles, getCollectiblesBatch, getCollectible, getSystemStats,
  batchUpsertCollectibles, upsertSnkrdunkPrice, upsertPricechartingPrice,
  recordSyncStatus, getLastSyncStatus,
  getCardsWithSnkrdunkMatch, getCardsNeedingSnkrdunk, getCardsNeedingPricecharting,
  getNewCardsNeedingSync,
  markUnlistedCards, generateUUID,
  getMimoCache, upsertMimoCache,
}
