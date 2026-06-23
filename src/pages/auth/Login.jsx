import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useAuth } from '../../hooks/useAuth'
import { selectUser, selectAuthInitialized } from '../../store/slices/authSlice'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import Logo from '../../components/brand/Logo'

/* ── decorative left panel ─────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex flex-col relative overflow-hidden"
      style={{
        background: '#0F0F0F',
        width: '46%',
        minHeight: '100vh',
      }}
    >
      {/* grid overlay */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0.07,
        }}
      >
        <defs>
          <pattern id="lgrid" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#FAFAF8" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lgrid)" />
      </svg>

      {/* crimson slash */}
      <div
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: 5,
          height: '100%',
          background: '#C0392B',
        }}
      />

      {/* top-left mark */}
      <div style={{ padding: '2.5rem 2.5rem 0', position: 'relative', zIndex: 1 }}>
        <Logo variant="dark" size={28} />
      </div>

      {/* centre type composition */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 2.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* thin rule + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 1, background: '#C0392B' }} />
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '0.85rem',
              letterSpacing: '0.2em',
              color: '#9C9894',
              textTransform: 'uppercase',
            }}
          >
            Welcome back
          </span>
        </div>

        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            lineHeight: 0.88,
            letterSpacing: '0.02em',
          }}
        >
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>SIGN</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>INTO</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#C0392B' }}>YOUR</div>
          <div style={{ fontSize: 'clamp(4rem, 6vw, 6.5rem)', color: '#FAFAF8' }}>WORLD</div>
        </div>

        {/* bottom rule */}
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#2D2D2D' }} />
          <div style={{ width: 6, height: 6, background: '#C0392B', transform: 'rotate(45deg)' }} />
          <div style={{ flex: 1, height: 1, background: '#2D2D2D' }} />
        </div>

        <p
          style={{
            marginTop: '1.75rem',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.05rem',
            fontStyle: 'italic',
            color: '#5C5854',
            lineHeight: 1.65,
            maxWidth: 280,
          }}
        >
          Every great wardrobe starts with a single step. Yours is right here.
        </p>
      </div>

      {/* bottom bar */}
      <div
        style={{
          padding: '1.5rem 2.5rem',
          borderTop: '1px solid #1A1A1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#3A3A3A', textTransform: 'uppercase' }}>
          Est. 2024
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: i === 1 ? 20 : 6,
                height: 3,
                borderRadius: 2,
                background: i === 1 ? '#C0392B' : '#2D2D2D',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────────────── */
