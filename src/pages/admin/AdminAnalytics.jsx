import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../../api/adminApi'
import AreaChart from '../../components/admin/AreaChart'
import Spinner from '../../components/ui/Spinner'

const RANGES = [{ d: 7, label: '7 days' }, { d: 30, label: '30 days' }, { d: 90, label: '90 days' }]

const STATUS_COLOR = {
  pending: '#D97706', confirmed: '#0284C7', shipped: '#16A34A',
  delivered: '#15803D', cancelled: '#C0392B', refunded: '#5C5854',
}

const money = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const money2 = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pad = (n) => String(n).padStart(2, '0')

// Build a continuous day-by-day series so the chart has no gaps.
function fillDaily(daily, days) {
  const map = {}
  ;(daily || []).forEach(d => { map[d.date] = d })
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const dt  = new Date(); dt.setDate(dt.getDate() - i)
    const key = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
    const row = map[key]
    out.push({
      key,
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: row ? Number(row.revenue) : 0,
      orders:  row ? Number(row.orders)  : 0,
    })
  }
  return out
}

function delta(cur, prev) {
  cur = Number(cur || 0); prev = Number(prev || 0)
  if (prev === 0) return cur > 0 ? { pct: 100, up: true } : null
  const pct = ((cur - prev) / prev) * 100
  return { pct: Math.abs(pct), up: pct >= 0 }
}

function StatCard({ label, value, change, accent = '#0F0F0F' }) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <p className="text-xs font-medium" style={{ color: '#9C9894' }}>{label}</p>
      <p className="text-2xl font-black tracking-tight mt-1" style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {change ? (
        <p className="text-xs font-bold mt-1 flex items-center gap-1" style={{ color: change.up ? '#16A34A' : '#C0392B' }}>
          <span>{change.up ? '▲' : '▼'}</span>{change.pct.toFixed(0)}%
          <span className="font-medium" style={{ color: '#9C9894' }}>vs previous</span>
        </p>
      ) : (
        <p className="text-xs mt-1" style={{ color: '#C8C4BC' }}>—</p>
      )}
    </div>
  )
}

function BarList({ rows, valueKey, format, color = '#0F0F0F', colorOf }) {
  const max = Math.max(...rows.map(r => Number(r[valueKey]) || 0), 1)
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate pr-2" style={{ color: '#0F0F0F' }}>{r.label}</span>
              <span className="font-bold shrink-0" style={{ color: '#5C5854' }}>{format(v)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F0EEE9' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (v / max) * 100)}%`, background: colorOf ? colorOf(r) : color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getAnalytics(days)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days])

  const s        = data?.summary
  const series   = fillDaily(data?.daily, days)
  const aov       = s && s.paid_orders ? s.revenue / s.paid_orders : 0
  const revChange = s ? delta(s.revenue, s.prev_revenue) : null
  const ordChange = s ? delta(s.orders, s.prev_orders) : null

  const topProducts = (data?.top_products || []).map(p => ({ ...p, label: p.name }))
  const byCategory  = (data?.by_category || []).map(c => ({ ...c, label: c.category }))
  const byStatus    = (data?.by_status || []).map(x => ({ ...x, label: x.status }))

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>
      {/* Header + range selector */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Insights</p>
          <h1 className="text-4xl font-black tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}>
            ANALYTICS
          </h1>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl p-1" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          {RANGES.map(r => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors ${days === r.d ? 'bg-ink text-white' : 'text-ink-tertiary hover:text-ink'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : !data ? (
        <p className="text-ink-secondary">Could not load analytics.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label={`Revenue · last ${days}d`} value={money2(s.revenue)} change={revChange} accent="#16A34A" />
            <StatCard label="Orders" value={s.orders} change={ordChange} accent="#0284C7" />
            <StatCard label="Avg. Order Value" value={money2(aov)} accent="#B8922E" />
            <StatCard label="Units Sold" value={s.units} accent="#C0392B" />
          </div>

          {/* Revenue trend */}
          <div className="rounded-2xl p-6 bg-white mb-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Revenue Trend</h2>
              <span className="text-xs" style={{ color: '#9C9894' }}>paid orders · last {days} days</span>
            </div>
            <AreaChart data={series.map(d => ({ label: d.label, value: d.revenue }))} format={money} color="#16A34A" />
          </div>

          {/* Orders per day */}
          <div className="rounded-2xl p-6 bg-white mb-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-base" style={{ color: '#0F0F0F' }}>Orders per Day</h2>
              <span className="text-xs" style={{ color: '#9C9894' }}>all orders</span>
            </div>
            <AreaChart data={series.map(d => ({ label: d.label, value: d.orders }))} format={(v) => Math.round(v)} color="#0284C7" height={160} />
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl p-6 bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <h2 className="font-bold text-base mb-4" style={{ color: '#0F0F0F' }}>Top Products by Revenue</h2>
              {topProducts.length ? (
                <BarList rows={topProducts} valueKey="revenue" format={money2} color="#C0392B" />
              ) : <p className="text-sm" style={{ color: '#9C9894' }}>No sales in this period.</p>}
            </div>

            <div className="rounded-2xl p-6 bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <h2 className="font-bold text-base mb-4" style={{ color: '#0F0F0F' }}>Revenue by Category</h2>
              {byCategory.length ? (
                <BarList rows={byCategory} valueKey="revenue" format={money2} color="#B8922E" />
              ) : <p className="text-sm" style={{ color: '#9C9894' }}>No sales in this period.</p>}
            </div>
          </div>

          {/* Orders by status */}
          <div className="rounded-2xl p-6 bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <h2 className="font-bold text-base mb-4" style={{ color: '#0F0F0F' }}>Orders by Status</h2>
            {byStatus.length ? (
              <BarList
                rows={byStatus}
                valueKey="count"
                format={(v) => `${Math.round(v)} order${Math.round(v) === 1 ? '' : 's'}`}
                colorOf={(r) => STATUS_COLOR[r.status] || '#5C5854'}
              />
            ) : <p className="text-sm" style={{ color: '#9C9894' }}>No orders in this period.</p>}
          </div>
        </>
      )}
    </div>
  )
}
