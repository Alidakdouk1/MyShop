import { useState, useEffect } from 'react'
import { getFilters, getProductFilters } from '../../api/filterApi'

/**
 * Lets an admin pick filter values for a product on the Add/Edit form.
 *
 * Two switches per filter:
 *   1. Apply  — OFF: filter does not apply / ON: admin picks values
 *   2. Visible — OFF: values saved but hidden on the product page
 *                ON:  values shown on the product page
 *
 * Each picked option also gets its own quantity input (stock for that option).
 *
 * Controlled component:
 *   value    — { [filter_id]: { enabled, visible, option_ids:[], quantities:{}, min_value, max_value } }
 *   onChange — (next) => void
 *
 * Pass `productId` on edit to pre-fill existing selections.
 * Pass `categoryId` to show only the filters that belong to the product's category.
 */
export default function ProductFiltersPicker({ value, onChange, productId, categoryId }) {
  const [filters, setFilters] = useState([])
  const [loading, setLoading] = useState(true)

  // Show only the filters assigned to this product's category.
  useEffect(() => {
    if (!categoryId) { setFilters([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    getFilters(categoryId)
      .then(r => { if (!cancelled) setFilters(r.data.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [categoryId])

  // On edit — preload existing product selections (and switch them ON)
  useEffect(() => {
    if (!productId) return
    getProductFilters(productId)
      .then(r => {
        const next = {}
        ;(r.data.data || []).forEach(sel => {
          const quantities  = {}
          const hover_texts = {}
          if (Array.isArray(sel.options)) {
            sel.options.forEach(o => {
              quantities[o.id]  = o.quantity   == null ? '' : String(o.quantity)
              hover_texts[o.id] = o.hover_text == null ? '' : String(o.hover_text)
            })
          }
          next[sel.filter_id] = {
            enabled:    true,
            visible:    sel.is_visible == null ? true : Number(sel.is_visible) === 1,
            option_ids: sel.option_ids || [],
            quantities,
            hover_texts,
            min_value:  sel.min_value ?? '',
            max_value:  sel.max_value ?? '',
          }
        })
        onChange(next)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  if (!categoryId) {
    return (
      <p className="text-xs italic" style={{ color: '#9C9894' }}>
        Pick a category above to see the filters available for it.
      </p>
    )
  }
  if (loading) {
    return <p className="text-xs italic" style={{ color: '#9C9894' }}>Loading filters…</p>
  }
  if (filters.length === 0) {
    return (
      <p className="text-xs" style={{ color: '#9C9894' }}>
        This category has no filters yet. Assign some on the{' '}
        <a href="/admin/categories" className="underline font-semibold">Categories</a> page,
        or create filters on the{' '}
        <a href="/admin/filters" className="underline font-semibold">Filters</a> page.
      </p>
    )
  }

  const blank = { enabled: false, visible: true, option_ids: [], quantities: {}, hover_texts: {}, min_value: '', max_value: '' }

  const setField = (filterId, field, v) => {
    const current = value[filterId] || blank
    onChange({ ...value, [filterId]: { ...current, [field]: v } })
  }

  const toggleEnabled = (filterId) => {
    const current = value[filterId] || blank
    if (current.enabled) {
      onChange({ ...value, [filterId]: { ...blank, enabled: false } })
    } else {
      onChange({ ...value, [filterId]: { ...current, enabled: true, visible: current.visible !== false } })
    }
  }

  const toggleVisible = (filterId) => {
    const current = value[filterId] || blank
    onChange({ ...value, [filterId]: { ...current, visible: !current.visible } })
  }

  const toggleOption = (filterId, optionId, isMulti) => {
    const current  = value[filterId] || blank
    const currentQ = current.quantities  || {}
    const currentH = current.hover_texts || {}
    if (isMulti) {
      const has = current.option_ids.includes(optionId)
      const nextIds = has
        ? current.option_ids.filter(id => id !== optionId)
        : [...current.option_ids, optionId]
      const nextQ = { ...currentQ }
      const nextH = { ...currentH }
      if (has) { delete nextQ[optionId]; delete nextH[optionId] }
      onChange({ ...value, [filterId]: { ...current, option_ids: nextIds, quantities: nextQ, hover_texts: nextH } })
    } else {
      const wasSelected = current.option_ids[0] === optionId
      onChange({
        ...value,
        [filterId]: {
          ...current,
          option_ids:  wasSelected ? [] : [optionId],
          quantities:  wasSelected ? {} : { [optionId]: currentQ[optionId] ?? '' },
          hover_texts: wasSelected ? {} : { [optionId]: currentH[optionId] ?? '' },
        },
      })
    }
  }

  const setOptionQty = (filterId, optionId, qty) => {
    const current = value[filterId] || blank
    const nextQ   = { ...(current.quantities || {}), [optionId]: qty }
    onChange({ ...value, [filterId]: { ...current, quantities: nextQ } })
  }

  const setOptionHover = (filterId, optionId, txt) => {
    const current = value[filterId] || blank
    const nextH   = { ...(current.hover_texts || {}), [optionId]: txt }
    onChange({ ...value, [filterId]: { ...current, hover_texts: nextH } })
  }

  return (
    <div className="space-y-3">
      {filters.map(f => {
        const sel     = value[f.id] || blank
        const enabled = !!sel.enabled
        return (
          <div
            key={f.id}
            className="rounded-xl"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              background: enabled ? '#fff' : '#FAFAF8',
              transition: 'background 0.15s',
            }}
          >
            {/* Header row with switch */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold" style={{ color: '#0F0F0F' }}>{f.name}</p>
                  {f.unit && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F0EEE9', color: '#5C5854' }}>
                      {f.unit}
                    </span>
                  )}
                  {Number(f.is_required) === 1 && (
                    <span className="text-[10px] font-bold" style={{ color: '#C0392B' }}>required</span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: '#9C9894' }}>
                  {enabled ? 'Pick the values that apply to this product' : 'Turn on to apply this filter'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleEnabled(f.id)}
                aria-label={`Toggle ${f.name}`}
                className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
                style={{ background: enabled ? '#0F0F0F' : 'rgba(0,0,0,0.15)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: enabled ? '22px' : '2px' }}
                />
              </button>
            </div>

            {/* Second switch — show on product page */}
            {enabled && (
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderTop: '1px dashed rgba(0,0,0,0.06)',
                  background: '#FAFAF8',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold" style={{ color: '#0F0F0F' }}>
                    Show on product page
                  </p>
                  <p className="text-[11px]" style={{ color: '#9C9894' }}>
                    {sel.visible === false
                      ? 'Hidden — customers won’t see this filter on the product page'
                      : 'Visible — customers will see this on the product page'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVisible(f.id)}
                  aria-label={`Show ${f.name} on product page`}
                  className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
                  style={{ background: sel.visible === false ? 'rgba(0,0,0,0.15)' : '#0F0F0F' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: sel.visible === false ? '2px' : '22px' }}
                  />
                </button>
              </div>
            )}

            {/* Inputs — visible only when switched on */}
            {enabled && (
              <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px dashed rgba(0,0,0,0.06)' }}>
                {f.type === 'range' ? (
                  <div className="flex items-center gap-2 pt-3">
                    <input
                      type="number" step="0.01"
                      value={sel.min_value ?? ''}
                      onChange={e => setField(f.id, 'min_value', e.target.value)}
                      placeholder={f.unit ? `Min (${f.unit})` : 'Min'}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-ink"
                    />
                    <span className="text-ink-tertiary">–</span>
                    <input
                      type="number" step="0.01"
                      value={sel.max_value ?? ''}
                      onChange={e => setField(f.id, 'max_value', e.target.value)}
                      placeholder={f.unit ? `Max (${f.unit})` : 'Max'}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-ink"
                    />
                  </div>
                ) : f.type === 'single' ? (
                  <div className="pt-3 space-y-2">
                    <select
                      value={sel.option_ids[0] ?? ''}
                      onChange={e => {
                        const id = e.target.value ? Number(e.target.value) : null
                        if (!id) {
                          onChange({ ...value, [f.id]: { ...sel, option_ids: [], quantities: {} } })
                        } else {
                          onChange({
                            ...value,
                            [f.id]: {
                              ...sel,
                              option_ids: [id],
                              quantities: { [id]: (sel.quantities || {})[id] ?? '' },
                            },
                          })
                        }
                      }}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-ink"
                    >
                      <option value="">— Select —</option>
                      {(f.options || []).map(o => (
                        <option key={o.id} value={o.id}>{o.value}{f.unit ? ` ${f.unit}` : ''}</option>
                      ))}
                    </select>
                    {sel.option_ids[0] != null && (
                      <PickedOptionRow
                        label={(f.options || []).find(o => o.id === sel.option_ids[0])?.value}
                        unit={f.unit}
                        qty={(sel.quantities  || {})[sel.option_ids[0]] ?? ''}
                        hover={(sel.hover_texts || {})[sel.option_ids[0]] ?? ''}
                        onChangeQty={q   => setOptionQty(f.id,   sel.option_ids[0], q)}
                        onChangeHover={t => setOptionHover(f.id, sel.option_ids[0], t)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="pt-3 space-y-3">
                    {(f.options || []).length === 0 && (
                      <p className="text-xs italic" style={{ color: '#9C9894' }}>
                        No options yet — add some on the Filters page.
                      </p>
                    )}

                    {/* Option pills */}
                    <div className="flex flex-wrap gap-2">
                      {(f.options || []).map(o => {
                        const checked = sel.option_ids.includes(o.id)
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => toggleOption(f.id, o.id, true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                              ${checked
                                ? 'bg-ink text-white border-ink'
                                : 'bg-surface border-border hover:border-ink/40 text-ink'}`}
                          >
                            {o.value}{f.unit ? ` ${f.unit}` : ''}
                          </button>
                        )
                      })}
                    </div>

                    {/* Per-option stock + hover text */}
                    {sel.option_ids.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#5C5854' }}>
                          Stock &amp; hover text per option
                        </p>
                        <div className="space-y-2">
                          {sel.option_ids.map(oid => {
                            const opt = (f.options || []).find(o => o.id === oid)
                            if (!opt) return null
                            return (
                              <PickedOptionRow
                                key={oid}
                                label={opt.value}
                                unit={f.unit}
                                qty={(sel.quantities   || {})[oid] ?? ''}
                                hover={(sel.hover_texts || {})[oid] ?? ''}
                                onChangeQty={q   => setOptionQty(f.id,   oid, q)}
                                onChangeHover={t => setOptionHover(f.id, oid, t)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** One row per picked option: label + qty + hover-text input. */
function PickedOptionRow({ label, unit, qty, hover, onChangeQty, onChangeHover }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ background: '#F0EEE9', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <span
        className="text-xs font-bold shrink-0 min-w-[56px]"
        style={{ color: '#0F0F0F' }}
        title={label}
      >
        {label}{unit ? ` ${unit}` : ''}
      </span>
      <input
        type="number"
        min={0}
        value={qty}
        onChange={e => onChangeQty(e.target.value)}
        placeholder="Qty"
        className="w-20 bg-white rounded px-2 py-1 text-xs outline-none shrink-0"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      />
      <input
        type="text"
        value={hover}
        onChange={e => onChangeHover(e.target.value)}
        placeholder="Hover text (shown above the option on the product page)"
        className="flex-1 bg-white rounded px-2 py-1 text-xs outline-none"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      />
    </div>
  )
}
