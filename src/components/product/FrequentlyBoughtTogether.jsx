import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCartThunk } from '../../store/slices/cartSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import { useCurrency } from '../../context/CurrencyContext'

const imgUrl = (p) => {
  const raw = p?.primary_image || p?.main_image || p?.images?.[0]?.image_url
  if (!raw) return `https://placehold.co/200x200/F2F0EB/9C9894?text=Item`
  return raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`
}
const priceOf = (p) => Number(p?.sale_price || p?.base_price || p?.price || 0)
const isSimpleAddable = (p) =>
  Number(p?.variant_count || 0) === 0 && Number(p?.stock_qty || 0) > 0

export default function FrequentlyBoughtTogether({ current, items = [], currentAddable = false }) {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const toast    = useToast()
  const { format } = useCurrency()

  // Only one-click-addable suggestions belong in the bundle (no variant/size
  // picking needed). Cap at 3 — the classic "this + 3" bundle.
  const suggestions = useMemo(
    () => (items || []).filter(isSimpleAddable).slice(0, 3),
    [items]
  )

  // Build the bundle rows: current item first (anchor), then suggestions.
  const rows = useMemo(() => {
    const list = []
    if (current) list.push({ ...current, _current: true, _addable: currentAddable })
    suggestions.forEach(s => list.push({ ...s, _current: false, _addable: true }))
    return list
  }, [current, suggestions, currentAddable])

  const [checked, setChecked] = useState(() =>
    new Set(rows.filter(r => r._addable).map(r => r.id))
  )
  const [busy, setBusy] = useState(false)

  if (suggestions.length === 0) return null

  const toggle = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedRows = rows.filter(r => checked.has(r.id))
  const total = selectedRows.reduce((sum, r) => sum + priceOf(r), 0)

  const addBundle = async () => {
    if (!user) { toast.info('Please login to add to cart'); return }
    if (selectedRows.length === 0) { toast.info('Select at least one item'); return }
    setBusy(true)
    let ok = 0
    for (const r of selectedRows) {
      const res = await dispatch(addToCartThunk({ product_id: r.id, quantity: 1 }))
      if (!res.error) ok++
    }
    setBusy(false)
    if (ok > 0) toast.success(`Added ${ok} item${ok === 1 ? '' : 's'} to cart!`)
    else toast.error('Could not add the bundle')
  }

  return (
    <div style={{ maxWidth: 1280, margin: '8px auto 0', padding: '0 20px' }}>
      <div style={{ borderTop: '1px solid #E4E1D9', paddingTop: 48 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: '#9C9894', marginBottom: 6,
        }}>
          Buy It With
        </p>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
          fontWeight: 400, letterSpacing: '0.03em',
          color: '#0F0F0F', margin: '0 0 28px', lineHeight: 1,
        }}>
          Frequently Bought Together
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
          {/* Image strip joined with "+" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link
                  to={`/products/${r.slug}`}
                  style={{
                    width: 104, height: 104, borderRadius: 14, overflow: 'hidden',
                    background: '#EEECE6', display: 'block',
                    border: checked.has(r.id) ? '2px solid #0F0F0F' : '2px solid transparent',
                    opacity: r._addable ? 1 : 0.55, flexShrink: 0,
                  }}
                >
                  <img src={imgUrl(r)} alt={r.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Link>
                {i < rows.length - 1 && (
                  <span style={{ fontSize: 24, fontWeight: 300, color: '#C8C4BC' }}>+</span>
                )}
              </div>
            ))}
          </div>

          {/* Total + add button */}
          <div style={{ minWidth: 200 }}>
            <p style={{ fontSize: 12, color: '#9C9894', margin: '0 0 4px' }}>
              Total for {selectedRows.length} item{selectedRows.length === 1 ? '' : 's'}
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0F0F0F', margin: '0 0 14px' }}>
              {format(total)}
            </p>
            <button
              onClick={addBundle}
              disabled={busy || selectedRows.length === 0}
              style={{
                height: 48, padding: '0 26px',
                background: busy || selectedRows.length === 0 ? '#E4E1D9' : '#0F0F0F',
                color: busy || selectedRows.length === 0 ? '#9C9894' : '#fff',
                border: 'none', borderRadius: 14,
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: busy || selectedRows.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!busy && selectedRows.length) e.currentTarget.style.background = '#2D2D2D' }}
              onMouseLeave={e => { if (!busy && selectedRows.length) e.currentTarget.style.background = '#0F0F0F' }}
            >
              {busy ? 'Adding…' : `Add ${selectedRows.length} to Cart`}
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => (
            <label
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                fontSize: 14, color: r._addable ? '#0F0F0F' : '#9C9894',
                cursor: r._addable ? 'pointer' : 'default',
              }}
            >
              <input
                type="checkbox"
                checked={checked.has(r.id)}
                disabled={!r._addable}
                onChange={() => r._addable && toggle(r.id)}
                style={{ width: 16, height: 16, accentColor: '#0F0F0F', flexShrink: 0 }}
              />
              <span style={{ fontWeight: 600 }}>
                {r._current ? 'This item: ' : ''}
                <Link
                  to={`/products/${r.slug}`}
                  style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid #E4E1D9' }}
                >
                  {r.name}
                </Link>
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{format(priceOf(r))}</span>
              {r._current && !r._addable && (
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  select options above
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
