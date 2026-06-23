import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { selectCartCount, selectCartItems } from '../../store/slices/cartSlice'
import { toggleCart } from '../../store/slices/uiSlice'
import { useCurrency } from '../../context/CurrencyContext'

const DURATION = 4500   // ms before auto-dismiss
const SLIDE_MS = 260    // entry/exit animation length

/**
 * Lightweight "added to cart" preview — slides in top-right (desktop) or
 * top-center (mobile), shows the item that just landed plus the running
 * cart total, and auto-dismisses with a thin progress bar.
 *
 * Portals to <body> so the CSS `transform` on the .animate-page-in wrapper
 * doesn't trap our `position: fixed` (same trick as the lightbox + confetti).
 */
export default function AddedToCartPopover({ product, qty = 1, image, onClose }) {
  const dispatch = useDispatch()
  const items    = useSelector(selectCartItems)
  const count    = useSelector(selectCartCount)
  const { format } = useCurrency()
  const [closing, setClosing] = useState(false)

  const startClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, SLIDE_MS)
  }

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(startClose, DURATION)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute running cart total from the redux slice. We don't lean on
  // selectCartTotal because some payloads carry strings.
  const cartTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
  const unitPrice = Number(product?.sale_price || product?.base_price || product?.price || 0)

  const openCartDrawer = () => {
    dispatch(toggleCart())
    startClose()
  }

  return createPortal((
    <div
      role="status"
      aria-live="polite"
      style={{
        position:    'fixed',
        top:         16,
        right:       16,
        left:        16,
        zIndex:      90,
        display:     'flex',
        justifyContent: 'flex-end',
        pointerEvents:  'none',
      }}
    >
      <div
        style={{
          width:           '100%',
          maxWidth:        360,
          background:      '#fff',
          border:          '1px solid #E5E2DA',
          borderRadius:    16,
          boxShadow:       '0 18px 40px -12px rgba(15,23,42,0.18), 0 4px 12px rgba(15,23,42,0.06)',
          overflow:        'hidden',
          pointerEvents:   'auto',
          transform:       closing ? 'translateY(-12px) scale(0.96)' : 'translateY(0) scale(1)',
          opacity:         closing ? 0 : 1,
          transition:      `transform ${SLIDE_MS}ms cubic-bezier(0.34,1.4,0.64,1), opacity ${SLIDE_MS}ms ease`,
          animation:       closing ? 'none' : `popoverIn ${SLIDE_MS}ms cubic-bezier(0.34,1.4,0.64,1) both`,
        }}
      >
        <style>{`
          @keyframes popoverIn {
            0%   { opacity: 0; transform: translateY(-14px) scale(0.94); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes popoverDrain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>

        {/* Top: green tick + "Added to cart" */}
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,209,193,0.16)', color: '#0AAFA3',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0AAFA3', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Added to cart
            </p>
          </div>
          <button
            type="button"
            onClick={startClose}
            aria-label="Dismiss"
            style={{
              width: 26, height: 26, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#9C9894', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Item row */}
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: '#F2F0EB',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {image && (
              <img
                src={image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {product?.name || 'Item'}
            </p>
            <p style={{ fontSize: 12, color: '#5C5854', margin: '4px 0 0' }}>
              {qty} × {format(unitPrice)}
              <span style={{ color: '#9C9894' }}> · </span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{format(unitPrice * qty)}</span>
            </p>
          </div>
        </div>

        {/* Cart summary line */}
        <div style={{
          padding: '10px 16px',
          background: '#FAFAFC',
          borderTop: '1px solid #F2F0EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: '#5C5854',
        }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Cart · {count} {count === 1 ? 'item' : 'items'}
          </span>
          <span style={{ fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {format(cartTotal)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 14px 14px', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={openCartDrawer}
            style={{
              flex: 1, height: 38, borderRadius: 10,
              background: 'transparent', color: '#0F172A',
              border: '1.5px solid #E5E2DA', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Quick view
          </button>
          <Link
            to="/cart"
            onClick={startClose}
            style={{
              flex: 1.4, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)',
              color: '#fff', textDecoration: 'none',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            View cart
          </Link>
        </div>

        {/* Auto-dismiss progress bar */}
        <div style={{ height: 3, background: '#F2F0EB', position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position:    'absolute',
              inset:       0,
              background:  '#00D8C8',
              transformOrigin: 'left center',
              animation:   closing
                ? 'none'
                : `popoverDrain ${DURATION}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  ), document.body)
}
