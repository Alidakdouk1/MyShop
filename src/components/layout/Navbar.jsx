import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { selectCartCount } from '../../store/slices/cartSlice'
import { selectWishlistItems } from '../../store/slices/wishlistSlice'
import { toggleCart, toggleMobileMenu, setMobileMenu, selectMobileMenuOpen } from '../../store/slices/uiSlice'
import { removeCartItemThunk, updateCartItemThunk } from '../../store/slices/cartSlice'
import { useAuth } from '../../hooks/useAuth'
import { getHomepageSettings } from '../../api/adminApi'
import { getProducts } from '../../api/productApi'
import { resolveImg } from '../../lib/img'

const DEFAULT_ANNOUNCE = [
  { icon: '🚚', text: 'Free Shipping',  show_icon: true },
  { icon: '↩️',  text: 'Free Returns',   show_icon: true },
  { icon: '💳', text: 'No Hidden Fees', show_icon: true },
]
const DEFAULT_BAR_STYLE = {
  bg_color:   '#0F0F0F',
  text_color: '#ffffff',
  font_size:  'xs',
  padding_y:  10,
  separator:  '|',
}
let _announceCache = null  // { items, style }

// Premium line-icons for the announcement bar. Resolved from the item TEXT so
// they look right for the defaults and for any admin-configured items, falling
// back to the stored emoji (or a check) when no keyword matches.
function AnnounceSvg({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ width: '1.15em', height: '1.15em' }} className="shrink-0">
      {children}
    </svg>
  )
}

const ANNOUNCE_ICONS = {
  shipping: <AnnounceSvg><rect x="1.75" y="6.75" width="11.5" height="8.5" rx="1" /><path d="M13.25 9.25h3.6a1 1 0 0 1 .78.38l2.05 2.55a1 1 0 0 1 .22.62v2.45h-6.65" /><circle cx="6" cy="17.4" r="1.6" /><circle cx="16.75" cy="17.4" r="1.6" /></AnnounceSvg>,
  returns:  <AnnounceSvg><path d="M9 15 3 9l6-6" /><path d="M3 9h12a6 6 0 0 1 0 12h-3" /></AnnounceSvg>,
  fees:     <AnnounceSvg><path d="M3.6 3.6h6.2a1.5 1.5 0 0 1 1.06.44l8.4 8.4a1.5 1.5 0 0 1 0 2.12l-4.7 4.7a1.5 1.5 0 0 1-2.12 0l-8.4-8.4A1.5 1.5 0 0 1 3.6 9.8z" /><circle cx="7.4" cy="7.4" r="1.05" /></AnnounceSvg>,
  secure:   <AnnounceSvg><path d="M12 3.2 19 6v5c0 4.2-2.9 7.6-7 8.8C7.9 18.6 5 15.2 5 11V6z" /><path d="M9 11.6l2 2 4-4" /></AnnounceSvg>,
  support:  <AnnounceSvg><path d="M4 5.5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" /></AnnounceSvg>,
  check:    <AnnounceSvg><circle cx="12" cy="12" r="9" /><path d="M8.5 12.4l2.5 2.5 4.6-5" /></AnnounceSvg>,
}

function announceIconType(text = '') {
  const t = text.toLowerCase()
  if (/ship|deliver/.test(t))                                return 'shipping'
  if (/return|refund|exchang/.test(t))                       return 'returns'
  if (/fee|hidden|price|tax|cost/.test(t))                   return 'fees'
  if (/secur|safe|encrypt|protect|guarant|warrant/.test(t))  return 'secure'
  if (/support|help|service|customer|24\/7/.test(t))         return 'support'
  return null
}

function AnnounceIcon({ item }) {
  const type = announceIconType(item.text)
  if (type) return ANNOUNCE_ICONS[type]
  if (item.icon) return <span className="shrink-0">{item.icon}</span>
  return ANNOUNCE_ICONS.check
}

