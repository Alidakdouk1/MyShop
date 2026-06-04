import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminDashboard, getAbandonedCarts } from '../../api/adminApi'
import Spinner from '../../components/ui/Spinner'

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3 group"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent ? `${accent}12` : '#F0EEE9' }}
        >
          <span style={{ color: accent || '#5C5854' }}>{icon}</span>
        </div>
        <div
          className="w-1 h-8 rounded-full self-start opacity-60"
          style={{ background: accent || '#E4E1D9' }}
        />
      </div>
      <div>
        <p
          className="text-3xl font-black tracking-tight"
          style={{ fontVariantNumeric: 'tabular-nums', color: '#0F0F0F' }}
        >
          {value}
        </p>
        <p className="text-sm font-medium mt-0.5" style={{ color: '#9C9894' }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: accent || '#9C9894' }}>{sub}</p>}
      </div>
    </div>
  )
}

// Lightweight dependency-free bar chart for daily revenue.
function SalesChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="h-44 flex items-center justify-center text-sm" style={{ color: '#9C9894' }}>
        No sales data yet — it’ll appear here as orders come in.
      </div>
    )
  }
  const max = Math.max(...data.map(d => Number(d.revenue) || 0), 1)
  return (
    <div className="flex items-end gap-1 h-44">
      {data.map((d, i) => {
        const rev = Number(d.revenue) || 0
        const h   = Math.max(2, (rev / max) * 100)
        return (
          <div
            key={i}
            title={`${d.date} · $${rev.toFixed(2)} · ${d.orders} order${Number(d.orders) === 1 ? '' : 's'}`}
            className="flex-1 rounded-t hover:opacity-80 transition-opacity cursor-default"
            style={{ height: `${h}%`, background: 'linear-gradient(180deg, #C0392B 0%, #0F0F0F 100%)' }}
          />
        )
      })}
    </div>
  )
}

