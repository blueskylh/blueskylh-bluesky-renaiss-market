# Renaiss Market Maker

宝可梦卡牌跨平台套利检测工具，实时监控 Renaiss、SNKRDUNK、PriceCharting 三大平台的价格数据，自动发现套利机会。

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 端点](#api-端点)
- [数据同步](#数据同步)
- [同步策略与增量机制](#同步策略与增量机制)
- [数据库设计](#数据库设计)
- [数据源详解](#数据源详解)
- [MiMo 视觉分析](#mimo-视觉分析)
- [价格匹配算法](#价格匹配算法)
- [套利计算](#套利计算)
- [前端功能](#前端功能)
- [定时任务](#定时任务)
- [代理与限速](#代理与限速)
- [部署](#部署)
- [故障排查](#故障排查)

---

## 功能概览

- **跨平台价差监控**：实时比较 Renaiss 挂牌价与 SNKRDUNK / PriceCharting 市场价，计算折扣率和套利空间
- **AI 卡牌识别**：使用小米 MiMo-V2.5 视觉模型分析卡牌图片，自动生成日文（SNKRDUNK）和英文（PriceCharting）搜索关键词
- **增量同步**：每日自动检测新增卡牌并同步价格，避免重复处理已同步的卡牌
- **多语言界面**：中文简体、中文繁体、English、한국어、日本語
- **多币种显示**：USD、CNY、JPY、KRW（实时汇率）
- **高级筛选**：按折扣率、价格区间、语言、评级公司、流动性等多维度筛选
- **列自定义**：13 个数据列均可独立显示/隐藏
- **骨架屏加载**：数据加载时展示骨架屏动画，避免页面闪烁

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.3.1 |
| 前端构建 | Vite | 6.4.1 |
| 前端样式 | Tailwind CSS | 4.2.2 |
| 后端框架 | Express | 4.22.1 |
| 运行时 | Node.js | 20+ |
| 数据库 | PostgreSQL | 16+ |
| 包管理 | bun | - |
| HTTP 代理 | Jina AI Reader | r.jina.ai |
| AI 视觉 | MiMo-V2.5 | OpenAI 兼容 API |
| 并发控制 | 自研 Promise.all 分批 | - |
| 定时任务 | node-cron | 3.0.3 |

---

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 16+
- bun（或 npm）

### 安装

```bash
# 后端
cd backend
bun install

# 前端
cd frontend
bun install
```

### 配置

编辑 `backend/.env`：

```env
# 服务端口
BACKEND_PORT=3001

# PostgreSQL 连接
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/renaiss_market

# Renaiss API
RENAISS_API_URL=https://www.renaiss.xyz

# 启用定时任务
CRON_ENABLED=true

# 可选：HTTP 代理（用于突破 Jina AI 限速）
# 不设置则使用内置 20 RPM 限速队列
HTTPS_PROXY=http://user:pass@proxy-host:port
```

### 运行

```bash
# 启动后端
cd backend && node server.js

# 启动前端（开发模式）
cd frontend && npx vite
```

生产环境由 Express 直接提供前端静态文件，无需单独启动前端服务。前端构建产物在 `frontend/dist/`。

### 构建前端

```bash
cd frontend && bun run build
```

---

## 项目结构

```
├── frontend/                          # 前端项目
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx               # 主页面（1900+ 行，含内联翻译）
│   │   ├── lib/
│   │   │   └── api.ts                 # API 请求工具
│   │   ├── App.tsx                    # 入口组件
│   │   ├── main.tsx                   # React 挂载点
│   │   └── index.css                  # 全局样式（暗色主题、骨架屏、价格高亮）
│   ├── vite.config.ts                 # Vite 配置（代理、别名）
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                           # 后端项目
│   ├── server.js                      # Express 入口 + 路由挂载 + 定时任务
│   ├── db/
│   │   ├── index.js                   # 数据库操作层（查询、写入、LEFT JOIN）
│   │   └── schema.js                  # 表结构定义
│   ├── routes/
│   │   ├── sync.js                    # Renaiss 数据同步
│   │   ├── combined.js                # 组合同步（SNKRDUNK + PriceCharting）
│   │   ├── snkrdunk.js                # SNKRDUNK 价格同步
│   │   ├── pricecharting.js           # PriceCharting 价格同步
│   │   ├── arbitrage.js               # 套利计算与流动性分析
│   │   └── exchange.js                # 汇率 API
│   ├── lib/
│   │   ├── concurrency.js             # Promise.all 分批并发控制
│   │   ├── jinaFetch.js               # Jina AI 代理请求 + 限速队列
│   │   └── mimo.js                    # MiMo-V2.5 视觉分析（图片→搜索词）
│   ├── .env                           # 环境变量
│   └── package.json
│
├── CLAUDE.md                          # 项目指令文件
└── README.md                          # 本文件
```

---

## API 端点

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查，返回 `{ status: 'ok', timestamp }` |
| GET | `/api` | API 信息与端点列表 |

### 数据查询

| 方法 | 路径 | 参数 | 返回 |
|------|------|------|------|
| GET | `/api/stats` | - | `{ total, totalValue, withAskPrice, snkrdunkCount, lastSync }` |
| GET | `/api/collectibles` | `limit`(默认100), `offset`(0), `language`, `search`, `hasAskPrice`(默认true), `status`(默认'listed'), `grade`, `minPrice`, `maxPrice` | `{ collection: [...], total }` |
| GET | `/api/collectibles/:tokenId` | - | 单张卡牌完整数据（404 if not found） |
| GET | `/api/exchange/rates` | - | `{ base: 'USD', rates: { USD, CNY, JPY, KRW, HKD, TWD, SGD, EUR, GBP } }` |

### 同步操作

| 方法 | 路径 | Body | 说明 |
|------|------|------|------|
| POST | `/api/sync/collectibles` | - | 从 Renaiss 全量同步（最多 5000 张） |
| POST | `/api/snkrdunk/sync-all` | `{ limit, concurrency }` | 全量同步 SNKRDUNK（所有语言） |
| POST | `/api/pricecharting/sync-all` | `{ limit, concurrency }` | 全量同步 PriceCharting（所有语言） |
| POST | `/api/combined/sync-all` | `{ limit, concurrency }` | 组合全量同步（MiMo 共享，SN + PC） |
| POST | `/api/combined/sync-incremental` | `{ limit, concurrency }` | 增量同步（仅新增卡牌） |
| GET | `/api/sync/status` | - | 最近一次各数据源的同步状态 |

### 套利分析

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/api/arbitrage` | `threshold`(默认0.85) | 套利机会 TOP 50 |
| GET | `/api/liquidity` | - | 流动性数据（同 `/api/arbitrage/liquidity`） |

### 同步接口返回格式

**Renaiss 同步** (`/api/sync/collectibles`):
```json
{ "success": true, "updated": 1283, "failed": 0, "total": 1283, "pagesProcessed": 13, "hasMore": false }
```

**组合同步** (`/api/combined/sync-all`):
```json
{
  "success": true, "total": 500,
  "snkrdunk": { "updated": 320, "failed": 180 },
  "pricecharting": { "updated": 450, "failed": 50 },
  "errors": []
}
```

**增量同步** (`/api/combined/sync-incremental`):
```json
{
  "success": true, "total": 3,
  "snkrdunk": { "updated": 1, "failed": 0 },
  "pricecharting": { "updated": 2, "failed": 0 },
  "errors": []
}
```

---

## 数据同步

### 组合同步（推荐）

每张卡只调用一次 MiMo 视觉分析，结果在 SNKRDUNK 和 PriceCharting 之间共享：

```bash
# 全量组合同步（最多 5000 张，并发 2）
curl -X POST http://localhost:3001/api/combined/sync-all \
  -H "Content-Type: application/json" \
  -d '{"limit":5000,"concurrency":2}'

# 增量组合同步（snkrdunk_prices 或 pricecharting_prices 中任一缺失记录的卡牌）
curl -X POST http://localhost:3001/api/combined/sync-incremental \
  -H "Content-Type: application/json" \
  -d '{"limit":5000,"concurrency":2}'
```

### 单独同步

```bash
# 仅同步 Renaiss 卡牌数据
curl -X POST http://localhost:3001/api/sync/collectibles

# 仅同步 SNKRDUNK 价格
curl -X POST http://localhost:3001/api/snkrdunk/sync-all \
  -H "Content-Type: application/json" \
  -d '{"limit":500,"concurrency":2}'

# 仅同步 PriceCharting 价格
curl -X POST http://localhost:3001/api/pricecharting/sync-all \
  -H "Content-Type: application/json" \
  -d '{"limit":200,"concurrency":1}'
```

### 同步速度参考

| 同步类型 | 100 张卡 | 500 张卡 | 说明 |
|----------|----------|----------|------|
| Renaiss | ~10s | ~30s | 并发 10，直接 API |
| SNKRDUNK | ~5min | ~25min | 需 MiMo + Jina 抓取，限速 20 RPM |
| PriceCharting | ~3min | ~15min | 需 MiMo + Jina 抓取，限速 20 RPM |
| 组合同步 | ~5min | ~25min | MiMo 共享 |

> 注：同步采用游标分批加载（每批 50 张），内存占用恒定，不会随卡牌数量增长。

---

## 同步策略与增量机制

### 三层同步架构

```
┌─────────────────────────────────────────────────────┐
│  Renaiss 同步（每小时）                                │
│  api.renaiss.xyz → collectibles 表                    │
│  只写 Renaiss 自有数据，不碰 SNKRDUNK/PC               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  全量 SN+PC 同步（每周一 00:00）                       │
│  所有已上市卡牌 → MiMo → SN(日版) + PC(全部)          │
│  覆盖写入 snkrdunk_prices / pricecharting_prices     │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  增量 SN+PC 同步（每天 03:00）                         │
│  仅新增卡牌（无 snkrdunk_prices 或无 pricecharting_prices 记录）│
│  MiMo → SN(日版) + PC(全部) → 写入独立价格表           │
└─────────────────────────────────────────────────────┘
```

### 增量判定逻辑

每张卡的同步状态通过 `snkrdunk_prices` 和 `pricecharting_prices` 表的 `token_id` 主键记录：

- **无记录**（`s.token_id IS NULL` 或 `p.token_id IS NULL`）→ 需要同步
- **有记录**（无论价格是否为 NULL）→ 已同步，跳过

这意味着同步失败（搜不到产品、价格无效等）也会写入一条 NULL 价格记录，避免下次重复处理。

### 失败即写入策略

以下场景均会写入 NULL 价格记录 + `updated_at` 时间戳：

**SNKRDUNK 失败场景**：
- 搜不到产品（所有搜索词均无结果）
- 匹配分数不够（< 100 分）
- 无价格数据（无 lastSale 且无 currentPrice）
- 非日版卡（跳过 SN 同步）

**PriceCharting 失败场景**：
- 无卡牌名称
- 所有搜索词均未匹配到产品

---

## 数据库设计

### 表关系

```
collectibles (主表)
  │
  ├── LEFT JOIN ──→ snkrdunk_prices     (token_id PK)
  │
  └── LEFT JOIN ──→ pricecharting_prices (token_id PK)

sync_status (独立表，记录同步历史)
```

### `collectibles` 表（Renaiss 卡牌主数据）

| 列名 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| token_id | TEXT UNIQUE | Renaiss token ID |
| name | TEXT | 卡牌名称 |
| set_name | TEXT | 系列名称 |
| card_number | TEXT | 卡牌编号 |
| pokemon_name | TEXT | 宝可梦名称（结构化） |
| owner_address | TEXT | 持有者钱包地址 |
| ask_price_in_usdt | REAL | 挂牌价（USDT） |
| fmv_price_in_usd | REAL | 公允市场价值（USD） |
| buyback_base_value | REAL | 回购基准价 |
| offer_price_in_usdt | TEXT | 出价（文本类型） |
| top_offer | REAL | 最高出价 |
| last_sale | REAL | 最近成交价 |
| front_image_url | TEXT | 卡牌正面图 URL |
| grade | TEXT | 评级（如 "10"） |
| grading_company | TEXT | 评级公司（PSA/CGC/BGS） |
| year | INTEGER | 年份 |
| vault_location | TEXT | 保管库位置 |
| language | TEXT | 语言（Japanese/English/Chinese/Korean） |
| serial | TEXT | 序列号 |
| status | TEXT | listed / unlisted |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

索引：`idx_collectibles_status`（status）、`idx_collectibles_ask_price`（ask_price_in_usdt）

### `snkrdunk_prices` 表

| 列名 | 类型 | 说明 |
|------|------|------|
| token_id | TEXT PK | 关联 collectibles.token_id |
| snkrdunk_price | REAL | SNKRDUNK 挂牌价（USD） |
| snkrdunk_last_sale | REAL | 最近成交价（USD） |
| snkrdunk_product_id | BIGINT | 产品 ID |
| snkrdunk_product_url | TEXT | 产品链接 |
| snkrdunk_updated_at | TEXT | 同步时间 |
| snkrdunk_volume_30d | INTEGER | 30 天成交量 |
| updated_at | TIMESTAMPTZ | 记录更新时间 |

### `pricecharting_prices` 表

| 列名 | 类型 | 说明 |
|------|------|------|
| token_id | TEXT PK | 关联 collectibles.token_id |
| pricecharting_last_sale | REAL | 匹配到的价格（USD） |
| pricecharting_url | TEXT | 产品链接 |
| pricecharting_updated_at | TEXT | 同步时间 |
| pricecharting_volume_30d | INTEGER | 30 天成交量 |
| updated_at | TIMESTAMPTZ | 记录更新时间 |

### `sync_status` 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| source | TEXT | renaiss / snkrdunk / pricecharting / combined / incremental |
| total_cards | INTEGER | 处理卡牌数 |
| updated_cards | INTEGER | 成功更新数 |
| failed_cards | INTEGER | 失败数 |
| last_sync_at | TEXT | ISO 时间戳 |
| metadata | TEXT | JSON 元数据 |

---

## 数据源详解

### Renaiss

- **API**: `https://api.renaiss.xyz/v0/marketplace`
- **同步频率**: 每小时
- **数据内容**: 挂牌价（ask price）、公允市场价值（FMV）、最高出价（top offer）、最近成交价
- **价格转换**: askPrice 从 wei（÷1e18）转 USDT，FMV 从分（÷100）转美元
- **卡牌图**: 通过 `https://www.renaiss.xyz/api/trpc/collectible.list` 获取（30 分钟缓存）
- **状态管理**: 同步后不在本次列表中的卡牌标记为 `unlisted`

### SNKRDUNK

- **平台**: `snkrdunk.com`（日本卡牌交易平台）
- **语言限制**: 无（所有语言，非日版卡搜索词自动添加语言标签：英語版/中国語版/韓国語版）
- **搜索方式**: MiMo 生成搜索词（4 级优先级）→ 非日版卡追加语言标签 → Jina AI 抓取 SNKRDUNK 搜索页 → 正则提取产品
- **搜索词优先级**:
  1. AI 推荐的 `snkrdunk_queries`（去 variant "none"）
  2. 剔除 variant（如 `ピカチュウ SAR[x]` → `ピカチュウ[x]`）
  3. 仅保留 variant + bracket（如 `SAR[x]`）
  4. 去掉 set_code 尾字母（如 `SV4A` → `SV4`，`SM-P` 不受影响）
- **价格匹配**: 卡号硬筛选 + 语言标签筛选 + 成交价获取 + FMV 0.25~4x 范围校验
- **币种**: 从 `priceFormat` 解析（HK$/¥/US$/NT$/₩）→ 实时汇率转 USD
- **数据内容**: 挂牌价、最近成交价、产品链接

### PriceCharting

- **平台**: `pricecharting.com`（多语言卡牌价格参考）
- **语言限制**: 无（处理所有语言）
- **搜索优先级**:
  1. 结构化字段：`pokemon_name #card_number set_name`
  2. 简化搜索：`pokemon_name #card_number`
  3. MiMo 英文搜索词兜底
  4. 旧正则逻辑兜底
- **价格选择**: 根据评级公司 + 等级精确匹配（PSA 10 → psa10，CGC 8.5 → cgc8_5 → grade8.5 → grade8 向下兼容）
- **数据内容**: 匹配价格、产品链接、30 天成交量

### 汇率

- **API**: `https://open.er-api.com/v6/latest/USD`
- **缓存**: 5 分钟
- **支持币种**: USD、CNY、JPY、KRW、HKD、TWD、SGD、EUR、GBP
- **兜底汇率**: API 不可用时使用硬编码汇率（CNY 7.25, JPY 155, KRW 1350 等）

---

## MiMo 视觉分析

使用小米 MiMo-V2.5 多模态模型分析卡牌图片，自动识别卡牌信息并生成搜索关键词。

### API 配置

- **Endpoint**: `https://token-plan-cn.xiaomimimo.com/v1`（OpenAI 兼容）
- **Model**: `mimo-v2.5`
- **请求格式**: OpenAI Chat Completions（支持 image_url 类型）

### 输入

卡牌正面图片 URL（MiMo 直接读取远程图片，无需 base64 转换）+ Renaiss 卡牌数据。

### 输出结构

```json
{
  "name_ja": "キュレムex",
  "name_en": "Kyurem ex",
  "set_name": "Black Bolt",
  "set_code": "BLK",
  "number": "165/170",
  "language": "Japanese",
  "variant": "SAR",
  "snkrdunk_queries": ["キュレムex SIR[BLK 165]", "キュレムex BLK"],
  "pc_queries": ["Kyurem ex 165 Black Bolt", "Japanese Kyurem ex 165"]
}
```

### 容错机制

1. **JSON 修复**：自动补全被截断的 JSON（未关闭的字符串、数组、对象）
2. **正则提取**：JSON 解析失败时用正则提取关键字段（name_ja, name_en, set_code, number）
3. **无图降级**：图片获取失败时，仅用文本名称进行分析

### 生成的搜索词

**SNKRDUNK（日文）**：优先使用 AI 推荐的 `snkrdunk_queries`，额外拼接 `{日文名} {变体}[{系列} {编号}]`、`{日文名} {系列}`、`{日文名}` 等变体，最多 6 个，去重。非日版卡在评级标签前自动追加语言标签：英文版 `【英語版】`、中文版 `【中国語版】`、韩文版 `【韓国語版】`。

**PriceCharting（英文）**：优先使用 AI 推荐的 `pc_queries`，fallback 拼接 `{英文名} {编号} {系列}`、`{英文名} {编号}`、`{英文名}`。

---

## 价格匹配算法

### SNKRDUNK 匹配（卡号 + FMV 范围校验）

对搜索结果依次进行硬筛选：

1. **卡号筛选**：产品名 `[SET NUM/TOTAL]` 或 `[SET NUM]` 中的编号必须与目标卡一致
2. **语言筛选**：非日版卡的产品名必须包含对应语言标签（【英語版】/【中国語版】/【韓国語版】）
3. **成交价获取**：调用 trading-histories API 获取最近成交价，按评级精确匹配
4. **FMV 范围校验**：成交价（USD）与 Renaiss FMV 的比值必须在 0.25~4x 范围内

任一步骤不通过即跳过该产品，尝试下一个。

### PriceCharting 匹配（评级优先）

`getBestPCPrice()` 根据卡牌评级选择价格：

```
PSA 10  → psa10 价格
CGC 10  → cgc10 价格
BGS 9.5 → bgs9.5 价格
PSA 9   → psa9 价格
CGC 8.5 → cgc8.5 → grade8.5 → grade8（向下兼容）
无评级  → ungraded 价格
```

### FMV 价格校验（反错配）

**SNKRDUNK**：获取成交价后、写入前校验，价格与 FMV 比值必须在 0.25~4x 范围内：

```
如果 salePriceUSD / fmvPrice < 0.25  或  salePriceUSD / fmvPrice > 4.0
  → 跳过该产品，尝试下一个
```

**PriceCharting**：匹配到产品后、写入前校验，偏差超 5 倍则丢弃继续尝试下一个查询。

此校验仅在 FMV > 0 时生效。例如：某卡 FMV $50，SNKRDUNK 成交价 $10（0.2x）或 $300（6x）都会被拒绝。

---

## 套利计算

### 折扣率（Discount）

```
折扣率 = ((市场价格 - 挂牌价) / 市场价格) × 100
```

- **正值**（绿色）：挂牌价低于市场价，有套利空间
- **负值**（红色）：挂牌价高于市场价，无套利机会

三个维度：
- **FMV 折扣**：以 Renaiss FMV 为市场价
- **SN 折扣**：以 SNKRDUNK 价格为市场价
- **PC 折扣**：以 PriceCharting 价格为市场价

### 套利空间（Spread）

```
套利空间 = 市场价 - 挂牌价 - 邮费
```

当前邮费为 0。正值表示潜在利润。

### 套利机会检测

`GET /api/arbitrage?threshold=0.85`：

1. 获取所有有挂牌价的卡牌
2. 计算 `combinedVol30d = snkrdunk_volume_30d + pricecharting_volume_30d`
3. 筛选 `askPrice / max(snkrdunkPrice, pcPrice) < threshold`
4. 计算 `profit = bestExternal - askPrice`，`roi = (profit / askPrice) × 100`
5. 按成交量百分位分配流动性等级
6. 按 profit 降序返回 TOP 50

### 流动性等级

基于 30 天总成交量的百分位排名：

| 等级 | 百分位 | 含义 |
|------|--------|------|
| 高 | Top 30% | 成交活跃 |
| 中 | 30%-60% | 成交一般 |
| 低 | Bottom 40% | 成交稀少 |

---

## 前端功能

### 页面布局

单页面应用，所有功能在一个页面上：

```
┌─────────────────────────────────────────────────────────────┐
│  顶栏：标题 + 语言切换（简/繁/EN/한/日）+ 货币切换           │
├──────────┬──────────┬──────────┬────────────────────────────┤
│ 上市卡数  │ 教程链接  │ 社交链接  │ 货币选择 + 更新时间        │
├──────────┴──────────┴──────────┴────────────────────────────┤
│  套利空间统计：FMV空间 | SN空间 | PC空间 | 总空间            │
├─────────────────────────────────────────────────────────────┤
│  工具栏：搜索框 | 高级筛选 | 数据口径 | 列设置              │
├─────────────────────────────────────────────────────────────┤
│  高级筛选面板（展开时）                                       │
│  FMV折扣率范围 | 挂牌价范围 | 最低出价 | 语言 | 评级公司     │
├─────────────────────────────────────────────────────────────┤
│  数据表格（13列，可横向滚动）                                 │
│  卡牌 | 挂牌价 | 出价 | FMV | SN价 | PC价 | FMV折扣 | ...   │
├─────────────────────────────────────────────────────────────┤
│  分页：首页 上一页 X / Y 下一页 末页                         │
└─────────────────────────────────────────────────────────────┘
```

### 表格列（13 列，均可独立显示/隐藏）

| 列名 | 数据 | 颜色 | 说明 |
|------|------|------|------|
| 卡牌 | 缩略图 + 名称 | - | 地区标识（JP/EN/KR/CN）、评级标识、闪电图标（出价>挂牌价） |
| Renaiss 挂牌价 | askPriceInUSDT | 蓝色 | 挂牌价 |
| 最高出价 | topOffer | 黄色 | 最高出价 |
| FMV | fmvPriceInUSD | 绿色 | 公允市场价值 |
| SN 价格 | snkrdunkPrice | 粉色 | SNKRDUNK 价格 |
| PC 价格 | pricechartingLastSale | 黄色 | PriceCharting 价格 |
| FMV 折扣 | 计算值 | 绿/红 | FMV 折扣率 |
| SN 折扣 | 计算值 | 绿/红 | SNKRDUNK 折扣率 |
| PC 折扣 | 计算值 | 绿/红 | PriceCharting 折扣率 |
| FMV 空间 | 计算值 | 粉色 | FMV 套利空间 |
| SN 空间 | 计算值 | - | SNKRDUNK 套利空间 |
| PC 空间 | 计算值 | - | PriceCharting 套利空间 |
| 操作 | 链接 | - | Renaiss 购买链接、SN 链接、PC 链接 |

### 排序

默认按 FMV 折扣率降序。支持点击表头按任意数值列排序。

### 高级筛选

- **FMV 折扣率范围**：最小/最大百分比
- **挂牌价范围**：最小/最大 USD
- **最低出价**：单值
- **卡牌语言**：JP / EN / KR / CN 多选
- **评级公司**：PSA / CGC / BGS 多选
- **其他条件**：有出价 / 有 SN 数据 / 有 PC 数据 开关

### 分页

每页 20 条。切换筛选或排序时自动回到第 1 页。

### 数据刷新

- 页面加载时获取数据
- 每 6 小时自动刷新
- 手动刷新：浏览器刷新

### 骨架屏加载

数据加载时显示 15 行骨架屏动画（缩略图占位 + 数字占位 + 标签占位 + 按钮占位），避免页面闪烁。

### 图片灯箱

点击卡牌缩略图打开全屏灯箱查看大图。

---

## 定时任务

当 `CRON_ENABLED=true` 时启用：

| 时间 | Cron 表达式 | 任务 | 说明 |
|------|------------|------|------|
| 每小时 | `0 * * * *` | Renaiss 同步 | 从 Renaiss API 拉取最新卡牌数据 |
| 每周一 00:00 | `0 0 * * 1` | 全量 SN+PC 同步 | MiMo + SNKRDUNK + PriceCharting 全量同步 |
| 每天 03:00 | `0 3 * * *` | 增量 SN+PC 同步 | 仅同步新增卡牌（无价格记录的） |

---

## 代理与限速

### Jina AI 代理

所有对 SNKRDUNK 和 PriceCharting 的请求通过 Jina AI Reader（`r.jina.ai`）代理，绕过 Cloudflare 防护和 IP 限速。

### 限速策略

**无代理模式**（默认）：
- 20 请求/分钟（RPM）
- 最小间隔 3 秒
- 严格队列，避免并发超限
- 超限后自动等待

**有代理模式**（设置 `HTTPS_PROXY`）：
- 限速自动禁用（假定使用轮换 IP 代理）
- 适合大规模同步

### 重试机制

- 最多重试 3 次
- HTTP 429：解析 `Retry-After` 头，自动等待
- 超时：自动重试
- 指数退避

---

## 部署

### 服务器部署

```bash
# 使用 tmux 保持服务在 SSH 断开后继续运行
tmux new-session -d -s srv 'cd /opt/renaiss-market/backend && node server.js > app.log 2>&1'

# 查看实时日志（Ctrl+B D 退出，不停止服务）
tmux attach -t srv

# 查看日志（不进入 tmux）
tail -f /opt/renaiss-market/backend/app.log

# 搜索同步相关日志
grep -E "SYNC|SNKRDUNK|PRICECHARTING|INCREMENTAL|MiMo" /opt/renaiss-market/backend/app.log

# 重启服务
tmux kill-session -t srv
tmux new-session -d -s srv 'cd /opt/renaiss-market/backend && node server.js > app.log 2>&1'
```

### 前端构建部署

```bash
cd frontend && bun run build
# 构建产物在 frontend/dist/，由 Express 静态服务
```

### 数据库初始化

首次启动时自动创建表结构（`CREATE TABLE IF NOT EXISTS`），无需手动执行 SQL。

---

## 故障排查

### 同步无数据

1. 检查日志：`tail -50 app.log`
2. 确认 `DATABASE_URL` 正确：日志应显示 `PostgreSQL: configured`
3. 确认 `RENAISS_API_URL` 可达
4. 检查 Jina 代理状态：`getRateLimitStatus()` 日志

### SNKRDUNK 同步很慢

- 正常现象，每张卡需要：MiMo API 调用 (~2s) + Jina 抓取 (~2s) + 产品页面抓取 (~2s)
- 无代理模式下限速 20 RPM，500 张卡约需 25 分钟
- 设置 `HTTPS_PROXY` 可突破限速

### MiMo 分析失败

- 检查 `MIMO_API_KEY` 是否有效
- 查看日志中的 `[MiMo]` 前缀输出
- 图片获取失败会自动降级为文本分析

### 汇率获取失败

- 检查网络连通性
- 系统自动使用硬编码兜底汇率

### 端口冲突

- 检查 3001 端口：`lsof -i:3001`
- 修改 `BACKEND_PORT` 或杀掉占用进程
