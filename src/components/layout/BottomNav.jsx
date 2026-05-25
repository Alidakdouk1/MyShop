import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { selectCartCount } from '../../store/slices/cartSlice'

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  shop: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  cart: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
}

// Thumb-reachable bottom navigation — mobile only (hidden from md up).
export default function BottomNav() {
  const user      = useSelector(selectUser)
  const cartCount = useSelector(selectCartCount)

  const tabs = [
    { to: '/',     label: 'Home',    icon: ICONS.home, end: true },
    { to: '/shop', label: 'Shop',    icon: ICONS.shop },
    { to: '/cart', label: 'Cart',    icon: ICONS.cart, badge: cartCount },
    { to: user ? '/account/orders' : '/login', label: 'Account', icon: ICONS.user },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border pb-safe"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(t => (
          <NavLink
            key={t.label}
            to={t.to}
            end={t.end}
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
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                  {t.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-surface">
                      {t.badge > 9 ? '9+' : t.badge}
                    </span>
                  )}
                </span>
                {t.label}
                {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-ink" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
