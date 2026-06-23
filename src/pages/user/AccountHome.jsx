import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { useAuth } from '../../hooks/useAuth'
import { getOrders } from '../../api/orderApi'
import { getAddresses } from '../../api/userApi'
import { useCurrency } from '../../context/CurrencyContext'
import { selectWishlistItems } from '../../store/slices/wishlistSlice'

/**
 * Alibaba-style account home — replaces the old "My Account" link-list.
 *
 * Layout (mobile-first):
 *   1. Profile header  — avatar + name + default delivery location
 *   2. Quick actions   — 3-card row (Wishlist / Orders / Coupon)
 *   3. My orders preview — newest 2 orders + "View all"
 *   4. Account grid    — 8 icon links to every account-related page
 *   5. Sign out / Switch language hints
 */

const fmtDate = (d) => d
  ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  : ''

const orderStatusColor = (s) => ({
  pending:   { bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { bg: '#DBEAFE', fg: '#1D4ED8' },
  shipped:   { bg: '#FEF9EC', fg: '#92700A' },
  delivered: { bg: '#DCFCE7', fg: '#15803D' },
  cancelled: { bg: '#F3F4F6', fg: '#6B7280' },
  refunded:  { bg: '#F3F4F6', fg: '#6B7280' },
}[s] || { bg: '#F3F4F6', fg: '#6B7280' })

function QuickAction({ to, label, icon, count }) {
  return (
    <Link
      to={to}
      className="flex-1 bg-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-soft transition-shadow"
      style={{ border: '1px solid #E4E1D9' }}
    >
      <div className="relative">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-ink"
             style={{ background: '#F2F0EB' }}>
          {icon}
        </div>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#00D1C1' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-ink">{label}</span>
    </Link>
  )
}

function GridLink({ to, label, icon, accent }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 py-3 hover:bg-surface-alt rounded-xl transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: accent || '#0F0F0F' }}>
        {icon}
      </div>
      <span className="text-[11px] text-ink-secondary text-center leading-tight px-1">{label}</span>
    </Link>
  )
}