const STATUS_COLOR = {
  pending:   { bg: '#FEF9EC', text: '#D97706' },
  confirmed: { bg: '#EFF6FF', text: '#0284C7' },
  shipped:   { bg: '#F0FDF4', text: '#16A34A' },
  delivered: { bg: '#F0FDF4', text: '#15803D' },
  cancelled: { bg: '#FEF2F2', text: '#C0392B' },
  refunded:  { bg: '#F5F4F0', text: '#5C5854' },
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [abandoned, setAbandoned] = useState(null)

  useEffect(() => {
    getAdminDashboard()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    getAbandonedCarts()
      .then(r => setAbandoned(r.data.data))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" className="text-ink-tertiary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>

      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>
            Overview
          </p>
          <h1
            className="text-4xl font-black tracking-tight leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}
          >
            DASHBOARD
          </h1>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#0F0F0F' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Product
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Users"
          value={data?.total_users ?? 0}
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>}
          accent="#0284C7"
        />
        <StatCard
          label="Products"
          value={data?.total_products ?? 0}
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" /></svg>}
          accent="#C0392B"
        />
        <StatCard
          label="Total Orders"
          value={data?.revenue?.total_orders ?? 0}
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>}
          accent="#16A34A"
        />
        <StatCard
          label="Admins"
          value={data?.total_admins ?? 0}
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
          accent="#B8922E"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Revenue — hero card */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{ background: '#0F0F0F' }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Total Revenue
            </p>
            <p
              className="text-5xl font-black tracking-tight text-white"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              ${Number(data?.revenue?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Today's Orders</p>
                <p className="text-2xl font-bold text-white mt-0.5">{data?.revenue?.orders_today ?? 0}</p>
              </div>
              <div className="w-px h-10 self-center" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Avg. Order</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  ${data?.revenue?.total_orders
                    ? (Number(data.revenue.total_revenue || 0) / data.revenue.total_orders).toFixed(2)
                    : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Quick Actions</p>
          {[
            { to: '/admin/users',        label: 'Manage Users',   color: '#0284C7' },
            { to: '/admin/admins',       label: 'Manage Admins',  color: '#C0392B' },
            { to: '/admin/orders',       label: 'View Orders',    color: '#16A34A' },
            { to: '/admin/products',     label: 'All Products',   color: '#B8922E' },
            { to: '/admin/products/new', label: 'Add Product',    color: '#0F0F0F' },
          ].map(({ to, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 group"
              style={{ background: `${color}0D`, color }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              {label}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-100 transition-opacity">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Sales chart + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Revenue · Last 30 Days</h2>
            <span className="text-xs" style={{ color: '#9C9894' }}>paid orders</span>
          </div>
          <SalesChart data={data?.daily_sales || []} />
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="font-bold text-base mb-3" style={{ color: '#0F0F0F' }}>Top Products</h2>
          {data?.top_products?.length ? (
            <div className="flex flex-col gap-2.5">
              {data.top_products.map((p, i) => (
                <Link key={p.id} to={`/products/${p.slug}`} className="flex items-center gap-3 group">
                  <span className="w-5 text-sm font-black shrink-0" style={{ color: '#C8C4BC' }}>{i + 1}</span>
                  <span className="flex-1 min-w-0 text-sm font-medium truncate group-hover:underline" style={{ color: '#0F0F0F' }}>{p.name}</span>
                  <span className="text-xs font-bold shrink-0" style={{ color: '#16A34A' }}>{p.units_sold} sold</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#9C9894' }}>No sales yet.</p>
          )}
        </div>
      </div>

      {/* Low-stock alerts */}
      {data?.low_stock?.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Low Stock Alerts</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#C0392B' }}>
                {data.low_stock_count ?? data.low_stock.length}
              </span>
            </div>
            <Link
              to="/admin/low-stock"
              className="text-xs font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.low_stock.map(p => {
              const img = p.primary_image
                ? (p.primary_image.startsWith('http') ? p.primary_image : `/MyShop/backend/${p.primary_image}`)
                : 'https://placehold.co/80x80/F2F0EB/9C9894?text=%E2%80%A2'
              const out = Number(p.stock_qty) === 0
              return (
                <Link
                  key={p.id}
                  to={`/admin/products/${p.id}/edit`}
                  className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-surface-alt"
                  style={{ background: out ? '#FEF2F2' : '#FEF9EC' }}
                >
                  <img src={img} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-white shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: out ? '#991B1B' : '#92700A' }}>{p.name}</p>
                    <p className="text-[11px]" style={{ color: out ? '#C0392B' : '#A16207' }}>
                      {out ? 'Out of stock' : `${p.stock_qty} left · alert at ${p.low_stock_threshold}`}
                    </p>
                  </div>
                  <span className="text-lg font-black shrink-0" style={{ color: out ? '#C0392B' : '#D97706', fontVariantNumeric: 'tabular-nums' }}>{p.stock_qty}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Abandoned carts */}
      {abandoned?.count > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Abandoned Carts</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#C0392B' }}>{abandoned.count}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: '#16A34A' }}>${Number(abandoned.total_value).toFixed(2)} recoverable</span>
          </div>
          <div className="flex flex-col gap-2">
            {abandoned.carts.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate" style={{ color: '#5C5854' }}>{c.customer_name} · {c.email}</span>
                <span className="shrink-0" style={{ color: '#9C9894' }}>
                  {c.item_count} item{Number(c.item_count) === 1 ? '' : 's'} · <span className="font-bold" style={{ color: '#0F0F0F' }}>${Number(c.value).toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {data?.recent_orders?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Recent Orders</h2>
              <p className="text-xs mt-0.5" style={{ color: '#9C9894' }}>Last {Math.min(data.recent_orders.length, 10)} transactions</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold tracking-wide flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: '#C0392B' }}
            >
              View All
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {['Order', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: '#9C9894' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.slice(0, 10).map((o, i) => {
                  const sc = STATUS_COLOR[o.status] || STATUS_COLOR.pending
                  return (
                    <tr
                      key={o.id}
                      className="transition-colors"
                      style={{ borderBottom: i < 9 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9F8F6'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs font-bold" style={{ color: '#0F0F0F' }}>#{o.id}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold uppercase shrink-0"
                            style={{ background: '#F0EEE9', color: '#5C5854' }}
                          >
                            {o.customer_name?.[0] || '?'}
                          </div>
                          <span className="font-medium" style={{ color: '#0F0F0F' }}>{o.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold" style={{ color: '#0F0F0F' }}>${Number(o.total).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs" style={{ color: '#9C9894' }}>
                        {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