function AnnouncementBar() {
  const [items,    setItems]    = useState(_announceCache?.items    || DEFAULT_ANNOUNCE)
  const [barStyle, setBarStyle] = useState(_announceCache?.style    || DEFAULT_BAR_STYLE)

  useEffect(() => {
    if (_announceCache) return
    getHomepageSettings()
      .then(res => {
        const d     = res.data?.data || {}
        const bar   = d.announcement_bar
        const style = d.announcement_bar_style
        const resolvedItems = (Array.isArray(bar) && bar.length > 0) ? bar : DEFAULT_ANNOUNCE
        const resolvedStyle = style ? { ...DEFAULT_BAR_STYLE, ...style } : DEFAULT_BAR_STYLE
        _announceCache = { items: resolvedItems, style: resolvedStyle }
        setItems(resolvedItems)
        setBarStyle(resolvedStyle)
      })
      .catch(() => {})
  }, [])

  const fsMap = { xs: '0.75rem', sm: '0.875rem', base: '1rem' }
  const fontSize  = fsMap[barStyle.font_size || 'xs'] || '0.75rem'
  const textColor = barStyle.text_color || '#ffffff'
  const separator = barStyle.separator || '•'

  if (!items.length) return null

  // Repeat the items so the strip always fills the bar and reads as a dense
  // ticker; the duration scales with cell count to keep a constant, calm speed.
  const repeat      = Math.max(2, Math.ceil(10 / items.length))
  const durationSec = Math.max(24, items.length * repeat * 3.4)

  const group = (clone) => (
    <div
      className="marquee__group"
      aria-hidden={clone || undefined}
      style={{ animationDuration: `${durationSec}s` }}
    >
      {Array.from({ length: repeat }).map((_, r) =>
        items.map((item, i) => (
          <span key={`${r}-${i}`} className="inline-flex items-center whitespace-nowrap">
            <span className="mx-7 leading-none select-none" style={{ color: `${textColor}55` }}>
              {separator}
            </span>
            <span className="inline-flex items-center gap-2 font-medium tracking-wide">
              {item.show_icon !== false && <AnnounceIcon item={item} />}
              <span>{item.text}</span>
            </span>
          </span>
        ))
      )}
    </div>
  )

  return (
    <div
      className="hidden md:block overflow-hidden"
      style={{
        background:    barStyle.bg_color || '#0F0F0F',
        color:         textColor,
        paddingTop:    `${barStyle.padding_y ?? 10}px`,
        paddingBottom: `${barStyle.padding_y ?? 10}px`,
        fontSize,
      }}
    >
      <div className="marquee">
        {group(false)}
        {group(true)}
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { label: 'Shop',        to: '/shop' },
  { label: 'New Arrivals',to: '/shop?sort=newest' },
  { label: 'Sale',        to: '/shop?on_sale=1' },
]

export default function Navbar({ headerRef, hidden = false }) {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const location    = useLocation()
  const { logout }  = useAuth()
  const user        = useSelector(selectUser)
  const cartCount   = useSelector(selectCartCount)
  const wishCount   = useSelector(selectWishlistItems).length
  const mobileOpen  = useSelector(selectMobileMenuOpen)
  const [search, setSearch]         = useState('')
  const [userMenuOpen, setUserMenu] = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [results, setResults]       = useState([])
  const [showResults, setShowResults] = useState(false)
  const userMenuRef = useRef(null)
  const searchRef   = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e) => { if (!userMenuRef.current?.contains(e.target)) setUserMenu(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => { dispatch(setMobileMenu(false)) }, [location.pathname])

  // Search autocomplete — debounced product suggestions (state set only inside
  // the async callback; the render is gated on query length so nothing stale shows)
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    const t = setTimeout(() => {
      getProducts({ search: q, limit: 6 })
        .then(r => { setResults(r.data.data || []); setShowResults(true) })
        .catch(() => { /* keep previous suggestions on error */ })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const onClick = (e) => { if (!searchRef.current?.contains(e.target)) setShowResults(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) { navigate(`/shop?search=${encodeURIComponent(search.trim())}`); setSearch(''); setShowResults(false) }
  }

  const openResult = (slug) => { navigate(`/products/${slug}`); setSearch(''); setShowResults(false); setResults([]) }

  return (
    <>
      <header
        ref={headerRef}
        style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
        className={`sticky top-0 z-50 transition-[transform,box-shadow,background-color] duration-300 will-change-transform ${
          scrolled ? 'glass shadow-premium' : 'bg-surface'
        } ${
          location.pathname === '/shop' ? '' : (scrolled ? '' : 'border-b border-border')
        }`}
      >
        <AnnouncementBar />

        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            {/* Mobile menu toggle */}
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="md:hidden p-2 rounded-lg hover:bg-surface-alt text-ink"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 mr-2 transition-transform duration-200 hover:scale-[1.04] active:scale-95">
              <span className="hero-display text-2xl tracking-wider text-ink">MY<span className="text-accent">SHOP</span></span>
            </Link>

            {/* Nav links — desktop */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {NAV_LINKS.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3.5 py-2 text-sm font-semibold text-ink-secondary hover:text-ink rounded-lg hover:bg-surface-alt transition-all duration-150"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Search */}
            <form ref={searchRef} onSubmit={handleSearch} className="flex-1 max-w-md mx-auto hidden sm:block relative">
              <div className="relative w-full">
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => { if (results.length) setShowResults(true) }}
                  placeholder="Search products…"
                  className="w-full bg-surface-alt border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm
                    text-ink placeholder-ink-tertiary outline-none
                    focus:bg-white focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Autocomplete suggestions */}
              {showResults && search.trim().length >= 2 && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-down">
                  {results.map(p => {
                    const raw   = p.primary_image || p.main_image
                    const img   = raw ? (raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`) : 'https://placehold.co/80x80/F2F0EB/9C9894?text=P'
                    const price = p.sale_price || p.base_price || p.price || 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openResult(p.slug)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt transition-colors text-left"
                      >
                        <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-alt shrink-0" />
                        <span className="flex-1 min-w-0 text-sm font-medium text-ink line-clamp-1">{p.name}</span>
                        <span className="text-sm font-bold text-ink shrink-0">${Number(price).toFixed(2)}</span>
                      </button>
                    )
                  })}
                  <button
                    type="submit"
                    className="w-full text-center text-xs font-bold text-accent py-2.5 border-t border-border hover:bg-surface-alt transition-colors"
                  >
                    See all results for “{search.trim()}”
                  </button>
                </div>
              )}
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Wishlist */}
              {user && (
                <Link to="/account/wishlist" className="relative p-2.5 rounded-xl hover:bg-surface-alt transition-all duration-200 hover:-translate-y-0.5 active:scale-90">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishCount > 0 && <CountBadge count={wishCount} />}
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={() => dispatch(toggleCart())}
                className="relative p-2.5 rounded-xl hover:bg-surface-alt transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
                aria-label="Open cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && <CountBadge count={cartCount} />}
              </button>

              {/* User */}
              {user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenu(v => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-alt transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center uppercase">
                      {user.name?.[0] || user.email?.[0]}
                    </div>
                    <span className="text-sm font-semibold text-ink hidden md:block">
                      {user.name?.split(' ')[0]}
                    </span>
                    <svg className="w-4 h-4 text-ink-tertiary hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-slide-down z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-ink">{user.name}</p>
                        <p className="text-xs text-ink-tertiary">{user.email}</p>
                        {user.role === 'admin' && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="py-1">
                        {user.role === 'admin' && (
                          <MenuLink to="/admin" onClick={() => setUserMenu(false)}>
                            <span className="flex items-center gap-2">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent shrink-0">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Admin Panel
                            </span>
                          </MenuLink>
                        )}
                        <MenuLink to="/account/orders" onClick={() => setUserMenu(false)}>My Orders</MenuLink>
                        <MenuLink to="/account/wishlist" onClick={() => setUserMenu(false)}>Wishlist</MenuLink>
                        <MenuLink to="/account/profile" onClick={() => setUserMenu(false)}>Profile Settings</MenuLink>
                      </div>
                      <div className="border-t border-border py-1">
                        <button
                          onClick={() => { setUserMenu(false); logout() }}
                          className="w-full text-left px-4 py-2.5 text-sm text-accent font-medium hover:bg-accent-light transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="px-3.5 py-2 text-sm font-semibold text-ink hover:bg-surface-alt rounded-xl transition-colors">
                    Login
                  </Link>
                  <Link to="/register" className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-ink/80 transition-colors hidden sm:block">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-surface animate-slide-down">
            <form onSubmit={handleSearch} className="px-4 py-3">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-surface-alt border border-border rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </form>
            <nav className="px-2 pb-4 flex flex-col gap-0.5">
              {NAV_LINKS.map(l => (
                <Link key={l.to} to={l.to}
                  className="px-4 py-3 text-sm font-semibold text-ink-secondary hover:text-ink hover:bg-surface-alt rounded-xl transition-colors">
                  {l.label}
                </Link>
              ))}
              <div className="h-px bg-border my-2" />
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="px-4 py-3 text-sm font-semibold text-accent hover:bg-surface-alt rounded-xl">Admin Panel</Link>
                  )}
                  <Link to="/account/orders" className="px-4 py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-alt rounded-xl">Orders</Link>
                  <Link to="/account/wishlist" className="px-4 py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-alt rounded-xl">Wishlist</Link>
                  <button onClick={logout} className="px-4 py-3 text-sm font-semibold text-accent text-left hover:bg-accent-light rounded-xl">Sign Out</button>
                </>
              ) : (
                <Link to="/login" className="px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-alt rounded-xl">Login / Sign Up</Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Cart Drawer */}
      <CartDrawer />
    </>
  )
}

function CountBadge({ count }) {
  return (
    <span
      key={count}
      className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-accent text-white text-[10px] font-bold
        rounded-full flex items-center justify-center leading-none ring-2 ring-surface animate-badge-pop">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function MenuLink({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick}
      className="block px-4 py-2.5 text-sm text-ink-secondary font-medium hover:bg-surface-alt hover:text-ink transition-colors">
      {children}
    </Link>
  )
}

function CartDrawer() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const cartOpen  = useSelector(state => state.ui.cartOpen)
  const cartItems = useSelector(state => state.cart.items)
  const total     = useSelector(state => state.cart.items.reduce((n, i) => n + parseFloat(i.price) * i.quantity, 0))
  const [dragX, setDragX] = useState(0)
  const startX    = useRef(0)
  const startY    = useRef(0)
  const dragging  = useRef(false)

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dragging.current = false
  }
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (!dragging.current && Math.abs(dx) > Math.abs(dy) + 4) dragging.current = true
    if (dragging.current && dx > 0) setDragX(dx)
  }
  const onTouchEnd = () => {
    if (dragX > 90) dispatch(toggleCart())   // swiped far enough → close
    setDragX(0)
    dragging.current = false
  }

  if (!cartOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={() => dispatch(toggleCart())} />
      <div
        className="relative bg-surface w-full max-w-md h-full flex flex-col shadow-2xl animate-drawer-in"
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragX ? 'none' : 'transform 0.25s var(--ease-out-soft)',
          touchAction: 'pan-y',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-ink">
            Shopping Cart {cartItems.length > 0 && <span className="text-ink-tertiary font-normal text-sm">({cartItems.length})</span>}
          </h2>
          <button onClick={() => dispatch(toggleCart())} className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <p className="font-semibold text-ink">Your cart is empty</p>
              <p className="text-sm text-ink-tertiary mt-1">Add some products to get started</p>
              <button
                onClick={() => { dispatch(toggleCart()); navigate('/shop') }}
                className="mt-5 bg-ink text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-ink/80 transition-colors"
              >
                Browse Shop
              </button>
            </div>
          ) : cartItems.map(item => {
            const imgSrc = item.main_image
              ? resolveImg(item.main_image)
              : `https://placehold.co/80x80/F2F0EB/9C9894?text=P`
            return (
              <div key={item.id} className="flex gap-3">
                <Link to={`/products/${item.slug}`} onClick={() => dispatch(toggleCart())}>
                  <img src={imgSrc} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-surface-alt shrink-0" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.slug}`} onClick={() => dispatch(toggleCart())}>
                    <p className="text-sm font-semibold text-ink line-clamp-2 hover:text-accent transition-colors">{item.name}</p>
                  </Link>
                  <p className="text-sm font-bold text-ink mt-1">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => item.quantity > 1
                          ? dispatch(updateCartItemThunk({ id: item.id, quantity: item.quantity - 1 }))
                          : dispatch(removeCartItemThunk(item.id))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt transition-colors text-ink"
                      >–</button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateCartItemThunk({ id: item.id, quantity: item.quantity + 1 }))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt transition-colors text-ink"
                      >+</button>
                    </div>
                    <button
                      onClick={() => dispatch(removeCartItemThunk(item.id))}
                      className="text-ink-tertiary hover:text-accent transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {cartItems.length > 0 && (
          <div className="px-6 py-5 border-t border-border space-y-3 pb-safe">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Subtotal</span>
              <span className="text-xl font-bold text-ink">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { dispatch(toggleCart()); navigate('/checkout') }}
              className="shine w-full bg-ink text-white font-bold py-3.5 rounded-xl hover:bg-ink/80 active:scale-[0.98] transition-all"
            >
              Checkout · ${total.toFixed(2)}
            </button>
            <button
              onClick={() => { dispatch(toggleCart()); navigate('/cart') }}
              className="w-full text-sm text-ink-secondary hover:text-ink transition-colors py-1"
            >
              View Cart
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
