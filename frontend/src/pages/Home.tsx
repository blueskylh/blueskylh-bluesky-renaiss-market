import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const translations = {
  'zh-CN': {
    title: 'Renaiss 做市商套利工具',
    listedCards: 'Renaiss上市挂牌价卡数统计',
    tutorial: '使用教程',
    arbitrageTutorial: '套利教程',
    arbitrageTutorialSub: 'ARBITRAGE DOCS',
    sbtTool: '连号SBT工具',
    sbtToolSub: 'SBT UTILITIES',
    bluesky: '蓝天',
    followBluesky: '关注蓝天|bluesky',
    registerRenaiss: '注册Renaiss',
    currency: '货币',
    lastUpdate: '更新',
    shipping: '邮费',
    advancedFilter: '高级筛选',
    searchPlaceholder: '搜索卡牌名称或 Token ID...',
    arbitrageSummary: '套利空间统计',
    totalFmvSpread: 'FMV套利空间',
    totalSnSpread: 'SN套利空间',
    totalPcSpread: 'PC套利空间',
    totalSpread: '总套利空间',
    totalSpreadHint: 'FMV空间 + SN空间 + PC空间',
    metricsDoc: '数据口径',
    columnSettings: '列设置',
    hideImages: '隐藏图片',
    showImages: '显示图片',
    card: '卡牌',
    askPrice: '挂牌价',
    offerPrice: 'Offer价',
    fmvPrice: 'FMV',
    snPrice: 'SN价格',
    pcPrice: 'PC价格',
    fmvDiscount: 'FMV折扣',
    snDiscount: 'SN折扣',
    pcDiscount: 'PC折扣',
    fmvSpread: 'FMV套利空间',
    snSpread: 'SN套利空间',
    pcSpread: 'PC套利空间',
    actions: '操作',
    loading: '加载中...',
    fmvDiscountRate: 'FMV折扣率 (%)',
    askPriceUsd: '挂牌价 (USD)',
    offerPriceMin: 'Offer价 (最小值)',
    all: '全部',
    high: '高',
    medium: '中',
    low: '低',
    cardLanguage: '卡牌语言版本',
    grader: '评级机构',
    otherConditions: '其他条件',
    hasOfferPrice: '有Offer价',
    hasSnData: '有SN数据',
    hasPcData: '有PC数据',
    resetFilter: '重置筛选',
    discountExplain: '折扣率 = (市场价 - 挂牌价) / 市场价 × 100%',
    spreadExplain: '套利空间 = 市场价 - 挂牌价 - 邮费',
    noImage: '无图',
    buyOnRenaiss: '在Renaiss购买',
    offerUp: 'Offer↑',
    noOffer: '-',
    footer: '本系统仅供参考，不构成投资建议',
    executeArbitrage: '套利',
    page: '/',
    total: '张',
    resetFilters: '重置筛选',
    applyFilters: '应用筛选',
    metricsTitle: '数据口径说明',
    metricsCollapse: '收起',
    metricsCoreMetrics: '核心指标',
    metricsDataSources: '数据来源',
    metricsDisclaimer: '免责声明',
    metricsFmv: '公平市场价',
    metricsFmvDesc: 'Renaiss 平台官方参考价格',
    metricsSpread: '套利空间',
    metricsSpreadDesc: '市场价 − 挂牌价 − 邮费',
    metricsDiscount: '折扣率',
    metricsDiscountDesc: '(市场价 − 挂牌价) / 市场价 × 100%',
    metricsSnkrdunk: 'SNKRDUNK',
    metricsSnkrdunkDesc: '通过 r.jina.ai 代理每日同步',
    metricsSnkrdunkMeta: '速率: 20 RPM | 数据源: snkrdunk.com',
    metricsPricecharting: 'PriceCharting',
    metricsPricechartingDesc: '通过 r.jina.ai 代理每日同步',
    metricsRenaiss: 'Renaiss API',
    metricsRenaissDesc: '每小时从 api.renaiss.xyz 同步',
    metricsRenaissMeta: '实时挂牌价/Offer价',
    metricsDisclaimerText: '所有计算结果仅供参考，价格数据可能存在延迟。外部价格（SN/PC）可能与实际成交价不符，交易前请自行核实。',
    metricsColumnDefinitions: '数据口径说明',
    metricsAskPrice: '挂牌价',
    metricsAskPriceDesc: 'Renaiss 市场上的卖家挂牌出售价格，不含邮费。如果为 0 则表示未挂牌出售',
    metricsOfferPrice: 'Offer 价',
    metricsOfferPriceDesc: '买家对该卡牌的最高出价，显示在 Renaiss 上作为参考',
    metricsFmvCol: '公平市场价 (FMV)',
    metricsFmvDescCol: 'Renaiss 平台提供的官方参考价格，作为套利基准',
    metricsSnPrice: 'SN 价格',
    metricsSnPriceDesc: 'SNKRDUNK 平台的市场参考价，每日同步一次',
    metricsPcPrice: 'PC 价格',
    metricsPcPriceDesc: 'PriceCharting 平台的市场参考价，每日同步一次',
    metricsFmvDiscount: 'FMV 折扣率',
    metricsFmvDiscountDesc: '(FMV - 挂牌价) / FMV × 100%，正值表示挂牌价低于 FMV',
    metricsSnDiscountCol: 'SN 折扣率',
    metricsSnDiscountDesc: '(SN价格 - 挂牌价) / SN价格 × 100%，正值表示挂牌价低于 SN 价格',
    metricsPcDiscount: 'PC 折扣率',
    metricsPcDiscountDesc: '(PC价格 - 挂牌价) / PC价格 × 100%，正值表示挂牌价低于 PC 价格',
    metricsFmvSpread: 'FMV 套利空间',
    metricsFmvSpreadDesc: 'FMV - 挂牌价 - 邮费，正值表示存在 FMV 套利机会',
    metricsSnSpreadCol: 'SN 套利空间',
    metricsSnSpreadDesc: 'SN价格 - 挂牌价 - 邮费，正值表示存在 SN 套利机会',
    metricsPcSpread: 'PC 套利空间',
    metricsPcSpreadDesc: 'PC价格 - 挂牌价 - 邮费，正值表示存在 PC 套利机会',
    metricsActions: '操作按钮',
    metricsActionsDesc: '查看卡牌详情、在 Renaiss 购买、发起 Offer',
  },
  'zh-TW': {
    title: 'Renaiss 做市商套利工具',
    listedCards: '有Renaiss掛牌價',
    tutorial: '使用教程',
    arbitrageTutorial: '套利教程',
    arbitrageTutorialSub: 'ARBITRAGE DOCS',
    sbtTool: '連號SBT工具',
    sbtToolSub: 'SBT UTILITIES',
    bluesky: '藍天',
    followBluesky: '關注藍天|BLUESKY',
    registerRenaiss: '註冊Renaiss',
    currency: '貨幣',
    lastUpdate: '更新',
    shipping: '郵費',
    advancedFilter: '高級篩選',
    searchPlaceholder: '搜尋卡牌名稱或 Token ID...',
    arbitrageSummary: '套利空間統計',
    totalFmvSpread: 'FMV套利空間',
    totalSnSpread: 'SN套利空間',
    totalPcSpread: 'PC套利空間',
    totalSpread: '總套利空間',
    totalSpreadHint: 'FMV空間 + SN空間 + PC空間',
    metricsDoc: '數據口徑',
    columnSettings: '列設置',
    hideImages: '隱藏圖片',
    showImages: '顯示圖片',
    card: '卡牌',
    askPrice: '掛牌價',
    offerPrice: 'Offer價',
    fmvPrice: 'FMV',
    snPrice: 'SN價格',
    pcPrice: 'PC價格',
    fmvDiscount: 'FMV折扣',
    snDiscount: 'SN折扣',
    pcDiscount: 'PC折扣',
    fmvSpread: 'FMV套利空间',
    snSpread: 'SN套利空间',
    pcSpread: 'PC套利空间',
    actions: '操作',
    loading: '載入中...',
    fmvDiscountRate: 'FMV折扣率 (%)',
    askPriceUsd: '掛牌價 (USD)',
    offerPriceMin: 'Offer價 (最小值)',
    all: '全部',
    high: '高',
    medium: '中',
    low: '低',
    cardLanguage: '卡牌語言版本',
    grader: '評級機構',
    otherConditions: '其他條件',
    hasOfferPrice: '有Offer價',
    hasSnData: '有SN數據',
    hasPcData: '有PC數據',
    resetFilter: '重置篩選',
    discountExplain: '折扣率 = (市場價 - 掛牌價) / 市場價 × 100%',
    spreadExplain: '套利空間 = 市場價 - 掛牌價 - 郵費',
    noImage: '無圖',
    buyOnRenaiss: '在Renaiss購買',
    offerUp: 'Offer↑',
    noOffer: '-',
    footer: '本系統僅供參考，不構成投資建議',
    page: '/',
    total: '張',
    resetFilters: '重置篩選',
    applyFilters: '應用篩選',
    executeArbitrage: '套利',
    metricsTitle: '數據口徑說明',
    metricsCollapse: '收起',
    metricsCoreMetrics: '核心指標',
    metricsDataSources: '數據來源',
    metricsDisclaimer: '免責聲明',
    metricsFmv: '公平市場價',
    metricsFmvDesc: 'Renaiss 平台官方參考價格',
    metricsSpread: '套利空間',
    metricsSpreadDesc: '市場價 − 掛牌價 − 郵費',
    metricsDiscount: '折扣率',
    metricsDiscountDesc: '(市場價 − 掛牌價) / 市場價 × 100%',
    metricsSnkrdunk: 'SNKRDUNK',
    metricsSnkrdunkDesc: '通過 r.jina.ai 代理每日同步',
    metricsSnkrdunkMeta: '速率: 20 RPM | 數據源: snkrdunk.com',
    metricsPricecharting: 'PriceCharting',
    metricsPricechartingDesc: '通過 r.jina.ai 代理每日同步',
    metricsRenaiss: 'Renaiss API',
    metricsRenaissDesc: '每小時從 api.renaiss.xyz 同步',
    metricsRenaissMeta: '即時掛牌價/Offer價',
    metricsDisclaimerText: '所有計算結果僅供參考，價格數據可能存在延遲。外部價格（SN/PC）可能與實際成交價不符，交易前請自行核實。',
    metricsColumnDefinitions: '數據口徑說明',
    metricsAskPrice: '掛牌價',
    metricsAskPriceDesc: 'Renaiss 市場上的賣家掛牌出售價格，不含郵費。如果為 0 則表示未掛牌出售',
    metricsOfferPrice: 'Offer 價',
    metricsOfferPriceDesc: '買家對該卡牌的最高出價，顯示在 Renaiss 上作為參考',
    metricsFmvCol: '公平市場價 (FMV)',
    metricsFmvDescCol: 'Renaiss 平台提供的官方參考價格，作為套利基準',
    metricsSnPrice: 'SN 價格',
    metricsSnPriceDesc: 'SNKRDUNK 平台的市場參考價，每日同步一次',
    metricsPcPrice: 'PC 價格',
    metricsPcPriceDesc: 'PriceCharting 平台的市場參考價，每日同步一次',
    metricsFmvDiscount: 'FMV 折扣率',
    metricsFmvDiscountDesc: '(FMV - 掛牌價) / FMV × 100%，正值表示掛牌價低於 FMV',
    metricsSnDiscountCol: 'SN 折扣率',
    metricsSnDiscountDesc: '(SN價格 - 掛牌價) / SN價格 × 100%，正值表示掛牌價低於 SN 價格',
    metricsPcDiscount: 'PC 折扣率',
    metricsPcDiscountDesc: '(PC價格 - 掛牌價) / PC價格 × 100%，正值表示掛牌價低於 PC 價格',
    metricsFmvSpread: 'FMV 套利空間',
    metricsFmvSpreadDesc: 'FMV - 掛牌價 - 郵費，正值表示存在 FMV 套利機會',
    metricsSnSpreadCol: 'SN 套利空間',
    metricsSnSpreadDesc: 'SN價格 - 掛牌價 - 郵費，正值表示存在 SN 套利機會',
    metricsPcSpread: 'PC 套利空間',
    metricsPcSpreadDesc: 'PC價格 - 掛牌價 - 郵費，正值表示存在 PC 套利機會',
    metricsActions: '操作按鈕',
    metricsActionsDesc: '查看卡牌詳情、在 Renaiss 購買、發起 Offer',
  },
  'en': {
    title: 'Renaiss Arbitrage Tool',
    listedCards: 'Listed Cards',
    tutorial: 'Tutorial',
    arbitrageTutorial: 'Arbitrage Guide',
    arbitrageTutorialSub: 'DOCS',
    sbtTool: 'SBT Tool',
    sbtToolSub: 'UTILITIES',
    bluesky: 'Bluesky',
    followBluesky: '关注蓝天|BLUESKY',
    registerRenaiss: 'Register Renaiss',
    currency: 'Currency',
    lastUpdate: 'Updated',
    shipping: 'Shipping',
    advancedFilter: 'Advanced Filter',
    searchPlaceholder: 'Search card name or Token ID...',
    arbitrageSummary: 'Arbitrage Summary',
    totalFmvSpread: 'FMV Spread',
    totalSnSpread: 'SN Spread',
    totalPcSpread: 'PC Spread',
    totalSpread: 'Total Spread',
    totalSpreadHint: 'FMV + SN + PC',
    metricsDoc: 'Metrics',
    columnSettings: 'Columns',
    hideImages: 'Hide Images',
    showImages: 'Show Images',
    card: 'Card',
    askPrice: 'Ask Price',
    offerPrice: 'Offer Price',
    fmvPrice: 'FMV',
    snPrice: 'SN Price',
    pcPrice: 'PC Price',
    fmvDiscount: 'FMV Discount',
    snDiscount: 'SN Discount',
    pcDiscount: 'PC Discount',
    fmvSpread: 'FMV Spread',
    snSpread: 'SN Spread',
    pcSpread: 'PC Spread',
    actions: 'Actions',
    loading: 'Loading...',
    fmvDiscountRate: 'FMV Discount (%)',
    askPriceUsd: 'Ask Price (USD)',
    offerPriceMin: 'Min Offer',
    all: 'All',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    cardLanguage: 'Card Language',
    grader: 'Grader',
    otherConditions: 'Other',
    hasOfferPrice: 'Has Offer',
    hasSnData: 'Has SN Data',
    hasPcData: 'Has PC Data',
    resetFilter: 'Reset Filter',
    discountExplain: 'Discount = (Market - Ask) / Market × 100%',
    spreadExplain: 'Spread = Market - Ask - Shipping',
    noImage: 'No Image',
    buyOnRenaiss: 'Buy on Renaiss',
    offerUp: 'Offer↑',
    noOffer: '-',
    footer: 'For reference only, not investment advice',
    page: '/',
    total: '',
    resetFilters: 'Reset Filters',
    applyFilters: 'Apply Filters',
    executeArbitrage: 'Arbitrage',
    metricsTitle: 'Data Metrics',
    metricsCollapse: 'Collapse',
    metricsCoreMetrics: 'Core Metrics',
    metricsDataSources: 'Data Sources',
    metricsDisclaimer: 'Disclaimer',
    metricsFmv: 'Fair Market Value',
    metricsFmvDesc: 'Renaiss platform official reference price',
    metricsSpread: 'Arbitrage Spread',
    metricsSpreadDesc: 'Market Price − Ask Price − Shipping',
    metricsDiscount: 'Discount Rate',
    metricsDiscountDesc: '(Market − Ask) / Market × 100%',
    metricsSnkrdunk: 'SNKRDUNK',
    metricsSnkrdunkDesc: 'Daily sync via r.jina.ai proxy',
    metricsSnkrdunkMeta: 'Rate: 20 RPM | Source: snkrdunk.com',
    metricsPricecharting: 'PriceCharting',
    metricsPricechartingDesc: 'Daily sync via r.jina.ai proxy',
    metricsRenaiss: 'Renaiss API',
    metricsRenaissDesc: 'Hourly sync from api.renaiss.xyz',
    metricsRenaissMeta: 'Real-time ask/offer prices',
    metricsDisclaimerText: 'All calculations are for reference only. Price data may have latency. External prices (SN/PC) may differ from actual transaction prices. Please verify independently before trading.',
    metricsColumnDefinitions: 'Column Definitions',
    metricsAskPrice: 'Ask Price',
    metricsAskPriceDesc: "Seller's listing price on Renaiss market, excluding shipping. 0 means not listed for sale",
    metricsOfferPrice: 'Offer Price',
    metricsOfferPriceDesc: "Buyer's highest bid for this card. Shown on Renaiss for reference",
    metricsFmvCol: 'Fair Market Value (FMV)',
    metricsFmvDescCol: "Renaiss platform's official reference price, used as arbitrage baseline",
    metricsSnPrice: 'SN Price',
    metricsSnPriceDesc: 'SNKRDUNK platform market reference price, synced daily',
    metricsPcPrice: 'PC Price',
    metricsPcPriceDesc: 'PriceCharting platform market reference price, synced daily',
    metricsFmvDiscount: 'FMV Discount Rate',
    metricsFmvDiscountDesc: '(FMV - Ask) / FMV × 100%, positive = ask below FMV',
    metricsSnDiscountCol: 'SN Discount Rate',
    metricsSnDiscountDesc: '(SN - Ask) / SN × 100%, positive = ask below SN price',
    metricsPcDiscount: 'PC Discount Rate',
    metricsPcDiscountDesc: '(PC - Ask) / PC × 100%, positive = ask below PC price',
    metricsFmvSpread: 'FMV Arbitrage Spread',
    metricsFmvSpreadDesc: 'FMV - Ask - Shipping, positive = FMV arbitrage opportunity',
    metricsSnSpreadCol: 'SN Arbitrage Spread',
    metricsSnSpreadDesc: 'SN - Ask - Shipping, positive = SN arbitrage opportunity',
    metricsPcSpread: 'PC Arbitrage Spread',
    metricsPcSpreadDesc: 'PC - Ask - Shipping, positive = PC arbitrage opportunity',
    metricsActions: 'Action Buttons',
    metricsActionsDesc: 'View card details, Buy on Renaiss, Make an Offer',
  },
  'ko': {
    title: 'Renaiss 차익거래 도구',
    listedCards: '등록된 카드',
    tutorial: '사용教程',
    arbitrageTutorial: '차익거래教程',
    arbitrageTutorialSub: '차익거래 문서',
    sbtTool: 'SBT 도구',
    sbtToolSub: 'SBT UTILITIES',
    bluesky: '블루스카이',
    followBluesky: '블루스카이 팔로우|BLUESKY',
    registerRenaiss: 'Renaiss 등록',
    currency: '통화',
    lastUpdate: '업데이트',
    shipping: '배송비',
    advancedFilter: '고급 필터',
    searchPlaceholder: '카드 이름 또는 Token ID 검색...',
    arbitrageSummary: '차익 요약',
    totalFmvSpread: 'FMV 스프레드',
    totalSnSpread: 'SN 스프레드',
    totalPcSpread: 'PC 스프레드',
    totalSpread: '총 스프레드',
    totalSpreadHint: 'FMV + SN + PC',
    metricsDoc: '지표 정의',
    columnSettings: '열 설정',
    hideImages: '이미지 숨기기',
    showImages: '이미지 표시',
    card: '카드',
    askPrice: '판매가',
    offerPrice: '오퍼 가격',
    fmvPrice: 'FMV',
    snPrice: 'SN 가격',
    pcPrice: 'PC 가격',
    fmvDiscount: 'FMV 할인',
    snDiscount: 'SN 할인',
    pcDiscount: 'PC 할인',
    fmvSpread: 'FMV 스프레드',
    snSpread: 'SN 스프레드',
    pcSpread: 'PC 스프레드',
    actions: '操作',
    loading: '로딩 중...',
    fmvDiscountRate: 'FMV 할인율 (%)',
    askPriceUsd: '판매가 (USD)',
    offerPriceMin: '최소 오퍼',
    all: '전체',
    high: '높음',
    medium: '중간',
    low: '낮음',
    cardLanguage: '카드 언어 버전',
    grader: '등급 기관',
    otherConditions: '기타 조건',
    hasOfferPrice: '오퍼 있음',
    hasSnData: 'SN 데이터 있음',
    hasPcData: 'PC 데이터 있음',
    resetFilter: '필터 초기화',
    discountExplain: '할인율 = (시장가 - 판매가) / 시장가 × 100%',
    spreadExplain: '스프레드 = 시장가 - 판매가 - 배송비',
    noImage: '이미지 없음',
    buyOnRenaiss: 'Renaiss에서 구매',
    offerUp: '오퍼↑',
    noOffer: '-',
    footer: '본 시스템은 참고용이며, 투자 조언이 아닙니다',
    page: '/',
    total: '장',
    resetFilters: '필터 초기화',
    applyFilters: '필터 적용',
    executeArbitrage: '차익',
    metricsTitle: '지표 정의',
    metricsCollapse: '접기',
    metricsCoreMetrics: '핵심 지표',
    metricsDataSources: '데이터 소스',
    metricsDisclaimer: '면책 조항',
    metricsFmv: '공정 시장 가격',
    metricsFmvDesc: 'Renaiss 플랫폼 공식 참고 가격',
    metricsSpread: '차익 스프레드',
    metricsSpreadDesc: '시장가 − 판매가 − 배송비',
    metricsDiscount: '할인율',
    metricsDiscountDesc: '(시장가 − 판매가) / 시장가 × 100%',
    metricsSnkrdunk: 'SNKRDUNK',
    metricsSnkrdunkDesc: 'r.jina.ai 프록시를 통한 일일 동기화',
    metricsSnkrdunkMeta: '속도: 20 RPM | 출처: snkrdunk.com',
    metricsPricecharting: 'PriceCharting',
    metricsPricechartingDesc: 'r.jina.ai 프록시를 통한 일일 동기화',
    metricsRenaiss: 'Renaiss API',
    metricsRenaissDesc: 'api.renaiss.xyz에서 매시간 동기화',
    metricsRenaissMeta: '실시간 판매/오퍼 가격',
    metricsDisclaimerText: '모든 계산은 참고용입니다. 가격 데이터에 지연이 있을 수 있습니다. 외부 가격(SN/PC)은 실제 거래 가격과 다를 수 있습니다. 거래 전 직접 확인하세요.',
    metricsColumnDefinitions: '지표 정의',
    metricsAskPrice: '판매가',
    metricsAskPriceDesc: 'Renaiss 마켓의 판매자 판매 가격, 배송비 미포함. 0이면 판매 등록되지 않음',
    metricsOfferPrice: '오퍼 가격',
    metricsOfferPriceDesc: '해당 카드에 대한 구매자 최고 입찰가, Renaiss에서 참고로 표시',
    metricsFmvCol: '공정 시장 가격 (FMV)',
    metricsFmvDescCol: 'Renaiss 플랫폼에서 제공하는 공식 참고 가격, 차익 기준',
    metricsSnPrice: 'SN 가격',
    metricsSnPriceDesc: 'SNKRDUNK 플랫폼 시장 참고 가격, 매일 동기화',
    metricsPcPrice: 'PC 가격',
    metricsPcPriceDesc: 'PriceCharting 플랫폼 시장 참고 가격, 매일 동기화',
    metricsFmvDiscount: 'FMV 할인율',
    metricsFmvDiscountDesc: '(FMV - 판매가) / FMV × 100%, 양수는 판매가가 FMV보다 낮음',
    metricsSnDiscountCol: 'SN 할인율',
    metricsSnDiscountDesc: '(SN - 판매가) / SN × 100%, 양수는 판매가가 SN보다 낮음',
    metricsPcDiscount: 'PC 할인율',
    metricsPcDiscountDesc: '(PC - 판매가) / PC × 100%, 양수는 판매가가 PC보다 낮음',
    metricsFmvSpread: 'FMV 차익 스프레드',
    metricsFmvSpreadDesc: 'FMV - 판매가 - 배송비, 양수는 FMV 차익 기회 존재',
    metricsSnSpreadCol: 'SN 차익 스프레드',
    metricsSnSpreadDesc: 'SN - 판매가 - 배송비, 양수는 SN 차익 기회 존재',
    metricsPcSpread: 'PC 차익 스프레드',
    metricsPcSpreadDesc: 'PC - 판매가 - 배송비, 양수는 PC 차익 기회 존재',
    metricsActions: '작업 버튼',
    metricsActionsDesc: '카드 상세 보기, Renaiss에서 구매, 오퍼 만들기',
  },
  'ja': {
    title: 'Renaiss アービトラージツール',
    listedCards: '掲載カード',
    tutorial: '使い方',
    arbitrageTutorial: 'アービトラージ教程',
    sbtTool: 'SBTツール',
    bluesky: 'ブルースカイ',
    followBluesky: 'ブルースカイをフォロー|BLUESKY',
    registerRenaiss: 'Renaiss登録',
    currency: '通貨',
    lastUpdate: '更新',
    shipping: '送料',
    advancedFilter: '詳細フィルター',
    searchPlaceholder: 'カード名またはToken IDを検索...',
    arbitrageSummary: 'アビトラ統計',
    totalFmvSpread: 'FMVスプレッド',
    totalSnSpread: 'SNスプレッド',
    totalPcSpread: 'PCスプレッド',
    totalSpread: '合計スプレッド',
    totalSpreadHint: 'FMV + SN + PC',
    metricsDoc: 'データ定義',
    columnSettings: '列設定',
    hideImages: '画像を隠す',
    showImages: '画像を表示',
    card: 'カード',
    askPrice: '出品価格',
    offerPrice: 'オファー価格',
    fmvPrice: 'FMV',
    snPrice: 'SN価格',
    pcPrice: 'PC価格',
    fmvDiscount: 'FMV割引',
    snDiscount: 'SN割引',
    pcDiscount: 'PC割引',
    fmvSpread: 'FMVスプレッド',
    snSpread: 'SNスプレッド',
    pcSpread: 'PCスプレッド',
    actions: '操作',
    loading: '読み込み中...',
    fmvDiscountRate: 'FMV割引率 (%)',
    askPriceUsd: '出品価格 (USD)',
    offerPriceMin: '最小オファー',
    all: 'すべて',
    high: '高',
    medium: '中',
    low: '低',
    cardLanguage: 'カード言語バージョン',
    grader: '鑑定機関',
    otherConditions: 'その他の条件',
    hasOfferPrice: 'オファーあり',
    hasSnData: 'SNデータあり',
    hasPcData: 'PCデータあり',
    resetFilter: 'フィルターをリセット',
    discountExplain: '割引率 = (市場価格 - 出品価格) / 市場価格 × 100%',
    spreadExplain: 'スプレッド = 市場価格 - 出品価格 - 送料',
    noImage: '画像なし',
    buyOnRenaiss: 'Renaissで購入',
    offerUp: 'オファー↑',
    noOffer: '-',
    footer: '本システムは参考用であり、投資助言ではありません',
    page: '/',
    total: '枚',
    resetFilters: 'フィルターをリセット',
    applyFilters: 'フィルター適用',
    executeArbitrage: 'アビトラ',
    metricsTitle: 'データ定義',
    metricsCollapse: '閉じる',
    metricsCoreMetrics: 'コア指標',
    metricsDataSources: 'データソース',
    metricsDisclaimer: '免責事項',
    metricsFmv: '公正市場価格',
    metricsFmvDesc: 'Renaissプラットフォーム公式参照価格',
    metricsSpread: 'アビトラスプレッド',
    metricsSpreadDesc: '市場価格 − 出品価格 − 送料',
    metricsDiscount: '割引率',
    metricsDiscountDesc: '(市場価格 − 出品価格) / 市場価格 × 100%',
    metricsSnkrdunk: 'SNKRDUNK',
    metricsSnkrdunkDesc: 'r.jina.aiプロキシによる日次同期',
    metricsSnkrdunkMeta: '速度: 20 RPM | ソース: snkrdunk.com',
    metricsPricecharting: 'PriceCharting',
    metricsPricechartingDesc: 'r.jina.aiプロキシによる日次同期',
    metricsRenaiss: 'Renaiss API',
    metricsRenaissDesc: 'api.renaiss.xyzから毎時同期',
    metricsRenaissMeta: 'リアルタイム出品/オファー価格',
    metricsDisclaimerText: 'すべての計算は参考用です。価格データに遅延がある場合があります。外部価格(SN/PC)は実際の取引価格と異なる場合があります。取引前に必ずご確認ください。',
    metricsColumnDefinitions: 'データ定義',
    metricsAskPrice: '出品価格',
    metricsAskPriceDesc: 'Renaissマーケットの出品価格（送料別）。0は未出品を示す',
    metricsOfferPrice: 'オファー価格',
    metricsOfferPriceDesc: '当該カードへの買い手最高入札価格。Renaissで参考価格として表示',
    metricsFmvCol: '公正市場価格 (FMV)',
    metricsFmvDescCol: 'Renaissプラットフォーム提供の公式参照価格。アビトラ基準',
    metricsSnPrice: 'SN 価格',
    metricsSnPriceDesc: 'SNKRDUNKプラットフォームの市場参考価格。毎日同期',
    metricsPcPrice: 'PC 価格',
    metricsPcPriceDesc: 'PriceChartingプラットフォームの市場参考価格。毎日同期',
    metricsFmvDiscount: 'FMV 割引率',
    metricsFmvDiscountDesc: '(FMV - 出品価格) / FMV × 100%、正数は出品価格がFMV以下',
    metricsSnDiscountCol: 'SN 割引率',
    metricsSnDiscountDesc: '(SN - 出品価格) / SN × 100%、正数は出品価格がSN価格以下',
    metricsPcDiscount: 'PC 割引率',
    metricsPcDiscountDesc: '(PC - 出品価格) / PC × 100%、正数は出品価格がPC価格以下',
    metricsFmvSpread: 'FMV スプレッド',
    metricsFmvSpreadDesc: 'FMV - 出品価格 - 送料、正数はFMVアビトラ機会あり',
    metricsSnSpreadCol: 'SN スプレッド',
    metricsSnSpreadDesc: 'SN - 出品価格 - 送料、正数はSNアビトラ機会あり',
    metricsPcSpread: 'PC スプレッド',
    metricsPcSpreadDesc: 'PC - 出品価格 - 送料、正数はPCアビトラ機会あり',
    metricsActions: '操作ボタン',
    metricsActionsDesc: 'カード詳細表示、Renaissで購入、オファー作成',
  },
}

