import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getOrder, cancelOrder, getReturns, createReturn } from '../../api/orderApi'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import Spinner from '../../components/ui/Spinner'

const RETURN_STATUS = {
  requested: { bg: '#FEF9EC', text: '#B8922E', label: 'Requested' },
  approved:  { bg: '#EFF6FF', text: '#0284C7', label: 'Approved' },
  rejected:  { bg: '#FEF2F2', text: '#C0392B', label: 'Rejected' },
  completed: { bg: '#F0FDF4', text: '#16A34A', label: 'Completed' },
}

const STEPS = [
  { key: 'pending',   label: 'Order Placed',  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'confirmed', label: 'Confirmed',      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'shipped',   label: 'Shipped',        icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8' },
  { key: 'delivered', label: 'Delivered',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
]

const STEP_ORDER = ['pending', 'confirmed', 'shipped', 'delivered']

function StatusStepper({ status }) {
  const isCancelled = status === 'cancelled' || status === 'refunded'
  const activeIdx   = isCancelled ? -1 : STEP_ORDER.indexOf(status)

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#FEF2F2' }}>
          <svg className="w-5 h-5" style={{ color: '#C0392B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm capitalize" style={{ color: '#C0392B' }}>
            Order {status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          <p className="text-xs" style={{ color: '#9C9894' }}>This order has been {status}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-0 w-full">
      {STEPS.map((step, i) => {
        const done    = i <= activeIdx
        const current = i === activeIdx

        return (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-2 relative">
            {/* Connector line left */}
            {i > 0 && (
              <div className="absolute left-0 top-5 w-1/2 h-0.5 -translate-y-1/2 z-0"
                style={{ background: i <= activeIdx ? '#0F0F0F' : '#E5E2DD' }} />
            )}
            {/* Connector line right */}
            {i < STEPS.length - 1 && (
              <div className="absolute right-0 top-5 w-1/2 h-0.5 -translate-y-1/2 z-0"
                style={{ background: i < activeIdx ? '#0F0F0F' : '#E5E2DD' }} />
            )}

            {/* Circle */}
            <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: done ? '#0F0F0F' : '#F0EEE9',
                border: current ? '2px solid #0F0F0F' : 'none',
                boxShadow: current ? '0 0 0 4px rgba(15,15,15,0.1)' : 'none',
              }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: done ? '#fff' : '#C8C4BE' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
              </svg>
            </div>

            {/* Label */}
            <p className="text-[11px] font-semibold text-center leading-tight"
              style={{ color: done ? '#0F0F0F' : '#9C9894' }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function OrderDetail() {
  const { id }  = useParams()
  const toast   = useToast()
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [returnReq,        setReturnReq]        = useState(null)
  const [showReturnForm,   setShowReturnForm]   = useState(false)
  const [returnReason,     setReturnReason]     = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  useEffect(() => {
    getOrder(id)
      .then(r => setOrder(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    getReturns()
      .then(r => setReturnReq((r.data.data || []).find(x => Number(x.order_id) === Number(id)) || null))
      .catch(() => {})
  }, [id])

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

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="xl" className="text-ink-tertiary" />
    </div>
  )
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
    <div className="max-w-3xl mx-auto px-4 py-10">

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

      {/* Status stepper */}
      <div className="rounded-2xl border p-6 mb-4"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#9C9894' }}>Order Status</p>
        <StatusStepper status={order.status} />
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
          {order.full_name ? (
            <div className="text-sm space-y-0.5" style={{ color: '#5C5854' }}>
              <p className="font-semibold" style={{ color: '#0F0F0F' }}>{order.full_name}</p>
              <p>{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}</p>
              <p>{order.city}{order.state ? `, ${order.state}` : ''} {order.zip}</p>
              <p>{order.country}</p>
              {order.phone && <p className="pt-1" style={{ color: '#9C9894' }}>{order.phone}</p>}
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
