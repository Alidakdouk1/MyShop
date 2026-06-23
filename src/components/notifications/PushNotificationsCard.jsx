import { usePushNotifications } from '../../hooks/usePushNotifications'

/**
 * Push notifications card — lives at the bottom of the Profile → Notifications
 * section. Permission flows are state-machined inside the hook; this component
 * is just the UI for each state.
 */
export default function PushNotificationsCard() {
  const { supported, permission, subscribed, busy, error, enable, disable } = usePushNotifications()

  if (!supported) {
    return (
      <div style={card}>
        <Header
          title="Push notifications"
          subtitle="Your browser doesn't support push notifications. On iPhone, install Pick&Go LB to your home screen first (Safari → Share → Add to Home Screen)."
        />
      </div>
    )
  }

  const denied = permission === 'denied'

  return (
    <div style={card}>
      <Header
        title="Push notifications"
        subtitle="Order confirmations, shipping updates, and back-in-stock alerts straight to your device — even when this tab is closed."
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <Pill kind={subscribed ? 'on' : denied ? 'off' : 'idle'}>
          {subscribed ? 'Active' : denied ? 'Blocked' : 'Off'}
        </Pill>
        {subscribed ? (
          <button type="button" onClick={disable} disabled={busy} style={{ ...ghostBtn, color: '#C0392B', borderColor: '#FCA5A5' }}>
            {busy ? 'Turning off…' : 'Turn off'}
          </button>
        ) : (
          <button type="button" onClick={enable} disabled={busy || denied} style={primaryBtn}>
            {busy ? 'Asking permission…' : 'Enable notifications'}
          </button>
        )}
        {denied && (
          <span style={{ fontSize: 11, color: '#9C9894', maxWidth: 280, lineHeight: 1.5 }}>
            Re-enable in your browser's site settings (click the lock icon in the address bar → Permissions → Notifications).
          </span>
        )}
      </div>
      {error && <p style={{ color: '#C0392B', fontSize: 12, margin: '12px 0 0', lineHeight: 1.5 }}>{error}</p>}
    </div>
  )
}

function Header({ title, subtitle }) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: '#9C9894', lineHeight: 1.55, margin: '6px 0 0' }}>{subtitle}</p>
    </div>
  )
}

function Pill({ kind, children }) {
  const styles = kind === 'on'
    ? { background: 'rgba(0,209,193,0.14)', color: '#0AAFA3' }
    : kind === 'off'
      ? { background: '#FEE2E2', color: '#C0392B' }
      : { background: '#F2F0EB', color: '#5C5854' }
  return (
    <span style={{
      ...styles,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '4px 10px', borderRadius: 999,
    }}>
      {children}
    </span>
  )
}

const card = {
  background: '#fff',
  border: '1px solid #F2F0EB',
  borderRadius: 20,
  padding: '24px 28px',
  marginTop: 16,
}

const primaryBtn = {
  height: 38, padding: '0 18px',
  background: '#0F172A', color: '#fff',
  border: 'none', borderRadius: 10,
  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  cursor: 'pointer',
}

const ghostBtn = {
  height: 38, padding: '0 14px',
  background: 'transparent', color: '#0F172A',
  border: '1.5px solid #E4E1D9', borderRadius: 10,
  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  cursor: 'pointer',
}
