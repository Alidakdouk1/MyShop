import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getOrder, cancelOrder, getReturns, createReturn, reorderOrder } from '../../api/orderApi'
import { getBankTransferInfo, getWhishInfo } from '../../api/paymentApi'
import { fetchCart } from '../../store/slices/cartSlice'
import { useToast } from '../../hooks/useToast'
import { useCurrency } from '../../context/CurrencyContext'
import { resolveImg } from '../../lib/img'
import { carrierBySlug, buildTrackingUrl } from '../../lib/carriers'
import { OrderDetailSkeleton } from '../../components/ui/Skeleton'
import Confetti from '../../components/common/Confetti'
import { downloadInvoice } from '../../lib/invoice'

const RETURN_STATUS = {
  requested: { bg: '#FEF9EC', text: '#B8922E', label: 'Requested' },
  approved:  { bg: '#EFF6FF', text: '#0284C7', label: 'Approved' },
  rejected:  { bg: '#FEF2F2', text: '#C0392B', label: 'Rejected' },
  completed: { bg: '#F0FDF4', text: '#16A34A', label: 'Completed' },
}

const STEP_META = {
  pending:   { label: 'Order Placed', sub: 'We received your order',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  confirmed: { label: 'Confirmed',    sub: 'Your order is being prepared', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  shipped:   { label: 'Shipped',      sub: 'On its way to you',            icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8' },
  delivered: { label: 'Delivered',    sub: 'Order completed',              icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  cancelled: { label: 'Cancelled',    sub: 'This order was cancelled',     icon: 'M6 18L18 6M6 6l12 12' },
  refunded:  { label: 'Refunded',     sub: 'This order was refunded',      icon: 'M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1' },
}

const STEP_ORDER = ['pending', 'confirmed', 'shipped', 'delivered']

function fmtTs(ts) {
  if (!ts) return null
  const d = new Date(String(ts).replace(' ', 'T'))
  if (isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function OrderTimeline({ status, history = [] }) {
  const isTerminal = status === 'cancelled' || status === 'refunded'

  // First-seen timestamp for each status.
  const tsMap = {}
  ;(history || []).forEach(h => { if (!tsMap[h.status]) tsMap[h.status] = h.created_at })

  let rows
  if (isTerminal) {
    // Terminal orders read straight from what actually happened.
    const evts = (history && history.length) ? history : [{ status, created_at: null }]
    rows = evts.map((h, i) => {
      const term = h.status === 'cancelled' || h.status === 'refunded'
      return {
        key:   `${h.status}-${i}`,
        meta:  STEP_META[h.status] || { label: h.status, sub: '', icon: STEP_META.confirmed.icon },
        ts:    h.created_at,
        note:  h.note,
        state: term ? 'terminal' : 'done',
      }
    })
  } else {
    const activeIdx = STEP_ORDER.indexOf(status)
    rows = STEP_ORDER.map((key, i) => ({
      key,
      meta:  STEP_META[key],
      ts:    tsMap[key],
      state: i < activeIdx ? 'done' : i === activeIdx ? 'current' : 'upcoming',
    }))
  }

  return (
    <ol className="relative">
      {rows.map((r, i) => {
        const last      = i === rows.length - 1
        const term      = r.state === 'terminal'
        const reached   = r.state === 'done' || r.state === 'current' || term
        const circleBg  = term ? '#C0392B' : r.state === 'done' ? '#0F0F0F' : r.state === 'current' ? '#fff' : '#F0EEE9'
        const iconColor = term || r.state === 'done' ? '#fff' : r.state === 'current' ? '#0F0F0F' : '#C8C4BE'
        const lineDark  = r.state === 'done' || term
        const tsText    = fmtTs(r.ts)

        return (
          <li key={r.key} className="relative flex gap-4 pb-7 last:pb-0">
            {/* connector to the next node */}
            {!last && (
              <span className="absolute w-0.5"
                style={{ left: 19, top: 40, bottom: 0, background: lineDark ? '#0F0F0F' : '#E5E2DD' }} />
            )}

            {/* node */}
            <div className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: circleBg,
                border: r.state === 'current' ? '2px solid #0F0F0F' : 'none',
                boxShadow: r.state === 'current' ? '0 0 0 4px rgba(15,15,15,0.1)' : 'none',
              }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: iconColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={r.meta.icon} />
              </svg>
            </div>

            {/* text */}
            <div className="pt-1.5 min-w-0">
              <p className="text-sm font-bold leading-tight flex items-center gap-2"
                style={{ color: term ? '#C0392B' : reached ? '#0F0F0F' : '#9C9894' }}>
                {r.meta.label}
                {r.state === 'current' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(15,15,15,0.08)', color: '#0F0F0F' }}>Current</span>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9C9894' }}>
                {tsText || (r.state === 'upcoming' ? 'Pending' : r.meta.sub)}
              </p>
              {r.note && <p className="text-xs mt-1" style={{ color: '#5C5854' }}>{r.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function OrderDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const toast    = useToast()
  const { format } = useCurrency()
  // One-shot confetti when arriving here straight from checkout. The flag is
  // also written to sessionStorage so a refresh doesn't replay the burst.
  const [showConfetti, setShowConfetti] = useState(() => {
    if (typeof window === 'undefined') return false
    const fromCheckout = location.state?.justPlaced === true
    const key = `myshop_celebrated_order_${id}`
    if (fromCheckout && !sessionStorage.getItem(key)) {
      try { sessionStorage.setItem(key, '1') } catch {}
      return true
    }
    return false
  })
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [returnReq,        setReturnReq]        = useState(null)
  const [showReturnForm,   setShowReturnForm]   = useState(false)
  const [returnReason,     setReturnReason]     = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [downloading,      setDownloading]      = useState(false)
  const [reordering,       setReordering]       = useState(false)
  const [bank,             setBank]             = useState(null)
  const [whish,            setWhish]            = useState(null)
  const [copied,           setCopied]           = useState(null)

  const handleDownloadInvoice = async () => {
    setDownloading(true)
    try {
      await downloadInvoice(order)
    } catch (err) {
      console.error('Invoice PDF generation failed:', err)
      toast.error(`PDF error: ${err?.message || err}`)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    getOrder(id)
      .then(r => setOrder(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    getReturns()
      .then(r => setReturnReq((r.data.data || []).find(x => Number(x.order_id) === Number(id)) || null))
      .catch(() => {})
    getBankTransferInfo()
      .then(r => setBank(r.data.data))
      .catch(() => {})
    getWhishInfo()
      .then(r => setWhish(r.data.data))
      .catch(() => {})
  }, [id])

  const copyText = async (label, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  const handleReturn = async (e) => {
    e.preventDefault()
    if (!returnReason.trim()) return
    setReturnSubmitting(true)
    try {
      const { data } = await createReturn({ order_id: id, reason: returnReason.trim() })
      setReturnReq(data.data)
      setShowReturnForm(false)
      setReturnReason('')
      toast.success('Return request submitted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit return')
    } finally {
      setReturnSubmitting(false)
    }
  }

  const handleReorder = async () => {
    setReordering(true)
    try {
      const { data } = await reorderOrder(id)
      await dispatch(fetchCart())
      const added   = data?.data?.added ?? 0
      const skipped = data?.data?.skipped ?? []
      if (added === 0) {
        toast.error(skipped.length
          ? `Nothing was added — items unavailable: ${skipped.map(s => s.name).join(', ')}`
          : 'Nothing to re-add.')
      } else if (skipped.length) {
        toast.success(`Added ${added} item${added === 1 ? '' : 's'} · skipped ${skipped.length} (${skipped.map(s => s.name).join(', ')})`)
        navigate('/cart')
      } else {
        toast.success(`Added ${added} item${added === 1 ? '' : 's'} to your cart`)
        navigate('/cart')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reorder')
    } finally { setReordering(false) }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await cancelOrder(id)
      toast.success('Order cancelled')
      const r = await getOrder(id)
      setOrder(r.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order')
    } finally { setCancelling(false) }
  }

  if (loading) return <OrderDetailSkeleton />
  if (!order) return (
    <div className="text-center py-20 text-ink-secondary">Order not found</div>
  )

  const FIVE_HOURS_MS   = 5 * 60 * 60 * 1000
  const msElapsed       = Date.now() - new Date(order.created_at).getTime()
  const withinWindow    = msElapsed <= FIVE_HOURS_MS
  const isCancellable   = ['pending', 'confirmed'].includes(order.status)
  const canCancel       = isCancellable && withinWindow

  const msRemaining     = Math.max(0, FIVE_HOURS_MS - msElapsed)
  const hoursLeft       = Math.floor(msRemaining / 3600000)
  const minsLeft        = Math.floor((msRemaining % 3600000) / 60000)

  const subtotal  = Number(order.subtotal || 0)
  const shipping  = Number(order.shipping_fee || 0)
  const discount  = Number(order.discount || 0)
  const tax       = Number(order.tax || 0)
  const total     = Number(order.total || 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-page-in">

      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Celebration banner — only when the user JUST placed this order. */}
      {showConfetti && (
        <div
          className="mb-6 rounded-2xl p-5 text-center"
          style={{
            background:    'linear-gradient(135deg, rgba(0,209,193,0.12) 0%, rgba(163,255,18,0.10) 100%)',
            border:        '1px solid rgba(0,209,193,0.30)',
            animation:     'popIn 0.55s cubic-bezier(0.34,1.4,0.64,1) both',
          }}
        >
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0AAFA3' }}>
            Order placed
          </p>
          <p className="text-xs text-ink-tertiary mt-1">
            Thanks for shopping with Pick&amp;Go LB. We'll keep you posted on every status change.
          </p>
        </div>
      )}

      {/* Breadcrumb + header */}
      <div className="mb-8">
        <Link to="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 hover:underline"
          style={{ color: '#9C9894' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Orders
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-ink">Order #{order.order_number ?? order.id}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9C9894' }}>
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#0F0F0F' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {reordering ? 'Adding…' : 'Reorder'}
            </button>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border transition-all hover:opacity-70 disabled:opacity-50"
              style={{ borderColor: '#0F0F0F', color: '#0F0F0F' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              {downloading ? 'Generating…' : 'Download Invoice'}
            </button>
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm font-bold px-4 py-2 rounded-xl border transition-all hover:opacity-70 disabled:opacity-40"
                style={{ borderColor: '#C0392B', color: '#C0392B' }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shipment tracking — visible once admin sets carrier + tracking# */}
      {(order.tracking_number || order.tracking_url) && (() => {
        const c = carrierBySlug(order.carrier)
        const trackUrl = buildTrackingUrl(order)
        return (
          <div className="rounded-2xl p-5 mb-4" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: '#5B21B6' }}>
                  Shipped {c ? `via ${c.name}` : ''}
                </p>
                {order.tracking_number && (
                  <p className="text-xs font-mono mt-1" style={{ color: '#6D28D9' }}>
                    Tracking #: <span className="font-bold">{order.tracking_number}</span>
                  </p>
                )}
              </div>
            </div>
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
              >
                Track your shipment
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
          </div>
        )
      })()}

      {/* Cancel / edit window notice */}
      {isCancellable && (
        <div className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
          style={withinWindow
            ? { background: '#FEF9EC', border: '1px solid #F5DFA0' }
            : { background: '#F4F4F4', border: '1px solid #E5E2DD' }
          }>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: withinWindow ? '#B8922E' : '#9C9894' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {withinWindow ? (
            <p className="text-sm font-medium" style={{ color: '#92700A' }}>
              You have <span className="font-bold">{hoursLeft}h {minsLeft}m</span> left to cancel or edit this order.
            </p>
          ) : (
            <p className="text-sm font-medium" style={{ color: '#9C9894' }}>
              The 5-hour cancellation window has closed for this order.
            </p>
          )}
        </div>
      )}

      {/* Whish payment-pending card */}
      {order.payment_method === 'whish' && order.payment_status !== 'paid' && whish?.enabled && whish.whish_phone && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: '#F3E8FF' }}>📱</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#6D28D9' }}>Payment pending — send via Whish to complete your order</p>
              <p className="text-xs mt-0.5" style={{ color: '#7C3AED' }}>
                Send <span className="font-bold">{format(total)}</span> via Whish Money and include the reference number in the note.
              </p>
            </div>
          </div>

          {/* Reference */}
          <div className="mt-4 p-3 rounded-xl flex items-center justify-between gap-3"
               style={{ background: '#fff', border: '1.5px dashed #6D28D9' }}>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>Reference</p>
              <p className="text-base font-mono font-black text-ink">MS-{order.id}</p>
            </div>
            <button type="button" onClick={() => copyText('ref', `MS-${order.id}`)}
              className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg shrink-0 text-white"
              style={{ background: '#6D28D9' }}>
              {copied === 'ref' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Whish details */}
          <div className="mt-3 bg-white rounded-xl border border-black/5 divide-y divide-black/5">
            {[
              { label: 'Send to (Whish phone)', value: whish.whish_phone },
              { label: 'Account name',          value: whish.whish_name },
              { label: 'Amount',                value: `${format(total)} ${whish.currency_note ? `(${whish.currency_note})` : ''}` },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>{r.label}</p>
                  <p className="text-sm font-mono font-semibold text-ink truncate">{r.value}</p>
                </div>
                <button type="button" onClick={() => copyText(r.label, String(r.value))}
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shrink-0"
                  style={{ background: '#F0EEE9', color: '#0F0F0F' }}>
                  {copied === r.label ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>

          {whish.instructions && (
            <p className="text-xs mt-3 leading-relaxed" style={{ color: '#5C5854' }}>{whish.instructions}</p>
          )}

          {/* Open Whish app — re-triggers the deep link in case the user closed
              the app or it didn't auto-launch from checkout. */}
          <a
            href={whish.whish_deeplink || 'whish://'}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12" y2="18"/>
            </svg>
            Open Whish App
          </a>
        </div>
      )}

      {/* Bank transfer payment-pending card */}
      {order.payment_method === 'bank_transfer' && order.payment_status !== 'paid' && bank?.enabled && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: '#FEF3C7' }}>🏦</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#92400E' }}>Payment pending — please transfer to complete your order</p>
              <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>
                Send <span className="font-bold">{format(total)}</span> to the account below and include the reference number in the transfer description.
              </p>
            </div>
          </div>

          {/* Reference number — most important field */}
          <div className="mt-4 p-3 rounded-xl flex items-center justify-between gap-3"
               style={{ background: '#fff', border: '1.5px dashed #0F0F0F' }}>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>Reference</p>
              <p className="text-base font-mono font-black text-ink">MS-{order.id}</p>
            </div>
            <button type="button" onClick={() => copyText('ref', `MS-${order.id}`)}
              className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg shrink-0"
              style={{ background: '#0F0F0F', color: '#fff' }}>
              {copied === 'ref' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Bank details */}
          <div className="mt-3 bg-white rounded-xl border border-black/5 divide-y divide-black/5">
            {[
              { label: 'Bank',           value: bank.bank_name },
              { label: 'Account name',   value: bank.account_name },
              { label: 'Account number', value: bank.account_number },
              { label: 'IBAN',           value: bank.iban },
              { label: 'SWIFT',          value: bank.swift },
              { label: 'Amount',         value: `${format(total)} ${bank.currency_note ? `(${bank.currency_note})` : ''}` },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>{r.label}</p>
                  <p className="text-sm font-mono font-semibold text-ink truncate">{r.value}</p>
                </div>
                <button type="button" onClick={() => copyText(r.label, String(r.value))}
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shrink-0"
                  style={{ background: '#F0EEE9', color: '#0F0F0F' }}>
                  {copied === r.label ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>

          {bank.instructions && (
            <p className="text-xs mt-3 leading-relaxed" style={{ color: '#5C5854' }}>
              {bank.instructions}
            </p>
          )}
        </div>
      )}

      {/* Status stepper */}
      <div className="rounded-2xl border p-6 mb-4"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#9C9894' }}>Order Status</p>
        <OrderTimeline status={order.status} history={order.status_history} />
        {order.tracking_number && (
          <div className="mt-5 pt-4 border-t flex items-center gap-2"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <svg className="w-4 h-4 shrink-0" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-xs text-ink-secondary">Tracking: </span>
            <span className="text-xs font-mono font-semibold text-ink">{order.tracking_number}</span>
          </div>
        )}
      </div>

      {/* Returns / RMA — for delivered orders (or once a request exists) */}
      {(order.status === 'delivered' || returnReq) && (
        <div className="rounded-2xl border p-6 mb-4" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>Returns</p>
            {returnReq && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: (RETURN_STATUS[returnReq.status] || RETURN_STATUS.requested).bg,
                  color: (RETURN_STATUS[returnReq.status] || RETURN_STATUS.requested).text,
                }}
              >
                {(RETURN_STATUS[returnReq.status] || RETURN_STATUS.requested).label}
              </span>
            )}
          </div>

          {returnReq ? (
            <div className="mt-3 text-sm" style={{ color: '#5C5854' }}>
              <p><span className="font-semibold" style={{ color: '#0F0F0F' }}>Reason:</span> {returnReq.reason}</p>
              {returnReq.admin_note && (
                <p className="mt-1"><span className="font-semibold" style={{ color: '#0F0F0F' }}>Store note:</span> {returnReq.admin_note}</p>
              )}
              <p className="text-xs mt-2" style={{ color: '#9C9894' }}>
                Requested {new Date(returnReq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ) : showReturnForm ? (
            <form onSubmit={handleReturn} className="mt-3">
              <textarea
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                required rows={3}
                placeholder="Tell us why you'd like to return this order…"
                className="w-full text-sm rounded-xl p-3 outline-none"
                style={{ border: '1.5px solid #E4E1D9', background: '#fff', color: '#0F0F0F' }}
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={returnSubmitting}
                  className="text-sm font-bold px-4 py-2 rounded-xl text-white"
                  style={{ background: '#0F0F0F', opacity: returnSubmitting ? 0.6 : 1 }}>
                  {returnSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setShowReturnForm(false)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ color: '#9C9894' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm" style={{ color: '#9C9894' }}>Not happy with your order? Request a return.</p>
              <button onClick={() => setShowReturnForm(true)}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:opacity-70"
                style={{ border: '1.5px solid #0F0F0F', color: '#0F0F0F' }}>
                Request a Return
              </button>
            </div>
          )}
        </div>
      )}

      {/* Product list */}
      <div className="rounded-2xl border mb-4 overflow-hidden"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>
            Items ({order.items?.length || 0})
          </p>
        </div>

        <div className="divide-y" style={{ divideColor: 'rgba(0,0,0,0.05)' }}>
          {(order.items || []).map((item, i) => {
            const img = item.image
              ? resolveImg(item.image)
              : null

            return (
              <div key={item.id} className="flex gap-4 px-5 py-4"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                {/* Image */}
                <Link to={item.slug ? `/products/${item.slug}` : '#'} className="shrink-0">
                  {img ? (
                    <img src={img} alt={item.product_name_snapshot}
                      className="w-20 h-20 object-cover rounded-xl"
                      style={{ background: '#F0EEE9' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                    />
                  ) : null}
                  <div
                    className="w-20 h-20 rounded-xl items-center justify-center"
                    style={{ background: '#F0EEE9', display: img ? 'none' : 'flex' }}>
                    <svg className="w-8 h-8" style={{ color: '#C8C4BE' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                    </svg>
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link to={item.slug ? `/products/${item.slug}` : '#'}
                    className="font-semibold text-sm leading-snug hover:underline line-clamp-2"
                    style={{ color: '#0F0F0F' }}>
                    {item.product_name_snapshot}
                  </Link>
                  {item.sku_snapshot && (
                    <p className="text-xs mt-1" style={{ color: '#9C9894' }}>SKU: {item.sku_snapshot}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: '#9C9894' }}>
                    Qty: {item.quantity}
                  </p>
                  <p className="text-sm font-semibold mt-2" style={{ color: '#0F0F0F' }}>
                    ${Number(item.unit_price).toFixed(2)} each
                  </p>
                </div>

                {/* Line total */}
                <div className="shrink-0 text-right">
                  <p className="font-bold text-base" style={{ color: '#0F0F0F' }}>
                    ${Number(item.total_price).toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order total summary inside the items card */}
        <div className="px-5 py-4 border-t space-y-2" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
          <div className="flex justify-between text-sm" style={{ color: '#5C5854' }}>
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#5C5854' }}>
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#16A34A' }}>
              <span>Discount</span><span>−${discount.toFixed(2)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#5C5854' }}>
              <span>Tax</span><span>${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#0F0F0F' }}>
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping + Payment row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shipping address */}
        <div className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 shrink-0" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>Shipping Address</p>
          </div>
          {order.shipping_address ? (
            <div className="text-sm space-y-0.5" style={{ color: '#5C5854' }}>
              <p className="font-semibold flex items-center gap-2" style={{ color: '#0F0F0F' }}>
                {order.shipping_address.recipient_name || '—'}
                {order.shipping_address.label && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#F2F0EB', color: '#5C5854' }}>
                    {order.shipping_address.label}
                  </span>
                )}
              </p>
              <p>{order.shipping_address.street}</p>
              <p>{order.shipping_address.city}{order.shipping_address.state ? `, ${order.shipping_address.state}` : ''} {order.shipping_address.zip}</p>
              <p>{order.shipping_address.country}</p>
              {order.shipping_address.phone && <p className="pt-1" style={{ color: '#9C9894' }}>{order.shipping_address.phone}</p>}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#9C9894' }}>No address on file</p>
          )}
        </div>

        {/* Payment */}
        <div className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 shrink-0" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9C9894' }}>Payment</p>
          </div>
          <p className="font-semibold text-sm capitalize" style={{ color: '#0F0F0F' }}>
            {order.payment_method?.replace(/_/g, ' ') || '—'}
          </p>
          <span
            className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
            style={order.payment_status === 'paid'
              ? { background: '#F0FDF4', color: '#16A34A' }
              : { background: '#FEF9EC', color: '#B8922E' }
            }
          >
            {order.payment_status || 'pending'}
          </span>
          {order.notes && (
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'rgba(0,0,0,0.06)', color: '#9C9894' }}>
              <span className="font-semibold text-ink-secondary">Note: </span>{order.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
