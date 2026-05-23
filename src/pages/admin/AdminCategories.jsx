import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  uploadCategoryImage,
  getAdminSections,
  createCategorySection,
  updateCategorySection,
  deleteCategorySection,
} from '../../api/adminApi'
import { getAdminFilters, getCategoryFilters, saveCategoryFilters } from '../../api/filterApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

// ── Palette: one accent colour per top-level category slot ──────────────────
const PALETTE = [
  '#C0392B','#0284C7','#16A34A','#B8922E',
  '#7C3AED','#DB2777','#0891B2','#D97706',
  '#059669','#5C5854',
]
const paletteFor = (id) => PALETTE[(id - 1) % PALETTE.length]

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  plus:    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>,
  edit:    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>,
  trash:   <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
  chevron: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>,
  tag:     <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>,
  sizes:   <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>,
  search:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>,
  folder:  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>,
}

// ── Inline image uploader for categories ─────────────────────────────────────
function CategoryImageUploader({ value, onChange, onUploadingChange }) {
  const inputRef              = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState('')

  const setUploadingState = (v) => {
    setUploading(v)
    onUploadingChange?.(v)
  }

  const handleFile = async (file) => {
    if (!file) return
    setErr('')
    setUploadingState(true)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await uploadCategoryImage(fd)
      onChange(res.data.data.url)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed.')
    } finally {
      setUploadingState(false)
    }
  }

  const preview = value
    ? (value.startsWith('http') || value.startsWith('/') ? value : `/MyShop/backend/${value}`)
    : null

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
        Category Image <span className="font-normal normal-case" style={{ color: '#9C9894' }}>(optional)</span>
      </label>

      {/* Drop zone / preview */}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed cursor-pointer group transition-colors"
        style={{
          borderColor:     preview ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.1)',
          background:      '#FAFAF8',
          aspectRatio:     '16/7',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Category" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-lg transition-opacity">
                Change image
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: '#C4C0BB' }}>
            {uploading ? (
              <div className="w-6 h-6 border-2 border-[#C0392B]/30 border-t-[#C0392B] rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] font-medium">Click or drag to upload</span>
              </>
            )}
          </div>
        )}
        {uploading && preview && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {preview && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange('') }}
          className="mt-1 text-[11px] font-medium transition-colors"
          style={{ color: '#C0392B' }}
        >
          Remove image
        </button>
      )}
      {err && <p className="mt-1 text-[11px]" style={{ color: '#C0392B' }}>{err}</p>}

      {/* Also allow direct URL input as fallback */}
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        placeholder="Or paste an image URL…"
        className="mt-2 w-full rounded-xl border text-sm outline-none px-3.5 py-2 transition-all"
        style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#0F0F0F' }}
        onFocus={e  => e.target.style.borderColor = '#0F0F0F'}
        onBlur={e   => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  )
}

