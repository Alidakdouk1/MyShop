import { useState, useEffect, useMemo } from 'react'
import {
  getAdminFilters,
  createFilter, updateFilter, deleteFilter,
  createFilterOption, updateFilterOption, deleteFilterOption,
} from '../../api/filterApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  plus:    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>,
  edit:    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>,
  trash:   <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
  chevron: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>,
  funnel:  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V16a1 1 0 01-1.447.894L8.553 15.94A1 1 0 018 15v-3.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd"/></svg>,
}

const TYPES = [
  { value: 'multi',  label: 'Multi-select (checkboxes)' },
  { value: 'single', label: 'Single-select (dropdown / radio)' },
  { value: 'range',  label: 'Range (min / max)' },
]
const typeLabel = (t) => TYPES.find(x => x.value === t)?.label || t

// ── Filter create / edit form ────────────────────────────────────────────────
function FilterForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    type:          initial?.type          ?? 'multi',
    unit:          initial?.unit          ?? '',
    is_required:   Number(initial?.is_required) === 1,
    is_active:     initial ? Number(initial.is_active) === 1 : true,
    display_order: initial?.display_order ?? 0,
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const inputCls = (err) =>
    `w-full rounded-xl border text-sm outline-none px-3.5 py-2.5 transition-all
     ${err ? 'border-[#C0392B] ring-2 ring-[#C0392B]/10' : 'border-[rgba(0,0,0,0.1)] focus:border-[#0F0F0F] focus:ring-2 focus:ring-black/10'}`

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave({
      name:          form.name.trim(),
      type:          form.type,
      unit:          form.unit.trim(),
      is_required:   form.is_required ? 1 : 0,
      is_active:     form.is_active   ? 1 : 0,
      display_order: Number(form.display_order) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Filter Name <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Size, Color, Material"
          className={inputCls(errors.name)}
        />
        {errors.name && <p className="text-xs mt-1" style={{ color: '#C0392B' }}>{errors.name}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Type
        </label>
        <select
          value={form.type}
          onChange={e => set('type', e.target.value)}
          className={inputCls(false) + ' appearance-none cursor-pointer'}
          style={{ background: '#fff' }}
        >
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {form.type === 'range' && (
          <p className="text-[11px] mt-1.5" style={{ color: '#9C9894' }}>
            Range filters don't use options — products set their own min/max.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
            Unit <span className="font-normal normal-case" style={{ color: '#9C9894' }}>(optional)</span>
          </label>
          <input
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="e.g. cm, kg, $"
            className={inputCls(false)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
            Display Order
          </label>
          <input
            type="number" min={0}
            value={form.display_order}
            onChange={e => set('display_order', e.target.value)}
            className={inputCls(false)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Toggle
          checked={form.is_active}
          onChange={() => set('is_active', !form.is_active)}
          title="Active"
          desc="Hidden filters are not shown on the storefront"
        />
        <Toggle
          checked={form.is_required}
          onChange={() => set('is_required', !form.is_required)}
          title="Required"
          desc="Products must have a value for this filter"
        />
      </div>

      <div className="flex gap-2.5 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 text-sm font-bold py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#0F0F0F' }}
        >
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Filter'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 text-sm font-bold py-2.5 rounded-xl transition-all hover:opacity-80"
          style={{ background: '#F0EEE9', color: '#0F0F0F' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Toggle({ checked, onChange, title, desc }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={onChange}
        className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
        style={{ background: checked ? '#0F0F0F' : 'rgba(0,0,0,0.15)' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>{title}</p>
        {desc && <p className="text-xs" style={{ color: '#9C9894' }}>{desc}</p>}
      </div>
    </label>
  )
}

// ── Option editor inline inside each filter card ─────────────────────────────
function OptionEditor({ filter, onOptionsChanged }) {
  const toast = useToast()
  const [newVal, setNewVal]   = useState('')
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState(null)        // option id
  const [editVal, setEditVal] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(null)

  if (filter.type === 'range') {
    return (
      <div className="px-5 py-4" style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <p className="text-xs" style={{ color: '#9C9894' }}>
          Range filters use a min / max set per product (e.g. Price 10 – 50).
          No options to manage here.
        </p>
      </div>
    )
  }

  const addOption = async () => {
    const value = newVal.trim()
    if (!value) return
    setAdding(true)
    try {
      const { data } = await createFilterOption({
        filter_id: filter.id,
        value,
        display_order: (filter.options?.length || 0) + 1,
      })
      onOptionsChanged([...(filter.options || []), data.data])
      setNewVal('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add option')
    } finally { setAdding(false) }
  }

  const startEdit = (opt) => { setEditing(opt.id); setEditVal(opt.value) }

  const saveEdit = async (opt) => {
    const v = editVal.trim()
    if (!v) { setEditing(null); return }
    if (v === opt.value) { setEditing(null); return }
    setSavingEdit(true)
    try {
      const { data } = await updateFilterOption(opt.id, { value: v })
      onOptionsChanged((filter.options || []).map(o => o.id === opt.id ? data.data : o))
      setEditing(null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update option')
    } finally { setSavingEdit(false) }
  }

  const removeOption = async (opt) => {
    if (!confirm(`Delete option "${opt.value}"?`)) return
    setDeleting(opt.id)
    try {
      await deleteFilterOption(opt.id)
      onOptionsChanged((filter.options || []).filter(o => o.id !== opt.id))
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete option')
    } finally { setDeleting(null) }
  }

  const move = async (opt, dir) => {
    const list = [...(filter.options || [])]
    const i = list.findIndex(o => o.id === opt.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    onOptionsChanged(list)
    try {
      await Promise.all(list.map((o, idx) =>
        updateFilterOption(o.id, { display_order: idx + 1 })
      ))
    } catch {
      toast.error('Failed to save new order')
    }
  }

  return (
    <div className="px-5 py-4 space-y-2.5" style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#5C5854' }}>
        Options ({filter.options?.length || 0})
      </p>

      {(filter.options || []).length === 0 ? (
        <p className="text-xs italic" style={{ color: '#9C9894' }}>No options yet.</p>
      ) : (
        <div className="space-y-1.5">
          {filter.options.map((opt, idx) => (
            <div
              key={opt.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              {editing === opt.id ? (
                <>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(opt); if (e.key === 'Escape') setEditing(null) }}
                    className="flex-1 text-sm bg-transparent border-b outline-none"
                    style={{ borderColor: '#0F0F0F' }}
                  />
                  <button
                    onClick={() => saveEdit(opt)} disabled={savingEdit}
                    className="text-xs font-bold px-2 py-1 rounded text-white disabled:opacity-50"
                    style={{ background: '#0F0F0F' }}
                  >
                    {savingEdit ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ background: '#F0EEE9' }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-mono w-5 text-center shrink-0" style={{ color: '#C4C0BB' }}>
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium flex-1" style={{ color: '#0F0F0F' }}>
                    {opt.value}
                    {filter.unit && <span style={{ color: '#9C9894' }}> {filter.unit}</span>}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => move(opt, -1)} disabled={idx === 0}
                      className="p-1 rounded hover:bg-black/5 disabled:opacity-30" title="Move up">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    </button>
                    <button onClick={() => move(opt, 1)} disabled={idx === filter.options.length - 1}
                      className="p-1 rounded hover:bg-black/5 disabled:opacity-30" title="Move down">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </button>
                    <button onClick={() => startEdit(opt)}
                      className="p-1 rounded hover:bg-black/5" title="Edit">
                      {Icon.edit}
                    </button>
                    <button onClick={() => removeOption(opt)} disabled={deleting === opt.id}
                      className="p-1 rounded hover:bg-red-50 disabled:opacity-40" title="Delete"
                      style={{ color: '#C0392B' }}>
                      {deleting === opt.id ? '…' : Icon.trash}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add option */}
      <div className="flex gap-2 pt-1">
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
          placeholder={`Add a ${filter.name.toLowerCase()} value…`}
          className="flex-1 rounded-lg border text-sm outline-none px-3 py-2"
          style={{ borderColor: 'rgba(0,0,0,0.1)', background: '#fff' }}
        />
        <button
          onClick={addOption}
          disabled={!newVal.trim() || adding}
          className="text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-50"
          style={{ background: '#0F0F0F' }}
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── Filter card ──────────────────────────────────────────────────────────────
function FilterCard({ filter, onEdit, onDelete, onOptionsChanged, deleting }) {
  const [open, setOpen] = useState(false)
  const optionCount = filter.options?.length || 0
  const inactive = Number(filter.is_active) !== 1

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        opacity: inactive ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div
        className="group flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#0F0F0F', color: '#fff' }}
        >
          {Icon.funnel}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base" style={{ color: '#0F0F0F' }}>{filter.name}</span>
            {filter.unit && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md" style={{ background: '#F0EEE9', color: '#5C5854' }}>
                {filter.unit}
              </span>
            )}
            {Number(filter.is_required) === 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                REQUIRED
              </span>
            )}
            {inactive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0EEE9', color: '#9C9894' }}>
                HIDDEN
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9C9894' }}>
            {typeLabel(filter.type)} · {optionCount} option{optionCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(filter)}
            className="p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#F0EEE9', color: '#0F0F0F' }}
            title="Edit"
          >
            {Icon.edit}
          </button>
          <button
            onClick={() => onDelete(filter)}
            disabled={deleting === filter.id}
            className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: '#FEF2F2', color: '#C0392B' }}
            title="Delete"
          >
            {deleting === filter.id ? '…' : Icon.trash}
          </button>
        </div>

        <div
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#C4C0BB' }}
        >
          {Icon.chevron}
        </div>
      </div>

      {open && (
        <OptionEditor
          filter={filter}
          onOptionsChanged={(opts) => onOptionsChanged(filter.id, opts)}
        />
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminFilters() {
  const toast = useToast()

  const [filters,  setFilters]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [modal,    setModal]    = useState(null)   // null | 'create' | { type:'edit', filter }
  const [search,   setSearch]   = useState('')

  const load = () => {
    setLoading(true)
    getAdminFilters()
      .then(r => setFilters(r.data.data || []))
      .catch(() => toast.error('Failed to load filters'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const q = search.toLowerCase()
  const filtered = useMemo(
    () => filters.filter(f => !q || f.name.toLowerCase().includes(q)),
    [filters, q]
  )

  const handleCreate = async (data) => {
    setSaving(true)
    try {
      const res = await createFilter(data)
      setFilters(prev => [...prev, { ...res.data.data, options: [] }])
      setModal(null)
      toast.success('Filter created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create filter')
    } finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    const id = modal.filter.id
    setSaving(true)
    try {
      const res = await updateFilter(id, data)
      setFilters(prev => prev.map(f => f.id === id
        ? { ...res.data.data, options: f.options }
        : f))
      setModal(null)
      toast.success('Filter updated')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update filter')
    } finally { setSaving(false) }
  }

  const handleDelete = async (filter) => {
    if (!confirm(`Delete filter "${filter.name}" and all its options? Products will lose their values.`)) return
    setDeleting(filter.id)
    try {
      await deleteFilter(filter.id)
      setFilters(prev => prev.filter(f => f.id !== filter.id))
      toast.success('Filter deleted')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cannot delete filter')
    } finally { setDeleting(null) }
  }

  const handleOptionsChanged = (filterId, options) => {
    setFilters(prev => prev.map(f => f.id === filterId ? { ...f, options } : f))
  }

  const modalTitle = modal === 'create'
    ? 'New Filter'
    : modal?.type === 'edit' ? `Edit — ${modal.filter.name}` : ''
  const modalInitial = modal?.type === 'edit' ? modal.filter : null
  const onModalSave  = modal?.type === 'edit' ? handleUpdate : handleCreate

  const totalOpts = filters.reduce((s, f) => s + (f.options?.length || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: '#F0EEE9' }}>
      <div className="px-6 lg:px-8 pt-8 pb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>
              Catalog Filters
            </p>
            <h1
              className="text-4xl font-black tracking-tight leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}
            >
              FILTERS
            </h1>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#C0392B' }}
          >
            {Icon.plus}
            New Filter
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Filters',         value: filters.length },
            { label: 'Active filters',  value: filters.filter(f => Number(f.is_active) === 1).length },
            { label: 'Total options',   value: totalOpts },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <p className="text-2xl font-black" style={{ color: '#0F0F0F', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#9C9894' }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9C9894' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search filters…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: '#0F0F0F' }}
          />
        </div>
      </div>

      <div className="px-6 lg:px-8 pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="xl" className="text-ink-tertiary" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F0EEE9', color: '#9C9894' }}>
              {Icon.funnel}
            </div>
            <p className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>No filters yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#9C9894' }}>
              {search ? `No results for "${search}"` : 'Create filters like Size, Color, Material to power your shop sidebar.'}
            </p>
            {!search && (
              <button
                onClick={() => setModal('create')}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:opacity-80"
                style={{ background: '#0F0F0F', color: '#fff' }}
              >
                Add First Filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <FilterCard
                key={f.id}
                filter={f}
                onEdit={(filter) => setModal({ type: 'edit', filter })}
                onDelete={handleDelete}
                onOptionsChanged={handleOptionsChanged}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modalTitle}
        size="md"
      >
        {!!modal && (
          <FilterForm
            initial={modalInitial}
            onSave={onModalSave}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  )
}
