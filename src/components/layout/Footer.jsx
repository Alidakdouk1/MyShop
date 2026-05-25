import { Link } from 'react-router-dom'

const LINKS = {
  Shop: [
    { label: 'All Products', to: '/shop' },
    { label: 'New Arrivals', to: '/shop?sort=newest' },
    { label: 'Sale',         to: '/shop?on_sale=1' },
    { label: 'Categories',   to: '/shop' },
  ],
  Account: [
    { label: 'My Orders',   to: '/account/orders' },
    { label: 'Profile',     to: '/account/profile' },
    { label: 'Wishlist',    to: '/account/wishlist' },
    { label: 'Sign Up',        to: '/register' },
  ],
  Support: [
    { label: 'Help Center',  to: '#' },
    { label: 'Returns',      to: '#' },
    { label: 'Track Order',  to: '/account/orders' },
    { label: 'Contact Us',   to: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white mt-20">
      {/* Premium accent rule */}
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-accent to-transparent opacity-70" />
      <div className="max-w-screen-xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="hero-display text-3xl tracking-wider">MY<span className="text-accent">SHOP</span></span>
            <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-xs">
              A modern online shop with curated products and a seamless shopping experience.
            </p>
            <div className="flex gap-3 mt-5">
              {['M', 'T', 'I', 'F'].map(s => (
                <div key={s} className="w-9 h-9 rounded-full bg-white/10 hover:bg-accent flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 ease-(--ease-out-back) hover:-translate-y-1 hover:scale-110">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{title}</p>
              <ul className="space-y-2.5">
                {links.map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">© {new Date().getFullYear()} MyShop. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link to="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Terms of Service</Link>
            <div className="flex items-center gap-2">
              {['VISA', 'MC', 'AMEX', 'STRIPE'].map(p => (
                <span key={p} className="text-[10px] font-bold bg-white/10 text-white/50 px-2 py-1 rounded">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