// ── Category form (add / edit) ───────────────────────────────────────────────
function CategoryForm({ initial, topLevelCats, allFilters, sectionsByCat = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name:       initial?.name       ?? '',
    parent_id:  initial?.parent_id  ?? '',
    section_id: initial?.section_id ?? '',
    sort_order: initial?.sort_order ?? 0,
    has_sizes:  Number(initial?.has_sizes) === 1,
    image_url:  initial?.image_url  ?? '',
  })

  // Sections only make sense for a sub-category — they belong to the chosen parent.
  const parentSections = form.parent_id !== ''
    ? (sectionsByCat[Number(form.parent_id)] || [])
    : []
  const [errors, setErrors]           = useState({})
  const [imageUploading, setImageUploading] = useState(false)
  const [filterIds, setFilterIds]     = useState([])

  const categoryId = initial?.id || null
  const parentId   = initial?.parent_id ?? null

  // Editing an existing category → load its own filters.
  // Creating a NEW sub-category → start from a one-time copy of the parent's
  // filters (the admin can change them here without affecting the parent).
  useEffect(() => {
    const sourceId = categoryId || parentId
    if (!sourceId) return
    getCategoryFilters(sourceId)
      .then(r => setFilterIds((r.data.data || []).map(Number)))
      .catch(() => setFilterIds([]))
  }, [categoryId, parentId])

  const toggleFilter = (id) =>
    setFilterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    onSave({
      name:       form.name.trim(),
      parent_id:  form.parent_id !== '' ? Number(form.parent_id) : null,
      section_id: form.parent_id !== '' && form.section_id !== '' ? Number(form.section_id) : null,
      sort_order: Number(form.sort_order),
      has_sizes:  form.has_sizes ? 1 : 0,
      image_url:  form.image_url.trim(),
      filter_ids: filterIds,
    })
  }

  const inputCls = (err) =>
    `w-full rounded-xl border text-sm outline-none px-3.5 py-2.5 transition-all
     ${err ? 'border-[#C0392B] ring-2 ring-[#C0392B]/10' : 'border-[rgba(0,0,0,0.1)] focus:border-[#0F0F0F] focus:ring-2 focus:ring-black/10'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {/* Name */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Category Name <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Summer Dresses"
          className={inputCls(errors.name)}
        />
        {errors.name && <p className="text-xs mt-1" style={{ color: '#C0392B' }}>{errors.name}</p>}
      </div>

      {/* Parent */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Parent Category
        </label>
        <select
          value={form.parent_id}
          onChange={e => setForm(f => ({ ...f, parent_id: e.target.value, section_id: '' }))}
          className={inputCls(false) + ' appearance-none cursor-pointer'}
          style={{ background: '#fff' }}
        >
          <option value="">— Top-level (no parent) —</option>
          {topLevelCats.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Section ("others" block) — only for sub-categories whose parent has sections */}
      {form.parent_id !== '' && parentSections.length > 0 && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
            Section
          </label>
          <select
            value={form.section_id}
            onChange={e => set('section_id', e.target.value)}
            className={inputCls(false) + ' appearance-none cursor-pointer'}
            style={{ background: '#fff' }}
          >
            <option value="">— Main block (no section) —</option>
            {parentSections.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <p className="text-[11px] mt-1" style={{ color: '#9C9894' }}>
            Choose which titled block this shows under in the menu, or leave as the main block.
          </p>
        </div>
      )}

      {/* Sort order */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Sort Order
        </label>
        <input
          type="number"
          min={0}
          value={form.sort_order}
          onChange={e => set('sort_order', e.target.value)}
          className={inputCls(false)}
        />
      </div>

      {/* Category image uploader */}
      <CategoryImageUploader
        value={form.image_url}
        onChange={v => set('image_url', v)}
        onUploadingChange={setImageUploading}
      />

      {/* Has sizes toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none group">
        <div
          onClick={() => set('has_sizes', !form.has_sizes)}
          className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
          style={{ background: form.has_sizes ? '#0F0F0F' : 'rgba(0,0,0,0.15)' }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
            style={{ left: form.has_sizes ? '22px' : '2px' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>Show size selector</p>
          <p className="text-xs" style={{ color: '#9C9894' }}>Enable for clothing, shoes & apparel</p>
        </div>
      </label>

      {/* Sidebar filters for this category */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Sidebar Filters
        </label>
        <p className="text-[11px] mb-2" style={{ color: '#9C9894' }}>
          Pick which filters show on the left when a customer opens this category.
          {!categoryId && parentId
            ? ' Pre-filled from the parent category — change them freely; the parent stays as is.'
            : ' Each category is independent — editing these does not change other categories.'}
        </p>
        {allFilters.length === 0 ? (
          <p className="text-xs italic" style={{ color: '#9C9894' }}>No filters defined yet.</p>
        ) : (
          <div
            className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto rounded-xl p-2.5"
            style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#FAFAF8' }}
          >
            {allFilters.map(f => {
              const checked = filterIds.includes(f.id)
              return (
                <label
                  key={f.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors"
                  style={{ background: checked ? '#fff' : 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFilter(f.id)}
                    className="w-4 h-4 rounded accent-ink cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-medium truncate" style={{ color: '#0F0F0F' }} title={f.name}>
                    {f.name}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-2">
        <button
          type="submit"
          disabled={saving || imageUploading}
          className="flex-1 text-sm font-bold py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#0F0F0F' }}
        >
          {imageUploading ? 'Uploading…' : saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Category'}
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

// ── Section form (add / rename a titled "others" block) ──────────────────────
function SectionForm({ initial, onSave, onCancel, saving }) {
  const [title, setTitle]         = useState(initial?.title ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)
  const [err, setErr]             = useState('')

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!title.trim()) { setErr('Title is required'); return }
    onSave({ title: title.trim(), sort_order: Number(sortOrder) })
  }

  const inputCls =
    `w-full rounded-xl border text-sm outline-none px-3.5 py-2.5 transition-all
     ${err ? 'border-[#C0392B] ring-2 ring-[#C0392B]/10' : 'border-[rgba(0,0,0,0.1)] focus:border-[#0F0F0F] focus:ring-2 focus:ring-black/10'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Section Title <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); setErr('') }}
          placeholder="e.g. New in Curve Clothing"
          className={inputCls}
        />
        {err && <p className="text-xs mt-1" style={{ color: '#C0392B' }}>{err}</p>}
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C5854' }}>
          Sort Order
        </label>
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          className="w-full rounded-xl border text-sm outline-none px-3.5 py-2.5 transition-all border-[rgba(0,0,0,0.1)] focus:border-[#0F0F0F] focus:ring-2 focus:ring-black/10"
        />
        <p className="text-[11px] mt-1" style={{ color: '#9C9894' }}>
          Lower numbers show first (left to right) in the menu.
        </p>
      </div>
      <div className="flex gap-2.5 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 text-sm font-bold py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#0F0F0F' }}
        >
          {saving ? 'Saving…' : initial ? 'Save Section' : 'Create Section'}
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

