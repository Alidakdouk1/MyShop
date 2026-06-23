import { useState, useEffect, useCallback } from 'react'
import {
  getUserDetail, setUserVipLevel,
  addUserNote, updateUserNote, deleteUserNote,
} from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../ui/Spinner'

const VIP_LEVELS = [
  { code: 'regular', label: 'Regular', color: '#9C9894', bg: '#F0EEE9' },
  { code: 'vip',     label: 'VIP',     color: '#7C3AED', bg: '#F5F3FF' },
  { code: 'gold',    label: 'Gold',    color: '#B8922E', bg: '#FEF9EC' },
]

const fmt = (d) => d
  ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  : '—'

function VipBadge({ level, size = 'sm' }) {
  const cfg = VIP_LEVELS.find(v => v.code === level) || VIP_LEVELS[0]
  if (cfg.code === 'regular') return null
  const cls = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      className={`inline-block font-bold uppercase tracking-wider rounded-full ${cls}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

export { VipBadge }

function NoteRow({ note, onPin, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!draft.trim()) return
    setSaving(true)
    await onSave(note.id, { body: draft.trim() })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div
      className="rounded-xl p-3 border transition-colors"
      style={{
        background: note.pinned ? '#FEF9EC' : '#fff',
        borderColor: note.pinned ? '#FCD34D' : '#E4E1D9',
      }}
    >
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            className="w-full text-sm rounded-lg border border-border px-3 py-2 outline-none focus:border-ink resize-none"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => { setDraft(note.body); setEditing(false) }} className="text-xs font-semibold text-ink-tertiary hover:text-ink px-2 py-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="text-xs font-bold uppercase tracking-wider bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink/90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{note.body}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
            <div className="text-[11px] text-ink-tertiary">
              {note.admin_name ? <>by <span className="font-semibold text-ink-secondary">{note.admin_name}</span> · </> : null}
              {fmt(note.created_at)}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPin(note.id, !note.pinned)}
                title={note.pinned ? 'Unpin' : 'Pin'}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-surface-alt transition-colors"
                style={{ color: note.pinned ? '#92400E' : '#9C9894' }}
              >
                {note.pinned ? '📌 Pinned' : 'Pin'}
              </button>
              <button onClick={() => setEditing(true)} className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink px-2 py-1 rounded hover:bg-surface-alt transition-colors">Edit</button>
              <button onClick={() => onDelete(note.id)} className="text-[10px] font-bold uppercase tracking-wider text-accent hover:text-accent-hover px-2 py-1 rounded hover:bg-accent-light transition-colors">Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function CustomerDetailDrawer({ userId, onClose, onChange }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState(null)
  const [draft, setDraft]     = useState('')
  const [pinNew, setPinNew]   = useState(false)
  const [adding, setAdding]   = useState(false)
  const [vipSaving, setVipSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getUserDetail(userId)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    setAdding(true)
    try {
      const r = await addUserNote(userId, { body: draft.trim(), pinned: pinNew ? 1 : 0 })
      setData(d => ({ ...d, notes: [r.data.data, ...(d?.notes || [])] }))
      setDraft('')
      setPinNew(false)
      toast.success('Note added')
      onChange?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setAdding(false) }
  }

  const handlePin = async (id, pinned) => {
    try {
      await updateUserNote(id, { pinned })
      setData(d => ({ ...d, notes: d.notes.map(n => n.id === id ? { ...n, pinned: pinned ? 1 : 0 } : n) }))
      toast.success(pinned ? 'Pinned' : 'Unpinned')
      onChange?.()
    } catch { toast.error('Could not update') }
  }

  const handleSaveBody = async (id, patch) => {
    try {
      await updateUserNote(id, patch)
      setData(d => ({ ...d, notes: d.notes.map(n => n.id === id ? { ...n, ...patch } : n) }))
      toast.success('Note updated')
    } catch { toast.error('Could not update') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return
    try {
      await deleteUserNote(id)
      setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }))
      toast.success('Deleted')
      onChange?.()
    } catch { toast.error('Could not delete') }
  }

  const setVip = async (level) => {
    if (level === data?.vip_level) return
    setVipSaving(true)
    try {
      await setUserVipLevel(userId, level)
      setData(d => ({ ...d, vip_level: level }))
      toast.success(`VIP set to ${level}`)
      onChange?.()
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update') }
    finally { setVipSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="w-full sm:max-w-md bg-bg flex flex-col"
        style={{ animation: 'drawerIn 0.36s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink">Customer Profile</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner size="xl" /></div>
          ) : !data ? (
            <div className="p-10 text-center text-ink-tertiary text-sm">Customer not found.</div>
          ) : (
            <>
              {/* Identity */}
              <div className="px-5 py-5 bg-surface border-b border-border">
                <p className="text-xl font-bold text-ink flex items-center gap-2 flex-wrap">
                  {data.name}
                  <VipBadge level={data.vip_level} />
                </p>
                <p className="text-sm text-ink-tertiary">{data.email}</p>
                {data.phone && <p className="text-xs text-ink-tertiary mt-1">{data.phone}</p>}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-black/5">
                  <Stat label="Orders" value={data.orders_count || 0} />
                  <Stat label="Lifetime" value={`$${Number(data.lifetime_value || 0).toFixed(0)}`} />
                  <Stat label="Last order" value={data.last_order_at ? new Date(String(data.last_order_at).replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'} />
                </div>
              </div>

              {/* VIP level */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">VIP Level</p>
                <div className="grid grid-cols-3 gap-2">
                  {VIP_LEVELS.map(v => {
                    const active = data.vip_level === v.code
                    return (
                      <button
                        key={v.code}
                        onClick={() => setVip(v.code)}
                        disabled={vipSaving}
                        className="text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all border"
                        style={{
                          background: active ? v.bg    : '#fff',
                          color:      active ? v.color : '#9C9894',
                          borderColor: active ? v.color : '#E4E1D9',
                        }}
                      >
                        {v.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-ink-tertiary mt-2">
                  VIP badges show on the orders list so you spot loyal customers fast.
                </p>
              </div>

              {/* Notes */}
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">
                  Private Notes ({data.notes?.length || 0})
                </p>

                <form onSubmit={handleAdd} className="mb-4">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={3}
                    placeholder="Add a private note about this customer…"
                    className="w-full text-sm rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-ink resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-secondary">
                      <input type="checkbox" checked={pinNew} onChange={e => setPinNew(e.target.checked)} className="accent-ink" />
                      Pin to top
                    </label>
                    <button
                      type="submit"
                      disabled={adding || !draft.trim()}
                      className="text-xs font-bold uppercase tracking-wider bg-ink text-white px-4 py-2 rounded-lg hover:bg-ink/90 disabled:opacity-50 transition-colors"
                    >
                      {adding ? 'Saving…' : 'Add Note'}
                    </button>
                  </div>
                </form>

                {(data.notes || []).length === 0 ? (
                  <p className="text-xs text-ink-tertiary text-center py-6">No notes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.notes.map(n => (
                      <NoteRow
                        key={n.id}
                        note={n}
                        onPin={handlePin}
                        onSave={handleSaveBody}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">{label}</p>
      <p className="text-base font-bold text-ink mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}
