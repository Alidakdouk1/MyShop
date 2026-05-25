import { useState, useEffect, useMemo } from 'react'
import { getFilters, serializeFilterParam } from '../../api/filterApi'

// Parse the URL-friendly filters string back into { filterId: [optionId,...] }
function parseFilterParam(str) {
  if (!str) return {}
  const out = {}
  String(str).split(';').forEach(chunk => {
    if (!chunk.includes(':')) return
    const [fid, opts] = chunk.split(':')
    const id = Number(fid)
    if (!id) return
    out[id] = (opts || '').split(',').map(Number).filter(Boolean)
  })
  return out
}

// Map common colour names → a CSS background for the swatch circle.
const COLOR_SWATCHES = {
  black: '#0F0F0F', white: '#FFFFFF', gray: '#9CA3AF', grey: '#9CA3AF',
  beige: '#E8DCC4', brown: '#8B5A2B', khaki: '#C3B091', tan: '#D2B48C',
  red: '#DC2626', burgundy: '#7B1F2B', maroon: '#7B1F2B',
  pink: '#F4A6C0', 'hot pink': '#FF1493', rose: '#E11D63',
  orange: '#F97316', yellow: '#FACC15', cream: '#FFF8E7',
  green: '#16A34A', olive: '#808000', mint: '#A7F3D0', teal: '#14B8A6',
  blue: '#2563EB', navy: '#1E2A52', 'light blue': '#7DD3FC', 'sky blue': '#7DD3FC',
  purple: '#7C3AED', lavender: '#C4B5FD', violet: '#8B5CF6',
  gold: '#D4AF37', silver: '#C0C0C0',
  multicolor: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
}

const swatchFor = (value) => COLOR_SWATCHES[String(value).trim().toLowerCase()] || null

// A filter is treated as a colour swatch picker when its name mentions "color"
// and at least some of its values are recognised colours.
const isColorFilter = (f) =>
  /colou?r/i.test(f.name) &&
  (f.options || []).some(o => swatchFor(o.value))

