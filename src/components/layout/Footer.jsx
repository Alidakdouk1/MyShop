import { useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeNewsletter } from '../../api/newsletterApi'
import { useToast } from '../../hooks/useToast'
import { useI18n } from '../../i18n/I18nContext'
import Logo from '../brand/Logo'

function NewsletterSignup() {
  const toast = useToast()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { data } = await subscribeNewsletter(email.trim())
      toast.success(data?.message || 'Thanks for subscribing!')
      setDone(true)
      setEmail('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-b border-white/10 pb-10 mb-10 grid md:grid-cols-2 gap-6 items-center">
      <div>
        <h3 className="hero-display text-3xl tracking-wide">JOIN THE LIST</h3>
        <p className="text-sm text-white/60 mt-2 max-w-sm">
          Subscribe for new arrivals, exclusive offers, and early access to sales.
        </p>
      </div>
      <form onSubmit={submit} className="flex gap-2 w-full md:justify-end">
        <input
          type="email"
          required
          value={email}
          onChange={e => { setEmail(e.target.value); setDone(false) }}
          placeholder="Enter your email"
          className="flex-1 md:max-w-xs bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm
            text-white placeholder-white/40 outline-none focus:border-white/40 focus:bg-white/15 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="shine bg-white text-ink font-bold text-sm px-6 rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60"
        >
          {loading ? '…' : done ? 'Subscribed ✓' : 'Subscribe'}
        </button>
      </form>
    </div>
  )
}

function buildLinks(t) {
  return [
    {
      titleKey: 'footer.shop',
      links: [
        { label: t('nav.shop'),        to: '/shop' },
        { label: t('nav.new_arrivals'),to: '/shop?sort=newest' },
        { label: t('nav.sale'),        to: '/shop?on_sale=1' },
      ],
    },
    {
      titleKey: 'nav.account',
      links: [
        { label: t('nav.orders'),    to: '/account/orders' },
        { label: t('nav.profile'),   to: '/account/profile' },
        { label: t('nav.wishlist'),  to: '/account/wishlist' },
        { label: t('auth.sign_up'),  to: '/register' },
      ],
    },
    {
      titleKey: 'footer.help',
      links: [
        { label: t('footer.faq'),      to: '#' },
        { label: t('footer.shipping'), to: '#' },
        { label: t('nav.orders'),      to: '/account/orders' },
        { label: t('footer.contact'),  to: '#' },
      ],
    },
  ]
}

export default function Footer() {
  const { t }  = useI18n()
  const groups = buildLinks(t)
  return (
    <footer className="bg-ink text-white mt-20">
      {/* Premium accent rule */}
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-accent to-transparent opacity-70" />
      <div className="max-w-screen-xl mx-auto px-4 pt-14 pb-8">
        <NewsletterSignup />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo variant="dark" size={40} showTag={false} />
            <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-xs">
              {t('footer.about_body')}
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
          {groups.map(g => (
            <div key={g.titleKey}>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{t(g.titleKey)}</p>
              <ul className="space-y-2.5">
                {g.links.map(l => (
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
          <p className="text-sm text-white/40">© <span data-bidi-isolate>{new Date().getFullYear()}</span> Pick&amp;Go LB. {t('footer.rights')}</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">{t('footer.privacy')}</Link>
            <Link to="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">{t('footer.terms')}</Link>
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
