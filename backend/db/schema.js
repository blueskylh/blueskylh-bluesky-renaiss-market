const { pgTable, text, integer, real, boolean, timestamp, varchar, bigint } = require('drizzle-orm/pg-core')

// collectibles - main card data table (Renaiss data only)
const collectibles = pgTable('collectibles', {
  id: text('id').primaryKey(),
  token_id: text('token_id').notNull().unique(),
  name: text('name').notNull().default(''),
  set_name: text('set_name').default(''),
  card_number: text('card_number').default(''),
  pokemon_name: text('pokemon_name'),
  owner_address: text('owner_address').default(''),
  ask_price_in_usdt: real('ask_price_in_usdt').default(0),
  fmv_price_in_usd: real('fmv_price_in_usd').default(0),
  buyback_base_value: real('buyback_base_value').default(0),
  offer_price_in_usdt: text('offer_price_in_usdt'),
  top_offer: real('top_offer'),
  last_sale: real('last_sale'),
  front_image_url: text('front_image_url'),
  grade: text('grade').default(''),
  grading_company: text('grading_company').default(''),
  year: integer('year').default(0),
  vault_location: text('vault_location').default(''),
  language: text('language').default(''),
  serial: text('serial'),
  offers_updated_at: text('offers_updated_at'),
  gemrate_id: text('gemrate_id'),
  status: text('status').default('listed'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

// snkrdunk_prices - SNKRDUNK price data (isolated from Renaiss sync)
const snkrdunkPrices = pgTable('snkrdunk_prices', {
  token_id: text('token_id').primaryKey(),
  snkrdunk_price: real('snkrdunk_price'),
  snkrdunk_last_sale: real('snkrdunk_last_sale'),
  snkrdunk_product_id: bigint('snkrdunk_product_id', { mode: 'number' }),
  snkrdunk_product_url: text('snkrdunk_product_url'),
  snkrdunk_updated_at: text('snkrdunk_updated_at'),
  updated_at: timestamp('updated_at').defaultNow(),
})

// pricecharting_prices - PriceCharting price data (isolated from Renaiss sync)
const pricechartingPrices = pgTable('pricecharting_prices', {
  token_id: text('token_id').primaryKey(),
  pricecharting_last_sale: real('pricecharting_last_sale'),
  pricecharting_url: text('pricecharting_url'),
  pricecharting_updated_at: text('pricecharting_updated_at'),
  updated_at: timestamp('updated_at').defaultNow(),
})

// sync_status - track sync operations
const syncStatus = pgTable('sync_status', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  total_cards: integer('total_cards').default(0),
  updated_cards: integer('updated_cards').default(0),
  failed_cards: integer('failed_cards').default(0),
  last_sync_at: text('last_sync_at'),
  metadata: text('metadata'),
})

module.exports = { collectibles, snkrdunkPrices, pricechartingPrices, syncStatus }
