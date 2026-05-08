import './index.css'

const RELOAD_KEY = '__dep_reload'
const MAX_RELOADS = 6
const RELOAD_WINDOW = 60_000

function getReloads(): { c: number; t: number } {
  try {
    return JSON.parse(sessionStorage.getItem(RELOAD_KEY) || '{}') as { c: number; t: number }
  } catch { return { c: 0, t: 0 } }
}

async function boot() {
  const root = document.getElementById('root')!

  try {
    const React = await import('react')

    if (typeof React.useState !== 'function') throw new Error('dep-stub')

    const { createElement } = React
    const { createRoot, hydrateRoot } = await import('react-dom/client')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const { BrowserRouter } = await import('react-router-dom')
    const { default: App } = await import('./App')
    const { default: ErrorBoundary } = await import('./ErrorBoundary')

    const queryClient = new QueryClient({
      defaultOptions: { queries: {
        refetchOnWindowFocus: false,
        retry: 3,
        retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
        staleTime: 30_000,
      } },
    })

    const children = createElement(ErrorBoundary, null,
      createElement(QueryClientProvider, { client: queryClient },
        createElement(BrowserRouter, null,
          createElement(App)
        )
      )
    )

    const hasPlaceholder = !!root.querySelector('[data-surf-placeholder]')
    if (root.childNodes.length > 0 && root.innerHTML !== '<!--ssr-outlet-->' && !hasPlaceholder) {
      hydrateRoot(root, children)
    } else {
      root.innerHTML = ''
      createRoot(root).render(children)
    }

    ;(window as any).__reactOk = true
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    const prev = getReloads()
    const count = (Date.now() - prev.t > RELOAD_WINDOW) ? 0 : prev.c

    if (count < MAX_RELOADS) {
      root.innerHTML = [
        '<div style="padding:24px;text-align:center;font-family:system-ui,sans-serif">',
        '<p style="color:#6366f1;font-weight:600;margin:0 0 4px">Loading dependencies...</p>',
        '<p style="color:#6366f1;opacity:0.7;font-size:12px;margin:0">Reloading automatically</p>',
        '</div>',
      ].join('')
      sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ c: count + 1, t: Date.now() }))
      setTimeout(() => location.reload(), 3000 + count * 1000)
    } else {
      root.innerHTML = [
        '<div style="padding:24px;text-align:center;font-family:system-ui,sans-serif">',
        '<p style="color:#ef4444;font-weight:600;margin:0 0 4px">Failed to load dependencies</p>',
        '<p style="color:#ef4444;opacity:0.8;font-size:12px;margin:0">Please refresh the page</p>',
        '</div>',
      ].join('')
    }
  }
}

boot()
