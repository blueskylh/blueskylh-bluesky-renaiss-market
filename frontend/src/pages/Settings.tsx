import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const syncData = async () => {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetch(api('sync/collectibles'), { method: 'POST' })
      const data = await res.json()
      setMessage(`同步完成: ${data.updated} 条记录`)
    } catch (err) {
      setMessage('同步失败')
    }
    setSyncing(false)
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
        <h1>设置</h1>

        <section style={{ marginTop: '2rem' }}>
          <h2>数据同步</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            从 Renaiss 市场同步最新的卡牌数据到本地数据库
          </p>
          <button
            onClick={syncData}
            disabled={syncing}
            className="syncBtn"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {syncing ? '同步中...' : '立即同步'}
          </button>
          {message && (
            <p style={{ marginTop: '1rem', color: '#10b981' }}>{message}</p>
          )}
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>关于</h2>
          <p style={{ color: '#94a3b8' }}>
            Renaiss 做市商系统 v1.0.0
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>本系统仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}
