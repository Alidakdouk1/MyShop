import { useState, useEffect } from 'react'
import { getSalesBannerAdmin, updateSalesBannerAdmin } from '../../api/salesBannerApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import SalesBanner from '../../components/common/SalesBanner'

const DEFAULTS = {
  enabled: 0,
  title: 'FLASH SALE',
  message: '20% off everything — limited time only!',
  cta_text: 'Shop now',
  cta_url: '/shop?on_sale=1',
  bg_color: '#C0392B',
  text_color: '#FFFFFF',
  ends_at: '',
  dismissible: 1,
}

const PRESETS = [
  { label: 'Red Sale',     bg: '#C0392B', fg: '#FFFFFF' },
  { label: 'Gold Holiday', bg: '#B8922E', fg: '#FFFFFF' },
  { label: 'Forest Green', bg: '#15803D', fg: '#FFFFFF' },
  { label: 'Royal Purple', bg: '#7C3AED', fg: '#FFFFFF' },
  { label: 'Midnight',     bg: '#0F0F0F', fg: '#FFFFFF' },
]

// Convert a server-side "YYYY-MM-DD HH:mm:ss" into a value the datetime-local
// input understands ("YYYY-MM-DDTHH:mm"). Returns '' when null/empty.
function toLocalInput(v) {
  if (!v) return ''
  const s = String(v).replace(' ', 'T').slice(0, 16)
  return s
}

export default function AdminSalesBanner() {
  const toast = useToast()
  const [s, setS]           = useState(DEFAULTS)
  const [loading, setLoad]  = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSalesBannerAdmin()
      .then(r => setS(prev => ({
        ...prev,
        ...r.data.data,
        ends_at: toLocalInput(r.data.data?.ends_at),
      })))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox'
      ? (e.target.checked ? 1 : 0)
      : e.target.value
    setS(prev => ({ ...prev, [k]: v }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...s,
        // Send back as "YYYY-MM-DD HH:mm:ss" or null
        ends_at: s.ends_at ? s.ends_at.replace('T', ' ') + ':00' : null,
      }
      const r = await updateSalesBannerAdmin(payload)
      setS(prev => ({ ...prev, ...r.data.data, ends_at: toLocalInput(r.data.data?.ends_at) }))
      toast.success('Saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="xl" /></div>

  // Preview config — the component expects ends_at in the same shape the API
  // returns, so re-format the input value for the preview.
  const previewCfg = {
    ...s,
    enabled: 1, // always force-on for preview so admin can see colors before turning live
    ends_at: s.ends_at ? s.ends_at.replace('T', ' ') + ':00' : null,
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Sales Banner</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Top-of-site countdown banner. Pin announcements above the navbar — great for flash sales, free-shipping weekends, holiday promos.
        </p>
      </div>

      {/* Live preview — pass config so it doesn't refetch from the server */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Preview</p>
        <div className="rounded-xl overflow-hidden border border-border">
          <SalesBanner config={previewCfg} previewOnly />
        </div>
        {!s.enabled && (
          <p className="text-[11px] text-ink-tertiary mt-2 italic">Preview only — toggle Enabled below to show on the storefront.</p>
        )}
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-ink">Settings</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!s.enabled} onChange={set('enabled')} className="accent-ink" />
            <span className="text-sm font-semibold text-ink">{s.enabled ? 'Live on site' : 'Disabled'}</span>
          </label>
        </div>

        <div className="space-y-4">
          <Field label="Tag (left chip)" maxLength={80} value={s.title} onChange={set('title')} placeholder="FLASH SALE" />
          <Field label="Message" maxLength={200} value={s.message} onChange={set('message')} required placeholder="20% off everything!" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA button text (optional)" maxLength={40} value={s.cta_text} onChange={set('cta_text')} placeholder="Shop now" />
            <Field label="CTA URL (optional)" value={s.cta_url} onChange={set('cta_url')} placeholder="/shop?on_sale=1" />
          </div>

          <div>
            <Label>Countdown ends at (optional)</Label>
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={s.ends_at}
                onChange={set('ends_at')}
                className="text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" />
              {s.ends_at && (
                <button type="button" onClick={() => setS(p => ({ ...p, ends_at: '' }))}
                  className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-accent transition-colors">
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-ink-tertiary mt-1.5">Leave blank for a banner with no countdown. Once the date passes, the banner auto-hides.</p>
          </div>

          <div>
            <Label>Colour presets</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setS(prev => ({ ...prev, bg_color: p.bg, text_color: p.fg }))}
                  className="text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg hover:scale-105 transition-transform"
                  style={{ background: p.bg, color: p.fg }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Background" value={s.bg_color}   onChange={set('bg_color')} />
              <ColorField label="Text"       value={s.text_color} onChange={set('text_color')} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-border">
            <input type="checkbox" checked={!!s.dismissible} onChange={set('dismissible')} className="accent-ink" />
            <span className="text-sm text-ink-secondary">Let visitors dismiss the banner (remembered for the session)</span>
          </label>
        </div>

        <div className="flex justify-end pt-5 mt-2 border-t border-border">
          <button type="submit" disabled={saving}
            className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save banner'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Label({ children }) {
  return <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">{children}</label>
}

function Field({ label, value, onChange, ...rest }) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value ?? ''} onChange={onChange} {...rest}
        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors" />
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={onChange}
          className="w-12 h-10 rounded-lg border border-border cursor-pointer" />
        <input type="text" value={value} onChange={onChange} pattern="^#[0-9a-fA-F]{6}$"
          className="flex-1 text-sm font-mono rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" />
      </div>
    </div>
  )
}
