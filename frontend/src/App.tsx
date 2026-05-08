import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary, #0f172a)' }}>
      <Routes>
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}
