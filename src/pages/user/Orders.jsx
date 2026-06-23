import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../../api/orderApi'
import { resolveImg } from '../../lib/img'
import { OrderRowSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

const STATUSES = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLE = {
  pending:   { color: '#B8922E', bg: '#FEF9EC', label: 'Pending' },
  confirmed: { color: '#0284C7', bg: '#EFF8FF', label: 'Confirmed' },
  shipped:   { color: '#7C3AED', bg: '#F5F3FF', label: 'Shipped' },
  delivered: { color: '#16A34A', bg: '#F0FDF4', label: 'Delivered' },
  cancelled: { color: '#9C9894', bg: '#F4F4F4', label: 'Cancelled' },
  refunded:  { color: '#C0392B', bg: '#FEF2F2', label: 'Refunded' },
}

export default function Orders() {
  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [tab,        setTab]        = useState('')

  useEffect(() => {
    setLoading(true)
    getOrders({ page, limit: 10, status: tab || undefined })
      .then(r => {
        setOrders(r.data.data || [])
        setTotalPages(r.data.meta?.last_page || 1)
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [page, tab])

  const handleTab = (key) => { setTab(key); setPage(1) }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-ink mb-6">My Orders</h1>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => handleTab(s.key)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={tab === s.key
              ? { background: '#0F0F0F', color: '#fff' }
              : { background: '#F0EEE9', color: '#5C5854' }
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <OrderRowSkeleton key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={tab ? 'No orders here yet' : 'No orders yet'}
          description={tab
            ? `You don't have any ${tab} orders right now. Switch tabs above to see other statuses.`
            : "Your first order is one tap away. Browse our top deals or pick up where you left off."}
          primary={{   label: "Start Shopping",        to: "/shop" }}
          secondary={{ label: "Browse Top Deals",      to: "/shop?on_sale=1" }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const st      = STATUS_STYLE[order.status] || STATUS_STYLE.pending
            const images  = order.preview_images
              ? order.preview_images.split('|||').filter(Boolean).slice(0, 4)
              : []
            const extra   = (order.item_count || 0) - images.length

            const FIVE_HOURS_MS  = 5 * 60 * 60 * 1000
            const msElapsed      = Date.now() - new Date(order.created_at).getTime()
            const canStillCancel = ['pending', 'confirmed'].includes(order.status)
            const withinWindow   = canStillCancel && msElapsed <= FIVE_HOURS_MS
            const msRemaining    = withinWindow ? Math.max(0, FIVE_HOURS_MS - msElapsed) : 0
            const hoursLeft      = Math.floor(msRemaining / 3600000)
            const minsLeft       = Math.floor((msRemaining % 3600000) / 60000)

            return (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="block rounded-2xl border transition-all hover:shadow-md hover:border-ink/20 overflow-hidden"
                style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
              >
                {/* Card top: order meta + status */}
                <div className="flex items-center justify-between px-5 py-3 border-b"
                  style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wide">
                      Order #{order.order_number ?? order.id}
                    </span>
                    <span className="text-xs text-ink-tertiary">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {withinWindow && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#FEF9EC', color: '#B8922E' }}>
                        Cancel in {hoursLeft}h {minsLeft}m
                      </span>
                    )}
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Product images strip */}
                <div className="px-5 py-4 flex items-center gap-3">
                  {images.length > 0 ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {images.map((src, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border"
                          style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#F0EEE9' }}>
                          <img
                            src={resolveImg(src)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        </div>
                      ))}
                      {extra > 0 && (
                        <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold"
                          style={{ background: '#F0EEE9', color: '#9C9894' }}>
                          +{extra}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      {Array.from({ length: Math.min(order.item_count || 1, 3) }).map((_, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center"
                          style={{ background: '#F0EEE9' }}>
                          <svg className="w-6 h-6" style={{ color: '#C8C4BE' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Right: total + CTA */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-ink">${Number(order.total).toFixed(2)}</p>
                    <p className="text-xs text-ink-tertiary mt-0.5">
                      {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                    </p>
                    <span className="inline-block mt-2 text-xs font-bold text-ink underline underline-offset-2">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

          <div className="pt-2">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={p => { setPage(p); window.scrollTo(0,0) }} />
          </div>
        </div>
      )}
    </div>
  )
}
