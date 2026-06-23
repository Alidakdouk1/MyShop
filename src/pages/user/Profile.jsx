import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import {
  updateProfile, getAddresses, addAddress, updateAddress, deleteAddress,
  getProfile, getUserStats, uploadAvatar,
} from '../../api/userApi'
import { useToast } from '../../hooks/useToast'
import TwoFactorCard from '../../components/auth/TwoFactorCard'
import PushNotificationsCard from '../../components/notifications/PushNotificationsCard'
import { useI18n } from '../../i18n/I18nContext'
import { useCurrency } from '../../context/CurrencyContext'

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
const IcoBell = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
  </svg>
)
const IcoGlobe = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)
const IcoActivity = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)
const IcoShield = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IcoCamera = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const SECTIONS = [
  { id: 'personal',      label: 'Personal Info',  Icon: IcoUser },
  { id: 'notifications', label: 'Notifications',  Icon: IcoBell },
  { id: 'preferences',   label: 'Preferences',    Icon: IcoGlobe },
  { id: 'security',      label: 'Security',       Icon: IcoLock },
  { id: 'addresses',     label: 'Addresses',      Icon: IcoPin  },
  { id: 'activity',      label: 'Activity',       Icon: IcoActivity },
  { id: 'privacy',       label: 'Privacy',        Icon: IcoShield },
]

/* ── Reusable field ──────────────────────────────────────────── */
function Field({ label, hint, disabled, ...props }) {
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
        disabled={disabled}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', height: '50px', padding: '0 16px',
          border: `1.5px solid ${focused ? '#0F0F0F' : '#E4E1D9'}`,
          borderRadius: '13px', fontSize: '14px',
          color: disabled ? '#9C9894' : '#0F0F0F',
          background: disabled ? '#F2F0EB' : (focused ? '#fff' : '#FAFAF8'),
          cursor: disabled ? 'not-allowed' : 'text',
          outline: 'none', transition: 'all 0.2s',
          fontFamily: "'Figtree', sans-serif",
          boxSizing: 'border-box',
        }}
      />
      {hint && <p style={{ fontSize: '11px', color: '#9C9894', marginTop: '5px' }}>{hint}</p>}
    </div>
  )
}

/* ── Stats banner — small 4-tile grid showing key account numbers ─ */
function StatsBanner({ stats, profile, compact = false }) {
  if (!stats) return null
  const items = [
    { label: 'Orders',       value: stats.total_orders ?? 0 },
    { label: 'Spent',        value: `$${Number(stats.lifetime_value || 0).toFixed(0)}` },
    { label: 'Reviews',      value: stats.reviews_written ?? 0 },
    { label: 'Member since', value: profile?.created_at
        ? new Date(String(profile.created_at).replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '—'
    },
  ]
  return (
    <div className="p-stats" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: compact ? 8 : 12, marginBottom: 16,
    }}>
      {items.map(i => (
        <div key={i.label} style={{
          background: '#fff', border: '1px solid #E4E1D9', borderRadius: 14,
          padding: compact ? '10px 12px' : '14px 16px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#9C9894',
            margin: 0, lineHeight: 1.2,
          }}>{i.label}</p>
          <p style={{
            fontSize: compact ? 16 : 20, fontWeight: 800,
            color: '#0F172A', margin: '6px 0 0',
            fontVariantNumeric: 'tabular-nums',
          }}>{i.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Verification badge ──────────────────────────────────────── */
function VerifyBadge({ label, verified, optional }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 999,
      background:  verified ? '#DCFCE7' : (optional ? '#F2F0EB' : '#FEF2F2'),
      color:       verified ? '#15803D' : (optional ? '#9C9894' : '#C0392B'),
    }}>
      {verified ? '✓' : optional ? '○' : '!'} {label}
    </span>
  )
}

/* ── Notification toggle row (Apple-style switch) ─────────────── */
function NotifToggle({ title, sub, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
      padding: '14px 4px', borderBottom: '1px solid #F2F0EB',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F0F0F' }}>{title}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9C9894', lineHeight: 1.4 }}>{sub}</p>}
      </div>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      {/* The track */}
      <span style={{
        position: 'relative', flexShrink: 0,
        width: 42, height: 24, borderRadius: 999,
        background: checked ? '#00D1C1' : '#E4E1D9',
        transition: 'background 0.2s',
      }}>
        {/* The thumb */}
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          transition: 'left 0.2s',
        }} />
      </span>
    </label>
  )
}

