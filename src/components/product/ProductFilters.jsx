import { useState, useEffect } from 'react'
import { Select } from '../ui/Input'

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest First' },
  { value: 'price_asc',    label: 'Price: Low to High' },
  { value: 'price_desc',   label: 'Price: High to Low' },
  { value: 'rating',       label: 'Top Rated' },
  { value: 'bestselling',  label: 'Best Selling' },
]

export default function ProductFilters({ filters, onChange, categories = [] }) {
  const [priceMin, setPriceMin] = useState(filters.price_min || '')
  const [priceMax, setPriceMax] = useState(filters.price_max || '')
  const [openParent, setOpenParent] = useState(null)

  // Build hierarchy from flat list
  const parents  = categories.filter(c => !c.parent_id)
  const childMap = {}
  categories.filter(c => c.parent_id).forEach(c => {
    if (!childMap[c.parent_id]) childMap[c.parent_id] = []
    childMap[c.parent_id].push(c)
  })

  // Auto-expand the parent of the currently active subcategory
  useEffect(() => {
    if (!filters.category_id) { setOpenParent(null); return }
    const active = categories.find(c => String(c.id) === String(filters.category_id))
    if (active?.parent_id) setOpenParent(active.parent_id)
    else setOpenParent(Number(filters.category_id))
  }, [filters.category_id, categories])

  const handleParentClick = (parent) => {
    const children = childMap[parent.id] || []
    // Toggle expand; always filter by this parent category
    setOpenParent(prev => prev === parent.id ? null : parent.id)
    onChange({ ...filters, category_id: parent.id, page: 1 })
  }

  const handleAllClick = () => {
    setOpenParent(null)
    onChange({ ...filters, category_id: undefined, page: 1 })
  }

  const apply = () => {
    onChange({ ...filters, price_min: priceMin || undefined, price_max: priceMax || undefined, page: 1 })
  }

  return (
    <div className="space-y-6">
      {/* Category */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-3">Category</p>
          <div className="flex flex-col gap-0.5">

            {/* All Categories */}
            <button
              onClick={handleAllClick}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${!filters.category_id
                  ? 'bg-ink text-white font-semibold'
                  : 'text-ink-secondary hover:bg-surface-alt hover:text-ink'}`}
            >
              All Categories
            </button>

            {/* Parent categories + expandable subcategories */}
            {parents.map(parent => {
              const children  = childMap[parent.id] || []
              const isOpen    = openParent === parent.id
              const isActive  = String(filters.category_id) === String(parent.id)

              // Support both image_url (admin API) and image (public API)
              const imgRaw = parent.image_url || parent.image
              const imgSrc = imgRaw
                ? (imgRaw.startsWith('http') || imgRaw.startsWith('/') ? imgRaw : `/MyShop/backend/${imgRaw}`)
                : null

              return (
                <div key={parent.id}>
                  <button
                    onClick={() => handleParentClick(parent)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center justify-between gap-2
                      ${isActive
                        ? 'bg-ink text-white font-semibold'
                        : 'text-ink-secondary hover:bg-surface-alt hover:text-ink'}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={parent.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/20"
                        />
                      ) : (
                        <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold uppercase transition-colors
                          ${isActive ? 'bg-white/20 text-white' : 'bg-surface-alt text-ink-tertiary'}`}>
                          {parent.name[0]}
                        </div>
                      )}
                      <span className="truncate">{parent.name}</span>
                    </span>
                    {children.length > 0 && (
                      <svg
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-white/70' : 'text-ink-tertiary'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Subcategories — slide open */}
                  {isOpen && children.length > 0 && (
                    <div className="ml-3 mt-0.5 mb-1 border-l-2 border-border pl-2 flex flex-col gap-0.5">
                      {children.map(child => {
                        const childImgRaw = child.image_url || child.image
                        const childImgSrc = childImgRaw
                          ? (childImgRaw.startsWith('http') || childImgRaw.startsWith('/') ? childImgRaw : `/MyShop/backend/${childImgRaw}`)
                          : null
                        const childActive = String(filters.category_id) === String(child.id)
                        return (
                          <button
                            key={child.id}
                            onClick={() => onChange({ ...filters, category_id: child.id, page: 1 })}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 flex items-center gap-2
                              ${childActive
                                ? 'bg-ink text-white font-semibold'
                                : 'text-ink-secondary hover:bg-surface-alt hover:text-ink'}`}
                          >
                            {childImgSrc ? (
                              <img src={childImgSrc} alt={child.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold uppercase
                                ${childActive ? 'bg-white/20 text-white' : 'bg-surface-alt text-ink-tertiary'}`}>
                                {child.name[0]}
                              </div>
                            )}
                            <span className="truncate">{child.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sort */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-3">Sort By</p>
        <Select
          value={filters.sort || 'newest'}
          onChange={e => onChange({ ...filters, sort: e.target.value, page: 1 })}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>

      {/* Price range */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-3">Price Range</p>
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
        <button
          onClick={apply}
          className="mt-3 w-full bg-ink text-white text-sm font-semibold py-2 rounded-lg hover:bg-ink/80 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* In stock */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.in_stock || false}
          onChange={e => onChange({ ...filters, in_stock: e.target.checked || undefined, page: 1 })}
          className="w-4 h-4 rounded border-border accent-ink cursor-pointer"
        />
        <span className="text-sm font-medium text-ink">In Stock Only</span>
      </label>
    </div>
  )
}
