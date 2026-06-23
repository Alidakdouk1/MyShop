import { useEffect, useState } from 'react'

const DISMISS_KEY = 'myshop_pwa_install_dismissed'

// Detect Safari on iOS / iPadOS (iOS doesn't fire `beforeinstallprompt` and
// has its own "Share → Add to Home Screen" flow we need to walk users through).
function detectIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIos      = /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  return isIos && !isStandalone && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function PwaInstall() {
  const [deferred,    setDeferred]    = useState(null)   // BeforeInstallPromptEvent (Android/desktop)
  const [iosHint,     setIosHint]     = useState(false)  // iOS modal open
  const [updateReady, setUpdateReady] = useState(false)
  const [offline,     setOffline]     = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [dismissed,   setDismissed]   = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const isIos     = typeof window !== 'undefined' && detectIos()
  const installed = typeof window !== 'undefined' && isStandalone()

  // Capture install prompt (Android Chrome, Edge, desktop Chrome).
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Once installed, hide everything.
  useEffect(() => {
    const onInstalled = () => setDeferred(null)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  // SW update from main.jsx.
  useEffect(() => {
    const onUpdate = () => setUpdateReady(true)
    window.addEventListener('pwa:update-ready', onUpdate)
    return () => window.removeEventListener('pwa:update-ready', onUpdate)
  }, [])

  // Online / offline toggle.
  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  const acceptInstall = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  const acceptUpdate = () => {
    const w = window.__pwaWaitingWorker
    if (w) w.postMessage({ type: 'SKIP_WAITING' })
    setUpdateReady(false)
    // controllerchange handler in main.jsx triggers the reload.
  }

  const showInstall = !installed && !dismissed && (deferred || (isIos && !installed))

  return (
    <>
      {/* Offline indicator */}
      {offline && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 text-center text-white text-xs font-bold py-1.5 px-3"
          style={{ background: '#0F0F0F', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          You're offline — showing cached content
        </div>
      )}

      {/* Update ready toast — top-right; the SW already downloaded the new version */}
      {updateReady && (
        <div
          role="alert"
          className="fixed z-50 right-4 max-w-[320px] rounded-2xl shadow-float ring-1 ring-border/70 bg-white p-4"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <p className="text-sm font-bold text-ink mb-1">New version available</p>
          <p className="text-xs text-ink-tertiary mb-3">Reload to get the latest improvements.</p>
          <div className="flex gap-2">
            <button
              onClick={acceptUpdate}
              className="flex-1 bg-ink text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-ink/90 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={() => setUpdateReady(false)}
              className="text-xs font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink px-3 py-2 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Install nudge — Android/desktop has a one-tap button, iOS opens the hint modal */}
      {showInstall && (
        <div
          className="fixed z-40 left-1/2 -translate-x-1/2 w-[min(100%-20px,420px)]"
          style={{ bottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-surface rounded-2xl shadow-float ring-1 ring-border/70 p-3 flex items-center gap-3"
               style={{ animation: 'pop-in 0.28s var(--ease-out-back)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0F0F0F' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink leading-snug">Install MyShop</p>
              <p className="text-[11px] text-ink-tertiary leading-snug">Faster checkout · works offline · no app store</p>
            </div>
            <button
              onClick={isIos ? () => setIosHint(true) : acceptInstall}
              className="shine bg-ink text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-ink/90 transition-colors whitespace-nowrap"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="text-ink-tertiary hover:text-ink p-1 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* iOS install instructions modal */}
      {iosHint && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIosHint(false) }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
               style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">Install on iPhone / iPad</h2>
              <button
                onClick={() => setIosHint(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ol className="space-y-3 text-sm text-ink leading-relaxed">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button
                  <svg className="inline-block mx-1 align-text-bottom" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16" />
                  </svg>
                  at the bottom of Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </li>
            </ol>
            <p className="text-xs text-ink-tertiary mt-4 leading-relaxed">
              MyShop will appear like a real app on your home screen — works offline, no app store needed.
            </p>
            <button
              onClick={() => setIosHint(false)}
              className="mt-5 w-full bg-ink text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-ink/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
