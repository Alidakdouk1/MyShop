import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminGetAds, adminSetAdStatus, adminSetAdFeatured, getAdminMarketplaceSettings, updateMarketplaceSettings } from '../../api/marketplaceApi'
import { STATUS_STYLE, conditionLabel } from '../../lib/marketplace'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import Spinner from '../../components/ui/Spinner'

const TABS = ['pending', 'reported', 'approved', 'rejected', 'sold', '']

export default function AdminMarketplace() {
  const toast = useToast()
  const [tab, setTab]       = useState('pending')
  const [ads, setAds]       = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]     = useState(null)
  const [settings, setSettings] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const load = () => {
    setLoading(true)
    adminGetAds(tab).then(r => setAds(r.data.data?.ads || [])).catch(() => setAds([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [tab])
  useEffect(() => { getAdminMarketplaceSettings().then(r => setSettings(r.data.data)).catch(() => {}) }, [])

  const setS = (k, v) => setSettings(s => ({ ...s, [k]: v }))
  const toggleS = (k) => setSettings(s => ({ ...s, [k]: Number(s[k]) ? 0 : 1 }))

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const payload = { ...settings, categories: Array.isArray(settings.categories) ? settings.categories.join('\n') : settings.categories }
      const { data } = await updateMarketplaceSettings(payload)
      setSettings(data.data)
      toast.success('Settings saved')
    } catch { toast.error('Could not save settings') }
    finally { setSavingSettings(false) }
  }

  const setStatus = async (id, status) => {
    let reason = null
    if (status === 'rejected') {
      reason = window.prompt('Reason for rejection (shown to the seller):', '')
      if (reason === null) return
    }
    setBusy(id)
    try {
      await adminSetAdStatus(id, status, reason)
      toast.success('Updated')
      setAds(a => a.filter(x => x.id !== id || tab === '')) // drop from filtered view
      if (tab === '') load()
    } catch { toast.error('Could not update') }
    finally { setBusy(null) }
  }

  const toggleFeatured = async (ad) => {
    setBusy(ad.id)
    try {
      await adminSetAdFeatured(ad.id, !Number(ad.is_featured))
      toast.success(Number(ad.is_featured) ? 'Unfeatured' : 'Featured')
      setAds(a => a.map(x => x.id === ad.id ? { ...x, is_featured: Number(ad.is_featured) ? 0 : 1 } : x))
    } catch { toast.error('Could not update') }
    finally { setBusy(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink tracking-tight">Marketplace</h1>
        <button onClick={() => setShowSettings(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-border text-ink-secondary hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>
      </div>
      <p className="text-sm text-ink-tertiary mb-6">Review and moderate user-posted classified ads.</p>

      {/* Settings panel */}
      {showSettings && settings && (
        <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">Marketplace settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {[
              ['enabled',          'Marketplace enabled',  'Master switch — hides the whole marketplace when off.'],
              ['require_approval', 'Require admin review',  'When off, new ads go live instantly.'],
              ['require_phone',    'Require phone number',  'Sellers must provide a WhatsApp number.'],
            ].map(([key, label, hint]) => (
              <label key={key} className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 cursor-pointer">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block text-[11px] text-ink-tertiary leading-snug">{hint}</span>
                </span>
                <button type="button" onClick={() => toggleS(key)}
                  className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 mt-0.5"
                  style={{ background: Number(settings[key]) ? '#00D8C8' : '#D8D4CC' }}>
                  <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: Number(settings[key]) ? 'translateX(22px)' : 'translateX(2px)' }} />
                </button>
              </label>
            ))}
            <NumRow label="Max images per ad"   hint="1–10"          value={settings.max_images}       onChange={v => setS('max_images', v)} />
            <NumRow label="Max active ads/user" hint="0 = unlimited" value={settings.max_ads_per_user} onChange={v => setS('max_ads_per_user', v)} />
            <NumRow label="Max price ($)"       hint="0 = no cap"    value={settings.price_max}        onChange={v => setS('price_max', v)} />
            <NumRow label="Ad expiry (days)"    hint="0 = never expires" value={settings.ad_expiry_days} onChange={v => setS('ad_expiry_days', v)} />
          </div>

          <div className="mt-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary block mb-1.5">Categories (one per line)</label>
            <textarea rows={6}
              value={Array.isArray(settings.categories) ? settings.categories.join('\n') : settings.categories}
              onChange={e => setS('categories', e.target.value.split('\n'))}
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-border bg-white text-ink outline-none focus:border-ink" />
          </div>
          <div className="mt-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary block mb-1.5">Posting guidelines (shown on the post form)</label>
            <textarea rows={2}
              value={settings.guidelines || ''}
              onChange={e => setS('guidelines', e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-border bg-white text-ink outline-none focus:border-ink" />
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={saveSettings} disabled={savingSettings}
              className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F172A' }}>
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t || 'all'} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-ink text-white' : 'bg-surface border border-border text-ink-secondary hover:text-ink'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : ads.length === 0 ? (
        <p className="text-center py-16 text-ink-tertiary">No ads in this view.</p>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => {
            const st  = STATUS_STYLE[ad.status] || STATUS_STYLE.pending
            const img = ad.images?.[0] ? resolveImg(ad.images[0]) : 'https://placehold.co/120/F2F0EB/9C9894?text=P'
            return (
              <div key={ad.id} className="flex gap-3 bg-white rounded-2xl border border-black/5 p-3">
                <Link to={`/marketplace/${ad.id}`} target="_blank" className="shrink-0">
                  <img src={img} alt={ad.title} className="w-24 h-24 rounded-xl object-cover bg-surface-alt" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-ink text-sm line-clamp-1">{ad.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {Number(ad.report_count) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#C0392B' }}>
                          🚩 {ad.report_count}
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {ad.seller_name} · {ad.seller_email}
                  </p>
                  <p className="text-sm text-ink mt-1">
                    <strong>{ad.price != null ? `$${Number(ad.price).toFixed(2)}` : 'Negotiable'}</strong>
                    <span className="text-ink-tertiary"> · {ad.category || 'Uncategorized'} · {conditionLabel(ad.condition)}{ad.location ? ` · ${ad.location}` : ''}</span>
                  </p>
                  {ad.description && <p className="text-xs text-ink-secondary mt-1 line-clamp-2">{ad.description}</p>}

                  <div className="flex gap-2 mt-2 flex-wrap">
                    {ad.status !== 'approved' && (
                      <button onClick={() => setStatus(ad.id, 'approved')} disabled={busy === ad.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A' }}>Approve</button>
                    )}
                    {ad.status !== 'rejected' && (
                      <button onClick={() => setStatus(ad.id, 'rejected')} disabled={busy === ad.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}>Reject</button>
                    )}
                    {ad.status === 'approved' && (
                      <button onClick={() => toggleFeatured(ad)} disabled={busy === ad.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                        style={Number(ad.is_featured)
                          ? { background: 'linear-gradient(135deg,#B8922E,#D4AF37)', color: '#fff' }
                          : { background: 'rgba(184,146,46,0.12)', color: '#B8922E' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                        {Number(ad.is_featured) ? 'Featured' : 'Feature'}
                      </button>
                    )}
                    <Link to={`/marketplace/${ad.id}`} target="_blank"
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface-alt text-ink">View</Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NumRow({ label, hint, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 border-b border-border/60">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-ink-tertiary">{hint}</span>
      </span>
      <input type="number" min={0} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 text-sm rounded-lg px-3 py-2 border border-border bg-white text-ink text-right outline-none focus:border-ink" />
    </label>
  )
}
