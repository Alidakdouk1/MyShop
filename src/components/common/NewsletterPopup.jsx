import { useEffect, useState } from 'react'
import { getPopupConfig, claimWelcomeDiscount } from '../../api/newsletterApi'

const SEEN_KEY = 'myshop_welcome_popup_seen'

function fmtDiscount(type, value) {
  if (type === 'fixed')   return `$${Number(value).toFixed(0)} off`
  return `${Number(value)}% off`
}

export default function NewsletterPopup() {
  const [config,  setConfig]  = useState(null)
  const [open,    setOpen]    = useState(false)
  const [email,   setEmail]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [result,  setResult]  = useState(null) // { code, discount_type, discount_value, min_order, expires_days }
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)

  // Load once; if seen this session OR disabled, never schedule.
  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1' } catch {}
    if (seen) return

    getPopupConfig()
      .then(r => {
        const c = r.data.data
        if (!c?.enabled) return
        setConfig(c)
        const t = setTimeout(() => setOpen(true), Math.max(0, Number(c.delay_sec) * 1000))
        return () => clearTimeout(t)
      })
      .catch(() => {})
  }, [])

  const close = () => {
    setOpen(false)
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return }
    setBusy(true)
    try {
      const { data } = await claimWelcomeDiscount(email.trim())
      setResult(data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong — please try again.')
    } finally { setBusy(false) }
  }

  const copyCode = async () => {
    if (!result?.code) return
    try { await navigator.clipboard.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch {}
  }

  if (!open || !config) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15,15,15,0.55)' }}
      onClick={close}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
        style={{ animation: 'popIn 0.55s cubic-bezier(0.34,1.4,0.64,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.85)', color: '#5C5854' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image (optional) */}
        {config.image_url && (
          <div className="relative" style={{ aspectRatio: '16/9', background: '#EEECE6', overflow: 'hidden' }}>
            <img
              src={config.image_url.startsWith('http') ? config.image_url : `/MyShop/backend/${config.image_url}`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {result ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">You're in 🎉</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-ink font-semibold leading-tight">
                Enjoy {fmtDiscount(result.discount_type, result.discount_value)} on your first order
              </h2>
              <p className="text-sm text-ink-secondary mt-2">Your code is below — use it at checkout. Valid for {result.expires_days} days, one-time use.</p>

              <div
                className="mt-5 flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-dashed"
                style={{ borderColor: '#0F0F0F', background: '#FAFAF8' }}
              >
                <code className="font-mono font-black text-lg text-ink tracking-wider">{result.code}</code>
                <button
                  onClick={copyCode}
                  className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors"
                  style={{ background: '#0F0F0F', color: '#fff' }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              {result.min_order > 0 && (
                <p className="text-xs text-ink-tertiary mt-3">Minimum order: ${Number(result.min_order).toFixed(2)}.</p>
              )}

              <button
                onClick={close}
                className="w-full mt-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ background: '#fff', color: '#0F0F0F', border: '1.5px solid #E4E1D9' }}
              >
                Start shopping
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">Welcome</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-ink font-semibold leading-tight">
                {config.title}
              </h2>
              <p className="text-sm text-ink-secondary mt-2">{config.subtitle}</p>

              <form onSubmit={submit} className="mt-5">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full text-sm rounded-xl px-4 py-3 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
                />
                {error && <p className="text-xs text-accent mt-2 font-semibold">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full mt-3 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors text-white disabled:opacity-60"
                  style={{ background: '#0F0F0F' }}
                >
                  {busy ? 'Generating…' : config.cta_label}
                </button>
                <p className="text-[11px] text-ink-tertiary mt-3 text-center">
                  By subscribing, you agree to receive marketing emails. Unsubscribe any time.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
