import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  selectCartItems, selectCartTotal,
  updateCartItemThunk, removeCartItemThunk, clearCartThunk,
} from '../store/slices/cartSlice'
import { selectUser } from '../store/slices/authSlice'
import { resolveImg } from '../lib/img'
import Button from '../components/ui/Button'

export default function Cart() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectUser)
  const items     = useSelector(selectCartItems)
  const total     = useSelector(selectCartTotal)

  if (items.length === 0) return (
    <div className="max-w-screen-xl mx-auto px-4 py-20 text-center">
      <div className="text-7xl mb-6">🛒</div>
      <h1 className="hero-display text-5xl text-ink mb-3">YOUR CART IS EMPTY</h1>
      <p className="text-ink-secondary mb-8">Looks like you haven&apos;t added anything yet.</p>
      <Button onClick={() => navigate('/shop')} size="lg">Browse Products</Button>
    </div>
  )

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-10">
      <h1 className="hero-display text-5xl text-ink mb-8 tracking-wide">SHOPPING CART</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const img = item.main_image
              ? resolveImg(item.main_image)
              : `https://placehold.co/100x100/F2F0EB/9C9894?text=P`
            return (
              <div key={item.id} className="flex gap-4 bg-surface rounded-2xl p-4 border border-border">
                <Link to={`/products/${item.slug}`}>
                  <img src={img} alt={item.name} className="w-24 h-24 object-cover rounded-xl bg-surface-alt shrink-0" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.slug}`}>
                    <h3 className="font-semibold text-ink hover:text-accent transition-colors line-clamp-2">{item.name}</h3>
                  </Link>
                  {(item.size || item.color) && (
                    <div className="flex gap-2 mt-1">
                      {item.color && (
                        <span className="text-xs text-ink-secondary bg-surface-alt px-2 py-0.5 rounded-lg">Color: {item.color}</span>
                      )}
                      {item.size && (
                        <span className="text-xs text-ink-secondary bg-surface-alt px-2 py-0.5 rounded-lg">Size: {item.size}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => item.quantity > 1
                          ? dispatch(updateCartItemThunk({ id: item.id, quantity: item.quantity - 1 }))
                          : dispatch(removeCartItemThunk(item.id))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt transition-colors"
                      >–</button>
                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateCartItemThunk({ id: item.id, quantity: item.quantity + 1 }))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt transition-colors"
                      >+</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-ink">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => dispatch(removeCartItemThunk(item.id))}
                        className="text-ink-tertiary hover:text-accent transition-colors"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => dispatch(clearCartThunk())}
            className="text-sm text-ink-tertiary hover:text-accent transition-colors font-medium"
          >
            Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-ink text-lg mb-5">Order Summary</h2>
            <div className="space-y-3 mb-5">
              <Row label="Subtotal" value={`$${total.toFixed(2)}`} />
              <Row label="Shipping" value="Calculated at checkout" small />
              <Row label="Taxes"    value="Calculated at checkout" small />
              <div className="border-t border-border pt-3">
                <Row label="Estimated Total" value={`$${total.toFixed(2)}`} bold />
              </div>
            </div>
            {user ? (
              <Button onClick={() => navigate('/checkout')} size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            ) : (
              <div className="space-y-2">
                <Button onClick={() => navigate('/login')} size="lg" className="w-full">
                  Login to Checkout
                </Button>
                <p className="text-xs text-center text-ink-tertiary">
                  or <Link to="/register" className="text-accent font-medium">create an account</Link>
                </p>
              </div>
            )}
            <Link to="/shop" className="block text-center text-sm text-ink-tertiary hover:text-ink transition-colors mt-4">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, small, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${small ? 'text-xs text-ink-tertiary' : 'text-sm text-ink-secondary'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-ink text-base' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