// Tiny icon factory — stroke-1.6 outline icons, all on a 24×24 viewBox.
const ico = (path) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const ICONS = {
  heart:    ico(<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />),
  bag:      ico(<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></>),
  ticket:   ico(<path d="M2 9V7a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 000-4z" />),
  pin:      ico(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>),
  user:     ico(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  star:     ico(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />),
  compare:  ico(<path d="M3 6h13M3 12h9M3 18h6M17 6l4 3-4 3M21 18l-4-3 4-3" />),
  shield:   ico(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  globe:    ico(<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></>),
  help:     ico(<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  signout:  ico(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  share:    ico(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>),
}

export default function AccountHome() {
  const user = useSelector(selectUser)
  const { logout } = useAuth()
  const { format } = useCurrency()
  const wishlistItems = useSelector(selectWishlistItems)
  const [orders, setOrders] = useState([])
  const [defaultAddress, setDefaultAddress] = useState(null)
  const [stats, setStats] = useState({ totalOrders: 0 })

  useEffect(() => {
    getOrders({ page: 1, per_page: 3 })
      .then(r => {
        setOrders(r.data.data || [])
        setStats({ totalOrders: r.data.meta?.total ?? (r.data.data?.length || 0) })
      })
      .catch(() => setOrders([]))
    getAddresses()
      .then(r => {
        const list = r.data.data || []
        setDefaultAddress(list.find(a => a.is_default) || list[0] || null)
      })
      .catch(() => setDefaultAddress(null))
  }, [])

  const firstName = (user?.name || '').split(' ')[0] || 'there'
  const initials  = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen" style={{ background: '#F0EEE9' }}>
      {/* ── Profile header ───────────────────────────────── */}
      <div className="px-4 pt-6 pb-5" style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E1D9' }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #00D1C1 0%, #A3FF12 100%)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ink truncate">{user?.name || 'Welcome'}</p>
            {defaultAddress ? (
              <Link to="/account/profile" className="text-xs text-ink-tertiary inline-flex items-center gap-1 hover:text-ink transition-colors mt-0.5">
                <span style={{ color: '#00D1C1' }}>{ICONS.pin}</span>
                <span className="truncate">Deliver to <span className="font-semibold text-ink underline">{defaultAddress.city || defaultAddress.country || 'set address'}</span></span>
              </Link>
            ) : (
              <Link to="/account/profile" className="text-xs text-ink-tertiary hover:text-ink transition-colors mt-0.5">
                + Add a delivery address
              </Link>
            )}
          </div>
          <Link to="/account/profile" aria-label="Settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-tertiary hover:bg-surface-alt transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01A1.65 1.65 0 009 4.6V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── 3-card quick actions ─────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="flex gap-2.5">
          <QuickAction to="/account/wishlist"    label="Wishlist"  icon={<span style={{ color: '#C0392B' }}>{ICONS.heart}</span>}  count={wishlistItems.length} />
          <QuickAction to="/account/orders"      label="Orders"    icon={<span style={{ color: '#0F172A' }}>{ICONS.bag}</span>}    count={stats.totalOrders} />
          <QuickAction to="/shop?on_sale=1"      label="Deals"     icon={<span style={{ color: '#A3FF12' }}>{ICONS.ticket}</span>} />
        </div>
      </div>

      {/* ── My orders preview ────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E4E1D9' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink">My orders</h2>
            <Link to="/account/orders" className="text-xs font-semibold text-ink-tertiary hover:text-ink transition-colors inline-flex items-center gap-1">
              View all
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" data-rtl-flip>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-ink-tertiary mb-3">No orders yet</p>
              <Link to="/shop" className="inline-block text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: '#0F172A' }}>
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 2).map(o => {
                const s = orderStatusColor(o.status)
                return (
                  <Link key={o.id} to={`/account/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-alt transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Order #{o.id}</p>
                      <p className="text-[11px] text-ink-tertiary">{fmtDate(o.created_at)} · {o.item_count || 1} item{(o.item_count || 1) === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: s.bg, color: s.fg }}>{o.status}</span>
                      <span className="text-sm font-bold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{format(o.total)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Account features grid (Alibaba-style 4×2 icon links) ── */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl p-3" style={{ border: '1px solid #E4E1D9' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary px-2 py-2">My account</p>
          <div className="grid grid-cols-4 gap-1">
            <GridLink to="/account/profile"  label="Profile"     icon={ICONS.user} />
            <GridLink to="/account/profile"  label="Addresses"   icon={ICONS.pin} />
            <GridLink to="/account/wishlist" label="Wishlist"    icon={ICONS.heart}  accent="#C0392B" />
            <GridLink to="/compare"          label="Compare"     icon={ICONS.compare} />
            <GridLink to="/account/orders"   label="Track Order" icon={ICONS.shield} accent="#00D1C1" />
            <GridLink to="/account/orders"   label="Returns"     icon={ICONS.bag} />
            <GridLink to="/account/orders"   label="My Reviews"  icon={ICONS.star}   accent="#B8922E" />
            <GridLink to="/marketplace"      label="Marketplace" icon={ICONS.compare} />
            <GridLink to="/account/ads"      label="My Ads"      icon={ICONS.bag}    accent="#00D1C1" />
          </div>
        </div>
      </div>

      {/* ── Promo card (Share & Earn style) ─────────────── */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#fff' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,209,193,0.18)', color: '#00D1C1' }}>
            {ICONS.share}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Share your wishlist</p>
            <p className="text-[11px] opacity-70">Let friends and family see + buy what you love.</p>
          </div>
          <Link to="/account/wishlist" className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg whitespace-nowrap"
            style={{ background: '#A3FF12', color: '#0F172A' }}>
            Open
          </Link>
        </div>
      </div>

      {/* ── Support + sign-out ──────────────────────────── */}
      <div className="px-4 pt-3 pb-8">
        <div className="bg-white rounded-2xl p-1" style={{ border: '1px solid #E4E1D9' }}>
          <Link to="/account/profile" className="flex items-center gap-3 px-3 py-3 hover:bg-surface-alt rounded-xl transition-colors">
            <span className="text-ink-tertiary">{ICONS.help}</span>
            <span className="flex-1 text-sm font-medium text-ink">Help &amp; support</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-ink-tertiary" data-rtl-flip>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent-light rounded-xl transition-colors">
            <span className="text-accent">{ICONS.signout}</span>
            <span className="flex-1 text-sm font-medium text-accent text-start">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
