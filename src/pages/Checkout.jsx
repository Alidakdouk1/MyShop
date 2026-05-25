import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCartItems, selectCartTotal, clearCartThunk } from '../store/slices/cartSlice'
import { checkout, validateCoupon } from '../api/orderApi'
import { computeTotals } from '../lib/storeConfig'
import { useToast } from '../hooks/useToast'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const STEPS = ['Address', 'Payment', 'Review']

export default function Checkout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast    = useToast()
  const items    = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartTotal)
  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon]   = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', zip: '', country: 'US',
    payment_method: 'cod',
  })
  const [errors, setErrors] = useState({})

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.phone.trim())     e.phone     = 'Required'
    if (!form.address_line1.trim()) e.address_line1 = 'Required'
    if (!form.city.trim())      e.city      = 'Required'
    if (!form.zip.trim())       e.zip       = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setCouponLoading(true)
    try {
      const { data } = await validateCoupon(coupon)
      const d = data.data
      const saved = d.type === 'percent'
        ? subtotal * d.value / 100
        : Math.min(d.value, subtotal)
      setDiscount(saved)
      toast.success(`Coupon applied! You save $${saved.toFixed(2)}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon')
    } finally { setCouponLoading(false) }
  }

  const placeOrder = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await checkout({
        ...form,
        coupon_code: coupon || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      await dispatch(clearCartThunk())
      toast.success('Order placed successfully!')
      navigate(`/account/orders/${data.data.order_id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed')
    } finally { setLoading(false) }
  }

  const { shipping, tax, total, freeShippingRemaining } = computeTotals(subtotal, discount)

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-10">
      <h1 className="hero-display text-5xl text-ink mb-8 tracking-wide">CHECKOUT</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${i <= step ? 'bg-ink text-white' : 'bg-border text-ink-tertiary'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? 'text-ink' : 'text-ink-tertiary'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-ink' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step 0: Address */}
          {step === 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 animate-fade-in">
              <h2 className="font-bold text-ink text-lg">Shipping Address</h2>
              <Input label="Full Name" value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} required />
              <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} required />
              <Input label="Address" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} error={errors.address_line1} required />
              <Input label="Apt/Suite (optional)" value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} error={errors.city} required />
                <Input label="State/Province" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="ZIP / Postal Code" value={form.zip} onChange={e => set('zip', e.target.value)} error={errors.zip} required />
                <Input label="Country" value={form.country} onChange={e => set('country', e.target.value)} />
              </div>
              <div className="pt-2">
                <Button onClick={() => validate() && setStep(1)} size="lg">Continue to Payment →</Button>
              </div>
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 animate-fade-in">
              <h2 className="font-bold text-ink text-lg">Payment Method</h2>
              <div className="space-y-3">
                {[
                  { value: 'cod',    label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
                  { value: 'stripe', label: 'Card / Stripe',    icon: '💳', desc: 'Visa, Mastercard, Amex' },
                ].map(m => (
                  <label key={m.value}
                    className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all
                      ${form.payment_method === m.value ? 'border-ink bg-surface-alt' : 'border-border hover:border-ink/40'}`}>
                    <input type="radio" name="payment" value={m.value}
                      checked={form.payment_method === m.value}
                      onChange={() => set('payment_method', m.value)}
                      className="accent-ink" />
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-semibold text-ink">{m.label}</p>
                      <p className="text-xs text-ink-tertiary">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {form.payment_method === 'stripe' && (
                <div className="bg-info-light border border-info/20 rounded-xl p-4 text-sm text-info">
                  🔒 Stripe integration coming soon — use Cash on Delivery for now.
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(0)}>← Back</Button>
                <Button onClick={() => setStep(2)} size="lg">Review Order →</Button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 animate-fade-in">
              <h2 className="font-bold text-ink text-lg">Review Your Order</h2>
              <div className="bg-surface-alt rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-ink">📍 Shipping to:</p>
                <p className="text-sm text-ink-secondary">
                  {form.full_name} · {form.phone}<br />
                  {form.address_line1}{form.address_line2 ? `, ${form.address_line2}` : ''}<br />
                  {form.city}{form.state ? `, ${form.state}` : ''} {form.zip}, {form.country}
                </p>
              </div>
              <div className="bg-surface-alt rounded-xl p-4">
                <p className="text-sm font-semibold text-ink mb-1">💳 Payment: <span className="font-normal capitalize">{form.payment_method === 'cod' ? 'Cash on Delivery' : 'Stripe'}</span></p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={placeOrder} loading={loading} size="lg" variant="accent">
                  Place Order · ${total.toFixed(2)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-2xl p-6 sticky top-24 space-y-4">
            <h2 className="font-bold text-ink">Order Summary</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {items.map(i => {
                const img = i.main_image ? `/MyShop/backend/${i.main_image}` : `https://placehold.co/60x60/F2F0EB/9C9894?text=P`
                return (
                  <div key={i.id} className="flex gap-3">
                    <img src={img} alt={i.name} className="w-12 h-12 object-cover rounded-lg bg-surface-alt" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink line-clamp-2">{i.name}</p>
                      <p className="text-xs text-ink-tertiary">×{i.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink shrink-0">${(parseFloat(i.price) * i.quantity).toFixed(2)}</span>
                  </div>
                )
              })}
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={e => setCoupon(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <Button variant="secondary" size="sm" onClick={applyCoupon} loading={couponLoading}>Apply</Button>
            </div>

            {/* Free-shipping progress nudge */}
            {freeShippingRemaining > 0 && (
              <div className="text-xs text-ink-secondary bg-surface-alt rounded-xl px-3 py-2.5">
                Add <span className="font-bold text-ink">${freeShippingRemaining.toFixed(2)}</span> more to unlock <span className="font-semibold text-ink">free shipping</span>.
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <Row label="Subtotal"     value={`$${subtotal.toFixed(2)}`} />
              {discount > 0 && <Row label="Discount" value={`-$${discount.toFixed(2)}`} accent />}
              <Row label="Shipping"     value={shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`} />
              {tax > 0 && <Row label="Tax" value={`$${tax.toFixed(2)}`} />}
              <Row label="Total"        value={`$${total.toFixed(2)}`} bold />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-ink text-base' : accent ? 'text-success font-semibold' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
