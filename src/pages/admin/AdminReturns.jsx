import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminReturns, updateReturnStatus } from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const STATUSES = ['requested', 'approved', 'rejected', 'completed']
const STATUS_STYLE = {
  requested: { bg: '#FEF9EC', text: '#B8922E' },
  approved:  { bg: '#EFF6FF', text: '#0284C7' },
  rejected:  { bg: '#FEF2F2', text: '#C0392B' },
  completed: { bg: '#F0FDF4', text: '#16A34A' },
}

function ReturnRow({ r, onUpdated }) {
  const toast = useToast()
  const [status, setStatus] = useState(r.status)
  const [note, setNote]     = useState(r.admin_note || '')
  const [saving, setSaving] = useState(false)
  const dirty = status !== r.status || note !== (r.admin_note || '')

  const save = async () => {
    setSaving(true)
    try {
      await updateReturnStatus(r.id, { status, admin_note: note || null })
      toast.success(`Return #${r.id} updated`)
      onUpdated(r.id, { status, admin_note: note })
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const sc = STATUS_STYLE[status] || STATUS_STYLE.requested

  return (
    <div className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link to={`/account/orders/${r.order_id}`} className="font-bold text-sm hover:underline" style={{ color: '#0F0F0F' }}>
              Order #{r.order_id}
            </Link>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>
              {status}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9C9894' }}>
            {r.customer_name} · {r.customer_email} · ${Number(r.order_total || 0).toFixed(2)}
          </p>
        </div>
        <span className="text-xs" style={{ color: '#9C9894' }}>
          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <p className="text-sm mt-3" style={{ color: '#5C5854' }}>
        <span className="font-semibold" style={{ color: '#0F0F0F' }}>Reason:</span> {r.reason}
      </p>

      <div className="flex items-end gap-2 mt-3 flex-wrap">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm rounded-lg px-3 py-2 capitalize outline-none"
          style={{ border: '1.5px solid #E4E1D9', background: '#fff', color: '#0F0F0F' }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note to customer (optional)"
          className="flex-1 min-w-[160px] text-sm rounded-lg px-3 py-2 outline-none"
          style={{ border: '1.5px solid #E4E1D9', background: '#fff', color: '#0F0F0F' }}
        />
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="text-sm font-bold px-4 py-2 rounded-lg text-white transition-all"
          style={{ background: '#0F0F0F', opacity: (!dirty || saving) ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
      </div>
    </div>
  )
}

export default function AdminReturns() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminReturns()
      .then(r => setReturns(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Support</p>
        <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}>
          RETURNS
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : returns.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.07)' }}>
          <p className="text-sm" style={{ color: '#9C9894' }}>No return requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {returns.map(r => (
            <ReturnRow
              key={r.id}
              r={r}
              onUpdated={(id, patch) => setReturns(list => list.map(x => x.id === id ? { ...x, ...patch } : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
