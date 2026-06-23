import { useState, useEffect, useCallback } from 'react'
import { getAdminUsers, deleteAdminUser, createAdminUser, updateAdminUser } from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import { SkeletonBox } from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import CustomerDetailDrawer, { VipBadge } from '../../components/admin/CustomerDetailDrawer'

const AVATAR_COLORS = ['#C0392B','#0284C7','#16A34A','#B8922E','#7C3AED','#DB2777']
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

function UserForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: initial?.name || '', email: initial?.email || '', password: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (!initial && !form.password) e.password = 'Required for new users'
    if (form.password && form.password.length < 6) e.password = 'Min 6 characters'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = e => {
    e.preventDefault(); if (!validate()) return
    const payload = { name: form.name, email: form.email, role: 'customer' }
    if (form.password) payload.password = form.password
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)}
        error={errors.name} required placeholder="User's full name" />
      <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
        error={errors.email} required placeholder="user@example.com" />
      <Input
        label={initial ? 'New Password (leave blank to keep)' : 'Password'}
        type="password" value={form.password} onChange={e => set('password', e.target.value)}
        error={errors.password} placeholder="Min 6 characters"
      />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{initial ? 'Save Changes' : 'Create User'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function AdminUsers() {
  const toast = useToast()
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [deleting, setDeleting] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [modal,    setModal]    = useState(null)
  const [drawerId, setDrawerId] = useState(null)

  const refresh = useCallback(() => {
    getAdminUsers()
      .then(r => setUsers(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = async (user) => {
    if (!confirm(`Delete "${user.name}"? This cannot be undone.`)) return
    setDeleting(user.id)
    try {
      await deleteAdminUser(user.id)
      setUsers(us => us.filter(u => u.id !== user.id))
      toast.success('User deleted')
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete') }
    finally { setDeleting(null) }
  }

  const handleCreate = async (data) => {
    setSaving(true)
    try {
      const res = await createAdminUser(data)
      setUsers(us => [...us, res.data.data]); setModal(null); toast.success('User created')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    setSaving(true)
    try {
      const res = await updateAdminUser(modal.user.id, data)
      setUsers(us => us.map(u => u.id === modal.user.id ? { ...u, ...res.data.data } : u))
      setModal(null); toast.success('User updated')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Management</p>
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}>
            CUSTOMERS
          </h1>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: '#0F0F0F' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: '#0F0F0F' }}
            onFocus={e => e.target.style.borderColor = '#0F0F0F'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: '#9C9894' }}>
          {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 items-center px-6 py-4 gap-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="col-span-4 flex items-center gap-3">
                <SkeletonBox height={36} width={36} style={{ borderRadius: '50%' }} />
                <SkeletonBox height={14} width="60%" />
              </div>
              <div className="col-span-3"><SkeletonBox height={12} width="80%" /></div>
              <div className="col-span-2"><SkeletonBox height={12} width="60%" /></div>
              <div className="col-span-1"><SkeletonBox height={12} width={24} /></div>
              <div className="col-span-2 flex justify-end"><SkeletonBox height={28} width={70} style={{ borderRadius: 999 }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Table header */}
          <div className="grid grid-cols-12 px-6 py-3 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#9C9894', background: '#FAFAF8' }}>
            <div className="col-span-4">Customer</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1 text-center">Notes</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium" style={{ color: '#9C9894' }}>No customers found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
              {filtered.map((u, i) => {
                const ac = avatarColor(u.name)
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 items-center px-6 py-4 transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9F8F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Customer */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0 text-white"
                        style={{ background: ac }}
                      >
                        {u.name?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5" style={{ color: '#0F0F0F' }}>
                          {u.name}
                          <VipBadge level={u.vip_level} />
                        </p>
                        <p className="text-xs truncate" style={{ color: '#9C9894' }}>ID #{u.id}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="col-span-3 text-sm truncate pr-4" style={{ color: '#5C5854' }}>{u.email}</div>

                    {/* Joined */}
                    <div className="col-span-2 text-xs" style={{ color: '#9C9894' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* Notes count */}
                    <div className="col-span-1 flex items-center justify-center">
                      {Number(u.notes_count) > 0 ? (
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#FEF3C7', color: '#92400E' }}
                          title={`${u.notes_count} note${Number(u.notes_count) === 1 ? '' : 's'}`}
                        >
                          {u.notes_count}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-tertiary">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDrawerId(u.id)}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: '#0F0F0F', color: '#fff' }}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setModal({ type: 'edit', user: u })}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: '#F0EEE9', color: '#0F0F0F' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deleting === u.id}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: '#FEF2F2', color: '#C0392B' }}
                      >
                        {deleting === u.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add New Customer" size="md">
        <UserForm onSave={handleCreate} onCancel={() => setModal(null)} saving={saving} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title={`Edit — ${modal?.user?.name}`} size="md">
        {modal?.type === 'edit' && (
          <UserForm initial={modal.user} onSave={handleUpdate} onCancel={() => setModal(null)} saving={saving} />
        )}
      </Modal>

      {drawerId && (
        <CustomerDetailDrawer
          userId={drawerId}
          onClose={() => setDrawerId(null)}
          onChange={refresh}
        />
      )}
    </div>
  )
}
