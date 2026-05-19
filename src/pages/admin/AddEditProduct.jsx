import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminProduct, adminCreateProduct, adminUpdateProduct,
  adminUploadImage, adminDeleteImage, adminAddVariant, adminDeleteVariant,
} from '../../api/adminApi'
import { getCategoriesFlat } from '../../api/productApi'
import { useToast } from '../../hooks/useToast'
import Input, { Textarea, Select } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

// ── Category-aware variant presets ────────────────────────────────────────────
const PRESETS = {
  clothing:    { label: 'Clothing Sizes',  options: ['XS','S','M','L','XL','XXL','XXXL','One Size'] },
  shoes:       { label: 'Shoe Sizes (EU)', options: ['35','36','37','38','39','40','41','42','43','44','45','46'] },
  beauty:      { label: 'Volume',          options: ['15ml','30ml','50ml','75ml','100ml','150ml','200ml'] },
  storage:     { label: 'Storage',         options: ['64GB','128GB','256GB','512GB','1TB','2TB'] },
  bags:        { label: 'Bag Sizes',       options: ['Mini','Small','Medium','Large','XL'] },
  home:        { label: 'Sizes',           options: ['Small','Medium','Large','XL','XXL'] },
}

function getCatPreset(cat) {
  if (!cat) return PRESETS.clothing
  const n = `${cat.parent_name || ''} ${cat.name}`.toLowerCase()
  if (/shoe|boot|sneaker/.test(n))                              return PRESETS.shoes
  if (/beauty|skin|makeup|hair|perfume|cosmetic/.test(n))       return PRESETS.beauty
  if (/electron|phone|laptop|tablet|watch/.test(n))             return PRESETS.storage
  if (/bag/.test(n))                                            return PRESETS.bags
  if (/home|garden|furniture|kitchen|bedding|decor/.test(n))   return PRESETS.home
  return PRESETS.clothing
}

