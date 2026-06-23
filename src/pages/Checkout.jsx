import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { selectCartItems, selectCartTotal, clearCartThunk } from '../store/slices/cartSlice'
import { checkout, validateCoupon } from '../api/orderApi'
import { computeTotals } from '../lib/storeConfig'
import { resolveImg } from '../lib/img'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import { getBankTransferInfo, getWhishInfo } from '../api/paymentApi'
import { getAddresses, addAddress } from '../api/userApi'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const STEPS = ['Address', 'Payment', 'Review']

export default function Checkout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast    = useToast()
  const items    = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartTotal)
  const { format } = useCurrency()
  const [step, setStep]       = useState(0)
  const [bank, setBank]       = useState(null)
  const [whish, setWhish]     = useState(null)
  const [copied, setCopied]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon]   = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddrId, setSelectedAddrId] = useState(null) // null = "new address" mode
  const [form, setForm] = useState({
    label: 'Home', recipient_name: '', phone: '', street: '',
    city: '', state: '', zip: '', country: '',
    is_default: false,
    payment_method: 'cod',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })) }

  // Pull the admin-published bank + Whish details once + saved addresses.
  useEffect(() => {
    getBankTransferInfo().then(r => setBank(r.data.data)).catch(() => {})
    getWhishInfo().then(r => setWhish(r.data.data)).catch(() => {})
    getAddresses().then(r => {
      const list = r.data.data || []
      setSavedAddresses(list)
      // Auto-select the default address (or the first one) so the user can
      // jump straight to payment if they're a returning customer.
      const def = list.find(a => a.is_default) || list[0]
      if (def) setSelectedAddrId(def.id)
    }).catch(() => {})
  }, [])

  const chosenAddress = savedAddresses.find(a => a.id === selectedAddrId)

  const copyText = async (label, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  // Validate the new-address form. Saved-address selection always passes.
  const validate = () => {
    if (selectedAddrId) return true
    const e = {}
    if (!form.recipient_name.trim()) e.recipient_name = 'Required'
    if (!form.street.trim())         e.street         = 'Required'
    if (!form.city.trim())           e.city           = 'Required'
    if (!form.country.trim())        e.country        = 'Required'
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
      toast.success(`Coupon applied! You save ${format(saved)}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon')
    } finally { setCouponLoading(false) }
  }

  const placeOrder = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      // If the user typed a new address, save it first so it's available next
      // time and so the order can reference it by id.
      let addressId = selectedAddrId
      if (!addressId) {
        const res = await addAddress({
          label:          form.label || 'Home',
          recipient_name: form.recipient_name,
          phone:          form.phone,
          street:         form.street,
          city:           form.city,
          state:          form.state,
          country:        form.country,
          zip:            form.zip,
          is_default:     form.is_default || savedAddresses.length === 0 ? 1 : 0,
        })
        addressId = res.data.data?.id
      }

      const { data } = await checkout({
        address_id:     addressId,
        payment_method: form.payment_method,
        notes:          form.notes || undefined,
        coupon_code:    coupon || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      await dispatch(clearCartThunk())
      // Backend returns the full order row; its primary key is `id`. The old
      // `order_id` read here was undefined, sending users to /orders/undefined.
      const orderId = data.data.id
      toast.success('Order placed successfully!')

      // Whish payment: try to launch the Whish app — only on mobile, since
      // desktop browsers can't open whish:// and would just log a console
      // error and bother the user with an "external app?" prompt.
      const isMobile = typeof navigator !== 'undefined'
        && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

      if (form.payment_method === 'whish' && whish?.enabled && isMobile) {
        const deeplink = (whish.whish_deeplink || 'whish://').trim()
        if (deeplink) {
          const a = document.createElement('a')
          a.href = deeplink
          a.rel  = 'noopener noreferrer'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
        // Give the OS ~800ms to switch to Whish before we navigate this tab.
        setTimeout(() => navigate(`/account/orders/${orderId}`, { state: { justPlaced: true } }), 800)
        return
      }

      navigate(`/account/orders/${orderId}`, { state: { justPlaced: true } })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed')
    } finally { setLoading(false) }
  }

  const { shipping, tax, total, freeShippingRemaining } = computeTotals(subtotal, discount)

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-10 animate-page-in">
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
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-ink text-lg">Shipping Address</h2>
                {savedAddresses.length > 0 && (
                  <Link to="/account/profile" className="text-xs font-semibold text-ink-tertiary hover:text-ink underline underline-offset-2">
                    Manage addresses
                  </Link>
                )}
              </div>

              {/* Saved address picker */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map(a => {
                    const active = a.id === selectedAddrId
                    return (
                      <label
                        key={a.id}
                        className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-all
                          ${active ? 'border-ink bg-surface-alt' : 'border-border hover:border-ink/40'}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={active}
                          onChange={() => setSelectedAddrId(a.id)}
                          className="mt-1 accent-ink"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-ink text-sm">{a.recipient_name || '—'}</span>
                            {a.label && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-alt text-ink-secondary">
                                {a.label}
                              </span>
                            )}
                            {a.is_default ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ink text-white">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-ink-secondary leading-relaxed">
                            {a.phone && <>{a.phone} · </>}
                            {a.street}, {a.city}{a.state ? `, ${a.state}` : ''} {a.zip}, {a.country}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                  <label
                    className={`flex items-center gap-3 border border-dashed rounded-xl p-4 cursor-pointer transition-all
                      ${selectedAddrId === null ? 'border-ink bg-surface-alt' : 'border-border hover:border-ink/40'}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddrId === null}
                      onChange={() => setSelectedAddrId(null)}
                      className="accent-ink"
                    />
                    <span className="text-sm font-semibold text-ink">+ Use a new address</span>
                  </label>
                </div>
              )}

              {/* New-address form */}
              {selectedAddrId === null && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Label" value={form.label} onChange={e => set('label', e.target.value)} placeholder="Home, Work…" />
                    <Input label="Recipient Name" value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} error={errors.recipient_name} required />
                  </div>
                  <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  <Input label="Street Address" value={form.street} onChange={e => set('street', e.target.value)} error={errors.street} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} error={errors.city} required />
                    <Input label="State/Province" value={form.state} onChange={e => set('state', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="ZIP / Postal Code" value={form.zip} onChange={e => set('zip', e.target.value)} />
                    <Input label="Country" value={form.country} onChange={e => set('country', e.target.value)} error={errors.country} required />
                  </div>
                  {savedAddresses.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.is_default}
                        onChange={e => set('is_default', e.target.checked)}
                        className="accent-ink"
                      />
                      <span className="text-sm text-ink-secondary">Make this my default address</span>
                    </label>
                  )}
                </div>
              )}

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
                  { value: 'cod',           label: 'Cash on Delivery',  icon: '💵', desc: 'Pay when your order arrives.' },
                  ...(whish?.enabled && whish.whish_phone ? [{
                    value: 'whish',         label: 'Whish Money',       icon: '📱',
                    desc: `Send via Whish to ${whish.whish_phone}. Free and instant.`,
                  }] : []),
                  ...(bank?.enabled ? [{
                    value: 'bank_transfer', label: 'Bank Transfer',     icon: '🏦',
                    desc: `Pay by transfer to our ${bank.bank_name || 'bank'} account, then we'll confirm and ship.`,
                  }] : []),
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

              {form.payment_method === 'whish' && whish?.enabled && whish.whish_phone && (
                <div className="rounded-xl p-4 space-y-3 border" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7C3AED' }}>Send via Whish</p>
                  <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3" style={{ border: '1px solid #E9D5FF' }}>
                    <div className="min-w-0">
                      <p className="text-[11px] text-ink-tertiary">Whish phone number</p>
                      <p className="text-base font-mono font-bold text-ink">{whish.whish_phone}</p>
                      {whish.whish_name && <p className="text-[11px] text-ink-tertiary mt-0.5">{whish.whish_name}</p>}
                    </div>
                    <button type="button" onClick={() => copyText('whish', whish.whish_phone)}
                      className="text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg shrink-0 text-white"
                      style={{ background: '#7C3AED' }}>
                      {copied === 'whish' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  {whish.currency_note && (
                    <p className="text-xs text-ink-secondary">Currency: <span className="font-bold text-ink">{whish.currency_note}</span></p>
                  )}
                  {whish.instructions && (
                    <div className="text-xs text-ink-secondary border-t pt-3 leading-relaxed" style={{ borderColor: '#E9D5FF' }}>{whish.instructions}</div>
                  )}
                  <div className="text-xs text-ink-tertiary border-t pt-3" style={{ borderColor: '#E9D5FF' }}>
                    <span className="font-bold text-ink">After placing the order</span>, send the total to the Whish number above and include
                    the order reference (we'll show you next) in the note. Your order ships once payment is confirmed.
                  </div>
                </div>
              )}

              {form.payment_method === 'bank_transfer' && bank?.enabled && (
                <div className="bg-surface-alt rounded-xl p-4 space-y-3 border border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary">Transfer to</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Bank',           value: bank.bank_name },
                      { label: 'Account name',   value: bank.account_name },
                      { label: 'Account number', value: bank.account_number },
                      { label: 'IBAN',           value: bank.iban },
                      { label: 'SWIFT',          value: bank.swift },
                    ].filter(r => r.value).map(r => (
                      <div key={r.label} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] text-ink-tertiary">{r.label}</p>
                          <p className="text-sm font-mono font-semibold text-ink truncate">{r.value}</p>
                        </div>
                        <button type="button" onClick={() => copyText(r.label, r.value)}
                          className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shrink-0"
                          style={{ background: '#0F0F0F', color: '#fff' }}>
                          {copied === r.label ? 'Copied ✓' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                  {bank.currency_note && (
                    <p className="text-xs text-ink-secondary">Currency: <span className="font-bold text-ink">{bank.currency_note}</span></p>
                  )}
                  {bank.instructions && (
                    <div className="text-xs text-ink-secondary border-t border-border pt-3 leading-relaxed">{bank.instructions}</div>
                  )}
                  <div className="text-xs text-ink-tertiary border-t border-border pt-3">
                    <span className="font-bold text-ink">After placing the order</span>, transfer to the account above and include the order
                    number we'll show you in the description. We'll confirm once the money lands and your order will be shipped.
                  </div>
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
                {chosenAddress ? (
                  <p className="text-sm text-ink-secondary">
                    <span className="font-semibold text-ink">{chosenAddress.recipient_name}</span>
                    {chosenAddress.phone ? <> · {chosenAddress.phone}</> : null}<br />
                    {chosenAddress.street}<br />
                    {chosenAddress.city}{chosenAddress.state ? `, ${chosenAddress.state}` : ''} {chosenAddress.zip}, {chosenAddress.country}
                  </p>
                ) : (
                  <p className="text-sm text-ink-secondary">
                    <span className="font-semibold text-ink">{form.recipient_name}</span>{form.phone ? <> · {form.phone}</> : null}<br />
                    {form.street}<br />
                    {form.city}{form.state ? `, ${form.state}` : ''} {form.zip}, {form.country}
                  </p>
                )}
              </div>
              <div className="bg-surface-alt rounded-xl p-4">
                <p className="text-sm font-semibold text-ink mb-1">💳 Payment: <span className="font-normal capitalize">{form.payment_method === 'cod' ? 'Cash on Delivery' : 'Stripe'}</span></p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={placeOrder} loading={loading} size="lg" variant="accent">
                  Place Order · {format(total)}
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
                const img = i.main_image ? resolveImg(i.main_image) : `https://placehold.co/60x60/F2F0EB/9C9894?text=P`
                return (
                  <div key={i.id} className="flex gap-3">
                    <img src={img} alt={i.name} className="w-12 h-12 object-cover rounded-lg bg-surface-alt" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink line-clamp-2">{i.name}</p>
                      <p className="text-xs text-ink-tertiary">×{i.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink shrink-0">{format(parseFloat(i.price) * i.quantity)}</span>
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
                Add <span className="font-bold text-ink">{format(freeShippingRemaining)}</span> more to unlock <span className="font-semibold text-ink">free shipping</span>.
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <Row label="Subtotal"     value={format(subtotal)} />
              {discount > 0 && <Row label="Discount" value={`-${format(discount)}`} accent />}
              <Row label="Shipping"     value={shipping === 0 ? 'Free' : format(shipping)} />
              {tax > 0 && <Row label="Tax" value={format(tax)} />}
              <Row label="Total"        value={format(total)} bold />
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
