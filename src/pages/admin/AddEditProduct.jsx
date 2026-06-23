import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminProduct, adminCreateProduct, adminUpdateProduct,
  adminUploadImage, adminDeleteImage,
  adminUploadVideo, adminAddYoutube,
} from '../../api/adminApi'
import { getCategoriesFlat } from '../../api/productApi'
import { saveProductFilters, buildFiltersPayload } from '../../api/filterApi'
import ProductFiltersPicker from '../../components/admin/ProductFiltersPicker'
import { useToast } from '../../hooks/useToast'
import Input, { Textarea, Select } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

export default function AdminAddEditProduct() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()
  const isEdit   = !!id

  const [loading,          setLoading]          = useState(isEdit)
  const [saving,           setSaving]           = useState(false)
  const [createdProductId, setCreatedProductId] = useState(null)
  const [categories,       setCategories]       = useState([])
  const [imageFile,        setImageFile]        = useState(null)
  const [preview,          setPreview]          = useState(null)
  const [existingImages,   setExistingImages]   = useState([])
  const [deletingImg,      setDeletingImg]      = useState(null)
  const [addingVideo,      setAddingVideo]      = useState(false)

  const [filterSelections, setFilterSelections] = useState({})

  const [form, setForm] = useState({
    name: '', description: '', base_price: '', sale_price: '',
    category_id: '', sku: '', status: 'active', is_featured: 0,
    release_date: '', low_stock_threshold: 5,
    seo_title: '', seo_description: '', seo_og_image: '',
  })
  // Structured spec rows ({ label, value }). Kept as array so admin can
  // reorder; serialized to JSON in the payload.
  const [specs, setSpecs] = useState([])
  const [errors, setErrors] = useState({})

  // Total stock is the sum of every per-option quantity in enabled filters
  const totalStock = useMemo(() => {
    let sum = 0
    Object.values(filterSelections || {}).forEach(sel => {
      if (sel?.enabled === false) return
      Object.values(sel?.quantities || {}).forEach(q => {
        if (q !== '' && q != null && !Number.isNaN(Number(q))) sum += Number(q)
      })
    })
    return sum
  }, [filterSelections])

  // Derived values for the sidebar / inline hints.
  const slug = useMemo(() => {
    const s = (form.name || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return s || 'untitled'
  }, [form.name])

  const base = parseFloat(form.base_price) || 0
  const sale = parseFloat(form.sale_price) || 0
  const onSale = sale > 0 && sale < base
  const discountPct = onSale ? Math.round((1 - sale / base) * 100) : 0
  const lowStock = totalStock > 0 && totalStock <= Number(form.low_stock_threshold ?? 0)

  // Dirty tracking — flips true after first user edit, drives the
  // beforeunload warning and the "Unsaved changes" pill in the top bar.
  const [dirty, setDirty] = useState(false)
  const initialLoad = useRef(true)
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return }
    setDirty(true)
  }, [form, specs, filterSelections, imageFile])

  // Warn before leaving the tab if there are unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    getCategoriesFlat()
      .then(r => setCategories(r.data.data || []))
      .catch(() => toast.error('Failed to load categories'))
    if (isEdit) {
      getAdminProduct(id)
        .then(r => {
          const p = r.data.data
          setForm({
            name:         p.name         || '',
            description:  p.description  || '',
            base_price:   p.base_price   || '',
            sale_price:   p.sale_price   || '',
            category_id:  p.category_id  || '',
            sku:          p.sku          || '',
            status:       p.status       || 'active',
            is_featured:  p.is_featured  || 0,
            release_date: p.release_date || '',
            low_stock_threshold: p.low_stock_threshold ?? 5,
            seo_title:       p.seo_title       || '',
            seo_description: p.seo_description || '',
            seo_og_image:    p.seo_og_image    || '',
          })
          setSpecs(Array.isArray(p.specs) ? p.specs : [])
          setExistingImages(p.images || [])
          const primary = (p.images || []).find(i => i.is_primary) || (p.images || [])[0]
          if (primary) {
            const url = primary.image_url
            setPreview(url.startsWith('http') ? url : `/MyShop/backend/${url}`)
          }
        })
        .catch(() => toast.error('Product not found'))
        .finally(() => setLoading(false))
    }
  }, [id])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name        = 'Required'
    if (!form.base_price)  e.base_price  = 'Required'
    if (!form.sku.trim())  e.sku         = 'Required'
    if (!form.category_id) e.category_id = 'Select a category'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const productIdForMedia = id || createdProductId

  const handleAddYouTube = async () => {
    const pid = productIdForMedia
    if (!pid) { toast.info('Save the product first, then add videos'); return }
    const url = window.prompt('Paste a YouTube URL (youtube.com/watch?v=… or youtu.be/…):')
    if (!url) return
    setAddingVideo(true)
    try {
      const { data } = await adminAddYoutube(pid, url.trim())
      const m = data?.data || {}
      setExistingImages(imgs => [...imgs, {
        id: m.id, image_url: m.image_url, video_url: m.video_url, media_type: 'youtube', is_primary: 0,
      }])
      toast.success('YouTube video added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add video')
    } finally { setAddingVideo(false) }
  }

  const handleVideoFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const pid = productIdForMedia
    if (!pid) { toast.info('Save the product first, then add videos'); return }
    setAddingVideo(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await adminUploadVideo(pid, fd)
      const m = data?.data || {}
      setExistingImages(imgs => [...imgs, {
        id: m.id, image_url: '', video_url: m.video_url, media_type: 'video', is_primary: 0,
      }])
      toast.success('Video uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload video')
    } finally { setAddingVideo(false) }
  }

  const handleDeleteImage = async (imgId) => {
    if (!confirm('Delete this item?')) return
    setDeletingImg(imgId)
    try {
      await adminDeleteImage(id, imgId)
      setExistingImages(imgs => imgs.filter(i => i.id !== imgId))
      toast.success('Image deleted')
    } catch { toast.error('Cannot delete image') }
    finally { setDeletingImg(null) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let productId = id || createdProductId
      const payload = {
        ...form,
        stock_qty:           totalStock,
        release_date:        form.release_date || null,
        low_stock_threshold: Math.max(0, parseInt(form.low_stock_threshold, 10) || 0),
        // Empty strings collapse to null so the DB stores NULL (not "") and
        // the storefront cleanly falls back to the auto-generated defaults.
        seo_title:           form.seo_title?.trim()       || null,
        seo_description:     form.seo_description?.trim() || null,
        seo_og_image:        form.seo_og_image?.trim()    || null,
        // Strip empty rows on the way out — backend re-validates but this
        // avoids needless network bytes when the admin leaves blanks around.
        specs: specs
          .map(s => ({ label: (s.label || '').trim(), value: (s.value || '').trim() }))
          .filter(s => s.label && s.value),
      }
      if (isEdit) {
        await adminUpdateProduct(id, payload)
      } else if (!productId) {
        const res = await adminCreateProduct(payload)
        productId = res.data?.data?.id
        if (!productId) throw new Error('Product was saved but no ID was returned — refresh and try again.')
        setCreatedProductId(productId)
      }
      if (imageFile && productId) {
        const fd = new FormData()
        fd.append('image', imageFile)
        await adminUploadImage(productId, fd)
      }
      if (productId) {
        const payload = buildFiltersPayload(filterSelections)
        await saveProductFilters(productId, payload)
      }
      toast.success(isEdit ? 'Product updated!' : 'Product created!')
      setDirty(false)
      navigate('/admin/products')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Spinner size="xl" className="text-ink-tertiary" />
    </div>
  )

  const onCancel = () => {
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return
    navigate('/admin/products')
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-4">
      {/* ── Sticky top action bar — Save always visible ── */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-5 border-b"
        style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(10px)', borderColor: '#E4E1D9' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-alt text-ink-secondary hover:text-ink transition-colors"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" data-rtl-flip>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
                {isEdit ? 'Edit product' : 'New product'}
              </p>
              <h1 className="text-lg sm:text-xl font-black text-ink truncate" style={{ letterSpacing: '-0.01em' }}>
                {form.name?.trim() || (isEdit ? 'Untitled product' : 'Add product')}
              </h1>
            </div>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={
                form.status === 'active'
                  ? { background: 'rgba(0,209,193,0.14)', color: '#0AAFA3' }
                  : { background: '#F0EEE9', color: '#5C5854' }
              }
            >
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: form.status === 'active' ? '#00D1C1' : '#9C9894' }}
              />
              {form.status === 'active' ? 'Active' : 'Draft'}
            </span>
            {dirty && (
              <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: '#FEF3C7', color: '#92400E' }}>
                Unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEdit && form.status === 'active' && (
              <a
                href={`/products/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border hover:bg-surface-alt transition-colors text-ink"
                style={{ borderColor: '#E4E1D9' }}
              >
                View
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
            <Button type="submit" form="product-form" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="min-w-0 space-y-6">

        {/* ── Image upload ── */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-bold text-ink mb-4 uppercase tracking-wide">Product Images</p>

          {existingImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
              {existingImages.map(img => {
                const isVideo = img.media_type === 'youtube' || img.media_type === 'video'
                const hasPoster = img.image_url && String(img.image_url).length > 0
                return (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square rounded-xl bg-surface-alt overflow-hidden flex items-center justify-center border border-border">
                      {hasPoster ? (
                        <img
                          src={img.image_url.startsWith('http') ? img.image_url : `/MyShop/backend/${img.image_url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-7 h-7 text-ink-tertiary" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm6.6 3.13a.75.75 0 0 0-1.1.66v3.42a.75.75 0 0 0 1.1.66l3.2-1.71a.75.75 0 0 0 0-1.32L10.6 9.63Z" /></svg>
                      )}
                    </div>
                    {isVideo && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </span>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ background: 'rgba(15,15,15,0.8)' }}>
                      {img.media_type === 'youtube' ? 'YT' : img.media_type === 'video' ? 'MP4' : ''}
                    </span>
                    {img.is_primary == 1 && (
                      <span className="absolute top-1 left-1 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        Main
                      </span>
                    )}
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={deletingImg === img.id}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Large drop zone — primary CTA when there's no media yet */}
          {existingImages.length === 0 && !preview && (
            <label
              className="cursor-pointer flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors hover:border-ink/40"
              style={{ borderColor: '#E4E1D9', background: '#FAFAF8', padding: '36px 20px' }}
            >
              <span
                className="inline-flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,209,193,0.12)', color: '#00D1C1' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </span>
              <p className="font-semibold text-ink">Click to upload first image</p>
              <p className="text-xs text-ink-tertiary">JPG, PNG, WebP · max 5 MB</p>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}

          {/* Inline preview row when an image is selected but not yet uploaded */}
          {preview && existingImages.length === 0 && (
            <div className="flex items-center gap-4">
              <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl bg-surface-alt" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">Image ready to upload</p>
                <p className="text-xs text-ink-tertiary mt-0.5">Click Save to attach it to the product.</p>
              </div>
            </div>
          )}

          {/* Media action row */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {existingImages.length > 0 ? 'Add Image' : preview ? 'Change Image' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleAddYouTube}
              disabled={addingVideo}
              className="inline-flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors disabled:opacity-60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19a2.78 2.78 0 0 0-2-2C17.84 4.7 12 4.7 12 4.7s-5.84 0-7.62.5a2.78 2.78 0 0 0-2 2A29.94 29.94 0 0 0 2 12a29.94 29.94 0 0 0 .42 4.81 2.78 2.78 0 0 0 2 2c1.78.49 7.62.49 7.62.49s5.84 0 7.62-.5a2.78 2.78 0 0 0 2-2A29.94 29.94 0 0 0 22 12a29.94 29.94 0 0 0-.42-4.81zM10 15.5v-7l6 3.5z"/></svg>
              YouTube URL
            </button>
            <label className={`cursor-pointer inline-flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors ${addingVideo ? 'opacity-60 pointer-events-none' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              Upload Video
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoFile} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-2">Images: JPG/PNG/WebP · 5MB · Videos: MP4/WebM/MOV · 50MB</p>
        </section>

        {/* ── Core fields ── */}
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-5">
          <p className="text-sm font-bold text-ink uppercase tracking-wide">Product Details</p>

          <div>
            <Input
              label="Product Name" value={form.name}
              onChange={e => set('name', e.target.value)}
              error={errors.name} required placeholder="e.g. Classic White T-Shirt"
            />
            {form.name?.trim() && (
              <p className="text-[11px] text-ink-tertiary mt-1.5" style={{ fontFamily: 'monospace' }}>
                URL: /products/<span className="font-bold text-ink-secondary">{slug}</span>
              </p>
            )}
          </div>

          <Textarea
            label="Description" value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the product — materials, features, sizing info…" rows={4}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Price ($)" type="number" step="0.01"
              value={form.base_price} onChange={e => set('base_price', e.target.value)}
              error={errors.base_price} required placeholder="0.00"
            />
            <div className="relative">
              <Input
                label="Sale Price ($)" type="number" step="0.01"
                value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
                placeholder="Leave blank if no sale"
              />
              {onSale && (
                <span
                  className="absolute right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{ top: 30, background: '#DCFCE7', color: '#15803D' }}
                >
                  -{discountPct}%
                </span>
              )}
            </div>
          </div>

          <Input
            label="SKU" value={form.sku} onChange={e => set('sku', e.target.value)}
            error={errors.sku} required placeholder="e.g. SHIRT-WHT"
          />

          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: '#F0EEE9', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5C5854' }}>
                Total stock
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9C9894' }}>
                Sum of every quantity you set per filter option below
              </p>
            </div>
            <div className="flex items-center gap-5">
              <p
                className="text-2xl font-black"
                style={{
                  color: totalStock <= Number(form.low_stock_threshold ?? 0) ? '#C0392B' : '#0F0F0F',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {totalStock}
              </p>
              <div className="border-l h-9 border-border" />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#5C5854' }}>
                  Low-stock alert at
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={form.low_stock_threshold}
                    onChange={e => set('low_stock_threshold', e.target.value)}
                    className="w-20 text-sm rounded-lg px-2 py-1.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors text-right"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span className="text-[11px]" style={{ color: '#9C9894' }}>units</span>
                </div>
              </div>
            </div>
          </div>

          <Select
            label="Category" value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
            error={errors.category_id} required
          >
            <option value="">Select a category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.parent_name ? `${c.parent_name} › ${c.name}` : c.name}
              </option>
            ))}
          </Select>

          <div>
            <label className="text-xs font-semibold text-ink-secondary">Pre-order release date <span className="font-normal text-ink-tertiary">(optional)</span></label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="date"
                value={form.release_date ? String(form.release_date).slice(0, 10) : ''}
                onChange={e => set('release_date', e.target.value)}
                className="text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
              />
              {form.release_date && (
                <button type="button" onClick={() => set('release_date', '')}
                  className="text-xs font-bold text-ink-tertiary hover:text-accent transition-colors px-2">
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink-tertiary mt-1">
              Set a future date to mark this product as a pre-order. The storefront will show "Coming on …" + "Notify Me" instead of "Add to Cart". Leave blank for normal availability.
            </p>
          </div>
        </section>

        {/* ── Specifications ── */}
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-ink uppercase tracking-wide mb-1">Specifications</p>
              <p className="text-xs text-ink-tertiary">
                Structured spec sheet for the product page — Material, Weight, Origin, etc.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSpecs(s => [...s, { label: '', value: '' }])}
              className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors"
            >
              + Add Row
            </button>
          </div>

          {specs.length === 0 ? (
            <p className="text-xs text-ink-tertiary text-center py-4 border border-dashed border-border rounded-xl">
              No specs yet. Tap "Add Row" to start.
            </p>
          ) : (
            <div className="space-y-2">
              {specs.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
                  <input
                    value={row.label}
                    onChange={e => setSpecs(s => s.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                    placeholder="Label (e.g. Material)"
                    maxLength={80}
                    className="text-sm rounded-lg px-3 py-2 outline-none border border-border bg-white text-ink focus:border-ink"
                  />
                  <input
                    value={row.value}
                    onChange={e => setSpecs(s => s.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    placeholder="Value (e.g. 100% Cotton)"
                    maxLength={300}
                    className="text-sm rounded-lg px-3 py-2 outline-none border border-border bg-white text-ink focus:border-ink"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSpecs(s => {
                        if (i === 0) return s
                        const next = [...s]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next
                      })}
                      disabled={i === 0}
                      title="Move up"
                      className="w-7 h-7 rounded-md hover:bg-surface-alt text-ink-tertiary hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecs(s => {
                        if (i === s.length - 1) return s
                        const next = [...s]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return next
                      })}
                      disabled={i === specs.length - 1}
                      title="Move down"
                      className="w-7 h-7 rounded-md hover:bg-surface-alt text-ink-tertiary hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpecs(s => s.filter((_, j) => j !== i))}
                    title="Remove row"
                    className="w-7 h-7 rounded-md hover:bg-accent-light text-ink-tertiary hover:text-accent transition-colors flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SEO ── */}
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-ink uppercase tracking-wide mb-1">SEO &amp; Social Sharing</p>
            <p className="text-xs text-ink-tertiary">
              Custom title + description for Google search results and link previews on WhatsApp, Facebook, Twitter. Leave blank to auto-generate from the product name &amp; description.
            </p>
          </div>

          {(() => {
            const effTitle = (form.seo_title || form.name || 'Product').trim()
            const effDesc  = (form.seo_description || form.description || '').trim().slice(0, 200)
            const effImg   = form.seo_og_image?.trim() || preview || ''
            const origin   = typeof window !== 'undefined' ? window.location.origin : 'https://myshop.com'
            return (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                    SEO Title <span className="text-ink-tertiary font-normal lowercase tracking-normal">({form.seo_title?.length || 0}/70 — sweet spot)</span>
                  </label>
                  <input
                    type="text" maxLength={80}
                    value={form.seo_title}
                    onChange={e => set('seo_title', e.target.value)}
                    placeholder={form.name ? `${form.name} · MyShop` : 'Leave blank to use product name'}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                    Meta Description <span className="text-ink-tertiary font-normal lowercase tracking-normal">({form.seo_description?.length || 0}/160 — sweet spot)</span>
                  </label>
                  <textarea
                    maxLength={200} rows={3}
                    value={form.seo_description}
                    onChange={e => set('seo_description', e.target.value)}
                    placeholder="One sentence that makes someone want to click."
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                    Social Share Image URL <span className="text-ink-tertiary font-normal lowercase tracking-normal">(defaults to primary product image)</span>
                  </label>
                  <input
                    type="url" maxLength={500}
                    value={form.seo_og_image}
                    onChange={e => set('seo_og_image', e.target.value)}
                    placeholder="https://… (optional)"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
                  />
                  <p className="text-[10px] text-ink-tertiary mt-1.5">Recommended: 1200×630px JPG/PNG. WhatsApp crops to a square.</p>
                </div>

                {/* Live previews */}
                <div className="border-t border-border pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">Live Previews</p>

                  {/* Google result */}
                  <div className="rounded-xl border border-border p-4 bg-white mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Google</p>
                    <p className="text-xs text-ink-tertiary truncate">{origin}/products/{form.name ? form.name.toLowerCase().replace(/\s+/g, '-') : 'product-slug'}</p>
                    <p className="text-[18px] leading-tight font-medium mt-1" style={{ color: '#1a0dab', fontFamily: 'arial, sans-serif' }}>
                      {effTitle}{form.seo_title ? '' : ' · MyShop'}
                    </p>
                    <p className="text-sm leading-snug mt-1" style={{ color: '#4d5156', fontFamily: 'arial, sans-serif' }}>
                      {effDesc || `Buy ${effTitle} at MyShop.`}
                    </p>
                  </div>

                  {/* WhatsApp / OG card */}
                  <div className="rounded-xl border border-border bg-white overflow-hidden max-w-md">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary p-3 pb-2">WhatsApp / Facebook</p>
                    {effImg && (
                      <div className="bg-surface-alt" style={{ aspectRatio: '1200/630' }}>
                        <img src={effImg} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3" style={{ background: '#f0f2f5' }}>
                      <p className="text-[11px] uppercase text-gray-500">{origin.replace(/^https?:\/\//, '')}</p>
                      <p className="text-sm font-semibold text-gray-900 leading-tight mt-1 line-clamp-2">{effTitle}{form.seo_title ? '' : ' · MyShop'}</p>
                      <p className="text-xs text-gray-600 leading-snug mt-1 line-clamp-2">{effDesc || `Buy ${effTitle} at MyShop.`}</p>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </section>

        {/* ── Filters ── */}
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-ink uppercase tracking-wide mb-1">Filters</p>
            <p className="text-xs text-ink-tertiary">
              Turn on a filter to apply it to this product, then pick the values that match.
            </p>
          </div>
          <ProductFiltersPicker
            value={filterSelections}
            onChange={setFilterSelections}
            productId={isEdit ? id : null}
            categoryId={form.category_id || null}
          />
        </section>

        </div>{/* /main column */}

        {/* ── Sticky sidebar — at-a-glance summary & quick toggles ── */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          {/* Status & visibility */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Status</p>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: '#F2F0EB' }}>
              {['active', 'draft'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className="text-xs font-bold uppercase tracking-wider py-2 rounded-lg transition-colors"
                  style={
                    form.status === s
                      ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' }
                      : { background: 'transparent', color: '#5C5854' }
                  }
                >
                  {s === 'active' ? 'Active' : 'Draft'}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm text-ink">Featured on homepage</span>
              <span className="relative inline-block w-10 h-6">
                <input
                  type="checkbox"
                  checked={!!form.is_featured}
                  onChange={e => set('is_featured', e.target.checked ? 1 : 0)}
                  className="sr-only peer"
                />
                <span
                  className="block w-10 h-6 rounded-full transition-colors peer-checked:bg-ink"
                  style={{ background: form.is_featured ? '#0F172A' : '#D6D2C7' }}
                />
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: form.is_featured ? 'translateX(16px)' : 'none' }}
                />
              </span>
            </label>
          </div>

          {/* Pricing summary */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">Pricing</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${onSale ? sale.toFixed(2) : base.toFixed(2)}
              </span>
              {onSale && (
                <span className="text-sm font-medium text-ink-tertiary line-through" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${base.toFixed(2)}
                </span>
              )}
            </div>
            {onSale && (
              <span
                className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: '#DCFCE7', color: '#15803D' }}
              >
                Save {discountPct}%
              </span>
            )}
            {!base && (
              <p className="text-xs text-ink-tertiary mt-1">Set a base price in Product Details.</p>
            )}
          </div>

          {/* Inventory snapshot */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">Inventory</p>
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-2xl font-black"
                style={{
                  color: totalStock === 0 ? '#9C9894' : lowStock ? '#C0392B' : '#0F172A',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {totalStock}
              </span>
              <span className="text-xs text-ink-tertiary">units total</span>
            </div>
            {lowStock && (
              <span
                className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: '#FEE2E2', color: '#C0392B' }}
              >
                Low stock
              </span>
            )}
            {totalStock === 0 && (
              <p className="text-xs text-ink-tertiary mt-2">Add quantities in the Filters section.</p>
            )}
          </div>

          {/* Visibility / URL */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Storefront URL</p>
            <p className="text-xs text-ink break-all" style={{ fontFamily: 'monospace' }}>
              /products/<span className="font-bold">{slug}</span>
            </p>
            <p className="text-[10px] text-ink-tertiary mt-2">Auto-generated from the product name.</p>
          </div>

          {/* Quick actions */}
          {isEdit && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Actions</p>
              <a
                href={`/products/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-ink hover:text-accent transition-colors"
              >
                <span>Preview on storefront</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-rtl-flip>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-between w-full text-sm text-ink-secondary hover:text-ink transition-colors"
              >
                <span>Back to product list</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-rtl-flip>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          )}
        </aside>
      </form>

      {/* Mobile-only floating Save bar — sidebar is hidden on mobile so we
          surface the primary action at the bottom for thumb reach. */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-20 p-3 border-t flex gap-2"
        style={{ background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderColor: '#E4E1D9' }}
      >
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" form="product-form" loading={saving} className="flex-[2]">
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  )
}
