import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/index.js'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
)

// Register the PWA service worker in production builds only (avoids caching
// conflicts with Vite's dev HMR). When the SW finds a newer version it sits in
// the `waiting` state — we surface that to the UI via a `pwa:update-ready`
// window event so the user can choose when to reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Notify when an update finishes downloading.
      const notify = (worker) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.__pwaWaitingWorker = worker
            window.dispatchEvent(new Event('pwa:update-ready'))
          }
        })
      }
      if (reg.waiting) {
        window.__pwaWaitingWorker = reg.waiting
        window.dispatchEvent(new Event('pwa:update-ready'))
      }
      reg.addEventListener('updatefound', () => {
        if (reg.installing) notify(reg.installing)
      })

      // Reload once the new SW takes control (after user accepts).
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }).catch(() => {})
  })
}
