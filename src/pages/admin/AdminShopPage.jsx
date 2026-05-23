import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getHomepageSettings, updateHomepageSettings, uploadHomepageImage } from '../../api/adminApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div>
        <h2 className="text-sm font-black text-ink uppercase tracking-widest">{title}</h2>
        {desc && <p className="text-[11px] text-ink-tertiary mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-ink-tertiary mt-0.5">{hint}</p>}
    </div>
  )
}

function TI({ value = '', onChange, placeholder = '', type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-white outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all"
    />
  )
}

function ColorRow({ value = '', onChange, placeholder = '#000000' }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-white shrink-0"
      />
      <TI value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-white outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {desc && <p className="text-[11px] text-ink-tertiary mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-ink' : 'bg-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function Card({ title, children, desc }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      {title && (
        <div>
          <h3 className="font-bold text-ink text-xs uppercase tracking-wide">{title}</h3>
          {desc && <p className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">{desc}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({ value = '', onChange, onCommit, label = 'Image', aspect = '16/9', onUploading }) {
  const inputRef               = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setErr('')
    setUploading(true)
    onUploading?.(true)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await uploadHomepageImage(fd)
      const url = res.data.data.url
      onChange(url)
      onCommit?.(url)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      onUploading?.(false)
    }
  }

  const preview = imgSrc(value)

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-border hover:border-ink/30 transition-colors cursor-pointer group bg-surface-alt"
        style={{ aspectRatio: aspect }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-lg">
                Change image
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-tertiary">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
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
          onClick={e => { e.stopPropagation(); onChange(''); onCommit?.('') }}
          className="mt-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Remove image
        </button>
      )}
      {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
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

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SHOP = {
  banner: {
    title:           'All Products',
    subtitle:        '',
    bg_color:        '',
    bg_image:        '',
    text_color:      '#0F0F0F',
    side_image:      '',
    overlay_opacity: 0.4,
  },
  grid: {
    cols:        4,
    mobile_cols: 2,
    card_shape:  'rounded',
  },
  sort: {
    default_sort: 'newest',
    per_page:     20,
  },
  card: {
    show_rating:    true,
    show_quick_add: true,
    show_badges:    true,
    image_ratio:    '3/4',
  },
  empty_state: {
    icon:     '🛍️',
    title:    'No products found',
    subtitle: 'Try adjusting your filters',
  },
}

// ─── Live Previews ────────────────────────────────────────────────────────────

function BannerPreview({ banner }) {
  const hasBg = banner.bg_image || banner.bg_color
  return (
    <div
      className="relative overflow-hidden rounded-xl flex items-center justify-between gap-4"
      style={{
        ...(banner.bg_image ? {
          backgroundImage:    `url("${imgSrc(banner.bg_image)}")`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          backgroundRepeat:   'no-repeat',
        } : {
          backgroundColor: banner.bg_color || '#FAFAF8',
        }),
        minHeight: hasBg ? '120px' : '64px',
        padding:   '20px 24px',
        border:    '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {banner.bg_image && (
        <div className="absolute inset-0 bg-black" style={{ opacity: banner.overlay_opacity ?? 0.4 }} />
      )}
      <div className="relative z-10 flex-1">
        <p
          style={{
            color:         banner.text_color || '#0F0F0F',
            fontSize:      '1.75rem',
            fontFamily:    'Bebas Neue, sans-serif',
            letterSpacing: '0.05em',
            fontWeight:    900,
            lineHeight:    1,
          }}
        >
          {banner.title || 'All Products'}
        </p>
        {banner.subtitle && (
          <p className="text-xs mt-1" style={{ color: (banner.text_color || '#5C5854') + 'aa' }}>
            {banner.subtitle}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: (banner.text_color || '#9C9894') + '88' }}>
          142 results
        </p>
      </div>
      {banner.side_image && (
        <div className="relative z-10 shrink-0">
          <img src={imgSrc(banner.side_image)} alt="" className="max-h-20 w-auto object-contain" />
        </div>
      )}
    </div>
  )
}

function GridPreview({ grid, card }) {
  const cols      = grid.cols || 4
  const shape     = grid.card_shape || 'rounded'
  const ratio     = card?.image_ratio || '3/4'
  const radiusMap = { rounded: '14px', soft: '6px', sharp: '2px' }
  const radius    = radiusMap[shape] || '14px'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-alt border border-border overflow-hidden"
          style={{ borderRadius: radius }}
        >
          <div className="relative bg-border/40" style={{ aspectRatio: ratio }}>
            {card?.show_badges !== false && (
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <div className="h-3 w-7 rounded bg-red-400/60" />
              </div>
            )}
          </div>
          <div className="p-2 space-y-1.5">
            <div className="h-2 bg-border/60 rounded w-3/4" />
            <div className="h-2 bg-border/40 rounded w-full" />
            {card?.show_rating !== false && (
              <div className="flex gap-0.5 mt-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} className="w-2 h-2 bg-yellow-400/70 rounded-sm" />
                ))}
              </div>
            )}
            <div className="h-3 bg-ink/10 rounded w-1/2 mt-0.5" />
            {card?.show_quick_add !== false && (
              <div className="h-6 bg-ink/10 rounded-lg mt-1" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyStatePreview({ empty }) {
  return (
    <div className="py-10 text-center bg-surface-alt rounded-xl border border-border">
      <div className="text-4xl mb-3">{empty.icon || '🛍️'}</div>
      <p className="text-sm font-medium text-ink-secondary">{empty.title || 'No products found'}</p>
      <p className="text-xs text-ink-tertiary mt-1">{empty.subtitle || 'Try adjusting your filters'}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminShopPage() {
  const [settings,     setSettingsState] = useState(DEFAULT_SHOP)
  const [loading,      setLoading]       = useState(true)
  const [saving,       setSaving]        = useState(false)
  const [saved,        setSaved]         = useState(false)
  const [error,        setError]         = useState('')
  const [anyUploading, setAnyUploading]  = useState(false)
  const uploadingCount = useRef(0)
  // Always-current snapshot of settings so auto-save never uses stale closure values
  const settingsRef = useRef(DEFAULT_SHOP)

  // Wrapper that keeps ref in sync atomically with the state update
  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      settingsRef.current = next
      return next
    })
  }, [])

  const handleUploading = useCallback((isUploading) => {
    uploadingCount.current += isUploading ? 1 : -1
    setAnyUploading(uploadingCount.current > 0)
  }, [])

  useEffect(() => {
    getHomepageSettings()
      .then(res => {
        const d = res.data?.data || {}
        if (d.shop_page) {
          setSettings(prev => ({
            banner:      { ...prev.banner,      ...(d.shop_page.banner      || {}) },
            grid:        { ...prev.grid,        ...(d.shop_page.grid        || {}) },
            sort:        { ...prev.sort,        ...(d.shop_page.sort        || {}) },
            card:        { ...prev.card,        ...(d.shop_page.card        || {}) },
            empty_state: { ...prev.empty_state, ...(d.shop_page.empty_state || {}) },
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const setBanner = (k, v) => setSettings(prev => ({ ...prev, banner:      { ...prev.banner,      [k]: v } }))
  const setGrid   = (k, v) => setSettings(prev => ({ ...prev, grid:        { ...prev.grid,        [k]: v } }))
  const setSort   = (k, v) => setSettings(prev => ({ ...prev, sort:        { ...prev.sort,        [k]: v } }))
  const setCard   = (k, v) => setSettings(prev => ({ ...prev, card:        { ...prev.card,        [k]: v } }))
  const setEmpty  = (k, v) => setSettings(prev => ({ ...prev, empty_state: { ...prev.empty_state, [k]: v } }))

  // Core save – uses settingsRef so it always has the latest values even when
  // called immediately after a state update (e.g. right after an image upload)
  const save = useCallback(async (overrideSettings) => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const toSave = overrideSettings ?? settingsRef.current
      const res    = await getHomepageSettings()
      const full   = res.data?.data || {}
      await updateHomepageSettings({ ...full, shop_page: toSave })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }, [])

  // Called by ImageUploader after upload or remove – builds updated settings
  // without waiting for React to flush the state update
  const makeAutoSave = useCallback((section, key) => (newUrl) => {
    const latest = settingsRef.current
    const updated = { ...latest, [section]: { ...latest[section], [key]: newUrl } }
    settingsRef.current = updated
    setSettingsState(updated)
    save(updated)
  }, [save])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  const SaveBtn = ({ className = '' }) => (
    <button
      onClick={() => save()}
      disabled={saving || anyUploading}
      className={`flex items-center gap-2 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink/80 transition-all disabled:opacity-50 ${className}`}
    >
      {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
    </button>
  )

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
        <div>
          <h1 className="text-xl font-black text-ink tracking-tight">Shop Page Settings</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Banner · Grid · Sort · Card display · Empty state
          </p>
        </div>
        <div className="flex items-center gap-3">
          {anyUploading && (
            <span className="text-[11px] text-ink-secondary flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-ink/20 border-t-ink rounded-full animate-spin inline-block" />
              Uploading…
            </span>
          )}
          {error && <span className="text-[11px] text-red-500">{error}</span>}
          <Link
            to="/shop"
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink border border-border rounded-xl px-3 py-2 transition-all hover:border-ink/30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            Preview Shop
          </Link>
          <SaveBtn className="px-5 py-2.5" />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-10">

          {/* ══ Banner ══════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon="🖼️" title="Banner / Header" desc="Title, background, colors at the top of the shop" />
            <div className="space-y-4">

              <Card title="Text Content">
                <Field label="Title">
                  <TI value={settings.banner.title} onChange={v => setBanner('title', v)} placeholder="All Products" />
                </Field>
                <Field label="Subtitle (optional)">
                  <TI value={settings.banner.subtitle} onChange={v => setBanner('subtitle', v)} placeholder="Discover our full collection" />
                </Field>
                <Field label="Text Color">
                  <ColorRow value={settings.banner.text_color} onChange={v => setBanner('text_color', v)} placeholder="#0F0F0F" />
                </Field>
              </Card>

              <Card title="Background" desc="Upload an image or choose a solid color. Image takes priority when both are set.">
                <ImageUploader
                  label="Background Image"
                  value={settings.banner.bg_image}
                  onChange={v => setBanner('bg_image', v)}
                  onCommit={makeAutoSave('banner', 'bg_image')}
                  aspect="4/1"
                  onUploading={handleUploading}
                />
                <Field label="Background Color (fallback when no image)">
                  <ColorRow value={settings.banner.bg_color} onChange={v => setBanner('bg_color', v)} placeholder="#FAFAF8" />
                </Field>
                {settings.banner.bg_image && (
                  <Field label={`Dark overlay: ${Math.round((settings.banner.overlay_opacity ?? 0.4) * 100)}%`}>
                    <input
                      type="range"
                      min={0} max={1} step={0.05}
                      value={settings.banner.overlay_opacity ?? 0.4}
                      onChange={e => setBanner('overlay_opacity', parseFloat(e.target.value))}
                      className="w-full accent-ink"
                    />
                    <p className="text-[10px] text-ink-tertiary mt-0.5">Darkens the image so text stays readable</p>
                  </Field>
                )}
              </Card>

              <Card title="Side Image" desc="Optional decorative image shown on the right side of the banner.">
                <ImageUploader
                  label="Side Image"
                  value={settings.banner.side_image}
                  onChange={v => setBanner('side_image', v)}
                  onCommit={makeAutoSave('banner', 'side_image')}
                  aspect="4/3"
                  onUploading={handleUploading}
                />
              </Card>

              <Card title="Live Preview">
                <BannerPreview banner={settings.banner} />
              </Card>

            </div>
          </section>

          {/* ══ Grid ════════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon="⊞" title="Product Grid" desc="Column count and card corner shape on the shop page" />
            <div className="space-y-4">

              <Card title="Columns">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desktop Columns">
                    <Sel
                      value={String(settings.grid.cols)}
                      onChange={v => setGrid('cols', parseInt(v))}
                      options={[
                        { value: '2', label: '2 columns' },
                        { value: '3', label: '3 columns' },
                        { value: '4', label: '4 columns (default)' },
                        { value: '5', label: '5 columns' },
                      ]}
                    />
                  </Field>
                  <Field label="Mobile Columns">
                    <Sel
                      value={String(settings.grid.mobile_cols)}
                      onChange={v => setGrid('mobile_cols', parseInt(v))}
                      options={[
                        { value: '1', label: '1 column' },
                        { value: '2', label: '2 columns (default)' },
                      ]}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Card Corner Shape">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'rounded', label: 'Rounded',  radius: '14px' },
                    { value: 'soft',    label: 'Soft',     radius: '6px'  },
                    { value: 'sharp',   label: 'Sharp',    radius: '2px'  },
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setGrid('card_shape', s.value)}
                      className={`flex flex-col items-center gap-2.5 p-4 border-2 rounded-xl transition-all ${
                        settings.grid.card_shape === s.value
                          ? 'border-ink bg-ink/5'
                          : 'border-border hover:border-ink/30 hover:bg-surface'
                      }`}
                    >
                      <div
                        className="w-12 h-16 bg-surface-alt border border-border/60"
                        style={{ borderRadius: s.radius }}
                      />
                      <span className={`text-[11px] font-semibold ${settings.grid.card_shape === s.value ? 'text-ink' : 'text-ink-secondary'}`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

            </div>
          </section>

          {/* ══ Sort & Pagination ════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon="↕️" title="Sort & Pagination" desc="Default sort order and products shown per page" />
            <div className="space-y-4">

              <Card title="Defaults">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Default Sort Order">
                    <Sel
                      value={settings.sort.default_sort}
                      onChange={v => setSort('default_sort', v)}
                      options={[
                        { value: 'newest',      label: 'Newest first' },
                        { value: 'price_asc',   label: 'Price: low → high' },
                        { value: 'price_desc',  label: 'Price: high → low' },
                        { value: 'bestselling', label: 'Best selling' },
                        { value: 'rating',      label: 'Top rated' },
                      ]}
                    />
                  </Field>
                  <Field label="Products Per Page">
                    <Sel
                      value={String(settings.sort.per_page)}
                      onChange={v => setSort('per_page', parseInt(v))}
                      options={[
                        { value: '12', label: '12 products' },
                        { value: '16', label: '16 products' },
                        { value: '20', label: '20 products (default)' },
                        { value: '24', label: '24 products' },
                        { value: '32', label: '32 products' },
                      ]}
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-ink-tertiary -mt-1">
                  Visitors can override sort from the filter sidebar. Per-page applies to every page load.
                </p>
              </Card>

            </div>
          </section>

          {/* ══ Card Display ════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon="🃏" title="Card Display" desc="What each product card shows and the image shape" />
            <div className="space-y-4">

              <Card title="Image Aspect Ratio">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '3/4', label: 'Portrait',   note: '3 : 4' },
                    { value: '1/1', label: 'Square',     note: '1 : 1' },
                    { value: '4/3', label: 'Landscape',  note: '4 : 3' },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setCard('image_ratio', r.value)}
                      className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                        settings.card.image_ratio === r.value
                          ? 'border-ink bg-ink/5'
                          : 'border-border hover:border-ink/30 hover:bg-surface'
                      }`}
                    >
                      <div
                        className="w-10 bg-surface-alt border border-border/60 rounded"
                        style={{ aspectRatio: r.value }}
                      />
                      <div className="text-center">
                        <p className={`text-[11px] font-semibold ${settings.card.image_ratio === r.value ? 'text-ink' : 'text-ink-secondary'}`}>
                          {r.label}
                        </p>
                        <p className="text-[9px] text-ink-tertiary">{r.note}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Visible Elements" desc="Toggle what appears on each product card">
                <Toggle
                  label="Star Ratings"
                  desc="Show average rating and review count"
                  checked={settings.card.show_rating !== false}
                  onChange={v => setCard('show_rating', v)}
                />
                <Toggle
                  label="Quick Add Button"
                  desc="'Quick Add' button on hover for simple products"
                  checked={settings.card.show_quick_add !== false}
                  onChange={v => setCard('show_quick_add', v)}
                />
                <Toggle
                  label="Sale & New Badges"
                  desc="Discount percentage and 'New' labels on product images"
                  checked={settings.card.show_badges !== false}
                  onChange={v => setCard('show_badges', v)}
                />
              </Card>

              <Card title="Live Preview">
                <p className="text-[11px] text-ink-tertiary -mt-2">
                  {settings.grid.cols} columns · {settings.grid.card_shape} · {settings.card.image_ratio} ratio
                </p>
                <GridPreview grid={settings.grid} card={settings.card} />
              </Card>

            </div>
          </section>

          {/* ══ Empty State ═════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon="🔍" title="Empty State" desc="Shown when no products match the active filters" />
            <div className="space-y-4">

              <Card title="Message">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Icon / Emoji">
                    <TI value={settings.empty_state.icon} onChange={v => setEmpty('icon', v)} placeholder="🛍️" />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Title">
                      <TI value={settings.empty_state.title} onChange={v => setEmpty('title', v)} placeholder="No products found" />
                    </Field>
                  </div>
                </div>
                <Field label="Subtitle">
                  <TI value={settings.empty_state.subtitle} onChange={v => setEmpty('subtitle', v)} placeholder="Try adjusting your filters" />
                </Field>
              </Card>

              <Card title="Live Preview">
                <EmptyStatePreview empty={settings.empty_state} />
              </Card>

            </div>
          </section>

          {/* Bottom save */}
          <div className="flex justify-end pb-10">
            <SaveBtn className="px-8 py-3" />
          </div>

        </div>
      </div>
    </div>
  )
}