function getBrowserLanguage() {
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return browserLang.includes('TW') || browserLang.includes('HK') ? 'zh-TW' : 'zh-CN'
  }
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('ja')) return 'ja'
  return 'en'
}

const LANGUAGE_NAMES = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
  'ko': '한국어',
  'ja': '日本語',
}

const COLUMNS = [
  { key: 'card', label: 'card', defaultVisible: true },
  { key: 'askPrice', label: 'askPrice', defaultVisible: true },
  { key: 'offerPrice', label: 'offerPrice', defaultVisible: true },
  { key: 'fmvPrice', label: 'fmvPrice', defaultVisible: true },
  { key: 'snPrice', label: 'snPrice', defaultVisible: true },
  { key: 'pcPrice', label: 'pcPrice', defaultVisible: true },
  { key: 'fmvDiscount', label: 'fmvDiscount', defaultVisible: true },
  { key: 'snDiscount', label: 'snDiscount', defaultVisible: true },
  { key: 'pcDiscount', label: 'pcDiscount', defaultVisible: true },
  { key: 'fmvSpread', label: 'fmvSpread', defaultVisible: true },
  { key: 'snSpread', label: 'snSpread', defaultVisible: true },
  { key: 'pcSpread', label: 'pcSpread', defaultVisible: true },
  { key: 'actions', label: 'actions', defaultVisible: true },
]

