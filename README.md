
# 📈 Renaiss Market Arbitrage & Maker (跨平台做市套利系统)

<p align="left">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-4.2-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

> 宝可梦卡牌跨平台套利检测工具。实时监控 [Renaiss Marketplace](https://www.renaiss.xyz)、SNKRDUNK、PriceCharting 三大平台的卡牌价格数据，自动发现**套利机会**，挖掘隐藏在 Renaiss 交易市场中价值 **2.4 万U的金矿**。

<div align="center">
  
**[👉 立即注册 Renaiss (邀请链接)](https://www.renaiss.xyz/ref/blueskyone)** | **[🐦 Follow @blueskylh1](https://twitter.com/intent/user?screen_name=blueskylh1)** | **[📖 使用教程](https://x.com/blueskylh1/status/2052038486832959629)** | **[🌐 直达已部署网站](https://bluesky-renaiss-market-maker2.napa.de5.net/)**

</div>

---

![Demo](screenshot.png)

## 📑 目录 (Table of Contents)

- [功能概览 (Features)](#-功能概览-features)
- [技术栈 (Tech Stack)](#-技术栈-tech-stack)
- [快速开始 (Quick Start)](#-快速开始-quick-start)
- [项目结构 (Project Structure)](#-项目结构-project-structure)
- [API 端点 (API Endpoints)](#-api-端点-api-endpoints)
- [数据同步 (Data Synchronization)](#-数据同步-data-synchronization)
- [同步策略与增量机制 (Sync Strategy)](#-同步策略与增量机制-sync-strategy)
- [数据库设计 (Database Schema)](#-数据库设计-database-schema)
- [数据源详解 (Data Sources)](#-数据源详解-data-sources)
- [MiMo 视觉分析 (AI Vision Analysis)](#-mimo-视觉分析-ai-vision-analysis)
- [价格匹配算法 (Matching Algorithm)](#-价格匹配算法-matching-algorithm)
- [套利计算 (Arbitrage Calculation)](#-套利计算-arbitrage-calculation)
- [前端功能 (Frontend Features)](#-前端功能-frontend-features)
- [定时任务 (Cron Jobs)](#-定时任务-cron-jobs)
- [代理与限速 (Proxy & Rate Limits)](#-代理与限速-proxy--rate-limits)
- [部署 (Deployment)](#-部署-deployment)
- [故障排查 (Troubleshooting)](#-故障排查-troubleshooting)

---

## ✨ 功能概览 (Features)

- **🔄 跨平台价差监控**：实时比较 Renaiss 挂牌价与 SNKRDUNK / PriceCharting 市场价，计算折扣率和套利空间。
- **🤖 AI 卡牌识别**：使用小米 MiMo-V2.5 视觉模型分析卡牌图片，自动生成日文（SNKRDUNK）和英文（PriceCharting）搜索关键词。
- **⚡ 增量同步**：每日自动检测新增卡牌并同步价格，避免重复处理已同步的卡牌。
- **🌍 多语言界面**：支持中文简体、中文繁体、English、한국어、日本語。
- **💱 多币种显示**：USD、CNY、JPY、KRW、MYR（实时汇率）。
- **🎯 高级筛选**：按折扣率、价格区间、语言、评级公司、流动性等多维度筛选。
- **⚙️ 列自定义**：13 个数据列均可独立显示/隐藏。
- **👻 骨架屏加载**：数据加载时展示骨架屏动画，避免页面闪烁。

---

## 🛠️ 技术栈 (Tech Stack)

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 18.3.1 |
| **前端构建** | Vite | 6.4.1 |
| **前端样式** | Tailwind CSS | 4.2.2 |
| **后端框架** | Express | 4.22.1 |
| **运行时** | Node.js | 20+ |
| **数据库** | PostgreSQL | 16+ |
| **包管理** | bun | - |
| **HTTP 代理** | Jina AI Reader | r.jina.ai |
| **AI 视觉** | MiMo-V2.5 | OpenAI 兼容 API |
| **并发控制** | 自研 Promise.all 分批 | - |
| **定时任务** | node-cron | 3.0.3 |

---

## 🚀 快速开始 (Quick Start)

### 环境要求 (Prerequisites)
- Node.js 20+
- PostgreSQL 16+
- bun（或 npm）

### 安装 (Installation)
```bash
# 后端
cd backend
bun install

# 前端
cd frontend
bun install

```

### 配置 (Configuration)

编辑 `backend/.env`：

```env
# 服务端口
BACKEND_PORT=3001

# PostgreSQL 连接
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/renaiss_market

# Renaiss API
RENAISS_API_URL=[https://www.renaiss.xyz](https://www.renaiss.xyz)

# 启用定时任务
CRON_ENABLED=true

# 可选：HTTP 代理（用于突破 Jina AI 限速）
# 不设置则使用内置 20 RPM 限速队列
HTTPS_PROXY=http://user:pass@proxy-host:port

```

### 运行 (Run)

```bash
# 启动后端
cd backend && node server.js

# 启动前端（开发模式）
cd frontend && npx vite

```

> **注:** 生产环境由 Express 直接提供前端静态文件，无需单独启动前端服务。前端构建产物在 `frontend/dist/`。

### 构建前端 (Build)

```bash
cd frontend && bun run build

```

---

## 📂 项目结构 (Project Structure)

```text
├── frontend/                          # 前端项目
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx               # 主页面（1900+ 行，含内联翻译）
│   │   ├── lib/
│   │   │   └── api.ts                 # API 请求工具
│   │   ├── App.tsx                    # 入口组件
│   │   ├── entry-client.tsx           # 客户端挂载点
│   │   ├── entry-server.tsx           # SSR 入口
│   │   ├── ErrorBoundary.tsx          # 错误边界
│   │   └── index.css                  # 全局样式（暗色主题、骨架屏、价格高亮）
│   ├── public/                        # 静态资源（头像、Logo）
│   ├── vite.config.ts                 # Vite 配置（代理、别名）
│   ├── tsconfig.json
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
│   │   ├── arbitrage.js               # 套利计算
│   │   └── exchange.js                # 汇率 API
│   ├── lib/
│   │   ├── concurrency.js             # Promise.all 分批并发控制
│   │   ├── jinaFetch.js               # Jina AI 代理请求 + 限速队列
│   │   └── mimo.js                    # MiMo-V2.5 视觉分析（图片→搜索词）
│   ├── scripts/
│   │   └── check-env.js               # 环境变量检查
│   ├── .env.example                   # 环境变量模板
│   └── package.json
│
├── .gitignore
├── CLAUDE.md                          # 项目指令文件
└── README.md                          # 本文件

```

---

## 🔌 API 端点 (API Endpoints)

### 系统

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查，返回 `{ status: 'ok', timestamp }` |
| GET | `/api` | API 信息与端点列表 |

### 数据查询

| 方法 | 路径 | 参数 | 返回 |
| --- | --- | --- | --- |
| GET | `/api/stats` | - | `{ total, totalValue, withAskPrice, snkrdunkCount, lastSync }` |
| GET | `/api/collectibles` | `limit`(默认100), `offset`(0), `language`, `search`, `hasAskPrice`(默认true), `status`(默认'listed'), `grade`, `minPrice`, `maxPrice` | `{ collection: [...], total }` |
| GET | `/api/collectibles/:tokenId` | - | 单张卡牌完整数据（404 if not found） |
| GET | `/api/exchange/rates` | - | `{ base: 'USD', rates: { USD, CNY, JPY, KRW, HKD, TWD, SGD, EUR, GBP } }` |

### 同步操作

| 方法 | 路径 | Body | 说明 |
| --- | --- | --- | --- |
| POST | `/api/sync/collectibles` | - | 从 Renaiss 全量同步（最多 5000 张） |
| POST | `/api/snkrdunk/sync-all` | `{ limit, concurrency }` | 全量同步 SNKRDUNK（所有语言） |
| POST | `/api/pricecharting/sync-all` | `{ limit, concurrency }` | 全量同步 PriceCharting（所有语言） |
| POST | `/api/combined/sync-all` | `{ limit, concurrency }` | 组合全量同步（MiMo 共享，SN + PC） |
| POST | `/api/combined/sync-incremental` | `{ limit, concurrency }` | 增量同步（仅新增卡牌） |
| GET | `/api/sync/status` | - | 最近一次各数据源的同步状态 |

### 套利分析

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/arbitrage` | `threshold`(默认0.85) | 套利机会 TOP 50 |

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

## 📡 数据同步 (Data Synchronization)

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
| --- | --- | --- | --- |
| Renaiss | ~10s | ~30s | 并发 10，直接 API |
| SNKRDUNK | ~5min | ~25min | 需 MiMo + Jina 抓取，限速 20 RPM |
| PriceCharting | ~3min | ~15min | 需 MiMo + Jina 抓取，限速 20 RPM |
| 组合同步 | ~5min | ~25min | MiMo 共享 |

> 注：同步采用游标分批加载（每批 50 张），内存占用恒定，不会随卡牌数量增长。

---

## 🏗️ 同步策略与增量机制 (Sync Strategy)

### 三层同步架构

```text
┌─────────────────────────────────────────────────────┐
│  Renaiss + 增量 SN+PC 同步（每小时）                     │
│  api.renaiss.xyz → collectibles 表                    │
│  + 仅新增卡牌 → MiMo → SN + PC → 独立价格表             │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  全量 SN+PC 同步（每周一 00:00）                        │
│  所有已上市卡牌 → MiMo → SN(日版) + PC(全部)           │
│  覆盖写入 snkrdunk_prices / pricecharting_prices     │
└─────────────────────────────────────────────────────┘

```

### 增量判定逻辑

每张卡的同步状态通过 `snkrdunk_prices` 和 `pricecharting_prices` 表的 `token_id` 主键记录：

* **无记录**（`s.token_id IS NULL` 或 `p.token_id IS NULL`）→ 需要同步
* **有记录**（无论价格是否为 NULL）→ 已同步，跳过
这意味着同步失败（搜不到产品、价格无效等）也会写入一条 NULL 价格记录，避免下次重复处理。

### 失败即写入策略

以下场景均会写入 NULL 价格记录 + `updated_at` 时间戳：

**SNKRDUNK 失败场景**：

* 搜不到产品（所有搜索词均无结果）
* 匹配分数不够（< 100 分）
* 无价格数据（无 lastSale 且无 currentPrice）
* 非日版卡（跳过 SN 同步）

**PriceCharting 失败场景**：

* 无卡牌名称
* 所有搜索词均未匹配到产品

---

## 🗄️ 数据库设计 (Database Schema)

### 表关系

```text
collectibles (主表)
  │
  ├── LEFT JOIN ──→ snkrdunk_prices     (token_id PK)
  │
  └── LEFT JOIN ──→ pricecharting_prices (token_id PK)

sync_status (独立表，记录同步历史)

```

### `collectibles` 表（Renaiss 卡牌主数据）

| 列名 | 类型 | 说明 |
| --- | --- | --- |
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

*索引：`idx_collectibles_status`（status）、`idx_collectibles_ask_price`（ask_price_in_usdt）*

### `snkrdunk_prices` & `pricecharting_prices`

*(对应平台的挂牌价、最近成交价、产品链接、30天成交量及同步时间戳，均以 `token_id` 关联主表。)*

---

## 🌐 数据源详解 (Data Sources)

### 1. Renaiss

* **API**: `https://api.renaiss.xyz/v0/marketplace`
* **同步频率**: 每小时
* **数据内容**: 挂牌价（ask price）、公允市场价值（FMV）、最高出价（top offer）、最近成交价
* **价格转换**: askPrice 从 wei（÷1e18）转 USDT，FMV 从分（÷100）转美元
* **状态管理**: 同步后不在本次列表中的卡牌标记为 `unlisted`

### 2. SNKRDUNK

* **平台**: `snkrdunk.com`（日本卡牌交易平台）
* **搜索方式**: MiMo 生成搜索词 → 非日版卡追加语言标签 → Jina AI 抓取 SNKRDUNK 搜索页 → 正则提取
* **搜索词优先级**: AI 推荐 > 剔除 variant > 保留 variant+bracket > 去掉 set_code 尾字母
* **价格匹配**: 卡号硬筛选 + 语言标签筛选 + 成交价获取 + FMV 0.25~4x 范围校验

### 3. PriceCharting

* **平台**: `pricecharting.com`（多语言卡牌价格参考）
* **搜索优先级**: 结构化字段 > MiMo 生成英文搜索词 > 旧正则逻辑兜底
* **搜索词变体**: 自动生成精确、智能、精简等多维度组合。
* **价格选择**: 根据评级公司 + 等级精确匹配（向下兼容，如 CGC 8.5 → grade8.5 → grade8）。

### 4. 汇率 (Exchange Rates)

* **API**: `https://open.er-api.com/v6/latest/USD`
* **缓存**: 5 分钟
* **兜底**: API 不可用时使用硬编码汇率（CNY 7.25, JPY 155等）。

---

## 👁️ MiMo 视觉分析 (AI Vision Analysis)

使用小米 MiMo-V2.5 多模态模型分析卡牌图片，自动识别卡牌信息并生成搜索关键词。

* **Endpoint**: `https://token-plan-cn.xiaomimimo.com/v1`（OpenAI 兼容）
* **Model**: `mimo-v2.5`
* **容错机制**: JSON 自动修复、正则备选提取、无图文本降级。
* **生成搜索词策略**: 优先 AI 推荐，自动拼接多维度变体（含非日版语言标签追加）。

---

## ⚖️ 价格匹配与套利算法 (Algorithm)

### 反错配校验 (FMV 范围校验)

**SNKRDUNK** & **PriceCharting**：
获取外部价格后，如果 `外部价格 / fmvPrice < 0.25` 或 `外部价格 / fmvPrice > 4.0`（偏差超 4/5 倍），则判定为数据错配，拒绝写入并跳过。

### 套利空间与折扣率

* **折扣率** = `((市场价格 - 挂牌价) / 市场价格) × 100` (正值代表有套利空间)
* **套利空间** = `市场价 - 挂牌价 - 邮费`

套利机会接口 (`GET /api/arbitrage?threshold=0.85`) 自动筛选 `askPrice / max(SN, PC) < threshold` 的卡牌，并按利润降序返回 TOP 50。

---

## 💻 前端功能 (Frontend Features)

* **单页面控制台布局**: 包含数据总览、工具栏、高级筛选面板和自适应数据表格。
* **13 列全景数据**: 缩略图、多维度价格、多维度折扣率与套利空间计算，均可独立配置显示。
* **高级筛选**: 支持 FMV 折扣区间、价格区间、语言/评级公司多选。
* **骨架屏 & 灯箱**: 优化数据加载体验，支持大图全屏查看。

---

## ⏱️ 定时任务 (Cron Jobs)

当 `CRON_ENABLED=true` 时启用：

| 时间 | Cron 表达式 | 任务 | 说明 |
| --- | --- | --- | --- |
| 每小时 | `0 * * * *` | Renaiss + 增量同步 | 拉取 Renaiss 数据 + 同步新增卡牌的 SN/PC 价格 |
| 每周一 00:00 | `0 0 * * 1` | 全量 SN+PC 同步 | MiMo + SNKRDUNK + PriceCharting 全量同步 |

---

## 🛡️ 代理与限速 (Proxy & Rate Limits)

所有外部抓取通过 **Jina AI Reader (`r.jina.ai`)** 代理，绕过 Cloudflare。

* **无代理模式**: 内置队列严格控制 20 请求/分钟，防封锁。
* **有代理模式**: 配置 `HTTPS_PROXY` 后自动解除请求限速，适合规模化同步。

---

## 📦 部署与排查 (Deployment & Troubleshooting)

### 服务器部署 (使用 tmux)

```bash
tmux new-session -d -s srv 'cd /opt/renaiss-market/backend && node server.js > app.log 2>&1'
# 查看日志
tail -f /opt/renaiss-market/backend/app.log

```

### 常见问题排查

1. **同步无数据**: 检查 PostgreSQL 连接日志、Jina 代理限速状态。
2. **SNKRDUNK 同步慢**: 正常现象（20 RPM 限速），如需提速请配置 `HTTPS_PROXY` 轮换 IP。
3. **MiMo 分析失败**: 检查 `MIMO_API_KEY`。

---

*Built with ⚡ by [blueskylh*](https://github.com/blueskylh)

```

