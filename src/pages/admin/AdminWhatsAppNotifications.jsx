import { useState, useEffect } from 'react'
import { getWhatsAppNotifySettings, updateWhatsAppNotifySettings } from '../../api/adminApi'
import { EVENT_LABELS, EVENT_KEYS, substituteTemplate } from '../../lib/whatsappNotify'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

// Fake order used to render the live preview so admin sees substituted text.
const PREVIEW_ORDER = {
  id: 1042,
  total: 89.50,
  shipping_address: { recipient_name: 'Layla Karam', phone: '+9617012345' },
  customer_name: 'Layla Karam',
}

const VAR_HINTS = [
  { key: '{customer_name}', hint: 'recipient first name' },
  { key: '{order_id}',      hint: 'order id (e.g. 1042)' },
  { key: '{reference}',     hint: 'MS-{order_id}' },
  { key: '{total}',         hint: 'formatted total ($89.50)' },
  { key: '{tracking_url}',  hint: 'order detail page URL' },
  { key: '{store_name}',    hint: 'Pick&Go LB' },
]

export default function AdminWhatsAppNotifications() {
  const toast = useToast()
  const [data, setData]     = useState(null)
  const [loading, setLoad]  = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getWhatsAppNotifySettings()
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoad(false))
  }, [])

  const setEnabled = (on) => setData(d => ({ ...d, enabled: on ? 1 : 0 }))
  const setTpl = (event, patch) => setData(d => ({
    ...d,
    templates: { ...d.templates, [event]: { ...d.templates[event], ...patch } },
  }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await updateWhatsAppNotifySettings(data)
      setData(r.data.data)
      toast.success('Templates saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  const insertVar = (event, token) => {
    const ta = document.getElementById(`wa-text-${event}`)
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const cur = data.templates[event].text || ''
    const next = cur.slice(0, start) + token + cur.slice(end)
    setTpl(event, { text: next })
    // Re-focus + place cursor right after the inserted token.
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + token.length
    })
  }

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="xl" /></div>
  if (!data)   return <div className="p-10 text-center text-ink-tertiary">Could not load settings.</div>

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">WhatsApp Notifications</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Edit the message templates that auto-prefill when you tap "WhatsApp" on an order. Free — uses click-to-chat, no Business API needed.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!data.enabled} onChange={e => setEnabled(e.target.checked)} className="accent-ink" />
          <span className="text-sm font-semibold text-ink">{data.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">How it works</p>
        <p className="text-sm text-ink-secondary leading-relaxed">
          When an order's status changes (or you tap the WhatsApp button on the orders list), a wa.me link opens
          in a new tab with the right template pre-filled to the customer's phone. You click <strong>Send</strong> in WhatsApp Web/Desktop.
          The customer can reply normally — it's a real WhatsApp thread.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VAR_HINTS.map(v => (
            <span key={v.key} className="text-[11px] font-mono px-2 py-1 rounded-md bg-surface-alt text-ink-secondary" title={v.hint}>
              {v.key}
            </span>
          ))}
        </div>
      </div>

      {/* Templates */}
      <form onSubmit={save}>
        {EVENT_KEYS.map(event => {
          const t = data.templates[event] || { enabled: 0, text: '' }
          const preview = substituteTemplate(t.text, PREVIEW_ORDER)
          return (
            <div key={event} className="bg-white rounded-2xl border border-black/5 p-5 mb-3">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="font-bold text-ink">{EVENT_LABELS[event]}</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!t.enabled}
                    onChange={e => setTpl(event, { enabled: e.target.checked ? 1 : 0 })} className="accent-ink" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                    {t.enabled ? 'On' : 'Off'}
                  </span>
                </label>
              </div>

              <textarea
                id={`wa-text-${event}`}
                value={t.text || ''}
                onChange={e => setTpl(event, { text: e.target.value })}
                rows={4}
                maxLength={2000}
                placeholder="Hi {customer_name}, your order #{order_id} ..."
                disabled={!t.enabled}
                className="w-full text-sm rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-ink resize-y disabled:opacity-50"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />

              {t.enabled && (
                <>
                  {/* Insert-variable buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {VAR_HINTS.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVar(event, v.key)}
                        className="text-[10px] font-mono px-2 py-1 rounded-md bg-surface-alt hover:bg-border text-ink transition-colors"
                        title={`Insert ${v.key}`}
                      >
                        + {v.key}
                      </button>
                    ))}
                  </div>

                  {/* Live preview */}
                  <div className="mt-3 p-3 rounded-xl" style={{ background: '#DCFCE7', borderLeft: '3px solid #25D366' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#15803D' }}>
                      WhatsApp preview (sample order #{PREVIEW_ORDER.id})
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#0F172A' }}>
                      {preview || <em className="text-ink-tertiary">Empty template</em>}
                    </p>
                  </div>
                </>
              )}
            </div>
          )
        })}

        <div className="flex justify-end pt-3">
          <button type="submit" disabled={saving}
            className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Templates'}
          </button>
        </div>
      </form>
    </div>
  )
}