// ── Sub-category row ─────────────────────────────────────────────────────────
function SubCatRow({ cat, onEdit, onDelete, deleting }) {
  return (
    <div
      className="group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
      style={{ background: 'rgba(0,0,0,0.02)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
    >
      {/* Connector */}
      <div className="flex items-center gap-1.5 shrink-0 ml-1">
        <div className="w-3 h-px" style={{ background: 'rgba(0,0,0,0.15)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }} />
      </div>

      <span className="text-sm font-medium flex-1 truncate" style={{ color: '#0F0F0F' }}>
        {cat.name}
      </span>

      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md shrink-0" style={{ background: '#F0EEE9', color: '#9C9894' }}>
        {cat.slug}
      </span>

      {cat.has_sizes ? (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#EFF6FF', color: '#0284C7' }}>
          {Icon.sizes} SIZES
        </span>
      ) : null}

      <span className="text-xs font-semibold shrink-0" style={{ color: '#9C9894' }}>
        {cat.product_count ?? 0}p
      </span>

      {/* Actions — appear on group hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(cat)}
          className="p-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ background: '#F0EEE9', color: '#0F0F0F' }}
          title="Edit"
        >
          {Icon.edit}
        </button>
        <button
          onClick={() => onDelete(cat)}
          disabled={deleting === cat.id}
          className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: '#FEF2F2', color: '#C0392B' }}
          title="Delete"
        >
          {deleting === cat.id ? <span className="w-3.5 h-3.5 block">…</span> : Icon.trash}
        </button>
      </div>
    </div>
  )
}

// ── Top-level category card ──────────────────────────────────────────────────
function TopCatCard({
  cat, mainChildren = [], sections = [], childrenBySection = {},
  onEdit, onDelete, onAddSub, deleting, colorIdx,
  onAddSection, onEditSection, onDeleteSection,
}) {
  const [open, setOpen] = useState(true)
  const color = PALETTE[colorIdx % PALETTE.length]
  const sectionChildCount = sections.reduce((s, sec) => s + (childrenBySection[sec.id]?.length || 0), 0)
  const childCount = mainChildren.length + sectionChildCount
  const expandable = childCount > 0 || sections.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Header row */}
      <div
        className="group flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors"
        onClick={() => expandable && setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 uppercase"
          style={{ background: color }}
        >
          {cat.name[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base" style={{ color: '#0F0F0F' }}>{cat.name}</span>
            {cat.has_sizes ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                {Icon.sizes} SIZES
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="font-mono text-xs" style={{ color: '#C4C0BB' }}>{cat.slug}</span>
            {childCount > 0 && (
              <span className="text-xs font-semibold" style={{ color: '#9C9894' }}>
                {childCount} sub-{childCount === 1 ? 'category' : 'categories'}
              </span>
            )}
            {sections.length > 0 && (
              <span className="text-xs font-semibold" style={{ color: color }}>
                {sections.length} section{sections.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xl font-black" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
            {cat.product_count ?? 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9C9894' }}>products</p>
        </div>

        {/* Divider */}
        <div className="w-px h-8 shrink-0 self-center hidden sm:block" style={{ background: 'rgba(0,0,0,0.06)' }} />

        {/* Action buttons (stop propagation) */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onAddSub(cat, null)}
            title="Add sub-category to the main block"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: `${color}14`, color }}
          >
            {Icon.plus}
            <span className="hidden sm:inline">Sub</span>
          </button>
          <button
            onClick={() => onAddSection(cat)}
            title="Add a titled section (others)"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#F0EEE9', color: '#0F0F0F' }}
          >
            {Icon.plus}
            <span className="hidden sm:inline">Section</span>
          </button>
          <button
            onClick={() => onEdit(cat)}
            className="p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#F0EEE9', color: '#0F0F0F' }}
            title="Edit"
          >
            {Icon.edit}
          </button>
          <button
            onClick={() => onDelete(cat)}
            disabled={deleting === cat.id}
            className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: '#FEF2F2', color: '#C0392B' }}
            title="Delete"
          >
            {deleting === cat.id ? '…' : Icon.trash}
          </button>
        </div>

        {/* Chevron */}
        {expandable && (
          <div
            className="shrink-0 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#C4C0BB' }}
          >
            {Icon.chevron}
          </div>
        )}
      </div>

      {/* Sub-categories (main block) + sections ("others") side by side */}
      {open && expandable && (
        <div
          className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-4 px-4 py-3"
          style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
        >
          {/* Left: main block */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9C9894' }}>
                Main block
              </span>
              <button
                onClick={() => onAddSub(cat, null)}
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: `${color}14`, color }}
              >
                {Icon.plus} Add
              </button>
            </div>
            <div className="space-y-1">
              {mainChildren.length === 0 ? (
                <p className="text-xs italic px-1 py-2" style={{ color: '#C4C0BB' }}>
                  No subcategories in the main block yet.
                </p>
              ) : mainChildren.map(child => (
                <SubCatRow key={child.id} cat={child} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
              ))}
            </div>
          </div>

          {/* Right: "others" sections */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9C9894' }}>
                Sections (others)
              </span>
              <button
                onClick={() => onAddSection(cat)}
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: '#F0EEE9', color: '#0F0F0F' }}
              >
                {Icon.plus} Add section
              </button>
            </div>

            {sections.length === 0 ? (
              <p className="text-xs italic px-1 py-2" style={{ color: '#C4C0BB' }}>
                No sections yet. Add one to show a titled block beside the main subcategories.
              </p>
            ) : (
              <div className="space-y-3">
                {sections.map(sec => {
                  const secChildren = childrenBySection[sec.id] || []
                  return (
                    <div
                      key={sec.id}
                      className="rounded-xl p-2.5"
                      style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      {/* Section header */}
                      <div className="group flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-sm font-bold flex-1 truncate" style={{ color: '#0F0F0F' }}>
                          {sec.title}
                        </span>
                        <button
                          onClick={() => onAddSub(cat, sec.id)}
                          title="Add subcategory to this section"
                          className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                          style={{ background: `${color}14`, color }}
                        >
                          {Icon.plus}
                        </button>
                        <button
                          onClick={() => onEditSection(sec)}
                          title="Rename section"
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: '#F0EEE9', color: '#0F0F0F' }}
                        >
                          {Icon.edit}
                        </button>
                        <button
                          onClick={() => onDeleteSection(sec)}
                          title="Delete section"
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: '#FEF2F2', color: '#C0392B' }}
                        >
                          {Icon.trash}
                        </button>
                      </div>
                      {/* Section children */}
                      <div className="space-y-1">
                        {secChildren.length === 0 ? (
                          <p className="text-[11px] italic px-1 py-1" style={{ color: '#C4C0BB' }}>
                            Empty — add subcategories to this section.
                          </p>
                        ) : secChildren.map(child => (
                          <SubCatRow key={child.id} cat={child} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminCategories() {
  const toast = useToast()

  const [cats,     setCats]     = useState([])
  const [sections, setSections] = useState([])
  const [allFilters, setAllFilters] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)
  // modal: null | 'create' | { type:'edit', cat } | { type:'addSub', parent, sectionId }
  //        | { type:'addSection', cat } | { type:'editSection', section }

  const loadSections = () =>
    getAdminSections()
      .then(r => setSections(r.data.data || []))
      .catch(() => setSections([]))

  const load = () => {
    setLoading(true)
    getAdminCategories()
      .then(r => setCats(r.data.data || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false))
    loadSections()
    getAdminFilters()
      .then(r => setAllFilters(r.data.data || []))
      .catch(() => setAllFilters([]))
  }

  // Reload without spinner — used after create/update so the list always
  // reflects the real database state (avoids stale-state bugs from manual patching).
  const reload = () => Promise.all([
    getAdminCategories().then(r => setCats(r.data.data || [])).catch(() => {}),
    loadSections(),
  ])

  useEffect(load, [])

  // Derived: top-level list and children map
  const topLevel = useMemo(
    () => cats.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [cats]
  )
  const childrenOf = useMemo(() => {
    const map = {}
    cats.filter(c => c.parent_id).forEach(c => {
      if (!map[c.parent_id]) map[c.parent_id] = []
      map[c.parent_id].push(c)
    })
    return map
  }, [cats])

  // Sections grouped by their owning category, in display order.
  const sectionsByCat = useMemo(() => {
    const map = {}
    ;[...sections].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
      .forEach(s => {
        const cid = Number(s.category_id)
        if (!map[cid]) map[cid] = []
        map[cid].push(s)
      })
    return map
  }, [sections])

  // Search filter
  const q = search.toLowerCase()
  const filteredTop = topLevel.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  )
  const filteredTopWithMatchingChildren = topLevel.filter(c => {
    if (!q) return true
    if (c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)) return true
    return (childrenOf[c.id] || []).some(ch =>
      ch.name.toLowerCase().includes(q) || ch.slug.toLowerCase().includes(q)
    )
  })
  const filteredChildrenOf = (parentId) => {
    const all = childrenOf[parentId] || []
    if (!q) return all
    return all.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
  }

  const handleCreate = async ({ filter_ids, ...data }) => {
    setSaving(true)
    try {
      const res   = await createAdminCategory(data)
      const newId = res.data?.data?.id
      if (newId && Array.isArray(filter_ids)) {
        await saveCategoryFilters(newId, filter_ids)
      }
      await reload()
      setModal(null)
      toast.success('Category created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create')
    } finally { setSaving(false) }
  }

  const handleUpdate = async ({ filter_ids, ...data }) => {
    const id = modal.cat.id
    setSaving(true)
    try {
      await updateAdminCategory(id, data)
      if (Array.isArray(filter_ids)) {
        await saveCategoryFilters(id, filter_ids)
      }
      await reload()
      setModal(null)
      toast.success('Category updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleDelete = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    setDeleting(cat.id)
    try {
      await deleteAdminCategory(cat.id)
      setCats(prev => prev.filter(c => c.id !== cat.id))
      toast.success('Category deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete this category')
    } finally { setDeleting(null) }
  }

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleCreateSection = async (data) => {
    const catId = modal.cat.id
    setSaving(true)
    try {
      await createCategorySection(catId, data)
      await reload()
      setModal(null)
      toast.success('Section created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create section')
    } finally { setSaving(false) }
  }

  const handleUpdateSection = async (data) => {
    const id = modal.section.id
    setSaving(true)
    try {
      await updateCategorySection(id, data)
      await reload()
      setModal(null)
      toast.success('Section updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update section')
    } finally { setSaving(false) }
  }

  const handleDeleteSection = async (section) => {
    if (!confirm(`Delete section "${section.title}"? Its subcategories move back to the main block.`)) return
    try {
      await deleteCategorySection(section.id)
      await reload()
      toast.success('Section deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete this section')
    }
  }

  // Modal helpers
  const openCreate     = ()                 => setModal('create')
  const openEdit       = (cat)              => setModal({ type: 'edit', cat })
  const openAddSub     = (parent, sectionId = null) => setModal({ type: 'addSub', parent, sectionId })
  const openAddSection = (cat)              => setModal({ type: 'addSection', cat })
  const openEditSection= (section)          => setModal({ type: 'editSection', section })

  const modalTitle = modal === 'create'
    ? 'New Top-Level Category'
    : modal?.type === 'edit'
    ? `Edit — ${modal.cat.name}`
    : modal?.type === 'addSub'
    ? `Add Sub-category to "${modal.parent.name}"`
    : modal?.type === 'addSection'
    ? `Add Section to "${modal.cat.name}"`
    : modal?.type === 'editSection'
    ? `Edit Section — ${modal.section.title}`
    : ''

  const modalInitial = modal?.type === 'edit'
    ? modal.cat
    : modal?.type === 'addSub'
    ? { parent_id: modal.parent.id, section_id: modal.sectionId ?? '' }
    : null

  const onModalSave = modal?.type === 'edit' ? handleUpdate : handleCreate
  const isSectionModal = modal?.type === 'addSection' || modal?.type === 'editSection'

  // Stats
  const totalTop  = topLevel.length
  const totalSubs = cats.filter(c => c.parent_id).length
  const totalProds = cats.reduce((s, c) => s + (c.product_count || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: '#F0EEE9' }}>
      {/* ── Header strip ─────────────────────────────────────────── */}
      <div className="px-6 lg:px-8 pt-8 pb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>
              Catalog Structure
            </p>
            <h1
              className="text-4xl font-black tracking-tight leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}
            >
              CATEGORIES
            </h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#C0392B' }}
          >
            {Icon.plus}
            New Category
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Top-level',    value: totalTop  },
            { label: 'Sub-categories', value: totalSubs  },
            { label: 'Total products', value: totalProds },
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

        {/* Search */}
        <div className="relative max-w-sm">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9C9894' }}>
            {Icon.search}
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#0F0F0F',
            }}
            onFocus={e => e.target.style.borderColor = '#0F0F0F'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
          />
        </div>
      </div>

      {/* ── Tree ─────────────────────────────────────────────────── */}
      <div className="px-6 lg:px-8 pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="xl" className="text-ink-tertiary" />
          </div>
        ) : filteredTopWithMatchingChildren.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F0EEE9' }}>
              <span style={{ color: '#9C9894' }}>{Icon.folder}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>No categories found</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#9C9894' }}>
              {search ? `No results for "${search}"` : 'Start by adding a top-level category'}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:opacity-80"
                style={{ background: '#0F0F0F', color: '#fff' }}
              >
                Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTopWithMatchingChildren.map((cat) => {
              const visible    = filteredChildrenOf(cat.id)
              const catSecs    = sectionsByCat[cat.id] || []
              const secIdSet   = new Set(catSecs.map(s => String(s.id)))
              const mainChildren = visible.filter(c => !c.section_id || !secIdSet.has(String(c.section_id)))
              const childrenBySection = {}
              catSecs.forEach(s => {
                childrenBySection[s.id] = visible.filter(c => String(c.section_id) === String(s.id))
              })
              return (
                <TopCatCard
                  key={cat.id}
                  cat={cat}
                  mainChildren={mainChildren}
                  sections={catSecs}
                  childrenBySection={childrenBySection}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddSub={openAddSub}
                  onAddSection={openAddSection}
                  onEditSection={openEditSection}
                  onDeleteSection={handleDeleteSection}
                  deleting={deleting}
                  colorIdx={topLevel.indexOf(cat)}
                />
              )
            })}

            {/* Orphaned subcategories that match search but parent doesn't */}
            {search && (() => {
              const shownParentIds = new Set(filteredTopWithMatchingChildren.map(c => c.id))
              return null
            })()}
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modalTitle}
        size="md"
      >
        {!!modal && isSectionModal && (
          <SectionForm
            initial={modal.type === 'editSection' ? modal.section : null}
            onSave={modal.type === 'editSection' ? handleUpdateSection : handleCreateSection}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        )}
        {!!modal && !isSectionModal && (
          <CategoryForm
            initial={modalInitial}
            topLevelCats={topLevel}
            allFilters={allFilters}
            sectionsByCat={sectionsByCat}
            onSave={onModalSave}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  )
}
