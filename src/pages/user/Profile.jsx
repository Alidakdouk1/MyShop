import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { updateProfile, getAddresses, addAddress, updateAddress, deleteAddress } from '../../api/userApi'
import { useToast } from '../../hooks/useToast'

/* ── Icons ──────────────────────────────────────────────────── */
const IcoUser = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
  </svg>
)
const IcoLock = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)
const IcoPin = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)
const IcoChevron = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
)
const IcoClose = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
  </svg>
)

const SECTIONS = [
  { id: 'personal',  label: 'Personal Info', Icon: IcoUser },
  { id: 'security',  label: 'Security',      Icon: IcoLock },
  { id: 'addresses', label: 'Addresses',     Icon: IcoPin  },
]

/* ── Reusable field ──────────────────────────────────────────── */
function Field({ label, hint, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: focused ? '#0F0F0F' : '#9C9894',
        marginBottom: '7px', transition: 'color 0.2s',
        fontFamily: "'Figtree', sans-serif",
      }}>{label}</label>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', height: '50px', padding: '0 16px',
          border: `1.5px solid ${focused ? '#0F0F0F' : '#E4E1D9'}`,
          borderRadius: '13px', fontSize: '14px',
          color: '#0F0F0F', background: focused ? '#fff' : '#FAFAF8',
          outline: 'none', transition: 'all 0.2s',
          fontFamily: "'Figtree', sans-serif",
          boxSizing: 'border-box',
        }}
      />
      {hint && <p style={{ fontSize: '11px', color: '#9C9894', marginTop: '5px' }}>{hint}</p>}
    </div>
  )
}

/* ── Password strength ───────────────────────────────────────── */
function pwScore(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8)         s++
  if (/[A-Z]/.test(pw))       s++
  if (/[0-9]/.test(pw))       s++
  if (/[^A-Za-z0-9]/.test(pw))s++
  return s
}
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', '#C0392B', '#D97706', '#B8922E', '#16A34A']

