import { useState, useEffect, useCallback } from 'react'
import {
  getAbandonedCartPending,
  getAbandonedCartSettings,
  updateAbandonedCartSettings,
  sendAbandonedCartRecovery,
} from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const fmt = (ts) => ts
  ? new Date(String(ts).replace(' ', 'T')).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  : '—'

function StatusBadge({ cart }) {
  if (cart.recovered_at) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#DCFCE7', color: '#15803D' }}>Recovered</span>
  }
  if (cart.email_sent_at) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>Email sent</span>
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-black/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">{label}</p>
      <p className="text-2xl font-black" style={{ color: accent || '#0F0F0F', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

export default function AdminAbandonedCarts() {
  const toast = useToast()
  const [loading,  setLoading]  = useState(true)
  const [carts,    setCarts]    = useState([])
  const [stats,    setStats]    = useState({ emails_sent_30d: 0, recovered_30d: 0, recovered_value_30d: 0 })
  const [settings, setSettings] = useState({
    enabled: 1, delay_hours: 24, discount_percent: 10, expiry_days: 7, min_cart_value: 0,
  })
  const [saving,    setSaving]   = useState(false)
  const [sendingId, setSendingId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getAbandonedCartPending()
      .then(r => {
        setCarts(r.data.data?.carts || [])
        setStats(r.data.data?.stats || {})
        if (r.data.data?.settings) setSettings(s => ({ ...s, ...r.data.data.settings }))
      })
      .catch(() => setCarts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // The settings endpoint is the source of truth for the form, but the pending
    // endpoint also returns settings — pull both so a missing app_settings row
    // still renders sane defaults.
    getAbandonedCartSettings().then(r => setSettings(s => ({ ...s, ...r.data.data }))).catch(() => {})
    load()
  }, [load])

  const saveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await updateAbandonedCartSettings(settings)
      setSettings(s => ({ ...s, ...r.data.data }))
      toast.success('Settings saved')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  const sendOne = async (cartId) => {
    setSendingId(cartId)
    try {
      const r = await sendAbandonedCartRecovery(cartId)
      const d = r.data.data || {}
      if (d.mail_enabled === false) {
        toast.info(`Coupon ${d.coupon_code} created — email disabled in dev, share the code manually.`)
      } else if (d.mail_sent) {
        toast.success(`Email sent with code ${d.coupon_code}`)
      } else {
        toast.error('Recorded, but the mail server rejected delivery.')
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send')
    } finally { setSendingId(null) }
  }

  const setField = (k) => (e) => setSettings(s => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value }))

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Abandoned Cart Recovery</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Win back customers who left without checking out. Each "Send" mints a single-use coupon and emails them a friendly nudge.
        </p>
      </div>

      {/* 30-day stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Emails sent (30d)"      value={stats.emails_sent_30d} />
        <StatCard label="Recovered (30d)"        value={stats.recovered_30d} accent="#16A34A" />
        <StatCard label="Recovered value (30d)"  value={`$${Number(stats.recovered_value_30d).toFixed(2)}`} accent="#16A34A" />
      </div>

      {/* Settings card */}
      <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-bold text-ink">Settings</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!settings.enabled} onChange={setField('enabled')} className="accent-ink" />
            <span className="text-sm font-semibold text-ink">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumField label="Wait time (hours)"      value={settings.delay_hours}      min={1}  step={1}  onChange={setField('delay_hours')}      hint="Cart is 'abandoned' after this many hours of inactivity" />
          <NumField label="Discount %"              value={settings.discount_percent} min={0}  step={1}  onChange={setField('discount_percent')} hint="Percent off the recovery coupon offers" />
          <NumField label="Coupon expiry (days)"   value={settings.expiry_days}      min={1}  step={1}  onChange={setField('expiry_days')}      hint="Coupon expires after this many days" />
          <NumField label="Min cart value ($)"     value={settings.min_cart_value}   min={0}  step={1}  onChange={setField('min_cart_value')}   hint="Skip carts below this subtotal" />
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving}
            className="bg-ink text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-ink/90 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div className="p-10 flex justify-center"><Spinner size="xl" /></div>
      ) : carts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold text-ink">No abandoned carts right now.</p>
          <p className="text-sm text-ink-tertiary mt-1">
            Carts older than {settings.delay_hours}h whose owners haven't ordered since will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-tertiary border-b border-black/5">
                <th className="px-5 py-3">Customer</th>
                <th className="px-3 py-3 text-right">Items</th>
                <th className="px-3 py-3 text-right">Value</th>
                <th className="px-3 py-3">Last activity</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Coupon</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {carts.map(c => {
                const sentDisabled = !!c.email_sent_at || sendingId === c.cart_id || !settings.enabled
                return (
                  <tr key={c.cart_id} className="border-b border-black/5 last:border-b-0 hover:bg-surface-alt/40 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-ink text-sm">{c.customer_name || 'Customer'}</p>
                        <p className="text-[11px] text-ink-tertiary">{c.email}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-ink-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.item_count}</td>
                    <td className="px-3 py-3 text-right font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>${Number(c.value).toFixed(2)}</td>
                    <td className="px-3 py-3 text-xs text-ink-tertiary">{fmt(c.updated_at)}</td>
                    <td className="px-3 py-3"><StatusBadge cart={c} /></td>
                    <td className="px-3 py-3 text-[11px] font-mono">
                      {c.coupon_code ? (
                        <span title={c.coupon_expires_at ? `expires ${fmt(c.coupon_expires_at)}` : ''}>{c.coupon_code}</span>
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                      {c.recovered_at && c.recovered_value > 0 && (
                        <div className="mt-1 text-[10px] font-semibold" style={{ color: '#16A34A' }}>
                          +${Number(c.recovered_value).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => sendOne(c.cart_id)}
                        disabled={sentDisabled}
                        className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {sendingId === c.cart_id ? 'Sending…' : c.email_sent_at ? 'Sent' : 'Send'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

function NumField({ label, hint, ...input }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">{label}</label>
      <input
        type="number"
        {...input}
        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
      {hint && <p className="text-[10px] text-ink-tertiary mt-1.5">{hint}</p>}
    </div>
  )
}
