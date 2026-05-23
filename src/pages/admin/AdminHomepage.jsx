import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminHomepageSections, createHomepageSection,
  updateHomepageSection, deleteHomepageSection,
  duplicateHomepageSection, reorderHomepageSections,
  uploadHomepageImage, getHomepageSettings, updateHomepageSettings,
} from '../../api/adminApi'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

const SECTION_META = {
  hero_3col:        { label: 'Hero Banner',         icon: '🖼️',  desc: '3-column hero with left banners, center panel, and right brand tiles' },
  category_circles: { label: 'Category Circles',    icon: '⚪',  desc: 'Horizontal scrollable category navigation row' },
  product_grid:     { label: 'Product Grid',        icon: '🛍️', desc: 'Grid of products – best sellers, new arrivals, etc.' },
  promo_banners:    { label: 'Promo Banners',        icon: '📢',  desc: 'Full-width promotional banners with CTA buttons' },
  trust_badges:     { label: 'Trust Badges',        icon: '✅',  desc: 'Trust indicators: shipping, returns, security, quality' },
  text_section:     { label: 'Text Section',        icon: '📝',  desc: 'Rich text heading and paragraph block' },
  image_text:       { label: 'Image + Text',        icon: '🖼️',  desc: 'Side-by-side image and text with optional CTA' },
  custom_banner:    { label: 'Custom Banner',       icon: '🎨',  desc: 'Full-width banner with background image and CTA' },
  offer_section:    { label: 'Offer / Countdown',   icon: '⏱️',  desc: 'Promotional offer with an optional countdown timer' },
}

// ─── Shared field UI ─────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function TI({ value = '', onChange, placeholder = '', type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-white outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all ${className}`}
    />
  )
}

