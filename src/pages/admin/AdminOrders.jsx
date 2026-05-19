import { useState, useEffect } from 'react'
import { getAdminOrders, updateOrderStatus } from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { Select } from '../../components/ui/Input'
import Pagination from '../../components/common/Pagination'

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
      setOrders(os => os.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success('Status updated')
    } catch { toast.error('Failed') }
    finally { setUpdating(null) }
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

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  {['Order', 'Customer', 'Total', 'Payment', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-ink-tertiary">No orders found</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-4 py-3 font-bold">#{o.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{o.customer_name}</p>
                      <p className="text-xs text-ink-tertiary">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-ink-secondary capitalize">{o.payment_method?.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <Select value={o.status} onChange={e => handleStatus(o.id, e.target.value)}
                        disabled={updating === o.id} className="!h-8 !text-xs !py-0">
                        {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