export default function ProductFilters({ filters, onChange, categories = [] }) {
  const [priceMin, setPriceMin]     = useState(filters.price_min || '')
  const [priceMax, setPriceMax]     = useState(filters.price_max || '')
  const [openSections, setOpen]     = useState({ price: true, other: true })
  const [dynamicFilters, setDynamicFilters] = useState([])
  const [openDynamic, setOpenDynamic] = useState({})  // { [filterId]: bool }

  const categoryId = filters.category_id || ''

  // Load the filters for the currently open category (or all when none selected)
  useEffect(() => {
    getFilters(categoryId)
      .then(r => {
        const list = r.data.data || []
        setDynamicFilters(list)
        // First three filters open by default
        const initial = {}
        list.slice(0, 3).forEach(f => { initial[f.id] = true })
        setOpenDynamic(initial)
      })
      .catch(() => setDynamicFilters([]))
  }, [categoryId])

  const selectedByFilter = useMemo(() => parseFilterParam(filters.filters), [filters.filters])

  const toggleSection = (key) => setOpen(s => ({ ...s, [key]: !s[key] }))
  const toggleDynamic = (id)  => setOpenDynamic(s => ({ ...s, [id]: !s[id] }))

  const applyPrice = () => {
    onChange({ ...filters, price_min: priceMin || undefined, price_max: priceMax || undefined, page: 1 })
  }

  // Show "Clear" once a min/max has been typed or is already applied to the results
  const hasPrice = priceMin !== '' || priceMax !== '' || !!filters.price_min || !!filters.price_max

  const clearPrice = () => {
    setPriceMin('')
    setPriceMax('')
    onChange({ ...filters, price_min: undefined, price_max: undefined, page: 1 })
  }

  const setDynamicSelection = (filterId, optionId, isMulti) => {
    const next = { ...selectedByFilter }
    const current = next[filterId] || []
    if (isMulti) {
      next[filterId] = current.includes(optionId)
        ? current.filter(x => x !== optionId)
        : [...current, optionId]
    } else {
      next[filterId] = current[0] === optionId ? [] : [optionId]
    }
    if (!next[filterId].length) delete next[filterId]
    onChange({ ...filters, filters: serializeFilterParam(next) || undefined, page: 1 })
  }

  return (
    <div className="space-y-5">
      {/* Price range */}
      <FilterSection title="Price Range" open={openSections.price} onToggle={() => toggleSection('price')}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <span className="text-ink-tertiary">–</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={applyPrice}
            className="flex-1 bg-ink text-white text-sm font-semibold py-2 rounded-lg hover:bg-ink/80 active:scale-[0.98] transition-all"
          >
            Apply
          </button>
          {hasPrice && (
            <button
              onClick={clearPrice}
              className="px-4 py-2 text-sm font-semibold text-ink-secondary border border-border rounded-lg hover:border-ink/40 hover:text-ink active:scale-[0.98] transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </FilterSection>

      {/* Dynamic admin-managed filters (Size, Color, Material, …) */}
      {dynamicFilters.map(f => {
        // Range filters can't be selected from option ids — they're set per-product.
        // We still show the section header but with a per-filter min/max input.
        if (f.type === 'range') {
          return (
            <DynamicRangeFilter
              key={f.id}
              filter={f}
              filters={filters}
              onChange={onChange}
              open={openDynamic[f.id]}
              onToggle={() => toggleDynamic(f.id)}
            />
          )
        }
        if (!(f.options || []).length) return null
        const selected = selectedByFilter[f.id] || []
        const isMulti  = f.type !== 'single'

        return (
          <FilterSection
            key={f.id}
            title={f.name}
            open={openDynamic[f.id]}
            onToggle={() => toggleDynamic(f.id)}
          >
            {isColorFilter(f) ? (
              // Colour swatches — small circles in their own colour
              <div className="flex flex-wrap gap-2.5">
                {f.options.map(o => {
                  const checked = selected.includes(o.id)
                  const bg      = swatchFor(o.value) || '#E4E1D9'
                  const isWhite = bg.toUpperCase() === '#FFFFFF' || /cream/i.test(o.value)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      title={`${o.value}${o.product_count != null ? ` — ${o.product_count} product${o.product_count === 1 ? '' : 's'}` : ''}`}
                      aria-label={o.value}
                      onClick={() => setDynamicSelection(f.id, o.id, isMulti)}
                      className={`relative w-7 h-7 rounded-full transition-transform hover:scale-110 ${o.product_count === 0 && !checked ? 'opacity-45' : ''}`}
                      style={{
                        background: bg,
                        boxShadow: checked
                          ? '0 0 0 2px #fff, 0 0 0 4px #0F0F0F'
                          : isWhite ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 24 24"
                          className="absolute inset-0 m-auto w-3.5 h-3.5"
                          fill="none"
                          stroke={isWhite ? '#0F0F0F' : '#fff'}
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              // Everything else — 3 selectable pills per row
              <div className="grid grid-cols-3 gap-2">
                {f.options.map(o => {
                  const checked = selected.includes(o.id)
                  const count   = o.product_count
                  const none    = count === 0
                  return (
                    <button
                      key={o.id}
                      type="button"
                      title={`${o.value}${f.unit ? ` ${f.unit}` : ''}${count != null ? ` — ${count} product${count === 1 ? '' : 's'}` : ''}`}
                      onClick={() => setDynamicSelection(f.id, o.id, isMulti)}
                      className={`text-xs font-semibold px-1 py-2 rounded-lg border text-center truncate transition-colors
                        ${checked
                          ? 'bg-ink text-white border-ink'
                          : 'bg-surface border-border text-ink-secondary hover:border-ink/40'}
                        ${none && !checked ? 'opacity-45' : ''}`}
                    >
                      {o.value}{f.unit ? ` ${f.unit}` : ''}
                      {count != null && (
                        <span className={checked ? 'text-white/55' : 'text-ink-tertiary'}> {count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </FilterSection>
        )
      })}

      {/* Other toggles */}
      <FilterSection title="Other" open={openSections.other} onToggle={() => toggleSection('other')}>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.in_stock || false}
              onChange={e => onChange({ ...filters, in_stock: e.target.checked || undefined, page: 1 })}
              className="w-4 h-4 rounded border-border accent-ink cursor-pointer"
            />
            <span className="text-sm font-medium text-ink">In Stock Only</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!filters.on_sale}
              onChange={e => onChange({ ...filters, on_sale: e.target.checked ? '1' : '', page: 1 })}
              className="w-4 h-4 rounded border-border accent-ink cursor-pointer"
            />
            <span className="text-sm font-medium text-ink">On Sale</span>
          </label>
        </div>
      </FilterSection>
    </div>
  )
}

// Range filter rendered as a min/max pair under its own collapsible section
function DynamicRangeFilter({ filter, filters, onChange, open, onToggle }) {
  const keyMin = `f_${filter.id}_min`
  const keyMax = `f_${filter.id}_max`
  const [min, setMin] = useState(filters[keyMin] || '')
  const [max, setMax] = useState(filters[keyMax] || '')

  const apply = () => {
    onChange({
      ...filters,
      [keyMin]: min || undefined,
      [keyMax]: max || undefined,
      page: 1,
    })
  }

  const hasValue = min !== '' || max !== '' || !!filters[keyMin] || !!filters[keyMax]

  const clear = () => {
    setMin('')
    setMax('')
    onChange({ ...filters, [keyMin]: undefined, [keyMax]: undefined, page: 1 })
  }

  return (
    <FilterSection title={filter.name} open={open} onToggle={onToggle}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder={filter.unit ? `Min (${filter.unit})` : 'Min'}
          value={min}
          onChange={e => setMin(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        />
        <span className="text-ink-tertiary">–</span>
        <input
          type="number"
          placeholder={filter.unit ? `Max (${filter.unit})` : 'Max'}
          value={max}
          onChange={e => setMax(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={apply}
          className="flex-1 bg-ink text-white text-sm font-semibold py-2 rounded-lg hover:bg-ink/80 active:scale-[0.98] transition-all"
        >
          Apply
        </button>
        {hasValue && (
          <button
            onClick={clear}
            className="px-4 py-2 text-sm font-semibold text-ink-secondary border border-border rounded-lg hover:border-ink/40 hover:text-ink active:scale-[0.98] transition-all"
          >
            Clear
          </button>
        )}
      </div>
    </FilterSection>
  )
}

function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary group-hover:text-ink transition-colors">
          {title}
        </p>
        <span className="text-ink-tertiary text-lg leading-none group-hover:text-ink transition-colors">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && children}
    </div>
  )
}
