import { useState, useEffect } from 'react'
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const SHIELD = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
)

function AdminForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: initial?.name || '', email: initial?.email || '', password: '' })
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (!initial && !form.password) e.password = 'Required for new admins'
    if (form.password && form.password.length < 6) e.password = 'Min 6 characters'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = e => {
    e.preventDefault(); if (!validate()) return
    const payload = { name: form.name, email: form.email }
    if (form.password) payload.password = form.password
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)}
        error={errors.name} required placeholder="e.g. Store Manager" />
      <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
        error={errors.email} required placeholder="admin@example.com" />
      <Input
        label={initial ? 'New Password (leave blank to keep)' : 'Password'}
        type="password" value={form.password} onChange={e => set('password', e.target.value)}
        error={errors.password} placeholder="Min 6 characters"
      />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{initial ? 'Save Changes' : 'Create Admin'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function AdminAdmins() {
  const toast = useToast()
  const [admins,   setAdmins]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [modal,    setModal]    = useState(null)

  const load = () => {
    setLoading(true)
    getAdmins().then(r => setAdmins(r.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (data) => {
    setSaving(true)
    try {
      const res = await createAdmin(data)
      setAdmins(a => [...a, res.data.data]); setModal(null); toast.success('Admin created')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create admin') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    setSaving(true)
    try {
      const res = await updateAdmin(modal.admin.id, data)
      setAdmins(a => a.map(x => x.id === modal.admin.id ? res.data.data : x))
      setModal(null); toast.success('Admin updated')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  const handleDelete = async (adm) => {
    if (!confirm(`Delete admin "${adm.name}"? This cannot be undone.`)) return
    setDeleting(adm.id)
    try {
      await deleteAdmin(adm.id)
      setAdmins(a => a.filter(x => x.id !== adm.id)); toast.success('Admin deleted')
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete this admin') }
    finally { setDeleting(null) }
  }

  const filtered = admins.filter(a =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Access Control</p>
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}>
            ADMINS
          </h1>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: '#C0392B' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Admin
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search admins…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: '#0F0F0F' }}
            onFocus={e => e.target.style.borderColor = '#0F0F0F'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: '#9C9894' }}>{filtered.length} admin{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="text-sm font-medium" style={{ color: '#9C9894' }}>No admin accounts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div
              key={a.id}
              className="rounded-2xl p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', transitionDuration: '150ms' }}
            >
              {/* Card header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black uppercase shrink-0"
                  style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}
                >
                  {a.name?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate" style={{ color: '#0F0F0F' }}>{a.name}</p>
                    <span className="shrink-0 text-[#C0392B]">{SHIELD}</span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#9C9894' }}>{a.email}</p>
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" />
                  Admin
                </span>
                <span className="text-xs" style={{ color: '#9C9894' }}>
                  Since {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => setModal({ type: 'edit', admin: a })}
                  className="flex-1 text-xs font-bold py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: '#F0EEE9', color: '#0F0F0F' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deleting === a.id}
                  className="flex-1 text-xs font-bold py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: '#FEF2F2', color: '#C0392B' }}
                >
                  {deleting === a.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add New Admin" size="md">
        <AdminForm onSave={handleCreate} onCancel={() => setModal(null)} saving={saving} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title={`Edit Admin — ${modal?.admin?.name}`} size="md">
        {modal?.type === 'edit' && (
          <AdminForm initial={modal.admin} onSave={handleUpdate} onCancel={() => setModal(null)} saving={saving} />
        )}
      </Modal>
    </div>
  )
}
