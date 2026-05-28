import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addBundleToCart } from '../../api/bundleApi'
import { fetchCart } from '../../store/slices/cartSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import { useCurrency } from '../../context/CurrencyContext'

const imgUrl = (p) => {
  const raw = p?.primary_image || p?.main_image
  if (!raw) return `https://placehold.co/120x120/F2F0EB/9C9894?text=Item`
  return raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`
}
const priceOf = (p) => Number(p?.sale_price || p?.base_price || 0)

export default function BundleCard({ bundle, currentProductId }) {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const toast    = useToast()
  const { format } = useCurrency()
  const [busy, setBusy] = useState(false)

  const items        = bundle.items || []
  const regularTotal = items.reduce((s, p) => s + priceOf(p), 0)
  const bundlePrice  = Number(bundle.bundle_price || 0)
  const savings      = Math.max(0, regularTotal - bundlePrice)
  const savePct      = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0

  const add = async () => {
    if (!user) { toast.info('Please login to add a bundle to cart'); return }
    setBusy(true)
    try {
      await addBundleToCart(bundle.id)
      await dispatch(fetchCart())
      toast.success(`Bundle added — you saved ${format(savings)}!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add bundle')
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #E4E1D9', borderRadius: 16,
      padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
    }}>
      {/* Image strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {bundle.image_url ? (
          <img
            src={bundle.image_url.startsWith('http') ? bundle.image_url : `/MyShop/backend/${bundle.image_url}`}
            alt={bundle.title}
            style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover', background: '#EEECE6' }}
          />
        ) : (
          items.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link to={`/products/${p.slug}`} style={{
                width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
                background: '#EEECE6', display: 'block', flexShrink: 0,
                border: p.id === currentProductId ? '2px solid #0F0F0F' : '2px solid transparent',
              }}>
                <img src={imgUrl(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              {i < items.length - 1 && <span style={{ fontSize: 18, color: '#C8C4BC' }}>+</span>}
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#C0392B', margin: 0,
        }}>
          Bundle Deal{savePct > 0 ? ` · Save ${savePct}%` : ''}
        </p>
        <h3 style={{ margin: '4px 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#0F0F0F' }}>
          {bundle.title}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5854' }}>
          Includes:{' '}
          {items.map((p, i) => (
            <span key={p.id}>
              <Link to={`/products/${p.slug}`} style={{ color: '#0F0F0F', textDecoration: 'underline', textDecorationColor: '#E4E1D9' }}>
                {p.name}
              </Link>{i < items.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </div>

      {/* Price + CTA */}
      <div style={{ minWidth: 180, textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#9C9894' }}>Bundle price</p>
        <p style={{ margin: '2px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0F0F0F' }}>
          {format(bundlePrice)}
        </p>
        {savings > 0 && (
          <p style={{ margin: '2px 0 10px', fontSize: 12, color: '#9C9894' }}>
            <span style={{ textDecoration: 'line-through' }}>{format(regularTotal)}</span>{' '}
            <span style={{ color: '#16A34A', fontWeight: 700 }}>save {format(savings)}</span>
          </p>
        )}
        <button
          onClick={add}
          disabled={busy}
          style={{
            marginTop: 6, height: 44, padding: '0 22px',
            background: busy ? '#2D2D2D' : '#0F0F0F', color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#C0392B' }}
          onMouseLeave={e => { if (!busy) e.currentTarget.style.background = '#0F0F0F' }}
        >
          {busy ? 'Adding…' : 'Add Bundle to Cart'}
        </button>
      </div>
    </div>
  )
}