// ── Variant row ───────────────────────────────────────────────────────────────
function VariantRow({ v, onDelete, deleting, pending }) {
  const key = pending ? v._tempId : v.id
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-2.5"
      style={{
        background: pending ? '#FFFBEB' : 'var(--color-surface-alt, #F0EEE9)',
        border: pending ? '1px dashed #D97706' : 'none',
      }}
    >
      <span className="font-semibold text-sm text-ink min-w-[60px]">{v.size || '—'}</span>
      {v.color && <span className="text-xs text-ink-secondary">{v.color}</span>}
      <span className="text-xs text-ink-tertiary">Qty: {v.stock_qty}</span>
      {v.price_modifier != null && Number(v.price_modifier) !== 0 && !isNaN(Number(v.price_modifier)) && (
        <span className="text-xs text-ink-tertiary">
          {Number(v.price_modifier) > 0 ? '+' : ''}${Number(v.price_modifier).toFixed(2)}
        </span>
      )}
      <span className="text-xs text-ink-tertiary font-mono">{v.sku}</span>
      {pending && (
        <span className="text-[10px] font-bold uppercase tracking-wide ml-auto" style={{ color: '#D97706' }}>
          pending
        </span>
      )}
      <button
        type="button"
        onClick={() => onDelete(key)}
        disabled={!pending && deleting === v.id}
        className="text-accent text-xs font-semibold hover:underline disabled:opacity-40 ml-auto"
      >
        {!pending && deleting === v.id ? '…' : 'Remove'}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [variants,         setVariants]         = useState([])      // saved (from DB)
  const [pendingVariants,  setPendingVariants]  = useState([])      // queued for creation
  const [deletingVar,      setDeletingVar]      = useState(null)
  const [deletingImg,      setDeletingImg]      = useState(null)
  const [addingVar,        setAddingVar]        = useState(false)

  const [newVariant, setNewVariant] = useState({
    size: '', color: '', stock_qty: '', price_modifier: '', sku: '',
  })

  const [form, setForm] = useState({
    name: '', description: '', base_price: '', sale_price: '',
    stock_qty: '', category_id: '', sku: '', status: 'active', is_featured: 0,
  })
  const [errors, setErrors] = useState({})

  const selectedCat = categories.find(c => String(c.id) === String(form.category_id))
  const hasSizes    = selectedCat?.has_sizes == 1
  const preset      = getCatPreset(selectedCat)

  useEffect(() => {
    getCategoriesFlat()
      .then(r => setCategories(r.data.data || []))
      .catch(() => toast.error('Failed to load categories'))
    if (isEdit) {
      getAdminProduct(id)
        .then(r => {
          const p = r.data.data
          setForm({
            name:        p.name        || '',
            description: p.description || '',
            base_price:  p.base_price  || '',
            sale_price:  p.sale_price  || '',
            stock_qty:   p.stock_qty   || '',
            category_id: p.category_id || '',
            sku:         p.sku         || '',
            status:      p.status      || 'active',
            is_featured: p.is_featured || 0,
          })
          setExistingImages(p.images || [])
          setVariants(p.variants || [])
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
    if (hasSizes && !isEdit && variants.length === 0 && pendingVariants.length === 0) {
      e.variants = 'Add at least one variant before creating this product'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleDeleteImage = async (imgId) => {
    if (!confirm('Delete this image?')) return
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
      if (isEdit) {
        await adminUpdateProduct(id, form)
      } else if (!productId) {
        const res = await adminCreateProduct(form)
        productId = res.data?.data?.id
        if (!productId) throw new Error('Product was saved but no ID was returned — refresh and try again.')
        setCreatedProductId(productId)
      }
      if (imageFile && productId) {
        const fd = new FormData()
        fd.append('image', imageFile)
        await adminUploadImage(productId, fd)
      }
      for (const { _tempId, ...variantData } of pendingVariants) {
        await adminAddVariant(productId, variantData)
      }
      toast.success(isEdit ? 'Product updated!' : 'Product created!')
      navigate('/admin/products')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleAddVariant = async () => {
    if (!newVariant.size)      return toast.error('Option / size is required')
    if (!newVariant.stock_qty) return toast.error('Stock qty is required')
    if (!newVariant.sku)       return toast.error('Variant SKU is required')

    const savedId = id || createdProductId
    if (savedId) {
      setAddingVar(true)
      try {
        const { data } = await adminAddVariant(savedId, newVariant)
        setVariants(v => [...v, { ...newVariant, id: data.data?.id }])
        setNewVariant({ size: '', color: '', stock_qty: '', sku: '' })
        toast.success('Variant added')
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add variant')
      } finally { setAddingVar(false) }
    } else {
      setPendingVariants(v => [...v, { ...newVariant, _tempId: Date.now() }])
      setNewVariant({ size: '', color: '', stock_qty: '', sku: '' })
    }
  }

  const handleDeleteVariant = async (vid) => {
    if (!confirm('Remove this variant?')) return
    setDeletingVar(vid)
    try {
      await adminDeleteVariant(id, vid)
      setVariants(v => v.filter(x => x.id !== vid))
      toast.success('Variant removed')
    } catch { toast.error('Cannot remove variant') }
    finally { setDeletingVar(null) }
  }

  const removePending = (tempId) => {
    setPendingVariants(v => v.filter(x => x._tempId !== tempId))
  }

  const pickSize = (size) => {
    const base = form.sku.split('-').slice(0, 2).join('-') || form.sku || 'SKU'
    setNewVariant(v => ({
      ...v,
      size,
      sku: `${base}-${size.replace(/\s+/g, '')}`,
    }))
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
              {existingImages.map(img => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.image_url.startsWith('http') ? img.image_url : `/MyShop/backend/${img.image_url}`}
                    alt=""
                    className="w-20 h-20 object-cover rounded-xl bg-surface-alt"
                  />
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
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            {preview && existingImages.length === 0 ? (
              <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-xl bg-surface-alt" />
            ) : !existingImages.length ? (
              <div className="w-20 h-20 bg-surface-alt rounded-xl flex items-center justify-center text-ink-tertiary text-3xl">📸</div>
            ) : null}
            <div>
              <label className="cursor-pointer bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors">
                {existingImages.length > 0 ? 'Add Another Image' : preview ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <p className="text-xs text-ink-tertiary mt-1.5">JPG, PNG, WebP · Max 5MB</p>
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

          <div className="grid grid-cols-2 gap-4">
            {!hasSizes && (
              <Input
                label="Stock Quantity" type="number"
                value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)}
                placeholder="0"
              />
            )}
            <Input
              label="SKU" value={form.sku} onChange={e => set('sku', e.target.value)}
              error={errors.sku} required placeholder="e.g. SHIRT-WHT"
              className={hasSizes ? 'col-span-2' : ''}
            />
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
        </section>

        {/* ── Variants ── */}
        {hasSizes && (
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-ink uppercase tracking-wide mb-1">Variants</p>
              <p className="text-xs text-ink-tertiary">
                Each variant gets its own stock and SKU. Variants added here will be saved when you
                {isEdit ? ' save changes.' : ' create the product.'}
              </p>
              {errors.variants && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.variants}</p>
              )}
            </div>

            {/* Saved variants */}
            {variants.length > 0 && (
              <div className="space-y-2">
                {variants.map(v => (
                  <VariantRow
                    key={v.id} v={v}
                    onDelete={handleDeleteVariant}
                    deleting={deletingVar}
                    pending={false}
                  />
                ))}
              </div>
            )}

            {/* Pending variants (create mode) */}
            {pendingVariants.length > 0 && (
              <div className="space-y-2">
                {pendingVariants.map(v => (
                  <VariantRow
                    key={v._tempId} v={v}
                    onDelete={removePending}
                    deleting={null}
                    pending={true}
                  />
                ))}
              </div>
            )}

            {/* Add variant form */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-ink-secondary uppercase tracking-wide">
                Add Variant
              </p>

              {/* Category-specific quick-pick buttons */}
              <div>
                <p className="text-xs text-ink-tertiary mb-2">{preset.label}</p>
                <div className="flex flex-wrap gap-2">
                  {preset.options.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => pickSize(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors
                        ${newVariant.size === s
                          ? 'bg-ink text-white border-ink'
                          : 'bg-surface border-border hover:border-ink/40'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary mb-1 block">
                    Option / Size *
                  </label>
                  <input
                    value={newVariant.size}
                    onChange={e => setNewVariant(v => ({ ...v, size: e.target.value }))}
                    placeholder="e.g. XL, 42, 100ml…"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary mb-1 block">
                    Color / Shade (optional)
                  </label>
                  <input
                    value={newVariant.color}
                    onChange={e => setNewVariant(v => ({ ...v, color: e.target.value }))}
                    placeholder="e.g. White, Beige…"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary mb-1 block">
                    Stock Qty for this variant *
                  </label>
                  <input
                    type="number" value={newVariant.stock_qty}
                    onChange={e => setNewVariant(v => ({ ...v, stock_qty: e.target.value }))}
                    placeholder="e.g. 20"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary mb-1 block">
                    Variant SKU *
                  </label>
                  <input
                    value={newVariant.sku}
                    onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))}
                    placeholder="e.g. SHIRT-WHT-XL"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </div>
              </div>

              <Button
                type="button" variant="secondary" size="sm"
                loading={addingVar} onClick={handleAddVariant}
              >
                Add Variant
              </Button>
            </div>
          </section>
        )}

        {/* ── Submit ── */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} size="lg">
            {isEdit ? 'Save Changes' : `Create Product${pendingVariants.length > 0 ? ` + ${pendingVariants.length} variant${pendingVariants.length > 1 ? 's' : ''}` : ''}`}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/admin/products')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
