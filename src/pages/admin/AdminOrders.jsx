import { useState, useEffect } from 'react'
import { getAdminOrders, updateOrderStatus, updateOrderTracking, bulkUpdateOrders, getWhatsAppNotifySettings } from '../../api/adminApi'
import { getOrder } from '../../api/orderApi'
import { markOrderPaid } from '../../api/paymentApi'
import { downloadInvoice } from '../../lib/invoice'
import { useToast } from '../../hooks/useToast'
import { TableRowSkeleton } from '../../components/ui/Skeleton'
import Badge from '../../components/ui/Badge'
import { Select } from '../../components/ui/Input'
import Pagination from '../../components/common/Pagination'
import { buildWhatsAppUrl, substituteTemplate, eventForStatus, EVENT_LABELS } from '../../lib/whatsappNotify'
import { CARRIERS, carrierBySlug, buildTrackingUrl } from '../../lib/carriers'

const STATUS_BADGE = {
  pending:    'warning', confirmed: 'info', processing: 'info',
  shipped:    'gold',    delivered: 'success', cancelled: 'default',
}
const ALL_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']

export default function AdminOrders() {
  const toast = useToast()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [page, setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [invoicing, setInvoicing] = useState(null)
  const [markingPaid, setMarkingPaid] = useState(null)
  const [waPrompt, setWaPrompt] = useState(null)         // { order, event, text, phone, url }
  const [waSettings, setWaSettings] = useState(null)     // loaded once
  const [trackingFor, setTrackingFor] = useState(null)   // order being edited
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkBusy,    setBulkBusy]    = useState(false)

  useEffect(() => {
    // Pull the templates once — cheap, single row.
    getWhatsAppNotifySettings()
      .then(r => setWaSettings(r.data.data))
      .catch(() => setWaSettings(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    getAdminOrders({ page, status: statusFilter || undefined })
      .then(r => {
        setOrders(r.data.data || [])
        setTotalPages(r.data.meta?.last_page || 1)
      }).catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  const handleStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      await updateOrderStatus(orderId, status)
      const updated = orders.find(o => o.id === orderId)
      setOrders(os => os.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success('Status updated')

      // Auto-prompt: if there's an enabled WhatsApp template for this status,
      // offer to send it. Fetches the full order for the phone number.
      const event = eventForStatus(status, updated?.payment_status)
      const tpl   = waSettings?.enabled && waSettings?.templates?.[event]
      if (tpl?.enabled && tpl.text) {
        try {
          const { data } = await getOrder(orderId)
          const order = data.data
          const phone = order?.shipping_address?.phone || order?.phone || updated?.phone
          if (phone) openWaPrompt(order, event, tpl.text, phone)
        } catch { /* silent — the status update already succeeded */ }
      }
    } catch { toast.error('Failed') }
    finally { setUpdating(null) }
  }

  // Open the confirm prompt; calling code provides the resolved order + phone.
  const openWaPrompt = (order, event, template, phone) => {
    const text = substituteTemplate(template, order)
    const url  = buildWhatsAppUrl({ phone, template, order })
    if (!url) { toast.error('Customer has no phone number on file'); return }
    setWaPrompt({ order, event, text, phone, url })
  }

  // Manual "WhatsApp" button per row — pick a sensible template for current status.
  const handleWhatsApp = async (orderRow) => {
    if (!waSettings?.enabled) { toast.info('WhatsApp templates are disabled in settings'); return }
    const event = eventForStatus(orderRow.status, orderRow.payment_status)
    const tpl   = waSettings.templates?.[event]
    if (!tpl?.enabled || !tpl.text) {
      toast.info(`No "${EVENT_LABELS[event]}" template configured`)
      return
    }
    try {
      const { data } = await getOrder(orderRow.id)
      const order = data.data
      const phone = order?.shipping_address?.phone || order?.phone
      if (!phone) { toast.error('Customer has no phone number on file'); return }
      openWaPrompt(order, event, tpl.text, phone)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load order')
    }
  }

  // The list rows only hold order summaries, so fetch the full order (with items
  // + address) before building the invoice. Admins are allowed by /api/orders/{id}.
  const handleMarkPaid = async (orderId) => {
    if (!confirm('Mark this order as paid? Do this only after you confirm the transfer landed in your account.')) return
    setMarkingPaid(orderId)
    try {
      await markOrderPaid(orderId)
      setOrders(os => os.map(o => o.id === orderId ? { ...o, payment_status: 'paid' } : o))
      toast.success('Marked as paid')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark paid')
    } finally { setMarkingPaid(null) }
  }

  // ── Bulk selection ─────────────────────────────────────────────────
  const allOnPageSelected = orders.length > 0 && orders.every(o => selectedIds.has(o.id))

  const toggleOne = (id) => setSelectedIds(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const toggleAll = () => setSelectedIds(prev => {
    const n = new Set(prev)
    if (allOnPageSelected) orders.forEach(o => n.delete(o.id))
    else                   orders.forEach(o => n.add(o.id))
    return n
  })

  const runBulkStatus = async (status) => {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (!confirm(`Set ${ids.length} order${ids.length === 1 ? '' : 's'} to "${status}"?`)) return
    setBulkBusy(true)
    try {
      const { data } = await bulkUpdateOrders({ ids, action: 'status_update', status })
      toast.success(data?.message || 'Done')
      setOrders(os => os.map(o => selectedIds.has(o.id) ? { ...o, status } : o))
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed')
    } finally { setBulkBusy(false) }
  }

  const handleInvoice = async (orderId) => {
    setInvoicing(orderId)
    try {
      const { data } = await getOrder(orderId)
      await downloadInvoice(data.data)
    } catch (err) {
      console.error('Admin invoice failed:', err)
      toast.error(`Could not generate invoice: ${err?.message || ''}`)
    } finally {
      setInvoicing(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="hero-display text-4xl text-ink mb-8 tracking-wide">ALL ORDERS</h1>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {['', ...ALL_STATUSES].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                ${statusFilter === s ? 'bg-ink text-white' : 'bg-surface border border-border text-ink-secondary hover:text-ink'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar — same dark-pill design as AdminProducts. */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-30 mb-4 rounded-2xl flex items-center gap-2 flex-wrap p-3" style={{ background: '#0F0F0F', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}>
          <span className="text-sm font-bold pl-2">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs font-semibold opacity-70 hover:opacity-100 px-2">Clear</button>
          <span className="text-[11px] opacity-60 ml-1">Set status to:</span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button onClick={() => runBulkStatus('confirmed')} disabled={bulkBusy} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(2,132,199,0.18)',  color: '#7DD3FC' }}>Confirmed</button>
            <button onClick={() => runBulkStatus('shipped')}   disabled={bulkBusy} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.20)', color: '#C4B5FD' }}>Shipped</button>
            <button onClick={() => runBulkStatus('delivered')} disabled={bulkBusy} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(22,163,74,0.18)',  color: '#86EFAC' }}>Delivered</button>
            <button onClick={() => runBulkStatus('cancelled')} disabled={bulkBusy} className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(192,57,43,0.22)',  color: '#FCA5A5' }}>Cancelled</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <tbody className="divide-y divide-border">
                {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cells={8} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-9">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                      className="accent-ink cursor-pointer"
                    />
                  </th>
                  {['Order', 'Customer', 'Total', 'Payment', 'Status', 'Date', 'Invoice'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-ink-tertiary">No orders found</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id} className={`hover:bg-surface-alt/50 transition-colors ${selectedIds.has(o.id) ? 'bg-surface-alt/30' : ''}`}>
                    <td className="px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                        aria-label={`Select order ${o.id}`}
                        className="accent-ink cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold">#{o.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink flex items-center gap-1.5 flex-wrap">
                        {o.customer_name}
                        {o.vip_level && o.vip_level !== 'regular' && (
                          <span
                            className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                            style={{
                              background: o.vip_level === 'gold' ? '#FEF9EC' : '#F5F3FF',
                              color:      o.vip_level === 'gold' ? '#B8922E' : '#7C3AED',
                            }}
                          >
                            {o.vip_level}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-tertiary">{o.customer_email}</p>
                      {o.pinned_note && (
                        <p
                          className="mt-1 text-[11px] leading-snug px-2 py-1 rounded line-clamp-2 max-w-[260px]"
                          title={o.pinned_note}
                          style={{ background: '#FEF9EC', color: '#92400E' }}
                        >
                          📌 {o.pinned_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="text-ink-secondary capitalize">{o.payment_method?.replace('_', ' ')}</div>
                      {o.payment_method === 'bank_transfer' && o.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(o.id)}
                          disabled={markingPaid === o.id}
                          title="Mark as paid once the transfer landed"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-white disabled:opacity-60"
                          style={{ background: '#16A34A' }}
                        >
                          {markingPaid === o.id ? '…' : '✓ Mark paid'}
                        </button>
                      )}
                      {o.payment_status === 'paid' && (
                        <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={o.status} onChange={e => handleStatus(o.id, e.target.value)}
                        disabled={updating === o.id} className="!h-8 !text-xs !py-0">
                        {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleInvoice(o.id)}
                          disabled={invoicing === o.id}
                          title="Download invoice PDF"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-ink-secondary hover:text-ink hover:border-ink/40 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                          </svg>
                          {invoicing === o.id ? '…' : 'PDF'}
                        </button>
                        {/* Tracking — set carrier + tracking # for the shipment */}
                        <button
                          onClick={() => setTrackingFor(o)}
                          title={o.tracking_number ? `Tracking: ${o.tracking_number}` : 'Add tracking'}
                          aria-label="Edit tracking"
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                            o.tracking_number
                              ? 'text-white'
                              : 'border border-border text-ink-secondary hover:text-ink hover:border-ink/40'
                          }`}
                          style={o.tracking_number ? { background: '#7C3AED' } : undefined}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" rx="2"/>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                            <circle cx="5.5" cy="18.5" r="2.5"/>
                            <circle cx="18.5" cy="18.5" r="2.5"/>
                          </svg>
                        </button>

                        {/* WhatsApp customer — opens wa.me with the template for current status */}
                        {waSettings?.enabled && (
                          <button
                            onClick={() => handleWhatsApp(o)}
                            title="Notify customer via WhatsApp"
                            aria-label="Notify customer via WhatsApp"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                            style={{ background: '#25D366', color: '#fff' }}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* WhatsApp confirm + preview modal — admin reviews message, then clicks
          "Open WhatsApp" which opens wa.me in a new tab pre-filled. */}
      {waPrompt && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setWaPrompt(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6"
            style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2">
                <span style={{ color: '#25D366' }}>●</span>
                Send via WhatsApp
              </h2>
              <button onClick={() => setWaPrompt(null)} aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-ink-tertiary mb-3">
              Template: <span className="font-semibold text-ink">{EVENT_LABELS[waPrompt.event]}</span> ·
              To: <span className="font-mono text-ink">{waPrompt.phone}</span>
            </p>

            <div className="rounded-xl p-3 mb-4 max-h-60 overflow-y-auto"
              style={{ background: '#DCFCE7', borderLeft: '3px solid #25D366' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#0F172A' }}>
                {waPrompt.text}
              </p>
            </div>

            <p className="text-[11px] text-ink-tertiary mb-4 leading-relaxed">
              Opens WhatsApp Web/Desktop in a new tab with the message pre-filled. Click <strong>Send</strong> in WhatsApp to deliver it.
            </p>

            <div className="flex justify-end gap-2">
              <button onClick={() => setWaPrompt(null)}
                className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors">
                Cancel
              </button>
              <a href={waPrompt.url} target="_blank" rel="noopener noreferrer"
                onClick={() => setWaPrompt(null)}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl text-white transition-colors"
                style={{ background: '#25D366' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tracking editor modal */}
      {trackingFor && (
        <TrackingModal
          order={trackingFor}
          onClose={() => setTrackingFor(null)}
          onSaved={(patch) => {
            setOrders(os => os.map(o => o.id === trackingFor.id ? { ...o, ...patch } : o))
            setTrackingFor(null)
            toast.success('Tracking saved')
          }}
        />
      )}
    </div>
  )
}

function TrackingModal({ order, onClose, onSaved }) {
  const [carrier, setCarrier]   = useState(order.carrier || '')
  const [num,     setNum]       = useState(order.tracking_number || '')
  const [url,     setUrl]       = useState(order.tracking_url || '')
  const [saving,  setSaving]    = useState(false)
  const toast = useToast()

  const c = carrierBySlug(carrier)
  const needsUrl = carrier === 'other' || (c && !c.url)
  const preview  = buildTrackingUrl({ carrier, tracking_number: num, tracking_url: url })

  const save = async (clear) => {
    setSaving(true)
    try {
      const payload = clear
        ? { carrier: '', tracking_number: '', tracking_url: '' }
        : { carrier, tracking_number: num.trim(), tracking_url: url.trim() }
      await updateOrderTracking(order.id, payload)
      onSaved(payload)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6" style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-ink text-lg">Shipment tracking · #{order.id}</h2>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary block mb-1.5">Carrier</label>
            <select
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink"
            >
              <option value="">— Select carrier —</option>
              {CARRIERS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary block mb-1.5">Tracking number</label>
            <input
              value={num}
              onChange={e => setNum(e.target.value)}
              placeholder="e.g. TRK-LB-44182"
              className="w-full text-sm font-mono rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink"
            />
          </div>

          {needsUrl && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary block mb-1.5">
                Tracking URL <span className="font-normal lowercase tracking-normal text-ink-tertiary">(paste full link)</span>
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://carrier.com/track/123"
                className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink"
              />
            </div>
          )}

          {preview && (
            <a
              href={preview}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-accent hover:underline break-all"
            >
              Preview: {preview}
            </a>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-6">
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="text-xs font-bold uppercase tracking-wider px-3 py-2.5 text-ink-tertiary hover:text-accent disabled:opacity-60"
          >
            Clear tracking
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving || !carrier || !num.trim()}
              className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl text-white disabled:opacity-60"
              style={{ background: '#0F172A' }}
            >
              {saving ? 'Saving…' : 'Save tracking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