/* ── Save button ─────────────────────────────────────────────── */
function SaveBtn({ loading, children, style: extraStyle, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading}
      style={{
        height: '48px', padding: '0 32px',
        background: loading ? '#E4E1D9' : '#0F0F0F',
        color: loading ? '#9C9894' : '#fff',
        border: 'none', borderRadius: '13px',
        fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        fontFamily: "'Figtree', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        ...extraStyle,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2D2D2D' }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? '#E4E1D9' : '#0F0F0F' }}
    >
      {loading ? (
        <>
          <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Saving…
        </>
      ) : children}
    </button>
  )
}

/* ── Section heading ─────────────────────────────────────────── */
function SectionHead({ eyebrow, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#9C9894', margin: '0 0 6px', fontFamily: "'Figtree', sans-serif" }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 400, lineHeight: 1, color: '#0F0F0F', margin: 0 }}>
          {title}
        </h1>
      </div>
      {action}
    </div>
  )
}

/* ── Card wrapper ────────────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E1D9', borderRadius: '20px', padding: '32px', ...style }}>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function Profile() {
  const user  = useSelector(selectUser)
  const toast = useToast()

  const [section,     setSection]     = useState('personal')
  const [form,        setForm]        = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [pwForm,      setPwForm]      = useState({ current_password: '', password: '', password_confirm: '' })
  const [saving,      setSaving]      = useState(false)
  const [addresses,   setAddresses]   = useState([])
  const [addrModal,   setAddrModal]   = useState(null)
  const [addrForm,    setAddrForm]    = useState({})
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrLoaded,  setAddrLoaded]  = useState(false)

  const strength = pwScore(pwForm.password)

  useEffect(() => {
    if (section === 'addresses' && !addrLoaded) {
      getAddresses().then(r => { setAddresses(r.data.data || []); setAddrLoaded(true) })
    }
  }, [section])

  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const refreshAddresses = () =>
    getAddresses().then(r => setAddresses(r.data.data || []))

  /* handlers */
  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await updateProfile(form); toast.success('Profile updated!') }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed') }
    finally { setSaving(false) }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pwForm.password !== pwForm.password_confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      await updateProfile(pwForm)
      toast.success('Password updated!')
      setPwForm({ current_password: '', password: '', password_confirm: '' })
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const saveAddress = async (e) => {
    e.preventDefault(); setAddrLoading(true)
    try {
      if (addrForm.id) await updateAddress(addrForm.id, addrForm)
      else await addAddress(addrForm)
      toast.success('Address saved!'); setAddrModal(null); refreshAddresses()
    }
    catch { toast.error('Failed to save address') }
    finally { setAddrLoading(false) }
  }

  const deleteAddr = async (id) => {
    await deleteAddress(id); toast.success('Address deleted'); refreshAddresses()
  }

  const openAddrModal = (addr = null) => {
    setAddrForm(addr ? { ...addr } : { full_name: user?.name || '', phone: user?.phone || '', address_line1: '', city: '', state: '', zip: '', country: '', is_default: false })
    setAddrModal(addr ? 'edit' : 'new')
  }

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: "'Figtree', sans-serif" }}>

      {/* Top accent bar */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #0F0F0F 0%, #C0392B 45%, #B8922E 100%)' }} />

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '44px 20px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px', alignItems: 'start' }}>

          {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
          <aside style={{ background: '#0F0F0F', borderRadius: '22px', overflow: 'hidden', position: 'sticky', top: '24px' }}>

            {/* Identity card */}
            <div style={{ padding: '32px 26px 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative glow */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,57,43,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,146,46,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

              {/* Avatar */}
              <div style={{ position: 'relative', width: 70, height: 70, marginBottom: 18 }}>
                {/* Gradient ring */}
                <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'linear-gradient(135deg, #C0392B 0%, #B8922E 100%)', opacity: 0.8 }} />
                <div style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: '#0F0F0F' }} />
                <div style={{
                  position: 'relative', width: 70, height: 70, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 24, fontWeight: 600, color: '#FAFAF8',
                  letterSpacing: '-0.01em',
                }}>
                  {initials}
                </div>
              </div>

              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: '#FAFAF8', margin: '0 0 4px', lineHeight: 1.2 }}>
                {user?.name}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 14px', wordBreak: 'break-all' }}>
                {user?.email}
              </p>

              {/* Role badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(192,57,43,0.14)', border: '1px solid rgba(192,57,43,0.28)',
                borderRadius: 100, padding: '3px 10px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                  {user?.role || 'Customer'}
                </span>
              </span>
            </div>

            {/* Nav */}
            <nav style={{ padding: '14px 14px 8px' }}>
              {SECTIONS.map(({ id, label, Icon }) => {
                const active = section === id
                return (
                  <button key={id} onClick={() => setSection(id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                    padding: '11px 13px', borderRadius: 12,
                    border: 'none', marginBottom: 2,
                    background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                    color: active ? '#FAFAF8' : 'rgba(255,255,255,0.38)',
                    cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left',
                    position: 'relative',
                  }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {active && (
                      <span style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 3, height: 22, background: '#C0392B', borderRadius: '0 2px 2px 0',
                      }} />
                    )}
                    <Icon />
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
                    {active && <span style={{ opacity: 0.4 }}><IcoChevron /></span>}
                  </button>
                )
              })}
            </nav>

            {/* Footer */}
            <div style={{ padding: '12px 26px 24px' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6, margin: 0 }}>
                Member since {new Date().getFullYear()}
              </p>
            </div>
          </aside>

          {/* ══ CONTENT ══════════════════════════════════════════════ */}
          <main>

            {/* ── Personal Info ──────────────────────────────────── */}
            {section === 'personal' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Personal Info" />
                <Card>
                  <form onSubmit={saveProfile} style={{ display: 'grid', gap: 20 }}>
                    <Field label="Full Name"     value={form.name}  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}  required />
                    <Field label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    <Field label="Phone Number"  type="tel"   value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    <div style={{ paddingTop: 20, borderTop: '1px solid #F2F0EB', display: 'flex', justifyContent: 'flex-end' }}>
                      <SaveBtn type="submit" loading={saving}>Save Changes</SaveBtn>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ── Security ───────────────────────────────────────── */}
            {section === 'security' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Security" />
                <Card>
                  <form onSubmit={savePassword} style={{ display: 'grid', gap: 20 }}>
                    <Field label="Current Password" type="password" value={pwForm.current_password}
                      onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />

                    {/* New password + strength meter */}
                    <div>
                      <Field label="New Password" type="password" value={pwForm.password}
                        onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} required />
                      {pwForm.password.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                            {[1,2,3,4].map(i => (
                              <div key={i} style={{
                                flex: 1, height: 3, borderRadius: 2,
                                background: i <= strength ? STRENGTH_COLOR[strength] : '#E4E1D9',
                                transition: 'background 0.3s',
                              }} />
                            ))}
                          </div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: STRENGTH_COLOR[strength], margin: 0 }}>
                            {STRENGTH_LABEL[strength]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <Field label="Confirm New Password" type="password" value={pwForm.password_confirm}
                        onChange={e => setPwForm(f => ({ ...f, password_confirm: e.target.value }))} required />
                      {pwForm.password_confirm.length > 0 && (
                        <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, margin: '6px 0 0',
                          color: pwForm.password === pwForm.password_confirm ? '#16A34A' : '#C0392B' }}>
                          {pwForm.password === pwForm.password_confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                      )}
                    </div>

                    <div style={{ paddingTop: 20, borderTop: '1px solid #F2F0EB', display: 'flex', justifyContent: 'flex-end' }}>
                      <SaveBtn type="submit" loading={saving}>Update Password</SaveBtn>
                    </div>
                  </form>
                </Card>

                {/* Danger zone */}
                <div style={{ marginTop: 24, border: '1px solid #FEE2E2', borderRadius: 20, padding: '24px 28px', background: '#FFF9F9' }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 400, color: '#C0392B', margin: '0 0 6px' }}>
                    Danger Zone
                  </h3>
                  <p style={{ fontSize: 13, color: '#9C9894', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button style={{
                    height: 38, padding: '0 18px',
                    background: 'transparent', color: '#C0392B',
                    border: '1.5px solid #C0392B', borderRadius: 10,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Figtree', sans-serif",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#C0392B'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C0392B' }}
                    onClick={() => toast.info('Please contact support to delete your account.')}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* ── Addresses ──────────────────────────────────────── */}
            {section === 'addresses' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead
                  eyebrow="Account Settings"
                  title="Addresses"
                  action={
                    <button onClick={() => openAddrModal()} style={{
                      height: 42, padding: '0 20px',
                      background: '#0F0F0F', color: '#fff',
                      border: 'none', borderRadius: 12,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'background 0.2s', fontFamily: "'Figtree', sans-serif",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2D2D2D'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0F0F0F'}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/>
                      </svg>
                      Add Address
                    </button>
                  }
                />

                {addresses.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: '56px 32px' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, background: '#F2F0EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <svg width="24" height="24" fill="none" stroke="#9C9894" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: '#0F0F0F', margin: '0 0 8px' }}>
                      No saved addresses
                    </p>
                    <p style={{ fontSize: 13, color: '#9C9894', margin: 0 }}>
                      Save a delivery address to speed up checkout
                    </p>
                  </Card>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {addresses.map((a, i) => (
                      <div key={a.id} style={{
                        background: '#fff',
                        border: `1.5px solid ${a.is_default ? '#0F0F0F' : '#E4E1D9'}`,
                        borderRadius: 20, padding: 24, position: 'relative',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        animation: `fadeIn 0.3s ease both`,
                        animationDelay: `${i * 0.05}s`,
                      }}>
                        {a.is_default && (
                          <span style={{
                            position: 'absolute', top: 16, right: 16,
                            background: '#0F0F0F', color: '#fff',
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                            padding: '3px 9px', borderRadius: 100,
                          }}>Default</span>
                        )}

                        <div style={{
                          width: 38, height: 38, borderRadius: 11, background: '#F2F0EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                        }}>
                          <svg width="16" height="16" fill="none" stroke="#5C5854" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                        </div>

                        <p style={{ fontWeight: 700, fontSize: 14, color: '#0F0F0F', margin: '0 0 4px' }}>{a.full_name}</p>
                        {a.phone && <p style={{ fontSize: 12, color: '#9C9894', margin: '0 0 10px' }}>{a.phone}</p>}
                        <p style={{ fontSize: 13, color: '#5C5854', lineHeight: 1.6, margin: 0 }}>
                          {a.address_line1}<br />
                          {a.city}{a.state ? `, ${a.state}` : ''} {a.zip}<br />
                          {a.country}
                        </p>

                        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F2F0EB' }}>
                          <button onClick={() => openAddrModal(a)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: '#0F0F0F', transition: 'opacity 0.15s', fontFamily: "'Figtree', sans-serif",
                          }}>Edit</button>
                          <button onClick={() => deleteAddr(a.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: '#C0392B', transition: 'opacity 0.15s', fontFamily: "'Figtree', sans-serif",
                          }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ══ ADDRESS MODAL ════════════════════════════════════════════ */}
      {addrModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setAddrModal(null) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 20,
            animation: 'fadeIn 0.18s ease both',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 24, padding: '36px',
            width: '100%', maxWidth: 500,
            animation: 'scaleIn 0.2s ease both',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.9rem', fontWeight: 400, margin: 0, color: '#0F0F0F' }}>
                {addrModal === 'edit' ? 'Edit Address' : 'New Address'}
              </h2>
              <button onClick={() => setAddrModal(null)} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: '#F2F0EB', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#E4E1D9'}
                onMouseLeave={e => e.currentTarget.style.background = '#F2F0EB'}
              >
                <IcoClose />
              </button>
            </div>

            <form onSubmit={saveAddress} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Full Name" value={addrForm.full_name || ''} onChange={e => setAddrForm(f => ({ ...f, full_name: e.target.value }))} required />
                <Field label="Phone" type="tel" value={addrForm.phone || ''} onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <Field label="Street Address" value={addrForm.address_line1 || ''} onChange={e => setAddrForm(f => ({ ...f, address_line1: e.target.value }))} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="City" value={addrForm.city || ''} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} required />
                <Field label="State / Province" value={addrForm.state || ''} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="ZIP / Postal Code" value={addrForm.zip || ''} onChange={e => setAddrForm(f => ({ ...f, zip: e.target.value }))} required />
                <Field label="Country" value={addrForm.country || ''} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} />
              </div>

              {/* Default toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 2 }}>
                <button type="button" onClick={() => setAddrForm(f => ({ ...f, is_default: !f.is_default }))} style={{
                  width: 22, height: 22, borderRadius: 6, border: 'none',
                  background: addrForm.is_default ? '#0F0F0F' : '#F2F0EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
                  outline: 'none',
                }}>
                  {addrForm.is_default && <span style={{ color: '#fff' }}><IcoCheck /></span>}
                </button>
                <span style={{ fontSize: 13, color: '#5C5854', fontFamily: "'Figtree', sans-serif" }}>Set as default delivery address</span>
              </label>

              {/* Modal buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setAddrModal(null)} style={{
                  flex: 1, height: 48, background: '#F2F0EB', color: '#5C5854',
                  border: 'none', borderRadius: 13,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.2s', fontFamily: "'Figtree', sans-serif",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#E4E1D9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F2F0EB'}
                >Cancel</button>
                <SaveBtn type="submit" loading={addrLoading} style={{ flex: 2 }}>
                  Save Address
                </SaveBtn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
