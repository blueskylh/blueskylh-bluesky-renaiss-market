import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const CURRENCY_SYMBOLS = {
  USD: '$',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
}

export default function MarketPage() {
  const [collectibles, setCollectibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    grade: '',
    language: '',
    minPrice: '',
    maxPrice: '',
  })
  const [sortField, setSortField] = useState('fmvPriceInUSD')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currency, setCurrency] = useState('USD')
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 })

  useEffect(() => {
    loadData()
    loadExchangeRates()
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

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.grade) params.set('grade', filters.grade)
      if (filters.language) params.set('language', filters.language)
      if (filters.minPrice) params.set('minPrice', filters.minPrice)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)

      const res = await fetch(api(`collectibles?limit=200&${params}`))
      const data = await res.json()
      setCollectibles(data.collection || [])
    } catch (err) {
      console.error('Failed to load:', err)
    }
    setLoading(false)
  }

  const getRegionClass = (lang) => {
    const l = (lang || '').toLowerCase()
    if (l.includes('japan')) return 'regionJp'
    if (l.includes('english')) return 'regionEn'
    if (l.includes('korean')) return 'regionKr'
    return ''
  }

  const sortedCollectibles = [...collectibles].sort((a, b) => {
    let aVal, bVal

    switch (sortField) {
      case 'name':
        aVal = (a.name || '').toLowerCase()
        bVal = (b.name || '').toLowerCase()
        break
      case 'askPriceInUSDT':
        aVal = Number(a.ask_price_in_usdt) || 0
        bVal = Number(b.ask_price_in_usdt) || 0
        break
      case 'fmvPriceInUSD':
        aVal = Number(a.fmv_price_in_usd) || 0
        bVal = Number(b.fmv_price_in_usd) || 0
        break
      case 'discount':
        aVal = a.fmv_price_in_usd ? ((a.fmv_price_in_usd - a.ask_price_in_usdt) / a.fmv_price_in_usd * 100) : 0
        bVal = b.fmv_price_in_usd ? ((b.fmv_price_in_usd - b.ask_price_in_usdt) / b.fmv_price_in_usd * 100) : 0
        break
      case 'serial':
        aVal = a.serial || ''
        bVal = b.serial || ''
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getDiscount = (card) => {
    if (!card.fmv_price_in_usd || !card.ask_price_in_usdt) return 0
    return ((card.fmv_price_in_usd - card.ask_price_in_usdt) / card.fmv_price_in_usd * 100)
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <div className="logoIcon">R</div>
          <span>Renaiss 做市商</span>
        </div>
        <nav className="nav">
          <Link to="/">首页</Link>
          <Link to="/market">市场</Link>
          <Link to="/settings">设置</Link>
        </nav>
      </header>

      <main className="main">
        <h1>市场数据</h1>

        <div className="filters">
          <input
            placeholder="评级 (如: PSA 10)"
            value={filters.grade}
            onChange={e => setFilters({ ...filters, grade: e.target.value })}
          />
          <input
            placeholder="语言 (如: Japanese)"
            value={filters.language}
            onChange={e => setFilters({ ...filters, language: e.target.value })}
          />
          <input
            placeholder="最低价"
            type="number"
            value={filters.minPrice}
            onChange={e => setFilters({ ...filters, minPrice: e.target.value })}
          />
          <input
            placeholder="最高价"
            type="number"
            value={filters.maxPrice}
            onChange={e => setFilters({ ...filters, maxPrice: e.target.value })}
          />
          <button onClick={loadData} disabled={loading}>
            {loading ? '加载中...' : '筛选'}
          </button>
        </div>

        <div className="sortBar">
          <span>排序:</span>
          <button onClick={() => handleSort('name')} className={sortField === 'name' ? 'activeSort' : ''}>
            名称 {getSortIcon('name')}
          </button>
          <button onClick={() => handleSort('askPriceInUSDT')} className={sortField === 'askPriceInUSDT' ? 'activeSort' : ''}>
            挂牌价 {getSortIcon('askPriceInUSDT')}
          </button>
          <button onClick={() => handleSort('fmvPriceInUSD')} className={sortField === 'fmvPriceInUSD' ? 'activeSort' : ''}>
            FMV {getSortIcon('fmvPriceInUSD')}
          </button>
          <button onClick={() => handleSort('discount')} className={sortField === 'discount' ? 'activeSort' : ''}>
            折扣 {getSortIcon('discount')}
          </button>
          <button onClick={() => handleSort('serial')} className={sortField === 'serial' ? 'activeSort' : ''}>
            Serial {getSortIcon('serial')}
          </button>
        </div>

        <div className="currencyBar">
          <span>货币:</span>
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="CNY">CNY (¥)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="KRW">KRW (₩)</option>
          </select>
          <span className="exchangeRates">
            汇率: ¥{exchangeRates.CNY?.toFixed(2)} | ¥{exchangeRates.JPY?.toFixed(2)} | ₩{exchangeRates.KRW?.toFixed(0)}
          </span>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="cardGrid">
            {sortedCollectibles.map((card, i) => {
              const discount = getDiscount(card)
              return (
                <div key={i} className="card">
                  <div className="cardHeader">
                    <h3>{card.name}</h3>
                    {card.serial && (
                      <span className="serial">Serial: {card.serial}</span>
                    )}
                  </div>
                  <div className="cardMeta">
                    <span className={getRegionClass(card.language)}>{card.language}</span>
                    <span>{card.grade}</span>
                    <span>{card.year}</span>
                    {card.setName && <span className="setName">{card.setName}</span>}
                  </div>
                  <div className="prices">
                    <div>
                      <span className="priceLabel">挂牌价</span>
                      <span className="priceValue">{formatPrice(convertPrice(Number(card.ask_price_in_usdt)))}</span>
                    </div>
                    <div>
                      <span className="priceLabel">FMV</span>
                      <span className="fmvValue">{formatPrice(convertPrice(Number(card.fmv_price_in_usd)))}</span>
                    </div>
                  </div>
                  {discount !== 0 && (
                    <div className={discount > 0 ? 'discountGreen' : 'discount'}>
                      {discount > 0 ? '+' : ''}{discount.toFixed(1)}%
                    </div>
                  )}
                  <a
                    href={`https://www.renaiss.xyz/card/${card.token_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="buyBtn"
                  >
                    在Renaiss购买
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>本系统仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}
