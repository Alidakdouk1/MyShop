import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getCartUpsell } from '../../api/cartApi'
import { addToCartThunk, selectCartItems } from '../../store/slices/cartSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import { useCurrency } from '../../context/CurrencyContext'
import { STORE_CONFIG } from '../../lib/storeConfig'

const imgUrl = (p) => {
  const raw = p?.primary_image
  if (!raw) return `https://placehold.co/80x80/F2F0EB/9C9894?text=•`
  return raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`
}
const priceOf = (p) => Number(p?.sale_price || p?.base_price || 0)

/**
 * Combined progress bar + gap-filler chips. When the cart is below the free
 * shipping threshold, shows 1–2 cheap products that fit the remaining gap with
 * one-tap add. When unlocked, switches to a green confirmation strip.
 */
export default function FreeShippingNudge({ total }) {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const cart     = useSelector(selectCartItems)
  const toast    = useToast()
  const { format } = useCurrency()
  const [items,  setItems]  = useState([])
  const [busy,   setBusy]   = useState(null)

  const threshold = Number(STORE_CONFIG.freeShippingThreshold || 0)
  const remaining = Math.max(0, threshold - (total || 0))
  const unlocked  = threshold > 0 && remaining === 0
  const pct       = threshold > 0 ? Math.min(100, ((total || 0) / threshold) * 100) : 0

  const cartKey = (cart || []).map(i => i.product_id).join(',')
  useEffect(() => {
    if (threshold <= 0 || unlocked) { setItems([]); return }
    getCartUpsell()
      .then(r => setItems(r.data.data?.items || []))
      .catch(() => setItems([]))
  }, [cartKey, unlocked, threshold])

  if (threshold <= 0) return null

  const addOne = async (p) => {
    if (!user) { toast.info('Please login to add to cart'); return }
    setBusy(p.id)
    const r = await dispatch(addToCartThunk({ product_id: p.id, quantity: 1 }))
    setBusy(null)
    if (!r.error) toast.success(`${p.name} added`)
    else toast.error(r.payload || 'Could not add')
  }

  // Round tiny remainders (cents) up so we don't show "$0.01 more" silliness —
  // round to the next whole dollar for the message, while keeping the math honest.
  const remDisplay = remaining >= 1 ? remaining : Math.ceil(remaining * 100) / 100
  const almostThere = !unlocked && remaining < 1

  return (
    <div className="rounded-xl p-3" style={{ background: unlocked ? '#F0FDF4' : '#FAF8F2' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: unlocked ? '#16A34A' : '#5C5854' }}>
        {unlocked
          ? '🎉 You unlocked free shipping!'
          : almostThere
            ? <>Almost there — add a small item to unlock <span className="font-bold text-ink">free shipping</span></>
            : <>Add <span className="font-bold text-ink">{format(remDisplay)}</span> more for free shipping</>}
      </p>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E4DC' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{
          width: `${pct}%`,
          background: unlocked ? '#16A34A' : 'linear-gradient(90deg, #C0392B, #0F0F0F)',
        }} />
      </div>

      {!unlocked && items.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9C9894' }}>
            Try adding
          </p>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {items.slice(0, 2).map(p => (
              <button
                key={p.id}
                onClick={() => addOne(p)}
                disabled={busy === p.id}
                className="shrink-0 flex items-center gap-2 bg-white rounded-xl p-1.5 pr-3 text-left disabled:opacity-60 transition-all hover:shadow-md"
                style={{ border: '1px solid rgba(0,0,0,0.06)', maxWidth: 220 }}
              >
                <img src={imgUrl(p)} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-alt shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-[11px] font-bold text-ink mt-0.5">
                    {format(priceOf(p))}
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                      {busy === p.id ? '…' : '+ Add'}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