function TA({ value = '', onChange, placeholder = '', rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-white outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all resize-none"
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

function Select({ value, onChange, options }) {
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

function ToggleRow({ label, desc, value, onChange }) {
  const on = Boolean(value)
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink leading-none">{label}</p>
        {desc && <p className="text-[11px] text-ink-tertiary mt-0.5 leading-snug">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className="relative w-10 h-5 rounded-full transition-all shrink-0"
        style={{ background: on ? '#0F0F0F' : 'rgba(0,0,0,0.15)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: on ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && <h3 className="font-bold text-ink text-xs uppercase tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({ value = '', onChange, label = 'Image', aspect = '16/9', onUploading }) {
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
      onChange(res.data.data.url)
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
          onClick={e => { e.stopPropagation(); onChange('') }}
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

// ─── Section Editors ──────────────────────────────────────────────────────────

function Hero3ColEditor({ data, onChange, onUploading }) {
  const setLeft   = (i, k, v) => onChange({ ...data, left_banners: data.left_banners.map((b, idx) => idx === i ? { ...b, [k]: v } : b) })
  const setCenter = (k, v)    => onChange({ ...data, center: { ...data.center, [k]: v } })
  const setRight  = (i, k, v) => onChange({ ...data, right_brands: data.right_brands.map((b, idx) => idx === i ? { ...b, [k]: v } : b) })

  const centerSlides = data.center?.slides || []
  const addSlide    = () => setCenter('slides', [...centerSlides, { image_url: '', bg_color: '#f5e8c8' }])
  const removeSlide = (i) => setCenter('slides', centerSlides.filter((_, idx) => idx !== i))
  const setSlide    = (i, k, v) => setCenter('slides', centerSlides.map((s, idx) => idx === i ? { ...s, [k]: v } : s))

  return (
    <div className="space-y-4">
      <Card title="Left Banners (3 stacked)">
        <p className="text-[11px] text-ink-tertiary -mt-2">Visible on tablet/desktop, stacked on the left side of the hero.</p>
        {(data.left_banners || []).map((b, i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-3 bg-surface">
            <p className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide">Banner {i + 1}</p>
            <ImageUploader label="Image (optional)" value={b.image_url || ''} onChange={v => setLeft(i, 'image_url', v)} aspect="16/7" onUploading={onUploading} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><TI value={b.title || ''} onChange={v => setLeft(i, 'title', v)} placeholder="Hot Sellers" /></Field>
              <Field label="Link"><TI value={b.link || ''} onChange={v => setLeft(i, 'link', v)} placeholder="/shop" /></Field>
              <Field label="Background Color"><ColorRow value={b.bg_color || ''} onChange={v => setLeft(i, 'bg_color', v)} placeholder="#1a1a1a" /></Field>
              <Field label="Text Color"><ColorRow value={b.text_color || '#ffffff'} onChange={v => setLeft(i, 'text_color', v)} placeholder="#ffffff" /></Field>
            </div>
          </div>
        ))}
      </Card>

      {/* ── Center Promo – Slideshow images ── */}
      <Card
        title="Center Promo – Slide Images"
        action={
          <span className="text-[11px] text-ink-tertiary">
            {centerSlides.length === 0 ? 'No slides' : `${centerSlides.length} slide${centerSlides.length > 1 ? 's' : ''}`}
          </span>
        }
      >
        <p className="text-[11px] text-ink-tertiary -mt-2">
          Add multiple background images — they will automatically crossfade every 4.5 s in the center panel.
          Leave empty to use a solid background colour only.
        </p>
        {centerSlides.map((slide, i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-3 bg-surface">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide">Slide {i + 1}</p>
              <button
                onClick={() => removeSlide(i)}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Remove
              </button>
            </div>
            <ImageUploader
              label="Background Image"
              value={slide.image_url || ''}
              onChange={v => setSlide(i, 'image_url', v)}
              aspect="16/9"
              onUploading={onUploading}
            />
            <Field label="Fallback Background Color (shown if no image)">
              <ColorRow value={slide.bg_color || ''} onChange={v => setSlide(i, 'bg_color', v)} placeholder="#f5e8c8" />
            </Field>
          </div>
        ))}
        <button
          onClick={addSlide}
          className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-ink-secondary hover:border-ink/30 hover:text-ink transition-all"
        >
          + Add Slide Image
        </button>
      </Card>

      {/* ── Center Promo – Text & CTA ── */}
      <Card title="Center Promo – Text & CTA">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Top Line"><TI value={data.center?.title_top || ''} onChange={v => setCenter('title_top', v)} placeholder="Shipped From Our" /></Field>
          <Field label="CTA Text"><TI value={data.center?.cta || ''} onChange={v => setCenter('cta', v)} placeholder="SHOP NOW" /></Field>
          <Field label="Main Title (large)"><TI value={data.center?.title_main || ''} onChange={v => setCenter('title_main', v)} placeholder="LOCAL" /></Field>
          <Field label="Sub Title"><TI value={data.center?.title_sub || ''} onChange={v => setCenter('title_sub', v)} placeholder="WAREHOUSE" /></Field>
          <Field label="CTA Link"><TI value={data.center?.link || ''} onChange={v => setCenter('link', v)} placeholder="/shop" /></Field>
          <Field label="Default Background Color">
            <ColorRow value={data.center?.bg_color || ''} onChange={v => setCenter('bg_color', v)} placeholder="#f5e8c8" />
          </Field>
          <Field label="Accent Color (badge & button)">
            <ColorRow value={data.center?.accent_color || ''} onChange={v => setCenter('accent_color', v)} placeholder="#C0392B" />
          </Field>
        </div>
        {/* Mini preview */}
        <div className="rounded-xl p-4 flex flex-col justify-between min-h-[120px] mt-1"
          style={{ background: data.center?.bg_color || '#f5e8c8' }}>
          <div className="flex flex-col items-center justify-center rounded-full text-white text-center"
            style={{ width: 48, height: 48, background: data.center?.accent_color || '#C0392B' }}>
            <span className="text-[7px] font-bold">UP TO</span>
            <span className="text-base font-black leading-tight">90%</span>
            <span className="text-[7px] font-bold">OFF</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] text-ink/60 uppercase tracking-widest">{data.center?.title_top}</p>
            <p className="font-black text-2xl text-ink leading-none">{data.center?.title_main || 'LOCAL'}</p>
            <p className="font-black text-base text-ink leading-none">{data.center?.title_sub || 'WAREHOUSE'}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-white text-[10px] font-bold py-1 px-3 rounded-sm mt-2 w-fit"
            style={{ background: data.center?.accent_color || '#C0392B' }}>
            <span className="border-r border-white/30 pr-1.5">Local</span>
            <span>{data.center?.cta || 'SHOP NOW'}</span>
          </div>
        </div>
      </Card>

      {/* ── Slideshow Behavior ── */}
      <Card title="Center Promo – Slideshow Behavior">
        <p className="text-[11px] text-ink-tertiary -mt-2">
          Controls how the center panel cycles through slide images.
          Only applies when 2 or more slide images are added above.
        </p>

        {/* Toggles */}
        <div className="divide-y divide-border">
          <ToggleRow
            label="Auto-play"
            desc="Automatically advance slides on a timer"
            value={data.center?.slide_autoplay !== false}
            onChange={v => setCenter('slide_autoplay', v)}
          />
          <ToggleRow
            label="Pause on hover"
            desc="Stop the timer while the user's cursor is over the banner"
            value={data.center?.slide_pause_hover !== false}
            onChange={v => setCenter('slide_pause_hover', v)}
          />
          <ToggleRow
            label="Show progress bar"
            desc="Thin bar at the bottom that shows time until the next slide"
            value={data.center?.slide_show_progress !== false}
            onChange={v => setCenter('slide_show_progress', v)}
          />
          <ToggleRow
            label="Show dot indicators"
            desc="Clickable dots at the bottom for manual navigation"
            value={data.center?.slide_show_dots !== false}
            onChange={v => setCenter('slide_show_dots', v)}
          />
          <ToggleRow
            label="Show prev / next arrows"
            desc="Left and right arrow buttons for manual navigation"
            value={data.center?.slide_show_arrows === true}
            onChange={v => setCenter('slide_show_arrows', v)}
          />
        </div>

        {/* Numeric / select controls */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Field label="Slide interval (seconds)">
            <TI
              type="number"
              value={String(data.center?.slide_interval ?? 4.5)}
              onChange={v => setCenter('slide_interval', Math.max(1, parseFloat(v) || 4.5))}
              placeholder="4.5"
            />
          </Field>
          <Field label="Transition speed (seconds)">
            <TI
              type="number"
              value={String(data.center?.slide_trans_dur ?? 0.7)}
              onChange={v => setCenter('slide_trans_dur', Math.max(0.1, parseFloat(v) || 0.7))}
              placeholder="0.7"
            />
          </Field>
          <Field label="Transition effect">
            <Select
              value={data.center?.slide_effect || 'fade'}
              onChange={v => setCenter('slide_effect', v)}
              options={[
                { value: 'fade',  label: 'Crossfade' },
                { value: 'slide', label: 'Slide (horizontal)' },
              ]}
            />
          </Field>
        </div>

        {/* Live summary */}
        <div className="rounded-lg bg-surface px-4 py-3 text-[11px] text-ink-secondary space-y-0.5">
          <p>
            <strong>Effect:</strong>{' '}
            {data.center?.slide_effect === 'slide' ? 'Horizontal slide' : 'Crossfade'}{' '}
            · <strong>Every</strong> {data.center?.slide_interval ?? 4.5}s
            · <strong>Transition:</strong> {data.center?.slide_trans_dur ?? 0.7}s
          </p>
          <p>
            Auto-play{' '}
            <strong>{data.center?.slide_autoplay !== false ? 'ON' : 'OFF'}</strong>
            {data.center?.slide_pause_hover !== false && ' · Pauses on hover'}
            {data.center?.slide_show_progress !== false && ' · Progress bar'}
          </p>
        </div>
      </Card>

      <Card title="Right Brand Tiles (3 tiles)">
        <p className="text-[11px] text-ink-tertiary -mt-2">Visible only on large screens, stacked on the right side of the hero.</p>
        {(data.right_brands || []).map((b, i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-3 bg-surface">
            <p className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide">Brand {i + 1}</p>
            <ImageUploader label="Image (optional)" value={b.image_url || ''} onChange={v => setRight(i, 'image_url', v)} aspect="4/3" onUploading={onUploading} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand Name"><TI value={b.name || ''} onChange={v => setRight(i, 'name', v)} placeholder="ROMWE" /></Field>
              <Field label="Link"><TI value={b.link || ''} onChange={v => setRight(i, 'link', v)} placeholder="/shop" /></Field>
              <Field label="Background Color"><ColorRow value={b.bg_color || ''} onChange={v => setRight(i, 'bg_color', v)} placeholder="#6e6e6e" /></Field>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function CategoryCirclesEditor({ data, onChange }) {
  const [maxVal, setMaxVal] = useState(String(data.max_items ?? 12))

  const commitMax = (v) => {
    const n = Math.min(50, Math.max(1, parseInt(v) || 1))
    setMaxVal(String(n))
    onChange({ ...data, max_items: n })
  }

  const rows   = data.rows   || 1
  const shape  = data.shape  || 'circle'
  const size   = data.size   || 'md'

  return (
    <div className="space-y-4">
      <Card title="Display Settings">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Categories">
            <input
              type="number"
              min={1}
              max={50}
              value={maxVal}
              onChange={e => setMaxVal(e.target.value)}
              onBlur={e  => commitMax(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-white outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all"
            />
          </Field>
          <Field label="Rows">
            <Select
              value={String(rows)}
              onChange={v => onChange({ ...data, rows: parseInt(v) })}
              options={[
                { value: '1', label: '1 Row (scroll)' },
                { value: '2', label: '2 Rows' },
                { value: '3', label: '3 Rows' },
                { value: '4', label: '4 Rows' },
              ]}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shape">
            <Select
              value={shape}
              onChange={v => onChange({ ...data, shape: v })}
              options={[
                { value: 'circle',       label: 'Circle' },
                { value: 'rounded',      label: 'Rounded Square' },
                { value: 'square',       label: 'Square (slight corners)' },
                { value: 'sharp',        label: 'Sharp Square' },
                { value: 'hexagon',      label: 'Hexagon' },
                { value: 'diamond',      label: 'Diamond' },
                { value: 'image_banner', label: 'Image Banner (wide, scroll)' },
              ]}
            />
          </Field>
          <Field label="Size">
            <Select
              value={size}
              onChange={v => onChange({ ...data, size: v })}
              options={[
                { value: 'sm', label: 'Small  (56 px)' },
                { value: 'md', label: 'Medium (76 px)' },
                { value: 'lg', label: 'Large  (96 px)' },
                { value: 'xl', label: 'X-Large (112 px)' },
              ]}
            />
          </Field>
        </div>
        <p className="text-[11px] text-ink-tertiary">
          Showing the first <strong>{data.max_items ?? 12}</strong> categories in{' '}
          <strong>{rows}</strong> row{rows > 1 ? 's' : ''}.
        </p>
      </Card>
      <div className="rounded-xl border border-border bg-surface-alt p-4 space-y-1.5">
        <p className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide">Category Images</p>
        <p className="text-[11px] text-ink-tertiary leading-relaxed">
          To set images for each category, go to{' '}
          <strong className="text-ink">Admin → Categories</strong> and upload an image for each category.
        </p>
      </div>
    </div>
  )
}

function ProductGridEditor({ data, onChange }) {
  return (
    <div className="space-y-4">
      <Card title="Heading">
        <Field label="Section Title">
          <TI value={data.title || ''} onChange={v => onChange({ ...data, title: v })} placeholder="Best Sellers" />
        </Field>
        <Field label="Subtitle">
          <TI value={data.subtitle || ''} onChange={v => onChange({ ...data, subtitle: v })} placeholder="Top picks loved by our customers" />
        </Field>
      </Card>

      <Card title="Products">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product Query">
            <Select value={data.query || 'bestselling'} onChange={v => onChange({ ...data, query: v })}
              options={[
                { value: 'bestselling', label: 'Best Selling' },
                { value: 'newest',      label: 'Newest' },
                { value: 'featured',    label: 'Featured' },
                { value: 'sale',        label: 'On Sale' },
              ]} />
          </Field>
          <Field label="Number of Products">
            <TI type="number" value={String(data.limit || 8)} onChange={v => onChange({ ...data, limit: Math.max(1, parseInt(v) || 8) })} placeholder="8" />
          </Field>
        </div>
      </Card>

      <Card title="Layout">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Display Mode">
            <Select value={data.layout_mode || 'grid'} onChange={v => onChange({ ...data, layout_mode: v })}
              options={[
                { value: 'grid',   label: 'Grid (wrap rows)' },
                { value: 'scroll', label: 'Scroll Row' },
              ]} />
          </Field>
          <Field label="Card Shape">
            <Select value={data.card_shape || 'rounded'} onChange={v => onChange({ ...data, card_shape: v })}
              options={[
                { value: 'rounded', label: 'Rounded (default)' },
                { value: 'soft',    label: 'Soft' },
                { value: 'sharp',   label: 'Sharp' },
              ]} />
          </Field>
        </div>

        {(data.layout_mode || 'grid') === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Desktop Columns">
              <Select value={String(data.cols || 4)} onChange={v => onChange({ ...data, cols: parseInt(v) })}
                options={[
                  { value: '2', label: '2 columns' },
                  { value: '3', label: '3 columns' },
                  { value: '4', label: '4 columns' },
                  { value: '5', label: '5 columns' },
                ]} />
            </Field>
            <Field label="Mobile Columns">
              <Select value={String(data.mobile_cols || 2)} onChange={v => onChange({ ...data, mobile_cols: parseInt(v) })}
                options={[
                  { value: '1', label: '1 column' },
                  { value: '2', label: '2 columns' },
                ]} />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Visible Items">
              <Select value={String(data.cols || 4)} onChange={v => onChange({ ...data, cols: parseInt(v) })}
                options={[
                  { value: '2', label: '2 visible' },
                  { value: '3', label: '3 visible' },
                  { value: '4', label: '4 visible' },
                  { value: '5', label: '5 visible' },
                ]} />
            </Field>
            <Field label="Card Size">
              <Select value={data.scroll_size || 'md'} onChange={v => onChange({ ...data, scroll_size: v })}
                options={[
                  { value: 'sm', label: 'Small' },
                  { value: 'md', label: 'Medium' },
                  { value: 'lg', label: 'Large' },
                ]} />
            </Field>
          </div>
        )}
      </Card>

      <Card title="View All Link">
        <div className="grid grid-cols-2 gap-3">
          <Field label="URL">
            <TI value={data.view_all_link || ''} onChange={v => onChange({ ...data, view_all_link: v })} placeholder="/shop?sort=bestselling" />
          </Field>
          <Field label="Button Label">
            <TI value={data.view_all_label || ''} onChange={v => onChange({ ...data, view_all_label: v })} placeholder="View all" />
          </Field>
        </div>
      </Card>
    </div>
  )
}

function PromoBannersEditor({ data, onChange, onUploading }) {
  const setBanner = (i, k, v) =>
    onChange({ ...data, banners: (data.banners || []).map((b, idx) => idx === i ? { ...b, [k]: v } : b) })

  const addBanner = () => onChange({
    ...data,
    banners: [...(data.banners || []), { title: 'NEW', subtitle: '', cta: 'Shop now →', link: '/shop', bg_color: '#333333', text_color: '#ffffff', image_url: '' }],
  })

  const removeBanner = (i) => onChange({
    ...data,
    banners: (data.banners || []).filter((_, idx) => idx !== i),
  })

  return (
    <div className="space-y-4">
      <Card title="Layout">
        <Field label="Column Layout">
          <Select value={data.layout || '2col'} onChange={v => onChange({ ...data, layout: v })}
            options={[
              { value: '1col', label: 'Single column (full width)' },
              { value: '2col', label: '2 columns (side by side)' },
              { value: '3col', label: '3 columns' },
            ]} />
        </Field>
      </Card>

      {(data.banners || []).map((b, i) => (
        <Card
          key={i}
          title={`Banner ${i + 1}`}
          action={
            <button onClick={() => removeBanner(i)}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
              Remove
            </button>
          }
        >
          <ImageUploader label="Background Image (optional)" value={b.image_url || ''} onChange={v => setBanner(i, 'image_url', v)} aspect="16/9" onUploading={onUploading} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><TI value={b.title || ''} onChange={v => setBanner(i, 'title', v)} placeholder="SALE" /></Field>
            <Field label="CTA Text"><TI value={b.cta || ''} onChange={v => setBanner(i, 'cta', v)} placeholder="Shop now →" /></Field>
            <Field label="Subtitle"><TI value={b.subtitle || ''} onChange={v => setBanner(i, 'subtitle', v)} placeholder="Up to 70% off" /></Field>
            <Field label="Link URL"><TI value={b.link || ''} onChange={v => setBanner(i, 'link', v)} placeholder="/shop" /></Field>
            <Field label="Background Color"><ColorRow value={b.bg_color || ''} onChange={v => setBanner(i, 'bg_color', v)} placeholder="#C0392B" /></Field>
            <Field label="Text Color"><ColorRow value={b.text_color || '#ffffff'} onChange={v => setBanner(i, 'text_color', v)} placeholder="#ffffff" /></Field>
          </div>
          {/* Mini preview */}
          <div className="relative overflow-hidden rounded-xl p-4 min-h-[80px] flex flex-col justify-end"
            style={{ background: b.bg_color || '#333' }}>
            <p className="font-black text-3xl text-white leading-none">{b.title || 'TITLE'}</p>
            <p className="text-white/70 text-[11px] mt-0.5">{b.subtitle}</p>
            <span className="text-white text-[11px] font-bold mt-1">{b.cta}</span>
          </div>
        </Card>
      ))}

      <button
        onClick={addBanner}
        className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-ink-secondary hover:border-ink/30 hover:text-ink transition-all"
      >
        + Add Banner
      </button>
    </div>
  )
}

function TrustBadgesEditor({ data, onChange }) {
  const setBadge   = (i, k, v) => onChange({ ...data, badges: (data.badges || []).map((b, idx) => idx === i ? { ...b, [k]: v } : b) })
  const addBadge   = () => onChange({ ...data, badges: [...(data.badges || []), { icon: '⭐', title: 'New Badge', desc: 'Description' }] })
  const removeBadge = (i) => onChange({ ...data, badges: (data.badges || []).filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-4">
      <Card title="Style">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Columns">
            <Select value={String(data.cols || 4)} onChange={v => onChange({ ...data, cols: parseInt(v) })}
              options={[{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }]} />
          </Field>
          <Field label="Background Color"><ColorRow value={data.bg_color || ''} onChange={v => onChange({ ...data, bg_color: v })} placeholder="#f9f9f9" /></Field>
          <Field label="Text Color"><ColorRow value={data.text_color || ''} onChange={v => onChange({ ...data, text_color: v })} placeholder="#111111" /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(data.badges || []).map((b, i) => (
          <Card
            key={i}
            action={
              <button onClick={() => removeBadge(i)} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Remove</button>
            }
          >
            <div className="space-y-2">
              <Field label="Icon (emoji)"><TI value={b.icon || ''} onChange={v => setBadge(i, 'icon', v)} placeholder="🚚" /></Field>
              <Field label="Title"><TI value={b.title || ''} onChange={v => setBadge(i, 'title', v)} placeholder="Free Shipping" /></Field>
              <Field label="Description"><TI value={b.desc || ''} onChange={v => setBadge(i, 'desc', v)} placeholder="On orders over $50" /></Field>
              <div className="flex items-start gap-3 bg-surface rounded-lg p-3 mt-1">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-bold text-ink text-xs">{b.title || 'Title'}</p>
                  <p className="text-[11px] text-ink-tertiary mt-0.5">{b.desc || 'Description'}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        onClick={addBadge}
        className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-ink-secondary hover:border-ink/30 hover:text-ink transition-all"
      >
        + Add Badge
      </button>
    </div>
  )
}

function TextSectionEditor({ data, onChange }) {
  return (
    <Card title="Content">
      <Field label="Title"><TI value={data.title || ''} onChange={v => onChange({ ...data, title: v })} placeholder="Section Title" /></Field>
      <Field label="Content">
        <TA value={data.content || ''} onChange={v => onChange({ ...data, content: v })} placeholder="Your text here…" rows={5} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alignment">
          <Select value={data.alignment || 'center'} onChange={v => onChange({ ...data, alignment: v })}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
        </Field>
        <Field label="Text Color"><ColorRow value={data.text_color || ''} onChange={v => onChange({ ...data, text_color: v })} placeholder="#111111" /></Field>
        <Field label="Background Color"><ColorRow value={data.bg_color || ''} onChange={v => onChange({ ...data, bg_color: v })} placeholder="#ffffff" /></Field>
      </div>
    </Card>
  )
}

function ImageTextEditor({ data, onChange, onUploading }) {
  return (
    <div className="space-y-4">
      <Card title="Image">
        <ImageUploader label="Image" value={data.image_url || ''} onChange={v => onChange({ ...data, image_url: v })} aspect="16/9" onUploading={onUploading} />
        <Field label="Image Position">
          <Select value={data.image_side || 'left'} onChange={v => onChange({ ...data, image_side: v })}
            options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
        </Field>
      </Card>
      <Card title="Content">
        <Field label="Title"><TI value={data.title || ''} onChange={v => onChange({ ...data, title: v })} placeholder="Headline" /></Field>
        <Field label="Text">
          <TA value={data.text || ''} onChange={v => onChange({ ...data, text: v })} placeholder="Paragraph text…" rows={4} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTA Button Text"><TI value={data.cta || ''} onChange={v => onChange({ ...data, cta: v })} placeholder="Learn more" /></Field>
          <Field label="CTA Link"><TI value={data.cta_link || ''} onChange={v => onChange({ ...data, cta_link: v })} placeholder="/shop" /></Field>
          <Field label="Text Color"><ColorRow value={data.text_color || ''} onChange={v => onChange({ ...data, text_color: v })} placeholder="#111111" /></Field>
          <Field label="Background Color"><ColorRow value={data.bg_color || ''} onChange={v => onChange({ ...data, bg_color: v })} placeholder="#ffffff" /></Field>
        </div>
      </Card>
    </div>
  )
}

function CustomBannerEditor({ data, onChange, onUploading }) {
  return (
    <div className="space-y-4">
      <Card title="Background">
        <ImageUploader label="Background Image" value={data.image_url || ''} onChange={v => onChange({ ...data, image_url: v })} aspect="21/9" onUploading={onUploading} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fallback Background Color"><ColorRow value={data.bg_color || '#1a1a1a'} onChange={v => onChange({ ...data, bg_color: v })} placeholder="#1a1a1a" /></Field>
          <Field label="Height (px)"><TI type="number" value={String(data.height || 320)} onChange={v => onChange({ ...data, height: parseInt(v) || 320 })} /></Field>
        </div>
      </Card>
      <Card title="Content">
        <Field label="Title"><TI value={data.title || ''} onChange={v => onChange({ ...data, title: v })} placeholder="Big Banner Headline" /></Field>
        <Field label="Subtitle"><TI value={data.subtitle || ''} onChange={v => onChange({ ...data, subtitle: v })} placeholder="Short supporting text" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTA Button Text"><TI value={data.cta || ''} onChange={v => onChange({ ...data, cta: v })} placeholder="Shop Now" /></Field>
          <Field label="CTA Link"><TI value={data.cta_link || ''} onChange={v => onChange({ ...data, cta_link: v })} placeholder="/shop" /></Field>
          <Field label="Text Color"><ColorRow value={data.text_color || '#ffffff'} onChange={v => onChange({ ...data, text_color: v })} placeholder="#ffffff" /></Field>
          <Field label="Content Alignment">
            <Select value={data.alignment || 'center'} onChange={v => onChange({ ...data, alignment: v })}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
          </Field>
        </div>
      </Card>
    </div>
  )
}

function OfferSectionEditor({ data, onChange }) {
  return (
    <div className="space-y-4">
      <Card title="Offer Content">
        <Field label="Headline">
          <TI value={data.title || ''} onChange={v => onChange({ ...data, title: v })} placeholder="Flash Sale Ends Soon!" />
        </Field>
        <Field label="Subheading">
          <TI value={data.subtitle || ''} onChange={v => onChange({ ...data, subtitle: v })} placeholder="Up to 50% off selected items" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTA Button Text"><TI value={data.cta || ''} onChange={v => onChange({ ...data, cta: v })} placeholder="Shop the Sale" /></Field>
          <Field label="CTA Link"><TI value={data.cta_link || ''} onChange={v => onChange({ ...data, cta_link: v })} placeholder="/shop?on_sale=1" /></Field>
          <Field label="Background Color"><ColorRow value={data.bg_color || '#C0392B'} onChange={v => onChange({ ...data, bg_color: v })} placeholder="#C0392B" /></Field>
          <Field label="Text Color"><ColorRow value={data.text_color || '#ffffff'} onChange={v => onChange({ ...data, text_color: v })} placeholder="#ffffff" /></Field>
        </div>
      </Card>

      <Card title="Size & Spacing">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Top & Bottom Padding (px)">
            <TI
              type="number"
              value={String(data.padding_y ?? 64)}
              onChange={v => onChange({ ...data, padding_y: Math.max(0, parseInt(v) || 64) })}
              placeholder="64"
            />
          </Field>
          <Field label="Left & Right Padding (px)">
            <TI
              type="number"
              value={String(data.padding_x ?? 16)}
              onChange={v => onChange({ ...data, padding_x: Math.max(0, parseInt(v) || 16) })}
              placeholder="16"
            />
          </Field>
          <Field label="Max Content Width (px)">
            <TI
              type="number"
              value={String(data.max_width ?? 672)}
              onChange={v => onChange({ ...data, max_width: Math.max(200, parseInt(v) || 672) })}
              placeholder="672"
            />
          </Field>
          <Field label="Min Section Height (px)">
            <TI
              type="number"
              value={String(data.min_height ?? 0)}
              onChange={v => onChange({ ...data, min_height: Math.max(0, parseInt(v) || 0) })}
              placeholder="0 (auto)"
            />
          </Field>
        </div>
        {/* Preview band */}
        <div
          className="rounded-xl text-center mt-1 text-[11px] text-ink-tertiary border border-dashed border-border flex items-center justify-center"
          style={{
            paddingTop: `${Math.min(data.padding_y ?? 64, 40)}px`,
            paddingBottom: `${Math.min(data.padding_y ?? 64, 40)}px`,
            background: data.bg_color || '#C0392B',
            minHeight: data.min_height ? `${Math.min(data.min_height, 120)}px` : undefined,
          }}
        >
          <span className="font-bold text-xs" style={{ color: data.text_color || '#ffffff', opacity: 0.7 }}>
            section preview
          </span>
        </div>
      </Card>

      <Card title="Countdown Timer (optional)">
        <Field label="Countdown End Date & Time">
          <TI type="datetime-local" value={data.countdown_end || ''} onChange={v => onChange({ ...data, countdown_end: v })} />
        </Field>
        <p className="text-[11px] text-ink-tertiary">Leave blank to hide the countdown timer.</p>
      </Card>
    </div>
  )
}

// ─── Announcement Bar (stored in homepage_settings) ──────────────────────────

const DEFAULT_ANNOUNCE = [
  { icon: '🚚', text: 'Free Shipping',  show_icon: true },
  { icon: '↩️',  text: 'Free Returns',   show_icon: true },
  { icon: '💳', text: 'No Hidden Fees', show_icon: true },
]

const DEFAULT_BAR_STYLE = {
  bg_color:   '#0F0F0F',
  text_color: '#ffffff',
  font_size:  'xs',
  padding_y:  10,
  separator:  '|',
}

function AnnouncementBarEditor() {
  const [items,    setItems]    = useState(DEFAULT_ANNOUNCE)
  const [barStyle, setBarStyle] = useState(DEFAULT_BAR_STYLE)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    getHomepageSettings()
      .then(res => {
        const d = res.data?.data || {}
        if (Array.isArray(d.announcement_bar) && d.announcement_bar.length)
          setItems(d.announcement_bar)
        if (d.announcement_bar_style)
          setBarStyle(prev => ({ ...prev, ...d.announcement_bar_style }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setItem    = (i, k, v) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const addItem    = () => setItems(prev => [...prev, { icon: '⭐', text: 'New announcement', show_icon: true }])
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const setStyle   = (k, v) => setBarStyle(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const res  = await getHomepageSettings()
      const full = res.data?.data || {}
      await updateHomepageSettings({ ...full, announcement_bar: items, announcement_bar_style: barStyle })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (_) {}
    setSaving(false)
  }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
    </div>
  )

  const fsMap = { xs: '0.75rem', sm: '0.875rem', base: '1rem' }
  const previewFs = fsMap[barStyle.font_size] || '0.75rem'

  return (
    <div className="space-y-4">

      {/* ── Items ── */}
      <Card title="Bar Items">
        <p className="text-[11px] text-ink-tertiary -mt-2">
          Items are separated by a "{barStyle.separator || '|'}" divider. Each item can optionally show an icon.
        </p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide">Item {i + 1}</p>
                <button
                  onClick={() => removeItem(i)}
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-3 items-end">
                <Field label="Icon (emoji)">
                  <TI value={item.icon || ''} onChange={v => setItem(i, 'icon', v)} placeholder="🚚" />
                </Field>
                <Field label="Text">
                  <TI value={item.text || ''} onChange={v => setItem(i, 'text', v)} placeholder="Free Shipping" />
                </Field>
              </div>
              {/* Show icon toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setItem(i, 'show_icon', !item.show_icon)}
                  className="relative w-8 h-4 rounded-full transition-all shrink-0"
                  style={{ background: item.show_icon !== false ? '#0F0F0F' : 'rgba(0,0,0,0.15)' }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: item.show_icon !== false ? '17px' : '2px' }}
                  />
                </div>
                <span className="text-[11px] text-ink-secondary">Show icon</span>
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-ink-secondary hover:border-ink/30 hover:text-ink transition-all"
        >
          + Add Item
        </button>
      </Card>

      {/* ── Style ── */}
      <Card title="Style">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Background Color">
            <ColorRow value={barStyle.bg_color || '#0F0F0F'} onChange={v => setStyle('bg_color', v)} placeholder="#0F0F0F" />
          </Field>
          <Field label="Text Color">
            <ColorRow value={barStyle.text_color || '#ffffff'} onChange={v => setStyle('text_color', v)} placeholder="#ffffff" />
          </Field>
          <Field label="Font Size">
            <Select
              value={barStyle.font_size || 'xs'}
              onChange={v => setStyle('font_size', v)}
              options={[
                { value: 'xs',   label: 'Small (12 px)' },
                { value: 'sm',   label: 'Medium (14 px)' },
                { value: 'base', label: 'Large (16 px)' },
              ]}
            />
          </Field>
          <Field label="Vertical Padding (px)">
            <TI
              type="number"
              value={String(barStyle.padding_y ?? 10)}
              onChange={v => setStyle('padding_y', Math.max(0, parseInt(v) || 10))}
              placeholder="10"
            />
          </Field>
          <Field label="Separator Character">
            <TI
              value={barStyle.separator ?? '|'}
              onChange={v => setStyle('separator', v)}
              placeholder="|"
            />
          </Field>
        </div>
      </Card>

      {/* ── Live preview ── */}
      <Card title="Preview">
        <div
          className="rounded-xl px-4 flex items-center justify-center flex-wrap gap-y-1"
          style={{
            background:    barStyle.bg_color  || '#0F0F0F',
            paddingTop:    `${barStyle.padding_y ?? 10}px`,
            paddingBottom: `${barStyle.padding_y ?? 10}px`,
            fontSize:      previewFs,
            color:         barStyle.text_color || '#ffffff',
          }}
        >
          {items.map((item, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && (
                <span
                  className="mx-6"
                  style={{ color: `${barStyle.text_color || '#ffffff'}44`, fontSize: '0.875rem' }}
                >
                  {barStyle.separator || '|'}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium tracking-wide">
                {item.show_icon !== false && item.icon && <span>{item.icon}</span>}
                <span>{item.text || '…'}</span>
              </span>
            </span>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-ink text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-ink/80 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Announcement Bar'}
        </button>
      </div>
    </div>
  )
}

// ─── Section Editor dispatcher ────────────────────────────────────────────────

function SectionEditor({ section, onChange, onUploading }) {
  const data = section.section_data || {}
  switch (section.type) {
    case 'hero_3col':        return <Hero3ColEditor       data={data} onChange={onChange} onUploading={onUploading} />
    case 'category_circles': return <CategoryCirclesEditor data={data} onChange={onChange} />
    case 'product_grid':     return <ProductGridEditor     data={data} onChange={onChange} />
    case 'promo_banners':    return <PromoBannersEditor    data={data} onChange={onChange} onUploading={onUploading} />
    case 'trust_badges':     return <TrustBadgesEditor     data={data} onChange={onChange} />
    case 'text_section':     return <TextSectionEditor     data={data} onChange={onChange} />
    case 'image_text':       return <ImageTextEditor       data={data} onChange={onChange} onUploading={onUploading} />
    case 'custom_banner':    return <CustomBannerEditor    data={data} onChange={onChange} onUploading={onUploading} />
    case 'offer_section':    return <OfferSectionEditor    data={data} onChange={onChange} />
    default: return <p className="text-sm text-ink-tertiary p-4">No editor available for this section type.</p>
  }
}

// ─── Add Section Modal ────────────────────────────────────────────────────────

function AddSectionModal({ onAdd, onClose }) {
  const [selected, setSelected] = useState(null)
  const [adding,   setAdding]   = useState(false)

  const defaultData = {
    hero_3col: {
      left_banners: [
        { title: 'Banner 1', link: '/shop', bg_color: '#1a1a1a', text_color: '#ffffff', image_url: '' },
        { title: 'Banner 2', link: '/shop', bg_color: '#1e3a5f', text_color: '#ffffff', image_url: '' },
        { title: 'Banner 3', link: '/shop', bg_color: '#5c4a2a', text_color: '#ffffff', image_url: '' },
      ],
      center: { badge: 'UP TO 90% OFF', title_top: 'Shipped From Our', title_main: 'LOCAL', title_sub: 'WAREHOUSE', cta: 'SHOP NOW', link: '/shop', bg_color: '#f5e8c8', accent_color: '#C0392B', image_url: '' },
      right_brands: [
        { name: 'BRAND 1', link: '/shop', bg_color: '#6e6e6e', image_url: '' },
        { name: 'BRAND 2', link: '/shop', bg_color: '#c9b8a8', image_url: '' },
        { name: 'BRAND 3', link: '/shop', bg_color: '#4a4a4a', image_url: '' },
      ],
    },
    category_circles: { max_items: 12 },
    product_grid:     { title: 'Products', subtitle: '', query: 'bestselling', limit: 8, cols: 4, mobile_cols: 2, layout_mode: 'grid', card_shape: 'rounded', scroll_size: 'md', view_all_link: '/shop', view_all_label: 'View all' },
    promo_banners:    { layout: '2col', banners: [{ title: 'SALE', subtitle: 'Up to 70% off', cta: 'Shop now →', link: '/shop', bg_color: '#C0392B', text_color: '#ffffff', image_url: '' }] },
    trust_badges:     { cols: 4, badges: [{ icon: '🚚', title: 'Free Shipping', desc: 'On orders over $50' }], bg_color: '', text_color: '' },
    text_section:     { title: 'New Section', content: 'Add your content here.', alignment: 'center', text_color: '', bg_color: '' },
    image_text:       { image_url: '', image_side: 'left', title: 'Image & Text', text: 'Add your content here.', cta: '', cta_link: '', text_color: '', bg_color: '' },
    custom_banner:    { image_url: '', bg_color: '#1a1a1a', height: 320, title: 'Big Headline', subtitle: 'Supporting text', cta: 'Shop Now', cta_link: '/shop', text_color: '#ffffff', alignment: 'center' },
    offer_section:    { title: 'Flash Sale!', subtitle: 'Limited time offer', cta: 'Shop the Sale', cta_link: '/shop?on_sale=1', bg_color: '#C0392B', text_color: '#ffffff', countdown_end: '' },
  }

  const handleAdd = async () => {
    if (!selected) return
    setAdding(true)
    await onAdd({
      type:         selected,
      label:        SECTION_META[selected].label,
      section_data: defaultData[selected] || {},
    })
    setAdding(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-black text-ink text-lg">Add New Section</h2>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(SECTION_META).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selected === type
                    ? 'border-ink bg-ink/5'
                    : 'border-border hover:border-ink/30'
                }`}
              >
                <span className="text-2xl">{meta.icon}</span>
                <p className="font-bold text-ink text-sm mt-2">{meta.label}</p>
                <p className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">{meta.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-sm font-semibold text-ink-secondary hover:text-ink transition-colors px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected || adding}
            className="bg-ink text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-ink/80 transition-all disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section List Item ────────────────────────────────────────────────────────

function SectionListItem({
  section, isSelected, isDragging, isDragOver,
  onSelect, onToggle, onDuplicate, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const meta = SECTION_META[section.type] || { label: section.type, icon: '📄' }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, section.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(e, section.id) }}
      onDrop={e => onDrop(e, section.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(section.id)}
      className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer border transition-all select-none ${
        isSelected
          ? 'bg-ink text-white border-ink'
          : isDragOver
            ? 'bg-surface-alt border-ink/40 border-dashed'
            : 'bg-white border-border hover:border-ink/20 hover:bg-surface'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Drag handle */}
      <div className={`cursor-grab active:cursor-grabbing ${isSelected ? 'text-white/50' : 'text-ink-tertiary'}`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zM7 9a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zm-6 5a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>

      {/* Icon + label */}
      <span className="text-base">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-ink'}`}>
          {section.label || meta.label}
        </p>
        <p className={`text-[11px] truncate ${isSelected ? 'text-white/60' : 'text-ink-tertiary'}`}>
          {meta.label}
        </p>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 shrink-0`} onClick={e => e.stopPropagation()}>
        {/* Visibility toggle */}
        <button
          title={section.is_visible ? 'Hide section' : 'Show section'}
          onClick={() => onToggle(section.id, !section.is_visible)}
          className={`p-1.5 rounded-lg transition-colors ${
            isSelected
              ? section.is_visible ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-white/30 hover:text-white/70 hover:bg-white/10'
              : section.is_visible ? 'text-ink-secondary hover:text-ink hover:bg-surface-alt' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-surface-alt'
          }`}
        >
          {section.is_visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>

        {/* Duplicate */}
        <button
          title="Duplicate"
          onClick={() => onDuplicate(section.id)}
          className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-ink-secondary hover:text-ink hover:bg-surface-alt'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          title="Delete"
          onClick={() => onDelete(section.id)}
          className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-white/70 hover:text-red-300 hover:bg-white/10' : 'text-ink-tertiary hover:text-red-500 hover:bg-red-50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ['Page Builder', 'Announcement Bar']

export default function AdminHomepage() {
  const [tab,          setTab]          = useState(0)
  const [sections,     setSections]     = useState([])
  const [selectedId,   setSelectedId]   = useState(null)
  const [editData,     setEditData]     = useState({})
  const [editLabel,    setEditLabel]    = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draggingId,   setDraggingId]   = useState(null)
  const [dragOverId,   setDragOverId]   = useState(null)
  const uploadingCount = useRef(0)
  const [anyUploading, setAnyUploading] = useState(false)

  const handleUploading = useCallback((isUploading) => {
    uploadingCount.current += isUploading ? 1 : -1
    setAnyUploading(uploadingCount.current > 0)
  }, [])

  // Load sections
  useEffect(() => {
    getAdminHomepageSections()
      .then(res => setSections(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // When selected section changes, copy its data to edit state
  const selectedSection = sections.find(s => s.id === selectedId) || null

  const handleSelect = (id) => {
    const sec = sections.find(s => s.id === id)
    if (!sec) return
    setSelectedId(id)
    setEditData(sec.section_data || {})
    setEditLabel(sec.label || '')
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await updateHomepageSection(selectedId, {
        label:        editLabel,
        section_data: editData,
      })
      setSections(prev => prev.map(s => s.id === selectedId ? res.data.data : s))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleVisibility = async (id, visible) => {
    try {
      const res = await updateHomepageSection(id, { is_visible: visible })
      setSections(prev => prev.map(s => s.id === id ? res.data.data : s))
    } catch (_) {}
  }

  const handleDuplicate = async (id) => {
    try {
      const res = await duplicateHomepageSection(id)
      setSections(prev => [...prev, res.data.data])
    } catch (_) {}
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section? This cannot be undone.')) return
    try {
      await deleteHomepageSection(id)
      setSections(prev => prev.filter(s => s.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (_) {}
  }

  const handleAdd = async (payload) => {
    try {
      const res = await createHomepageSection(payload)
      const newSec = res.data.data
      setSections(prev => [...prev, newSec])
      handleSelect(newSec.id)
    } catch (_) {}
  }

  // Drag-and-drop reordering
  const handleDragStart = (e, id) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    if (id !== draggingId) setDragOverId(id)
  }

  const handleDrop = async (e, targetId) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const newSections = [...sections]
    const fromIdx = newSections.findIndex(s => s.id === draggingId)
    const toIdx   = newSections.findIndex(s => s.id === targetId)
    const [item]  = newSections.splice(fromIdx, 1)
    newSections.splice(toIdx, 0, item)
    const reordered = newSections.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSections(reordered)
    setDraggingId(null)
    setDragOverId(null)
    try {
      await reorderHomepageSections(reordered.map(s => ({ id: s.id, sort_order: s.sort_order })))
    } catch (_) {}
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
        <div>
          <h1 className="text-xl font-black text-ink tracking-tight">Homepage Builder</h1>
          <p className="text-xs text-ink-secondary mt-0.5">Drag sections to reorder • Click to edit • Toggle to show/hide</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink border border-border rounded-xl px-3 py-2 transition-all hover:border-ink/30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            Preview
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 shrink-0">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              tab === i
                ? 'bg-ink text-white'
                : 'text-ink-secondary hover:text-ink hover:bg-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Announcement Bar tab */}
      {tab === 1 && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg">
            <AnnouncementBarEditor />
          </div>
        </div>
      )}

      {/* Page Builder tab */}
      {tab === 0 && (
        <div className="flex" style={{ height: 'calc(100vh - 136px)' }}>

          {/* Left sidebar – section list */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-surface overflow-hidden">
            <div className="p-4 space-y-2 flex-1 overflow-y-auto">
              {sections.map(sec => (
                <SectionListItem
                  key={sec.id}
                  section={sec}
                  isSelected={sec.id === selectedId}
                  isDragging={sec.id === draggingId}
                  isDragOver={sec.id === dragOverId}
                  onSelect={handleSelect}
                  onToggle={handleToggleVisibility}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {sections.length === 0 && (
                <p className="text-center text-ink-tertiary text-sm py-8">
                  No sections yet. Add one below.
                </p>
              )}
            </div>

            {/* Add section button */}
            <div className="p-4 border-t border-border shrink-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-ink-secondary hover:border-ink/30 hover:text-ink hover:bg-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>
          </div>

          {/* Right panel – section editor */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
            {selectedSection ? (
              <>
                {/* Editor header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{SECTION_META[selectedSection.type]?.icon || '📄'}</span>
                    <div>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="font-bold text-ink text-sm bg-transparent border-none outline-none hover:bg-surface px-1 py-0.5 rounded-lg transition-colors w-48 truncate"
                        placeholder="Section label"
                      />
                      <p className="text-[11px] text-ink-tertiary px-1">{SECTION_META[selectedSection.type]?.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {anyUploading && (
                      <span className="text-[11px] text-ink-secondary flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-ink/20 border-t-ink rounded-full animate-spin inline-block" />
                        Uploading…
                      </span>
                    )}
                    {error && <span className="text-[11px] text-red-500">{error}</span>}
                    <button
                      onClick={handleSave}
                      disabled={saving || anyUploading}
                      className="flex items-center gap-2 bg-ink text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-ink/80 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Editor form */}
                <div className="flex-1 overflow-y-auto p-6">
                  <SectionEditor
                    section={{ ...selectedSection, section_data: editData }}
                    onChange={setEditData}
                    onUploading={handleUploading}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-ink-tertiary">
                <div className="w-16 h-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="font-semibold text-ink text-sm">Select a section to edit</p>
                <p className="text-[12px] mt-1 max-w-[200px] leading-relaxed">
                  Click any section in the left panel to open its editor here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddModal && (
        <AddSectionModal
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
