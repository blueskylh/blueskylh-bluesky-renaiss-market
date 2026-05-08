# Renaiss Market Maker

Pokemon card arbitrage detection system deployed in Surf Studio container.

## Architecture

- **Frontend**: Vite 6 + React 18 + Tailwind CSS + react-router-dom (port from PORT env, default 5173)
- **Backend**: Express 4 via @surf-ai/sdk + JavaScript ESM (port from BACKEND_PORT env, default 3001)
- **Database**: Container built-in PostgreSQL via @surf-ai/sdk dbQuery (raw SQL)
- **Package Manager**: bun

## API Endpoints

- `GET /api/stats` - System statistics
- `GET /api/collectibles` - List cards (supports limit, offset, language, search, grade, minPrice, maxPrice)
- `GET /api/collectibles/:tokenId` - Single card detail
- `POST /api/sync/collectibles` - Sync from Renaiss API
- `POST /api/snkrdunk/sync-all` - Sync SNKRDUNK prices
- `POST /api/pricecharting/sync-all` - Sync PriceCharting prices
- `GET /api/arbitrage` - Arbitrage opportunities
- `GET /api/exchange/rates` - Exchange rates
- `GET /api/sync/status` - Last sync status

## Data Sources

- **Renaiss API** (`api.renaiss.xyz`): Hourly sync, real-time ask/offer prices
- **SNKRDUNK** (`snkrdunk.com/search`): Web search via r.jina.ai + trading-histories API for last sale prices. Full sync (~2h) filters by card number and FMV 0.25~4x range.
- **PriceCharting** (`pricecharting.com`): Daily sync via r.jina.ai proxy + direct fallback
- **Exchange Rates** (`open.er-api.com`): 5-min cache

## Cron Jobs (when CRON_ENABLED=true)

- Renaiss sync: every hour (`0 * * * *`)
- SNKRDUNK sync: daily at midnight (`0 0 * * *`)
- PriceCharting sync: daily at noon (`0 12 * * *`)

## Development

```bash
# Frontend
cd frontend && bun install && bun run dev

# Backend
cd backend && bun install && bun run dev
```

## i18n

5 languages: zh-CN, zh-TW, en, ko, ja
