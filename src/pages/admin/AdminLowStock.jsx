import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getLowStock } from '../../api/adminApi'
import Spinner from '../../components/ui/Spinner'

const imgSrc = (src) =>
  src ? (src.startsWith('http') ? src : `/MyShop/backend/${src}`)
      : 'https://placehold.co/80x80/F2F0EB/9C9894?text=%E2%80%A2'

// Days of cover = current stock / average daily sales over the last 30 days.
// Returns null when we can't estimate (no sales) so we can show "—".
function daysOfCover(stock, sold30d) {
  if (!Number(sold30d)) return null
  const perDay = Number(sold30d) / 30
  if (perDay <= 0) return null
  return Math.floor(Number(stock) / perDay)
}

function StatusPill({ qty, threshold }) {
  if (Number(qty) === 0) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>Out of stock</span>
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>Low · {qty}/{threshold}</span>
}

export default function AdminLowStock() {
  const [items, setItems]   = useState([])
  const [loading, setLoad]  = useState(true)
  const [filter, setFilter] = useState('all') // all | out | low

  useEffect(() => {
    getLowStock()
      .then(r => setItems(r.data.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoad(false))
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'out') return items.filter(p => Number(p.stock_qty) === 0)
    if (filter === 'low') return items.filter(p => Number(p.stock_qty) > 0)
    return items
  }, [items, filter])

  const outCount = items.filter(p => Number(p.stock_qty) === 0).length
  const lowCount = items.length - outCount

  if (loading) {
    return <div className="p-10 flex justify-center"><Spinner size="xl" /></div>
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Low Stock Alerts</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Products at or below their alert threshold. Order more before they sell out.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-black/5">
          {[
            { v: 'all', label: `All (${items.length})` },
            { v: 'out', label: `Out (${outCount})` },
            { v: 'low', label: `Low (${lowCount})` },
          ].map(o => (
            <button
              key={o.v}
              onClick={() => setFilter(o.v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                filter === o.v ? 'bg-ink text-white' : 'text-ink-tertiary hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold text-ink">All clear — nothing's running low.</p>
          <p className="text-sm text-ink-tertiary mt-1">
            Set each product's alert threshold on its edit page to control what shows up here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-tertiary border-b border-black/5">
                <th className="px-5 py-3">Product</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3 text-right">Threshold</th>
                <th className="px-3 py-3 text-right">30-day sales</th>
                <th className="px-3 py-3 text-right">Days of cover</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const dc = daysOfCover(p.stock_qty, p.sold_30d)
                return (
                  <tr key={p.id} className="border-b border-black/5 last:border-b-0 hover:bg-surface-alt/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={imgSrc(p.primary_image)} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-surface-alt" loading="lazy" />
                        <div className="min-w-0">
                          <Link to={`/admin/products/${p.id}/edit`} className="font-semibold text-ink text-sm hover:underline line-clamp-1">{p.name}</Link>
                          {p.category_name && <p className="text-[11px] text-ink-tertiary">{p.category_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-secondary font-mono">{p.sku || '—'}</td>
                    <td className="px-3 py-3 text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums', color: Number(p.stock_qty) === 0 ? '#C0392B' : '#D97706' }}>
                      {p.stock_qty}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-ink-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.low_stock_threshold}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-ink-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Number(p.sold_30d) || 0}
                    </td>
                    <td className="px-3 py-3 text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums', color: dc === null ? '#9C9894' : dc <= 3 ? '#C0392B' : '#5C5854' }}>
                      {dc === null ? '—' : `${dc}d`}
                    </td>
                    <td className="px-3 py-3"><StatusPill qty={p.stock_qty} threshold={p.low_stock_threshold} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors"
                      >
                        Restock
                      </Link>
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
