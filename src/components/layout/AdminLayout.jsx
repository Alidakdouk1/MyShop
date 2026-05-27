import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logoutThunk } from '../../store/slices/authSlice'
import { getAdminChatUnread } from '../../api/chatApi'
import { getAdminQuestionsUnread } from '../../api/questionApi'
import ToastContainer from '../ui/Toast'

const NAV = [
  {
    to: '/admin', end: true, label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6-3a2 2 0 114 0 2 2 0 01-4 0zm-2 8a4 4 0 018 0H6z" />
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/admin/analytics', label: 'Analytics',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM8 6a1 1 0 011-1h2a1 1 0 011 1v11a1 1 0 01-1 1H9a1 1 0 01-1-1V6zM14 3a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1h-2a1 1 0 01-1-1V3z" />
      </svg>
    ),
  },
  {
    to: '/admin/products', label: 'Products',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/users', label: 'Users',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    to: '/admin/admins', label: 'Admins',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/categories', label: 'Categories',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/admin/filters', label: 'Filters',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V16a1 1 0 01-1.447.894L8.553 15.94A1 1 0 018 15v-3.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/admin/orders', label: 'Orders',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/chat', label: 'Chat',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/questions', label: 'Q&A',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 6a2 2 0 00-1.732 1 1 1 0 101.732 1 .5.5 0 11.5.5 1 1 0 00-1 1v.5a1 1 0 102 0 2.5 2.5 0 10-1.5-4.5zM10 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/currencies', label: 'Currencies',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 012.871-.514l.504.168a.75.75 0 00.948-.948l-.168-.504a4.5 4.5 0 00-7.062 4.991.75.75 0 001.41-.513 3 3 0 01.658-3.108zM10 7a.75.75 0 01.75.75v.518a3 3 0 011.871 4.798.75.75 0 11-1.06-1.06A1.5 1.5 0 0010.75 9.5V11a.75.75 0 01-1.5 0V9.5a1.5 1.5 0 00-.81 2.756.75.75 0 11-.81 1.262A3 3 0 019.25 8.268V7.75A.75.75 0 0110 7z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/flash-sales', label: 'Flash Sales',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M11 3a1 1 0 00-1.7-.7L3.3 9.3a1 1 0 00.7 1.7H8v6a1 1 0 001.7.7l6-7a1 1 0 00-.7-1.7H11V3z" />
      </svg>
    ),
  },
  {
    to: '/admin/returns', label: 'Returns',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a5 5 0 015 5v2a1 1 0 11-2 0v-2a3 3 0 00-3-3H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/admin/homepage', label: 'Homepage',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    to: '/admin/shop', label: 'Shop Page',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3 5a1 1 0 000 2h1v8a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 100-2H3zm3 2h8v8H6V7zm2 2a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
]

export default function AdminLayout({ children }) {
  const user     = useSelector(s => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [sideOpen, setSideOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [qaUnread, setQaUnread]     = useState(0)

  useEffect(() => {
    let alive = true
    const tick = () => {
      getAdminChatUnread()
        .then(r => { if (alive) setChatUnread(r.data.data.unread || 0) })
        .catch(() => {})
      getAdminQuestionsUnread()
        .then(r => { if (alive) setQaUnread(r.data.data.unread || 0) })
        .catch(() => {})
    }
    tick()
    const iv = setInterval(tick, 15000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const handleLogout = async () => {
    await dispatch(logoutThunk())
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F0EEE9' }}>

      {/* Mobile overlay */}
      {sideOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-60 flex flex-col
          transition-transform duration-300
          ${sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#0E0E0E',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Dot-grid texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Logo */}
        <div className="relative h-16 flex items-center gap-3 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: '#C0392B' }}>
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-white font-black tracking-[0.15em] text-sm uppercase">MyShop</span>
          </Link>
          <span className="ml-auto text-[9px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 rounded" style={{ color: '#C0392B', border: '1px solid rgba(192,57,43,0.4)', background: 'rgba(192,57,43,0.08)' }}>
            Admin
          </span>
        </div>

        {/* Section label */}
        <div className="relative px-5 pt-6 pb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Navigation</p>
        </div>

        {/* Nav links */}
        <nav className="relative flex-1 px-3 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                ${isActive
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }
              `}
              style={({ isActive }) => isActive ? {
                background: 'rgba(192,57,43,0.15)',
                color: '#fff',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: '#C0392B' }} />
                  )}
                  <span className={isActive ? 'text-[#C0392B]' : 'text-white/30 group-hover:text-white/60 transition-colors'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {(() => {
                    const badge = item.to === '/admin/chat' ? chatUnread
                                : item.to === '/admin/questions' ? qaUnread : 0
                    return badge > 0
                  })() ? (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#C0392B' }}>
                      {(() => {
                        const badge = item.to === '/admin/chat' ? chatUnread : qaUnread
                        return badge > 9 ? '9+' : badge
                      })()}
                    </span>
                  ) : isActive ? (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#C0392B' }} />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="relative mx-5 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Quick actions */}
        <div className="relative px-3 pb-2 space-y-0.5">
          <Link
            to="/admin/products/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/25">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Product
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/25">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>
            View Store
          </Link>
        </div>

        {/* User profile */}
        <div className="relative p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0" style={{ background: 'rgba(192,57,43,0.2)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.3)' }}>
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate">{user?.name}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-white/20 hover:text-[#C0392B] transition-colors p-1 rounded"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm9.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 9H7a1 1 0 100 2h6.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-4 px-4 h-14 bg-white/80 backdrop-blur-sm border-b border-black/5">
          <button onClick={() => setSideOpen(true)} className="text-ink p-1">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-black tracking-wider text-sm uppercase text-ink">Admin Panel</span>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
