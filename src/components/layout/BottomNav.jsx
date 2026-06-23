import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { selectCartCount } from '../../store/slices/cartSlice'
import { useI18n } from '../../i18n/I18nContext'

const ICONS = {
  home:       'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  // 4-square grid icon for Categories
  categories: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  cart:       'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  user:       'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  // Filled play triangle in a rounded square — the universal Reels glyph.
  reels:      'M4 4h16v16H4V4zm6 4v8l6-4-6-4z',
}

// Thumb-reachable bottom navigation — mobile only (hidden from md up).
// 5 tabs now: Home / Categories / Reels / Cart / Account. Reels sits in the
// center because it's the most "tap me" discoverable entry point.
export default function BottomNav() {
  const user      = useSelector(selectUser)
  const cartCount = useSelector(selectCartCount)
  const { t }     = useI18n()

  const tabs = [
    { to: '/',           label: t('nav.home'),     icon: ICONS.home,       end: true },
    { to: '/categories', label: 'Categories',      icon: ICONS.categories },
    { to: '/reels',      label: 'Reels',           icon: ICONS.reels },
    { to: '/cart',       label: t('nav.cart'),     icon: ICONS.cart,       badge: cartCount },
    { to: user ? '/account' : '/login', label: t('nav.account'), icon: ICONS.user },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border pb-safe"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(tab => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            // Mark the cart tab so the "fly to cart" animation can target it on mobile.
            data-cart-icon={tab.to === '/cart' ? '' : undefined}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 flex-1 pt-2 pb-1.5 min-h-[52px]
               text-[10px] font-semibold tracking-wide transition-colors active:scale-95
               ${isActive ? 'text-ink' : 'text-ink-tertiary'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -inset-e-2 min-w-4 h-4 px-1 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-surface">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>
                {tab.label}
                {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-ink" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