export default function Login() {
  const { login, verifyTwoFactor, error, clearError } = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const user         = useSelector(selectUser)
  const initialized  = useSelector(selectAuthInitialized)
  const from         = location.state?.from?.pathname || '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // 2FA challenge state — set after password ok when 2FA is enabled
  const [twoFA, setTwoFA] = useState(null) // { challenge } or null
  const [code,  setCode]  = useState('')
  const [codeErr, setCodeErr] = useState('')

  useEffect(() => clearError, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(form)
    setSubmitting(false)
    if (!result) return
    if (result.twoFactorRequired) {
      setTwoFA({ challenge: result.challenge })
      return
    }
    navigate(result.role === 'admin' ? '/admin' : from, { replace: true })
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$|^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/.test(code.trim())) {
      setCodeErr('Enter a 6-digit code or a backup code'); return
    }
    setSubmitting(true)
    setCodeErr('')
    const result = await verifyTwoFactor(twoFA.challenge, code.trim())
    setSubmitting(false)
    if (result?.error) { setCodeErr(result.error); return }
    if (result) navigate(result.role === 'admin' ? '/admin' : from, { replace: true })
  }

  // Redirect already-authenticated users away from /login
  if (initialized && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : from} replace />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <LeftPanel />

      {/* ── right: form panel ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 2rem',
          background: '#FAFAF8',
          minHeight: '100vh',
        }}
      >
        {/* mobile-only logo */}
        <div className="lg:hidden mb-10 text-center">
          <Link to="/" aria-label="Pick&Go LB" style={{ textDecoration: 'none' }}>
            <Logo variant="light" size={44} />
          </Link>
        </div>

        <div className="w-full animate-fade-in" style={{ maxWidth: 420 }}>

          {/* back to home */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#5C5854',
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#0F0F0F'}
              onMouseLeave={e => e.currentTarget.style.color = '#5C5854'}
            >
              <span style={{ fontSize: '1rem' }}>←</span> Back to Home
            </Link>
          </div>

          {/* heading */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 28, height: 2, background: '#C0392B' }} />
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '0.8rem',
                  letterSpacing: '0.2em',
                  color: '#9C9894',
                  textTransform: 'uppercase',
                }}
              >
                Account access
              </span>
            </div>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(2.5rem, 4vw, 3.25rem)',
                letterSpacing: '0.03em',
                lineHeight: 0.95,
                color: '#0F0F0F',
                margin: 0,
              }}
            >
              Sign In
            </h1>
          </div>

          {/* error */}
          {error && (
            <div
              className="animate-slide-up"
              style={{
                background: '#FEF2F2',
                border: '1px solid rgba(192,57,43,0.2)',
                color: '#C0392B',
                fontSize: '0.8rem',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {twoFA ? (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: '#FAFAF8', border: '1px solid #E4E1D9',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <p style={{ fontSize: '0.85rem', color: '#0F0F0F', fontWeight: 600, margin: 0 }}>
                  Two-factor authentication
                </p>
                <p style={{ fontSize: '0.75rem', color: '#5C5854', margin: '4px 0 0', lineHeight: 1.5 }}>
                  Open your authenticator app and enter the 6-digit code for <strong>{form.email}</strong>.
                  Lost access? Enter one of your backup codes instead.
                </p>
              </div>
              <Input
                label="6-digit code"
                value={code}
                onChange={e => { setCode(e.target.value); setCodeErr('') }}
                placeholder="123456 or backup code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                error={codeErr}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', height: 52,
                  background: submitting ? '#2D2D2D' : '#0F0F0F',
                  color: '#FAFAF8', border: 'none', borderRadius: 6,
                  fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button
                type="button"
                onClick={() => { setTwoFA(null); setCode(''); setCodeErr('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', color: '#9C9894', textAlign: 'center',
                }}
              >
                Use a different account
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="stagger-1 animate-fade-in">
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="stagger-2 animate-fade-in" style={{ position: 'relative' }}>
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#9C9894',
                  padding: 0,
                }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>

            <div
              className="stagger-3 animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '-0.25rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#5C5854',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  style={{ accentColor: '#0F0F0F', width: 14, height: 14 }}
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.8rem',
                  color: '#C0392B',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </Link>
            </div>

            {/* submit */}
            <div className="stagger-4 animate-fade-in" style={{ marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  height: 52,
                  background: submitting ? '#2D2D2D' : '#0F0F0F',
                  color: '#FAFAF8',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#C0392B' }}
                onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#0F0F0F' }}
              >
                {submitting ? (
                  <>
                    <span
                      style={{
                        width: 16, height: 16,
                        border: '2px solid rgba(250,250,248,0.3)',
                        borderTopColor: '#FAFAF8',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                    Signing in…
                  </>
                ) : (
                  <>Sign In <span style={{ opacity: 0.5, fontSize: '1rem' }}>→</span></>
                )}
              </button>
            </div>
          </form>
          )}

          {!twoFA && <GoogleSignInButton redirectTo={from} />}

          {!twoFA && (
          <>
          {/* divider */}
          <div
            className="stagger-5 animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '1.75rem 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
            <span style={{ fontSize: '0.7rem', color: '#9C9894', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              New here?
            </span>
            <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
          </div>

          <div className="stagger-6 animate-fade-in">
            <Link
              to="/register"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                height: 48,
                border: '1.5px solid #E4E1D9',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#0F0F0F',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0F0F0F'
                e.currentTarget.style.background = '#0F0F0F'
                e.currentTarget.style.color = '#FAFAF8'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E4E1D9'
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#0F0F0F'
              }}
            >
              Create an Account
            </Link>
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.7rem',
              color: '#9C9894',
              marginTop: '2rem',
              lineHeight: 1.6,
            }}
          >
            By signing in, you agree to our{' '}
            <Link to="#" style={{ color: '#5C5854', textDecoration: 'underline' }}>Terms</Link>
            {' '}and{' '}
            <Link to="#" style={{ color: '#5C5854', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