const CURRENCY_SYMBOLS = {
  USD: '$',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  MYR: 'RM',
}

const CURRENCY_NAMES = {
  USD: 'USD',
  CNY: 'CNY',
  JPY: 'JPY',
  KRW: 'KRW',
  MYR: 'MYR',
}

// Icons
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
)

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
)

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
)

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
)

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
)

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
)

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
)

const ImageOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="m3 21 9.09-9.09a2 2 0 0 1 2.828 0l2.83 2.83"/></svg>
)

const SortIcon = ({ order }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: order === 'asc' ? 'rotate(180deg)' : 'none', opacity: order ? 1 : 0.3 }}>
    <polyline points="6 15 12 9 18 15"/>
  </svg>
)

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
)

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
)

const CompassIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.2"/></svg>
)

const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
)

const MetricsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
)

export default function HomePage() {
  const [stats, setStats] = useState({ total: 0, withAskPrice: 0, totalValue: 0 })
  const [collectibles, setCollectibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [language, setLanguage] = useState('zh-CN')
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 })
  const [sortField, setSortField] = useState('fmvDiscount')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [apiTotal, setApiTotal] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrollRight, setScrollRight] = useState(false)
  const [scrollLeft, setScrollLeft] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  })

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage')
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang)
    } else {
      setLanguage(getBrowserLanguage())
    }
  }, [])

  const saveLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('appLanguage', lang)
  }

  const t = (key) => {
    return translations[language]?.[key] || key
  }

  const handleTableScroll = (e) => {
    const el = e.currentTarget
    setScrollRight(el.scrollLeft > 10)
    setScrollLeft(el.scrollLeft > 10)
  }

  const [filters, setFilters] = useState({
    minDiscount: '',
    maxDiscount: '',
    minPrice: '',
    maxPrice: '',
    minOffer: '',
    languages: [],
    graders: [],
    hasOffer: false,
    hasSnkrdunk: false,
    hasPricecharting: false,
  })

  const pageSize = 20

  useEffect(() => {
    loadExchangeRates()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [sortField, sortOrder, filters])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadExchangeRates = async () => {
    try {
      const res = await fetch(api('exchange/rates'))
      const data = await res.json()
      setExchangeRates(data.rates || {})
    } catch (err) {
      console.error('Failed to load exchange rates:', err)
    }
  }

  const convertPrice = (priceInUSD) => {
    return priceInUSD * (exchangeRates[currency] || 1)
  }

  const formatPrice = (price) => {
    const symbol = CURRENCY_SYMBOLS[currency] || '$'
    if (currency === 'JPY' || currency === 'KRW') {
      return `${symbol}${Math.round(price).toLocaleString()}`
    }
    return `${symbol}${price.toFixed(2)}`
  }

  const calcDiscount = (askPrice, marketPrice) => {
    if (!marketPrice || marketPrice <= 0) return 0
    return ((marketPrice - askPrice) / marketPrice) * 100
  }

  const calcSpread = (marketPrice, askPrice, shipping) => {
    if (!marketPrice || marketPrice <= 0) return 0
    return marketPrice - askPrice - shipping
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [colRes, statsRes, statusRes] = await Promise.all([
        fetch(api('collectibles?limit=10000&hasAskPrice=true&status=listed')),
        fetch(api('stats')),
        fetch(api('sync/status')),
      ])

      let allCollectibles = []
      let fetchedTotal = 0
      if (colRes.ok) {
        const colJson = await colRes.json()
        allCollectibles = colJson.collection || []
        fetchedTotal = colJson.total || allCollectibles.length
      }

      allCollectibles = allCollectibles.map(c => {
        const askPrice = Number(c.ask_price_in_usdt) || 0
        const fmv = Number(c.fmv_price_in_usd) || 0
        const snPrice = Number(c.snkrdunk_price) || Number(c.snkrdunk_last_sale) || 0
        const pcPrice = Number(c.pricecharting_last_sale) || 0
        const offerPrice = c.offer_price_in_usdt ? Number(c.offer_price_in_usdt) : (c.top_offer ? Number(c.top_offer) : 0)

        return {
          ...c,
          askPrice,
          fmv,
          snPrice,
          pcPrice,
          offerPrice,
          fmvDiscount: calcDiscount(askPrice, fmv),
          snkrdunkDiscount: calcDiscount(askPrice, snPrice),
          pcDiscount: calcDiscount(askPrice, pcPrice),
          fmvSpread: calcSpread(fmv, askPrice, 0),
          snkrdunkSpread: calcSpread(snPrice, askPrice, 0),
          pcSpread: calcSpread(pcPrice, askPrice, 0),
        }
      })

      setCollectibles(allCollectibles)
      setApiTotal(fetchedTotal)

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats({
          total: statsData.total || 0,
          withAskPrice: statsData.withAskPrice || 0,
          totalValue: Number(statsData.totalValue) || 0,
        })
      }

      if (statusRes.ok) {
        const status = await statusRes.json()
        if (status.lastSyncAt) {
          setLastUpdate(new Date(status.lastSyncAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC')
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }
    setLoading(false)
  }

  const getCardImageUrl = (card) => {
    if (card.front_image_url) {
      return card.front_image_url
    }
    if (card.serial) {
      const serial = card.serial.replace(/[^0-9]/g, '')
      if (serial && serial.length >= 5) {
        return `https://8nothtoc5ds7a0x3.public.blob.vercel-storage.com/graded-cards-renders/PSA${serial}/nft_image.jpg`
      }
    }
    return ''
  }

  const handleImageError = (e) => {
    const img = e.currentTarget
    img.style.display = 'none'
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const filteredCollectibles = collectibles.filter(c => {
    if (!c.askPrice || c.askPrice <= 0) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = (c.name || '').toLowerCase().includes(q)
      const matchTokenId = (c.token_id || '').toLowerCase().includes(q)
      if (!matchName && !matchTokenId) return false
    }

    if (filters.minDiscount && c.fmvDiscount < Number(filters.minDiscount)) return false
    if (filters.maxDiscount && c.fmvDiscount > Number(filters.maxDiscount)) return false
    if (filters.minPrice && c.askPrice < Number(filters.minPrice)) return false
    if (filters.maxPrice && c.askPrice > Number(filters.maxPrice)) return false
    if (filters.minOffer && (!c.offerPrice || c.offerPrice < Number(filters.minOffer))) return false
    if (filters.languages.length > 0 && !filters.languages.some(fl => (c.language || '').toLowerCase().includes(fl.toLowerCase()))) return false
    if (filters.graders.length > 0 && !filters.graders.includes(c.grading_company)) return false
    if (filters.hasOffer && (!c.offerPrice || c.offerPrice <= 0)) return false
    if (filters.hasSnkrdunk && !c.snkrdunk_price) return false
    if (filters.hasPricecharting && !c.pricecharting_last_sale) return false

    return true
  })

  const displayedTotal = collectibles.length < apiTotal ? `${apiTotal}+` : apiTotal

  useEffect(() => {
    setTotalCount(filteredCollectibles.length)
  }, [filteredCollectibles.length])

  const sortedCollectibles = [...filteredCollectibles].sort((a, b) => {
    let aVal, bVal

    switch (sortField) {
      case 'name':
        aVal = (a.name || '').toLowerCase()
        bVal = (b.name || '').toLowerCase()
        break
      case 'askPrice':
        aVal = a.askPrice || 0
        bVal = b.askPrice || 0
        break
      case 'offerPrice':
        aVal = a.offerPrice || 0
        bVal = b.offerPrice || 0
        break
      case 'fmvDiscount':
        aVal = a.fmvDiscount || 0
        bVal = b.fmvDiscount || 0
        break
      case 'snkrdunkDiscount':
        aVal = a.snkrdunkDiscount || 0
        bVal = b.snkrdunkDiscount || 0
        break
      case 'pcDiscount':
        aVal = a.pcDiscount || 0
        bVal = b.pcDiscount || 0
        break
      case 'fmvSpread':
        aVal = a.fmvSpread || 0
        bVal = b.fmvSpread || 0
        break
      case 'snkrdunkSpread':
        aVal = a.snkrdunkSpread || 0
        bVal = b.snkrdunkSpread || 0
        break
      case 'pcSpread':
        aVal = a.pcSpread || 0
        bVal = b.pcSpread || 0
        break
      case 'fmvPrice':
        aVal = a.fmv || 0
        bVal = b.fmv || 0
        break
      case 'snPrice':
        aVal = a.snPrice || 0
        bVal = b.snPrice || 0
        break
      case 'pcPrice':
        aVal = a.pcPrice || 0
        bVal = b.pcPrice || 0
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const paginatedData = sortedCollectibles.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(totalCount / pageSize)

  const getRegionBadge = (lang) => {
    const l = (lang || '').toLowerCase()
    if (l.includes('japan')) return { class: 'badgeJp', text: 'JP' }
    if (l.includes('english')) return { class: 'badgeEn', text: 'EN' }
    if (l.includes('korean')) return { class: 'badgeKr', text: 'KR' }
    if (l.includes('chinese') || l.includes('simplified') || l.includes('traditional')) return { class: 'badgeCn', text: 'CN' }
    return { class: 'badge', text: (lang || '').slice(0, 2).toUpperCase() || '?' }
  }

  // 去除卡牌名称中的冗余信息（已在 badge 中展示的评级、语言、年份等）
  const cleanCardName = (name, grade, language) => {
    let s = name || ''
    // 去除开头的评级信息: "PSA 10 Gem Mint ", "CGC 9.5 ", "BGS 9 Mint ", "SGC 10 "
    s = s.replace(/^\s*(PSA|CGC|BGS|SGC|ACE|AGS|GMA)\s+[\d.]+\s*(Gem\s+Mint|Mint|Near\s*Mint|Excellent|Very\s*Good|Good|Fair|Poor|Authentic|MINT|GEM\s*MT)?\s*/i, '')
    // 去除开头残留的纯数字等级: "10 Gem Mint " 或 "9 "
    s = s.replace(/^\s*[\d.]+\s*(Gem\s+Mint|Mint|Near\s*Mint|Excellent|Very\s*Good|MINT|GEM\s*MT)?\s*/i, '')
    // 去除年份
    s = s.replace(/\b(19|20)\d{2}\b\s*/, '')
    // 去除 "Pokemon" (用户看到宝可梦卡牌交易平台，不需要强调)
    s = s.replace(/\bPokemon\b\s*/i, '')
    // 去除语言词 (已在 badge 中展示)
    const langWords = ['Japanese', 'English', 'Korean', 'Chinese', 'Simplified', 'Traditional', '日本語', '英語', '韓国語']
    for (const w of langWords) {
      s = s.replace(new RegExp(`\\b${w}\\b\\s*`, 'i'), '')
    }
    // 清理多余空格
    s = s.replace(/\s{2,}/g, ' ').trim()
    // 如果清理后太短或为空，返回原名
    return s.length >= 3 ? s : name
  }

  const formatDiscount = (discount) => {
    if (discount === 0) return '-'
    return `${discount > 0 ? '+' : ''}${discount.toFixed(1)}%`
  }

  const formatSpread = (spread) => {
    if (spread === 0) return '-'
    return `${spread > 0 ? '+' : ''}${formatPrice(spread)}`
  }

  const isColumnVisible = (key) => visibleColumns.has(key)

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <img src="/logo.svg" alt="Renaiss" className="logoImg" />
          <span>{t('title')}</span>
        </div>
        <nav className="nav">
          <div className="langSelector">
            {Object.keys(LANGUAGE_NAMES).map(lang => (
              <button
                key={lang}
                className={`langBtn ${language === lang ? 'active' : ''}`}
                onClick={() => saveLanguage(lang)}
                title={LANGUAGE_NAMES[lang]}
              >
                {lang === 'zh-CN' ? '简' : lang === 'zh-TW' ? '繁' : lang === 'en' ? 'EN' : lang === 'ko' ? '한' : '日'}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="main">
        {/* Stats Dashboard */}
        <div className="statsDashboard">
          <div className="statCard listed">
            <div className="statLabel">{t('listedCards')}</div>
            <div className={`statValue ${loading ? 'statValueLoading' : ''}`}>{loading ? '--' : stats.withAskPrice.toLocaleString()}</div>
          </div>
          <div className="statCard tutorialCard">
            <div className="statLabel">{t('tutorial')}</div>
            <div className="tutorialMicroGrid">
              <a href="https://x.com/blueskylh1/status/2046864072818512013" target="_blank" rel="noopener noreferrer" className="microCardPurple">
                <CompassIcon />
                <div className="microCardContent">
                  <span className="microCardMain">{t('arbitrageTutorial')}</span>
                  <span className="microCardSub">{t('arbitrageTutorialSub')}</span>
                </div>
              </a>
              <a href="https://renaiss-tool-689931.napa.de5.net/" target="_blank" rel="noopener noreferrer" className="microCardCyan">
                <TerminalIcon />
                <div className="microCardContent">
                  <span className="microCardMain">{t('sbtTool')}</span>
                  <span className="microCardSub">{t('sbtToolSub')}</span>
                </div>
              </a>
            </div>
          </div>
          <div className="statCard socialCard">
            <div className="statLabel">{t('bluesky')}</div>
            <div className="socialLinks">
              <a href="https://twitter.com/intent/user?screen_name=blueskylh1" target="_blank" rel="noopener noreferrer" className="socialLink">
                <img src="/avatar.jpg" alt="蓝天" className="avatarIcon" />
                <span>{t('followBluesky')}</span>
              </a>
              <a href="https://www.renaiss.xyz/ref/blueskyone" target="_blank" rel="noopener noreferrer" className="socialLink">
                <img src="/logo.svg" alt="Renaiss" className="logoIconSmall" />
                <span>{t('registerRenaiss')}</span>
              </a>
            </div>
          </div>
          <div className="statCard currencyCard">
            <div className="statLabel">{t('currency')}</div>
            <div className="currencySelector">
              {Object.keys(CURRENCY_NAMES).map(c => (
                <button
                  key={c}
                  className={`currencyBtn ${currency === c ? 'active' : ''}`}
                  onClick={() => setCurrency(c)}
                >
                  {CURRENCY_NAMES[c]}
                </button>
              ))}
            </div>
            {lastUpdate && <div className="lastUpdate">{t('lastUpdate')}: {lastUpdate}</div>}
          </div>
        </div>

        {/* Arbitrage Summary */}
        <div className="arbitrageSummary">
          <div className="summaryTitle">{t('arbitrageSummary')}</div>
          <div className="summaryGrid">
            <div className="summaryCard fmv">
              <div className="summaryLabel">{t('totalFmvSpread')}</div>
              <div className={`summaryValue ${loading ? 'summaryValueLoading' : ''}`}>
                {loading ? '--' : formatPrice(filteredCollectibles.reduce((sum, c) => sum + (c.fmvSpread > 0 ? convertPrice(c.fmvSpread) : 0), 0))}
              </div>
            </div>
            <div className="summaryCard sn">
              <div className="summaryLabel">{t('totalSnSpread')}</div>
              <div className={`summaryValue ${loading ? 'summaryValueLoading' : ''}`}>
                {loading ? '--' : formatPrice(filteredCollectibles.reduce((sum, c) => sum + (c.snkrdunkSpread > 0 ? convertPrice(c.snkrdunkSpread) : 0), 0))}
              </div>
            </div>
            <div className="summaryCard pc">
              <div className="summaryLabel">{t('totalPcSpread')}</div>
              <div className={`summaryValue ${loading ? 'summaryValueLoading' : ''}`}>
                {loading ? '--' : formatPrice(filteredCollectibles.reduce((sum, c) => sum + (c.pcSpread > 0 ? convertPrice(c.pcSpread) : 0), 0))}
              </div>
            </div>
            <div className="summaryCard total">
              <div className="summaryLabel">{t('totalSpread')}</div>
              <div className={`summaryValue ${loading ? 'summaryValueLoading' : ''}`}>
                {loading ? '--' : formatPrice(
                  filteredCollectibles.reduce((sum, c) => {
                    const fmv = c.fmvSpread > 0 ? convertPrice(c.fmvSpread) : 0
                    const sn = c.snkrdunkSpread > 0 ? convertPrice(c.snkrdunkSpread) : 0
                    const pc = c.pcSpread > 0 ? convertPrice(c.pcSpread) : 0
                    return sum + fmv + sn + pc
                  }, 0)
                )}
              </div>
              <div className="summaryHint">{t('totalSpreadHint')}</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbarLeft">
            <div className="searchInput">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
              />
            </div>

            <button
              className={`toggleBtn ${showAdvancedFilter ? 'active' : ''}`}
              onClick={() => {
                setShowAdvancedFilter(!showAdvancedFilter)
                if (!showAdvancedFilter) setShowMetrics(false)
              }}
            >
              <FilterIcon />
              {t('advancedFilter')}
            </button>
          </div>

          <div className="toolbarRight">
            <button
              className={`toggleBtn metricsBtn ${showMetrics ? 'active' : ''}`}
              onClick={() => {
                setShowMetrics(!showMetrics)
                if (!showMetrics) setShowAdvancedFilter(false)
              }}
            >
              <MetricsIcon />
              {t('metricsDoc')}
            </button>

            <div className="columnSettings">
              <button
                className={`toggleBtn ${showColumnSettings ? 'active' : ''}`}
                onClick={() => setShowColumnSettings(!showColumnSettings)}
              >
                <SettingsIcon />
                {t('columnSettings')}
              </button>
              {showColumnSettings && (
                <div className="columnDropdown">
                  <div className="columnHeader">{t('columnSettings')}</div>
                  {COLUMNS.map(col => (
                    <label key={col.key} className="columnItem">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span>{t(col.label)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showAdvancedFilter && (
          <div className="advancedFilterPanel">
            <div className="filterPanelHeader">
              <div className="filterPanelTitle">Filter Control Center</div>
              <div className="filterMatchCount">
                <span>◆</span>
                <span>Matches:</span>
                <span className="count">{totalCount.toLocaleString()}</span>
                <span>results</span>
              </div>
            </div>

            <div className="filterGrid">
              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('fmvDiscountRate')}
                </div>
                <div className="rangeInputs">
                  <div className="rangeInputGroup">
                    <label>MIN</label>
                    <input
                      type="number"
                      className="rangeInput cyan"
                      placeholder="-∞"
                      value={filters.minDiscount}
                      onChange={(e) => setFilters(f => ({ ...f, minDiscount: e.target.value }))}
                    />
                  </div>
                  <span className="rangeDivider">~</span>
                  <div className="rangeInputGroup">
                    <label>MAX</label>
                    <input
                      type="number"
                      className="rangeInput cyan"
                      placeholder="+∞"
                      value={filters.maxDiscount}
                      onChange={(e) => setFilters(f => ({ ...f, maxDiscount: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('askPriceUsd')}
                </div>
                <div className="rangeInputs">
                  <div className="rangeInputGroup">
                    <label>MIN</label>
                    <input
                      type="number"
                      className="rangeInput purple"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                    />
                  </div>
                  <span className="rangeDivider">~</span>
                  <div className="rangeInputGroup">
                    <label>MAX</label>
                    <input
                      type="number"
                      className="rangeInput purple"
                      placeholder="∞"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('offerPriceMin')}
                </div>
                <div className="rangeInputs">
                  <div className="rangeInputGroup">
                    <label>MIN</label>
                    <input
                      type="number"
                      className="rangeInput purple"
                      placeholder="0"
                      value={filters.minOffer}
                      onChange={(e) => setFilters(f => ({ ...f, minOffer: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('cardLanguage')}
                </div>
                <div className="pillSelector">
                  {[
                    { key: 'Japanese', label: 'JP' },
                    { key: 'English', label: 'EN' },
                    { key: 'Korean', label: 'KR' },
                    { key: 'Chinese', label: 'CN' },
                  ].map(lang => (
                    <span
                      key={lang.key}
                      className={`pill ${filters.languages.includes(lang.key) ? 'active' : ''}`}
                      onClick={() => {
                        if (filters.languages.includes(lang.key)) {
                          setFilters(f => ({ ...f, languages: f.languages.filter(l => l !== lang.key) }))
                        } else {
                          setFilters(f => ({ ...f, languages: [...f.languages, lang.key] }))
                        }
                      }}
                    >
                      {lang.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('grader')}
                </div>
                <div className="pillSelector">
                  {['PSA', 'CGC', 'BGS'].map(grader => (
                    <span
                      key={grader}
                      className={`pill cyan ${filters.graders.includes(grader) ? 'active' : ''}`}
                      onClick={() => {
                        if (filters.graders.includes(grader)) {
                          setFilters(f => ({ ...f, graders: f.graders.filter(g => g !== grader) }))
                        } else {
                          setFilters(f => ({ ...f, graders: [...f.graders, grader] }))
                        }
                      }}
                    >
                      {grader}
                    </span>
                  ))}
                </div>
              </div>

              <div className="filterCard">
                <div className="filterCardLabel">
                  <span className="icon">◈</span> {t('otherConditions')}
                </div>
                <div className="tagSelector">
                  <span
                    className={`tag ${filters.hasOffer ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, hasOffer: !f.hasOffer }))}
                  >
                    {t('hasOfferPrice')}
                  </span>
                  <span
                    className={`tag ${filters.hasSnkrdunk ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, hasSnkrdunk: !f.hasSnkrdunk }))}
                  >
                    {t('hasSnData')}
                  </span>
                  <span
                    className={`tag ${filters.hasPricecharting ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, hasPricecharting: !f.hasPricecharting }))}
                  >
                    {t('hasPcData')}
                  </span>
                </div>
              </div>
            </div>

            <div className="filterActions">
              <button
                className="filterResetBtn"
                onClick={() => setFilters({
                  minDiscount: '',
                  maxDiscount: '',
                  minPrice: '',
                  maxPrice: '',
                  minOffer: '',
                  languages: [],
                  graders: [],
                  hasOffer: false,
                  hasSnkrdunk: false,
                  hasPricecharting: false,
                })}
              >
                {t('resetFilter')}
              </button>
              <button
                className="filterApplyBtn"
                onClick={() => setShowAdvancedFilter(false)}
              >
                {t('applyFilters')}
              </button>
            </div>
          </div>
        )}

        {/* Metrics Documentation Panel */}
        {showMetrics && (
          <div className="metricsPanel">
            <div className="metricsPanelHeader">
              <div className="metricsPanelTitle">
                <span className="metricsIconBox">&lt;/&gt;</span>
                <span>{t('metricsTitle')}</span>
              </div>
              <button
                className="collapseBtn"
                onClick={() => setShowMetrics(false)}
              >
                {t('metricsCollapse')} ▲
              </button>
            </div>

            <div className="metricsGrid">
              <div className="metricsSection" style={{ gridColumn: '1 / -1' }}>
                <div className="metricsSectionTitle">
                  <span className="sectionIndicator">01</span>
                  {t('metricsColumnDefinitions')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)' }}>[ {t('askPrice')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsAskPrice')}</div>
                      <div className="metricsDesc">{t('metricsAskPriceDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>[ {t('offerPrice')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsOfferPrice')}</div>
                      <div className="metricsDesc">{t('metricsOfferPriceDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#22d3ee', background: 'rgba(6, 182, 212, 0.1)' }}>[ {t('fmvPrice')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsFmvCol')}</div>
                      <div className="metricsDesc">{t('metricsFmvDescCol')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#f472b6', background: 'rgba(236, 72, 153, 0.1)' }}>[ {t('snPrice')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsSnPrice')}</div>
                      <div className="metricsDesc">{t('metricsSnPriceDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>[ {t('pcPrice')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsPcPrice')}</div>
                      <div className="metricsDesc">{t('metricsPcPriceDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#a78bfa', background: 'rgba(139, 92, 246, 0.1)' }}>[ {t('fmvDiscount')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsFmvDiscount')}</div>
                      <div className="metricsDesc">{t('metricsFmvDiscountDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#f472b6', background: 'rgba(236, 72, 153, 0.1)' }}>[ {t('snDiscount')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsSnDiscountCol')}</div>
                      <div className="metricsDesc">{t('metricsSnDiscountDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>[ {t('pcDiscount')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsPcDiscount')}</div>
                      <div className="metricsDesc">{t('metricsPcDiscountDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.1)' }}>[ {t('fmvSpread')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsFmvSpread')}</div>
                      <div className="metricsDesc">{t('metricsFmvSpreadDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#f472b6', background: 'rgba(236, 72, 153, 0.1)' }}>[ {t('snSpread')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsSnSpreadCol')}</div>
                      <div className="metricsDesc">{t('metricsSnSpreadDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>[ {t('pcSpread')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsPcSpread')}</div>
                      <div className="metricsDesc">{t('metricsPcSpreadDesc')}</div>
                    </div>
                  </div>
                  <div className="metricsItem">
                    <div className="metricsTag" style={{ color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)' }}>[ {t('actions')} ]</div>
                    <div className="metricsContent">
                      <div className="metricsName">{t('metricsActions')}</div>
                      <div className="metricsDesc">{t('metricsActionsDesc')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="metricsSection" style={{ gridColumn: '1 / -1' }}>
                <div className="metricsSectionTitle">
                  <span className="sectionIndicator">⚠</span>
                  {t('metricsDisclaimer')}
                </div>
                <div className="metricsDisclaimer">
                  {t('metricsDisclaimerText')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="tableContainer">
              <div
                className={`tableWrapper ${scrollRight ? 'hasScrolledRight' : ''} ${scrollLeft ? 'hasScrolledLeft' : ''}`}
                onScroll={handleTableScroll}
              >
                <table className="table">
                  <thead>
                    <tr>
                      {isColumnVisible('card') && (
                        <th className={`sortable thCard`} onClick={() => handleSort('name')}>
                          <div className="thInner thInnerLeft">{t('card')} {sortField === 'name' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('askPrice') && (
                        <th className={`sortable thNumeric`} onClick={() => handleSort('askPrice')}>
                          <div className="thInner thInnerRight">{t('askPrice')} {sortField === 'askPrice' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('offerPrice') && (
                        <th className={`sortable thNumeric`} onClick={() => handleSort('offerPrice')}>
                          <div className="thInner thInnerRight">{t('offerPrice')} {sortField === 'offerPrice' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('fmvPrice') && (
                        <th className={`sortable thNumeric`} onClick={() => handleSort('fmvPrice')}>
                          <div className="thInner thInnerRight">{t('fmvPrice')} {sortField === 'fmvPrice' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('snPrice') && (
                        <th className={`sortable thNumeric`} onClick={() => handleSort('snPrice')}>
                          <div className="thInner thInnerRight">{t('snPrice')} {sortField === 'snPrice' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('pcPrice') && (
                        <th className={`sortable thNumeric`} onClick={() => handleSort('pcPrice')}>
                          <div className="thInner thInnerRight">{t('pcPrice')} {sortField === 'pcPrice' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('fmvDiscount') && (
                        <th className={`sortable thDiscount`} onClick={() => handleSort('fmvDiscount')}>
                          <div className="thInner thInnerRight">{t('fmvDiscount')} {sortField === 'fmvDiscount' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('snDiscount') && (
                        <th className={`sortable thDiscount`} onClick={() => handleSort('snkrdunkDiscount')}>
                          <div className="thInner thInnerRight">{t('snDiscount')} {sortField === 'snkrdunkDiscount' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('pcDiscount') && (
                        <th className={`sortable thDiscount`} onClick={() => handleSort('pcDiscount')}>
                          <div className="thInner thInnerRight">{t('pcDiscount')} {sortField === 'pcDiscount' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('fmvSpread') && (
                        <th className={`sortable thSpread`} onClick={() => handleSort('fmvSpread')}>
                          <div className="thInner thInnerRight">{t('fmvSpread')} {sortField === 'fmvSpread' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('snSpread') && (
                        <th className={`sortable thSpread`} onClick={() => handleSort('snkrdunkSpread')}>
                          <div className="thInner thInnerRight">{t('snSpread')} {sortField === 'snkrdunkSpread' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('pcSpread') && (
                        <th className={`sortable thSpread`} onClick={() => handleSort('pcSpread')}>
                          <div className="thInner thInnerRight">{t('pcSpread')} {sortField === 'pcSpread' && <SortIcon order={sortOrder} />}</div>
                        </th>
                      )}
                      {isColumnVisible('actions') && <th className="thActions">{t('actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 15 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="skeletonRow">
                          {isColumnVisible('card') && (
                            <td className="tdStickyLeft">
                              <div className="cardInfo">
                                <div className="skeleton skeletonThumb" />
                                <div className="cardDetails">
                                  <div className="skeleton skeletonLineLong" />
                                  <div className="skeleton skeletonLineShort" />
                                </div>
                              </div>
                            </td>
                          )}
                          {isColumnVisible('askPrice') && <td className="tdNumeric"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('offerPrice') && <td className="tdNumeric"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('fmvPrice') && <td className="tdNumeric"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('snPrice') && <td className="tdNumeric"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('pcPrice') && <td className="tdNumeric"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('fmvDiscount') && <td className="tdDiscount"><div className="skeleton skeletonTag" /></td>}
                          {isColumnVisible('snDiscount') && <td className="tdDiscount"><div className="skeleton skeletonTag" /></td>}
                          {isColumnVisible('pcDiscount') && <td className="tdDiscount"><div className="skeleton skeletonTag" /></td>}
                          {isColumnVisible('fmvSpread') && <td className="tdSpread"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('snSpread') && <td className="tdSpread"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('pcSpread') && <td className="tdSpread"><div className="skeleton skeletonNum" /></td>}
                          {isColumnVisible('actions') && (
                            <td className="tdStickyRight">
                              <div className="actionsCell">
                                <div className="skeleton skeletonBtn" />
                                <div className="skeleton skeletonBtnSmall" />
                                <div className="skeleton skeletonBtnSmall" />
                              </div>
                            </td>
                          )}
                        </tr>
                      )))
                    : (
                    paginatedData.map((card) => {
                      const region = getRegionBadge(card.language)
                      const hasImage = getCardImageUrl(card)

                      return (
                        <tr key={card.token_id}>
                          {isColumnVisible('card') && (
                            <td className="tdStickyLeft">
                              <div className="cardInfo">
                                {hasImage ? (
                                  <img
                                    src={getCardImageUrl(card)}
                                    alt={card.name}
                                    className="thumbnail"
                                    onError={handleImageError}
                                    onClick={() => setLightbox({ src: getCardImageUrl(card), alt: card.name })}
                                  />
                                ) : (
                                  <div className="thumbnailPlaceholder">{t('noImage')}</div>
                                )}
                                <div className="cardDetails">
                                  <div className="cardNameWrapper">
                                    <div className="cardName" title={card.name}>{cleanCardName(card.name, card.grade, card.language)}</div>
                                    <div className="tooltipContent">{card.name}</div>
                                  </div>
                                  <div className="cardMeta">
                                    <span className={`badge ${region.class}`}>{region.text}</span>
                                    <span className="badge badgeGrade">{card.grade}</span>
                                    {card.offerPrice > card.askPrice && (
                                      <span className="badge arbitrageBadge"><ZapIcon /> {t('offerUp')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}

                          {isColumnVisible('askPrice') && (
                            <td className="tdNumeric">
                              <span className="neonBlue">{formatPrice(convertPrice(card.askPrice))}</span>
                            </td>
                          )}

                          {isColumnVisible('offerPrice') && (
                            <td className="tdNumeric">
                              {card.offerPrice > 0 ? (
                                <span className="neonYellow">{formatPrice(convertPrice(card.offerPrice))}</span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('fmvPrice') && (
                            <td className="tdNumeric">
                              <span className="neonGreen">{formatPrice(convertPrice(card.fmv))}</span>
                            </td>
                          )}

                          {isColumnVisible('snPrice') && (
                            <td className="tdNumeric">
                              {card.snPrice > 0 ? (
                                <span className="neonPink">{formatPrice(convertPrice(card.snPrice))}</span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('pcPrice') && (
                            <td className="tdNumeric">
                              {card.pcPrice > 0 ? (
                                <span className="neonYellow">{formatPrice(convertPrice(card.pcPrice))}</span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('fmvDiscount') && (
                            <td className="tdDiscount">
                              <span className={`discount ${card.fmvDiscount > 0 ? 'positive' : card.fmvDiscount < 0 ? 'negative' : ''}`}>
                                {formatDiscount(card.fmvDiscount)}
                              </span>
                            </td>
                          )}

                          {isColumnVisible('snDiscount') && (
                            <td className="tdDiscount">
                              {card.snPrice > 0 ? (
                                <span className={`discount ${card.snkrdunkDiscount > 0 ? 'positive' : card.snkrdunkDiscount < 0 ? 'negative' : ''}`}>
                                  {formatDiscount(card.snkrdunkDiscount)}
                                </span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('pcDiscount') && (
                            <td className="tdDiscount">
                              {card.pcPrice > 0 ? (
                                <span className={`discount ${card.pcDiscount > 0 ? 'positive' : card.pcDiscount < 0 ? 'negative' : ''}`}>
                                  {formatDiscount(card.pcDiscount)}
                                </span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('fmvSpread') && (
                            <td className="tdSpread">
                              <span className={card.fmvSpread > 0 ? 'neonPink' : card.fmvSpread < 0 ? 'negative' : ''}>
                                {formatSpread(card.fmvSpread)}
                              </span>
                            </td>
                          )}

                          {isColumnVisible('snSpread') && (
                            <td className="tdSpread">
                              {card.snPrice > 0 ? (
                                <span className={card.snkrdunkSpread > 0 ? 'neonPink' : card.snkrdunkSpread < 0 ? 'negative' : ''}>
                                  {formatSpread(card.snkrdunkSpread)}
                                </span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('pcSpread') && (
                            <td className="tdSpread">
                              {card.pcPrice > 0 ? (
                                <span className={card.pcSpread > 0 ? 'neonPink' : card.pcSpread < 0 ? 'negative' : ''}>
                                  {formatSpread(card.pcSpread)}
                                </span>
                              ) : (
                                <span className="priceSub">-</span>
                              )}
                            </td>
                          )}

                          {isColumnVisible('actions') && (
                            <td className="tdStickyRight">
                              <div className="actionsCell">
                                <a
                                  href={`https://www.renaiss.xyz/card/${card.token_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="executeBtn"
                                  title="Execute Arbitrage"
                                >
                                  <img src="/logo.svg" alt="套利" className="executeLogo" />
                                  {t('executeArbitrage')}
                                </a>
                                {card.snkrdunk_product_url && (
                                  <a
                                    href={card.snkrdunk_product_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="actionBtn badge-btn"
                                    title="SNKRDUNK"
                                  >
                                    SN
                                  </a>
                                )}
                                {card.pricecharting_url && (
                                  <a
                                    href={card.pricecharting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="actionBtn badge-btn"
                                    title="PriceCharting"
                                  >
                                    PC
                                  </a>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && (
              <div className="pagination">
                <button
                  className="paginationBtn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  «
                </button>
                <button
                  className="paginationBtn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span className="paginationInfo">
                  {page} {t('page')} {totalPages} ({displayedTotal} {t('total')})
                </span>
                <input
                  type="number"
                  className="paginationJump"
                  min={1}
                  max={totalPages}
                  placeholder="#"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt((e.target as HTMLInputElement).value);
                      if (v >= 1 && v <= totalPages) { setPage(v); (e.target as HTMLInputElement).value = ''; }
                    }
                  }}
                />
                <button
                  className="paginationBtn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button
                  className="paginationBtn"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  »
                </button>
              </div>
              )}
        </div>
      </main>

      <footer className="footer">
        <p>{t('footer')}</p>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightboxContent" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} className="lightboxImage" />
            <p className="lightboxCaption">{lightbox.alt}</p>
            <button className="lightboxClose" onClick={() => setLightbox(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}