/* ── Info row for the Activity tab ───────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid #F2F0EB', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: '#9C9894' }}>{label}</span>
      <span style={{
        fontSize: 14, fontWeight: 600, color: '#0F0F0F',
        fontVariantNumeric: 'tabular-nums', textAlign: 'right',
      }}>{value}</span>
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
  const { locale, setLocale } = useI18n()
  const { current: currency, setCurrency, currencies } = useCurrency()

  const [section, setSection] = useState('personal')
  // Extended personal form — adds birthday + gender on top of the legacy fields.
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    birthday: '', gender: '',
  })
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirm: '' })
  // Notification preferences — booleans rendered as toggle switches.
  const [notif, setNotif] = useState({
    email_order: 1, email_marketing: 0, whatsapp_order: 0, sms_order: 0,
  })
  // Communication preferences — language + currency are stored against the user
  // so they persist across devices.
  const [prefs, setPrefs] = useState({ preferred_language: '', preferred_currency: '' })
  // Avatar — current URL + upload state.
  const [avatarUrl,  setAvatarUrl]  = useState(user?.avatar_url || '')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const avatarInputRef = useRef(null)
  // Account stats — loaded once for the dashboard header.
  const [stats, setStats] = useState(null)
  // Server-side profile snapshot — also used for member_since, last_login_at.
  const [profile, setProfile] = useState(null)

  const [saving,      setSaving]      = useState(false)
  const [addresses,   setAddresses]   = useState([])
  const [addrModal,   setAddrModal]   = useState(null)
  const [addrForm,    setAddrForm]    = useState({})
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrLoaded,  setAddrLoaded]  = useState(false)

  const strength = pwScore(pwForm.password)

  // Load the full profile + stats once on mount so every section has the data
  // it needs without separate fetches.
  useEffect(() => {
    getProfile().then(r => {
      const p = r.data.data
      setProfile(p)
      setForm(f => ({
        ...f,
        name: p.name || '', email: p.email || '', phone: p.phone || '',
        birthday: p.birthday ? String(p.birthday).slice(0, 10) : '',
        gender: p.gender || '',
      }))
      setNotif(p.notification_prefs || notif)
      setPrefs({
        preferred_language: p.preferred_language || '',
        preferred_currency: p.preferred_currency || '',
      })
      setAvatarUrl(p.avatar_url || '')
    }).catch(() => {})
    getUserStats().then(r => setStats(r.data.data)).catch(() => {})
  }, [])

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
    try {
      // Submit the new fields too. The backend's allowlist handles null safely.
      await updateProfile({
        name: form.name,
        phone: form.phone,
        birthday: form.birthday || null,
        gender: form.gender || null,
      })
      toast.success('Profile updated!')
    }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed') }
    finally { setSaving(false) }
  }

  const saveNotifications = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await updateProfile({ notification_prefs: notif })
      toast.success('Notification preferences saved')
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const savePreferences = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await updateProfile({
        preferred_language: prefs.preferred_language || null,
        preferred_currency: prefs.preferred_currency || null,
      })
      // Live-apply so the UI flips immediately, not only after the next reload.
      if (prefs.preferred_language) setLocale(prefs.preferred_language)
      if (prefs.preferred_currency) setCurrency(prefs.preferred_currency)
      toast.success('Preferences saved')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Quick client-side size guard so we don't even try a 20 MB upload.
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5 MB)'); return
    }
    setAvatarBusy(true)
    try {
      const fd = new FormData(); fd.append('avatar', file)
      const r = await uploadAvatar(fd)
      setAvatarUrl(r.data.data.avatar_url)
      toast.success('Avatar updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setAvatarBusy(false)
      // Allow re-selecting the same file.
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
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
    setAddrForm(addr ? { ...addr } : {
      label: 'Home', recipient_name: user?.name || '', phone: user?.phone || '',
      street: '', city: '', state: '', zip: '', country: '', is_default: false,
    })
    setAddrModal(addr ? 'edit' : 'new')
  }

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: "'Figtree', sans-serif" }}>

      {/* Top accent bar */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #0F0F0F 0%, #C0392B 45%, #B8922E 100%)' }} />

      {/* Responsive overrides — inline styles can't use breakpoints, so the
          two-column desktop layout is collapsed to a single column on phones
          and the vertical sidebar nav becomes a horizontal scrolling tab strip. */}
      <style>{`
        @media (max-width: 820px) {
          .profile-grid    { grid-template-columns: 1fr !important; gap: 16px !important; }
          .profile-sidebar { position: static !important; }
          .profile-identity { padding: 22px 22px 18px !important; }
          .profile-nav     { display: flex !important; overflow-x: auto; gap: 6px; padding: 12px 12px !important;
                             scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .profile-nav::-webkit-scrollbar { display: none; }
          .profile-nav-btn { width: auto !important; flex: 0 0 auto; margin-bottom: 0 !important; white-space: nowrap; }
          .profile-nav-chevron { display: none !important; }
          .profile-foot    { display: none !important; }
          .p-2col          { grid-template-columns: 1fr !important; }
          .p-stats         { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '44px 20px 80px' }}>
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px', alignItems: 'start' }}>

          {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
          <aside className="profile-sidebar" style={{ background: '#0F0F0F', borderRadius: '22px', overflow: 'hidden', position: 'sticky', top: '24px' }}>

            {/* Identity card */}
            <div className="profile-identity" style={{ padding: '32px 26px 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative glow */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,57,43,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,146,46,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

              {/* Avatar */}
              <div className="profile-avatar-wrap" style={{ position: 'relative', width: 70, height: 70, marginBottom: 18 }}>
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
            <nav className="profile-nav" style={{ padding: '14px 14px 8px' }}>
              {SECTIONS.map(({ id, label, Icon }) => {
                const active = section === id
                return (
                  <button key={id} onClick={() => setSection(id)} className="profile-nav-btn" style={{
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
                    {active && <span className="profile-nav-chevron" style={{ opacity: 0.4 }}><IcoChevron /></span>}
                  </button>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="profile-foot" style={{ padding: '12px 26px 24px' }}>
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

                {/* Stats banner — shows on top of Personal Info so the dashboard
                    feel is visible immediately on landing. */}
                {stats && <StatsBanner stats={stats} profile={profile} />}

                {/* Avatar upload + verification badges card */}
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 84, height: 84, borderRadius: '50%',
                        background: avatarUrl
                          ? `url(${avatarUrl.startsWith('http') ? avatarUrl : `/MyShop/backend/${avatarUrl}`}) center/cover`
                          : 'linear-gradient(135deg, #00D1C1 0%, #A3FF12 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 28,
                        boxShadow: '0 8px 24px rgba(15,15,15,0.12)',
                      }}>
                        {!avatarUrl && initials}
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarBusy}
                        aria-label="Change avatar"
                        style={{
                          position: 'absolute', bottom: -2, right: -2,
                          width: 30, height: 30, borderRadius: '50%',
                          background: '#0F172A', color: '#fff',
                          border: '3px solid #fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <IcoCamera />
                      </button>
                      <input
                        ref={avatarInputRef} type="file" accept="image/*"
                        onChange={onPickAvatar}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: '#0F0F0F', margin: 0 }}>{user?.name}</p>
                      <p style={{ fontSize: 12, color: '#9C9894', margin: '2px 0 8px' }}>{user?.email}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <VerifyBadge label="Email" verified={!!profile?.is_verified} />
                        <VerifyBadge label="Phone" verified={!!profile?.phone_verified_at} optional />
                        {(profile?.vip_level && profile.vip_level !== 'regular') && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                            padding: '3px 8px', borderRadius: 999,
                            background: profile.vip_level === 'gold' ? '#FEF9EC' : '#F5F3FF',
                            color:      profile.vip_level === 'gold' ? '#B8922E' : '#7C3AED',
                          }}>{profile.vip_level}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <form onSubmit={saveProfile} style={{ display: 'grid', gap: 20 }}>
                    <Field label="Full Name"     value={form.name}  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}  required />
                    <Field label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled
                      hint="Email is used for sign-in. Contact support to change it." />
                    <Field label="Phone Number"  type="tel"   value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />

                    <div className="p-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Date of Birth" type="date" value={form.birthday}
                        onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                        hint="Optional. Powers birthday surprises 🎁" />
                      <div>
                        <label style={{
                          display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                          textTransform: 'uppercase', color: '#9C9894', marginBottom: 7,
                        }}>Gender</label>
                        <select
                          value={form.gender}
                          onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                          style={{
                            width: '100%', height: 50, padding: '0 14px',
                            border: '1.5px solid #E4E1D9', borderRadius: 13,
                            fontSize: 14, color: '#0F0F0F', background: '#FAFAF8',
                            outline: 'none',
                          }}
                        >
                          <option value="">— Select —</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ paddingTop: 20, borderTop: '1px solid #F2F0EB', display: 'flex', justifyContent: 'flex-end' }}>
                      <SaveBtn type="submit" loading={saving}>Save Changes</SaveBtn>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ── Notifications ──────────────────────────────────── */}
            {section === 'notifications' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Notifications" />
                {stats && <StatsBanner stats={stats} profile={profile} compact />}
                <Card>
                  <p style={{ fontSize: 13, color: '#5C5854', margin: '0 0 18px', lineHeight: 1.6 }}>
                    Choose how you want to hear from us. You can change these any time.
                  </p>
                  <form onSubmit={saveNotifications} style={{ display: 'grid', gap: 4 }}>
                    <NotifToggle
                      title="Order updates by email"
                      sub="Confirmation, payment, shipping, delivery."
                      checked={!!notif.email_order}
                      onChange={v => setNotif(n => ({ ...n, email_order: v ? 1 : 0 }))}
                    />
                    <NotifToggle
                      title="Order updates by WhatsApp"
                      sub="Get the same milestones via WhatsApp."
                      checked={!!notif.whatsapp_order}
                      onChange={v => setNotif(n => ({ ...n, whatsapp_order: v ? 1 : 0 }))}
                    />
                    <NotifToggle
                      title="Order updates by SMS"
                      sub="Carrier fees may apply."
                      checked={!!notif.sms_order}
                      onChange={v => setNotif(n => ({ ...n, sms_order: v ? 1 : 0 }))}
                    />
                    <NotifToggle
                      title="Marketing &amp; new arrivals"
                      sub="Occasional emails about deals, drops, and curated picks. Unsubscribe any time."
                      checked={!!notif.email_marketing}
                      onChange={v => setNotif(n => ({ ...n, email_marketing: v ? 1 : 0 }))}
                    />

                    <div style={{ paddingTop: 20, marginTop: 12, borderTop: '1px solid #F2F0EB', display: 'flex', justifyContent: 'flex-end' }}>
                      <SaveBtn type="submit" loading={saving}>Save Preferences</SaveBtn>
                    </div>
                  </form>
                </Card>

                {/* Push notifications — separate card so the opt-in flow has
                    breathing room. The hook drives a state machine inside. */}
                <PushNotificationsCard />
              </div>
            )}

            {/* ── Preferences (language + currency) ──────────────── */}
            {section === 'preferences' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Preferences" />
                <Card>
                  <p style={{ fontSize: 13, color: '#5C5854', margin: '0 0 18px', lineHeight: 1.6 }}>
                    Set your default language and currency. These follow your account everywhere you sign in.
                  </p>
                  <form onSubmit={savePreferences} style={{ display: 'grid', gap: 18 }}>
                    <div>
                      <label style={{
                        display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: '#9C9894', marginBottom: 7,
                      }}>Language</label>
                      <select
                        value={prefs.preferred_language || locale}
                        onChange={e => setPrefs(p => ({ ...p, preferred_language: e.target.value }))}
                        style={{
                          width: '100%', height: 50, padding: '0 14px',
                          border: '1.5px solid #E4E1D9', borderRadius: 13,
                          fontSize: 14, color: '#0F0F0F', background: '#FAFAF8',
                          outline: 'none',
                        }}
                      >
                        <option value="en">English</option>
                        <option value="ar">العربية (Arabic)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: '#9C9894', marginBottom: 7,
                      }}>Currency</label>
                      <select
                        value={prefs.preferred_currency || currency?.code || 'USD'}
                        onChange={e => setPrefs(p => ({ ...p, preferred_currency: e.target.value }))}
                        style={{
                          width: '100%', height: 50, padding: '0 14px',
                          border: '1.5px solid #E4E1D9', borderRadius: 13,
                          fontSize: 14, color: '#0F0F0F', background: '#FAFAF8',
                          outline: 'none',
                        }}
                      >
                        {(currencies || [{ code: 'USD', name: 'US Dollar' }]).map(c => (
                          <option key={c.code} value={c.code}>{c.symbol ? `${c.symbol} ` : ''}{c.code} — {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ paddingTop: 20, borderTop: '1px solid #F2F0EB', display: 'flex', justifyContent: 'flex-end' }}>
                      <SaveBtn type="submit" loading={saving}>Save Preferences</SaveBtn>
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

                {/* Two-factor authentication */}
                <TwoFactorCard />

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
                  <div className="p-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

                        <p style={{ fontWeight: 700, fontSize: 14, color: '#0F0F0F', margin: '0 0 4px' }}>
                          {a.recipient_name || '—'}
                          {a.label && <span style={{ marginLeft: 8, fontSize: 11, color: '#9C9894', fontWeight: 600 }}>· {a.label}</span>}
                        </p>
                        {a.phone && <p style={{ fontSize: 12, color: '#9C9894', margin: '0 0 10px' }}>{a.phone}</p>}
                        <p style={{ fontSize: 13, color: '#5C5854', lineHeight: 1.6, margin: 0 }}>
                          {a.street}<br />
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

            {/* ── Activity ───────────────────────────────────────── */}
            {section === 'activity' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Activity" />
                {stats && <StatsBanner stats={stats} profile={profile} />}

                <Card>
                  <p style={{ fontSize: 13, color: '#5C5854', margin: '0 0 18px', lineHeight: 1.6 }}>
                    Recent account activity and lifetime stats.
                  </p>
                  <div style={{ display: 'grid', gap: 14 }}>
                    <InfoRow
                      label="Last sign-in"
                      value={profile?.last_login_at
                        ? new Date(String(profile.last_login_at).replace(' ', 'T')).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    />
                    <InfoRow
                      label="Member since"
                      value={profile?.created_at
                        ? new Date(String(profile.created_at).replace(' ', 'T')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '—'}
                    />
                    <InfoRow label="Total orders"     value={stats?.total_orders ?? '—'} />
                    <InfoRow label="Lifetime spent"   value={stats != null ? `$${Number(stats.lifetime_value || 0).toFixed(2)}` : '—'} />
                    <InfoRow label="Reviews written"  value={stats?.reviews_written ?? '—'} />
                    <InfoRow label="Saved addresses"  value={stats?.addresses_count ?? '—'} />
                    <InfoRow label="Wishlist items"   value={stats?.wishlist_count ?? '—'} />
                  </div>
                </Card>
              </div>
            )}

            {/* ── Privacy ────────────────────────────────────────── */}
            {section === 'privacy' && (
              <div style={{ animation: 'fadeIn 0.28s ease both' }}>
                <SectionHead eyebrow="Account Settings" title="Privacy" />
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 400, color: '#0F0F0F', margin: '0 0 8px' }}>
                    Your data
                  </h3>
                  <p style={{ fontSize: 13, color: '#5C5854', margin: '0 0 16px', lineHeight: 1.6 }}>
                    Request a copy of all the personal data we hold about you. We'll email you a JSON archive within 30 days.
                  </p>
                  <button
                    onClick={() => toast.info('Data export request sent. We will email you within 30 days.')}
                    style={{
                      height: 42, padding: '0 18px',
                      background: '#F2F0EB', color: '#0F0F0F', border: 'none', borderRadius: 12,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: "'Figtree', sans-serif",
                    }}
                  >
                    Request data export
                  </button>
                </Card>

                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 400, color: '#0F0F0F', margin: '0 0 8px' }}>
                    Wishlist sharing
                  </h3>
                  <p style={{ fontSize: 13, color: '#5C5854', margin: '0 0 16px', lineHeight: 1.6 }}>
                    Control whether others can view your wishlist via a public link.
                  </p>
                  <a
                    href="/account/wishlist"
                    style={{
                      display: 'inline-block',
                      height: 42, padding: '0 18px',
                      background: '#F2F0EB', color: '#0F0F0F', borderRadius: 12,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      lineHeight: '42px', textDecoration: 'none',
                      fontFamily: "'Figtree', sans-serif",
                    }}
                  >
                    Manage on Wishlist page
                  </a>
                </Card>

                {/* Danger zone */}
                <div style={{ border: '1px solid #FEE2E2', borderRadius: 20, padding: '24px 28px', background: '#FFF9F9' }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 400, color: '#C0392B', margin: '0 0 6px' }}>
                    Delete account
                  </h3>
                  <p style={{ fontSize: 13, color: '#9C9894', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => toast.info('Please contact support to delete your account.')}
                    style={{
                      height: 38, padding: '0 18px',
                      background: 'transparent', color: '#C0392B',
                      border: '1.5px solid #C0392B', borderRadius: 10,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: "'Figtree', sans-serif",
                    }}
                  >
                    Request account deletion
                  </button>
                </div>
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
              <Field label="Label" value={addrForm.label || ''} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="Home, Work, Mom's place…" />
              <div className="p-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Recipient Name" value={addrForm.recipient_name || ''} onChange={e => setAddrForm(f => ({ ...f, recipient_name: e.target.value }))} required />
                <Field label="Phone" type="tel" value={addrForm.phone || ''} onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <Field label="Street Address" value={addrForm.street || ''} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} required />
              <div className="p-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="City" value={addrForm.city || ''} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} required />
                <Field label="State / Province" value={addrForm.state || ''} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="p-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="ZIP / Postal Code" value={addrForm.zip || ''} onChange={e => setAddrForm(f => ({ ...f, zip: e.target.value }))} />
                <Field label="Country" value={addrForm.country || ''} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} required />
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
