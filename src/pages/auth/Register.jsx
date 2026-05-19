import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useAuth } from '../../hooks/useAuth'
import { selectUser } from '../../store/slices/authSlice'
import Input from '../../components/ui/Input'

/* ── decorative left panel ─────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex flex-col relative overflow-hidden"
      style={{ background: '#0F0F0F', width: '46%', minHeight: '100vh' }}
    >
      {/* grid overlay */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}
      >
        <defs>
          <pattern id="rgrid" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#FAFAF8" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rgrid)" />
      </svg>

      {/* crimson slash */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 5, height: '100%', background: '#C0392B' }} />

      {/* top-left mark */}
      <div style={{ padding: '2.5rem 2.5rem 0', position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.18em', color: '#FAFAF8' }}>
          MY<span style={{ color: '#C0392B' }}>SHOP</span>
        </span>
      </div>

      {/* centre type composition */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 2.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 1, background: '#C0392B' }} />
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', letterSpacing: '0.2em', color: '#9C9894', textTransform: 'uppercase' }}>
            Join us today
          </span>
        </div>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 0.88, letterSpacing: '0.02em' }}>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>BUILD</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#C0392B' }}>YOUR</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>OWN</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>STYLE</div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#2D2D2D' }} />
          <div style={{ width: 6, height: 6, background: '#C0392B', transform: 'rotate(45deg)' }} />
          <div style={{ flex: 1, height: 1, background: '#2D2D2D' }} />
        </div>

        <p style={{ marginTop: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontStyle: 'italic', color: '#5C5854', lineHeight: 1.65, maxWidth: 280 }}>
          Discover curated collections and shop with ease, all in one place.
        </p>
      </div>

      {/* bottom bar */}
      <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#3A3A3A', textTransform: 'uppercase' }}>Est. 2024</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: i === 1 ? 20 : 6, height: 3, borderRadius: 2, background: i === 1 ? '#C0392B' : '#2D2D2D' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────────────── */
export default function Register() {
  const { register, error, clearError } = useAuth()
  const navigate = useNavigate()
  const user     = useSelector(selectUser)
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirm: '', role: 'customer' })
  const [errors, setErrors]   = useState({})
  const [showPass, setShowPass]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (user) navigate('/') }, [user])
  useEffect(() => clearError, [])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                       e.name             = 'Name is required'
    if (!form.email.trim())                      e.email            = 'Email is required'
    if (form.password.length < 8)                e.password         = 'Minimum 8 characters'
    if (form.password !== form.password_confirm) e.password_confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const ok = await register(form)
    setSubmitting(false)
    if (ok) navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <LeftPanel />

      {/* ── right: form panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem', background: '#FAFAF8', minHeight: '100vh', overflowY: 'auto' }}>

        {/* mobile-only logo */}
        <div className="lg:hidden mb-8 text-center">
          <Link to="/" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.1em', color: '#0F0F0F', textDecoration: 'none' }}>
            MY<span style={{ color: '#C0392B' }}>SHOP</span>
          </Link>
        </div>

        <div className="w-full animate-fade-in" style={{ maxWidth: 420 }}>

          {/* heading */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 28, height: 2, background: '#C0392B' }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.8rem', letterSpacing: '0.2em', color: '#9C9894', textTransform: 'uppercase' }}>
                New account
              </span>
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 4vw, 3.25rem)', letterSpacing: '0.03em', lineHeight: 0.95, color: '#0F0F0F', margin: 0 }}>
              Create Account
            </h1>
          </div>

          {/* api error */}
          {error && (
            <div className="animate-slide-up" style={{ background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.2)', color: '#C0392B', fontSize: '0.8rem', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="stagger-1 animate-fade-in">
              <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)}
                error={errors.name} placeholder="John Doe" required autoComplete="name" />
            </div>

            <div className="stagger-2 animate-fade-in">
              <Input label="Email Address" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                error={errors.email} placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="stagger-3 animate-fade-in" style={{ position: 'relative' }}>
              <Input label="Password" type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)} error={errors.password}
                placeholder="Min. 8 characters" required autoComplete="new-password" hint="At least 8 characters" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 12, bottom: errors.password ? 24 : 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C9894', padding: 0 }}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="stagger-4 animate-fade-in">
              <Input label="Confirm Password" type="password" value={form.password_confirm}
                onChange={e => set('password_confirm', e.target.value)} error={errors.password_confirm}
                placeholder="Repeat your password" required />
            </div>

            {/* submit */}
            <div className="stagger-5 animate-fade-in" style={{ marginTop: '0.25rem' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', height: 52, background: submitting ? '#2D2D2D' : '#0F0F0F', color: '#FAFAF8', border: 'none', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#C0392B' }}
                onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#0F0F0F' }}
              >
                {submitting ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(250,250,248,0.3)', borderTopColor: '#FAFAF8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Creating account…
                  </>
                ) : (
                  <>Create Account <span style={{ opacity: 0.5, fontSize: '1rem' }}>→</span></>
                )}
              </button>
            </div>
          </form>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
            <span style={{ fontSize: '0.7rem', color: '#9C9894', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Have an account?</span>
            <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
          </div>

          <div className="stagger-6 animate-fade-in">
            <Link
              to="/login"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, border: '1.5px solid #E4E1D9', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0F0F0F', textDecoration: 'none', transition: 'all 0.2s ease', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F0F0F'; e.currentTarget.style.background = '#0F0F0F'; e.currentTarget.style.color = '#FAFAF8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E1D9'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0F0F0F' }}
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
