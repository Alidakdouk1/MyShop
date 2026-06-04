import { useState, useEffect, useMemo } from 'react'
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
  })
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
          })
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/products')}
          className="text-ink-tertiary hover:text-ink transition-colors text-sm"
        >
          ← Back
        </button>
        <h1 className="hero-display text-4xl text-ink tracking-wide">
          {isEdit ? 'EDIT PRODUCT' : 'ADD PRODUCT'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Image upload ── */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-bold text-ink mb-4 uppercase tracking-wide">Product Images</p>

          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {existingImages.map(img => {
                const isVideo = img.media_type === 'youtube' || img.media_type === 'video'
                const hasPoster = img.image_url && String(img.image_url).length > 0
                return (
                  <div key={img.id} className="relative group">
                    <div className="w-20 h-20 rounded-xl bg-surface-alt overflow-hidden flex items-center justify-center">
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

          <div className="flex items-center gap-4 flex-wrap">
            {preview && existingImages.length === 0 ? (
              <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-xl bg-surface-alt" />
            ) : !existingImages.length ? (
              <div className="w-20 h-20 bg-surface-alt rounded-xl flex items-center justify-center text-ink-tertiary text-3xl">📸</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors">
                {existingImages.length > 0 ? 'Add Image' : preview ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleAddYouTube}
                disabled={addingVideo}
                className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors disabled:opacity-60"
              >
                Add YouTube URL
              </button>
              <label className={`cursor-pointer bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors ${addingVideo ? 'opacity-60 pointer-events-none' : ''}`}>
                Upload Video
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoFile} className="hidden" />
              </label>
              <p className="text-xs text-ink-tertiary w-full">Images: JPG/PNG/WebP · 5MB · Videos: MP4/WebM/MOV · 50MB</p>
            </div>
          </div>
        </section>

        {/* ── Core fields ── */}
        <section className="bg-surface border border-border rounded-2xl p-5 space-y-5">
          <p className="text-sm font-bold text-ink uppercase tracking-wide">Product Details</p>

          <Input
            label="Product Name" value={form.name}
            onChange={e => set('name', e.target.value)}
            error={errors.name} required placeholder="e.g. Classic White T-Shirt"
          />

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
            <Input
              label="Sale Price ($)" type="number" step="0.01"
              value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
              placeholder="Leave blank if no sale"
            />
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

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active — visible in shop</option>
              <option value="draft">Draft — hidden from shop</option>
            </Select>
            <Select label="Featured" value={String(form.is_featured)} onChange={e => set('is_featured', Number(e.target.value))}>
              <option value="0">Not featured</option>
              <option value="1">Featured on homepage</option>
            </Select>
          </div>

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

        {/* ── Submit ── */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} size="lg">
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/admin/products')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
