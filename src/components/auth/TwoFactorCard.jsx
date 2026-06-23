import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from '../../api/authApi'
import { useToast } from '../../hooks/useToast'
import { getProfile } from '../../api/userApi'

/**
 * Two-factor authentication card for the user's Security settings.
 *
 * States:
 *   off           → not enabled. Button: "Enable 2FA" → setup
 *   setup         → secret generated, QR shown, waiting for first code
 *   backup-codes  → enabled. Show one-time backup codes (only this once).
 *   on            → already enabled. Show summary + Disable button.
 *   disable-pw    → confirming disable with current password.
 */
export default function TwoFactorCard() {
  const toast = useToast()
  const [state,   setState]   = useState('loading')
  const [secret,  setSecret]  = useState('')
  const [uri,     setUri]     = useState('')
  const [qrUrl,   setQrUrl]   = useState('')
  const [code,    setCode]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [enabledAt,   setEnabledAt]   = useState(null)
  const [disablePassword, setDisablePassword] = useState('')
  const initialLoad = useRef(true)

  // On mount: read current 2FA status from the profile.
  useEffect(() => {
    getProfile().then(r => {
      const u = r.data.data
      if (u.two_factor_enabled) {
        setState('on')
        setEnabledAt(u.two_factor_enabled_at)
      } else {
        setState('off')
      }
    }).catch(() => setState('off'))
  }, [])

  // Re-render the QR image whenever a new otpauth URI lands.
  useEffect(() => {
    if (!uri) { setQrUrl(''); return }
    QRCode.toDataURL(uri, { width: 220, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''))
  }, [uri])

  const startSetup = async () => {
    setBusy(true); setError('')
    try {
      const { data } = await setupTwoFactor()
      setSecret(data.data.secret)
      setUri(data.data.otpauth_uri)
      setState('setup')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start setup.')
    } finally { setBusy(false) }
  }

  const confirmEnable = async (e) => {
    e?.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true); setError('')
    try {
      const { data } = await enableTwoFactor(code.trim())
      setBackupCodes(data.data.backup_codes || [])
      setState('backup-codes')
      toast.success('Two-factor authentication enabled.')
      setCode('')
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid code.')
    } finally { setBusy(false) }
  }

  const confirmDisable = async (e) => {
    e?.preventDefault()
    setBusy(true); setError('')
    try {
      await disableTwoFactor(disablePassword)
      setState('off')
      setDisablePassword('')
      toast.success('Two-factor authentication disabled.')
    } catch (e) {
      setError(e.response?.data?.message || 'Incorrect password.')
    } finally { setBusy(false) }
  }

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      toast.success('Backup codes copied')
    } catch {}
  }

  const printBackupCodes = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Pick&amp;Go LB — Backup codes</title></head>
      <body style="font-family:monospace;padding:40px;line-height:2">
        <h2 style="font-family:sans-serif">Pick&amp;Go LB — backup codes</h2>
        <p style="font-family:sans-serif;color:#555">
          Keep these safe. Each can be used once if you lose access to your authenticator app.
        </p>
        ${backupCodes.map(c => `<div>${c}</div>`).join('')}
      </body></html>
    `)
    w.print()
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return <div style={cardStyle}><p style={{ color: '#9C9894', fontSize: 13 }}>Loading…</p></div>
  }

  if (state === 'off') {
    return (
      <div style={cardStyle}>
        <Header
          title="Two-factor authentication"
          subtitle="Add an extra layer of security. After your password, you'll enter a 6-digit code from an authenticator app on every login."
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
          <Pill kind="off">Not enabled</Pill>
          <button
            type="button"
            onClick={startSetup}
            disabled={busy}
            style={primaryBtn}
          >
            {busy ? 'Loading…' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    )
  }

  if (state === 'setup') {
    return (
      <div style={cardStyle}>
        <Header
          title="Set up two-factor authentication"
          subtitle="Use Google Authenticator, Authy, 1Password, or Microsoft Authenticator. They're all free."
        />
        <ol style={{ paddingLeft: 18, color: '#3F3D3B', fontSize: 13, lineHeight: 1.7, marginTop: 14 }}>
          <li>Install an authenticator app on your phone.</li>
          <li>Scan the QR code below (or enter the secret manually).</li>
          <li>Enter the 6-digit code your app displays.</li>
        </ol>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <div style={{
            padding: 10, background: '#fff', borderRadius: 12,
            border: '1px solid #E4E1D9',
          }}>
            {qrUrl ? (
              <img src={qrUrl} alt="2FA QR code" width="180" height="180" />
            ) : (
              <div style={{ width: 180, height: 180, background: '#F2F0EB' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9C9894', margin: 0 }}>
              Manual entry secret
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#0F172A', wordBreak: 'break-all', margin: '6px 0 12px' }}>
              {secret}
            </p>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(secret).then(() => toast.success('Secret copied')) }}
              style={ghostBtn}
            >
              Copy secret
            </button>
          </div>
        </div>

        <form onSubmit={confirmEnable} style={{ marginTop: 22, display: 'grid', gap: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9C9894' }}>
            6-digit code from your app
          </label>
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setError('') }}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            style={inputStyle}
          />
          {error && <p style={{ color: '#C0392B', fontSize: 12, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setState('off')} style={ghostBtn}>Cancel</button>
            <button type="submit" disabled={busy} style={primaryBtn}>
              {busy ? 'Verifying…' : 'Verify & enable'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (state === 'backup-codes') {
    return (
      <div style={cardStyle}>
        <Header
          title="Save your backup codes"
          subtitle="Each code works once. Use one if you lose your phone or can't open your authenticator app. We won't show them again."
        />
        <div style={{
          marginTop: 16, padding: 18, borderRadius: 12,
          background: '#0F172A', color: '#E4E1D9', fontFamily: 'monospace',
          fontSize: 14, lineHeight: 2,
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4,
        }}>
          {backupCodes.map(c => <div key={c}>{c}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" onClick={copyBackupCodes} style={ghostBtn}>Copy all</button>
          <button type="button" onClick={printBackupCodes} style={ghostBtn}>Print</button>
          <button
            type="button"
            onClick={() => { setState('on'); setBackupCodes([]); setEnabledAt(new Date().toISOString()) }}
            style={primaryBtn}
          >
            I've saved them
          </button>
        </div>
      </div>
    )
  }

  if (state === 'on') {
    return (
      <div style={cardStyle}>
        <Header
          title="Two-factor authentication"
          subtitle="Your account asks for a 6-digit code on every login."
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
          <Pill kind="on">Active</Pill>
          {enabledAt && (
            <span style={{ fontSize: 12, color: '#9C9894' }}>
              Enabled {new Date(enabledAt).toLocaleDateString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setState('disable-pw')}
            style={{ ...ghostBtn, color: '#C0392B', borderColor: '#FCA5A5', marginLeft: 'auto' }}
          >
            Disable
          </button>
        </div>
      </div>
    )
  }

  if (state === 'disable-pw') {
    return (
      <div style={cardStyle}>
        <Header
          title="Disable two-factor"
          subtitle="Confirm your current password to turn off 2FA. Your account will be less secure."
        />
        <form onSubmit={confirmDisable} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <input
            type="password"
            value={disablePassword}
            onChange={e => { setDisablePassword(e.target.value); setError('') }}
            placeholder="Current password"
            autoFocus
            style={inputStyle}
          />
          {error && <p style={{ color: '#C0392B', fontSize: 12, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setState('on'); setDisablePassword(''); setError('') }} style={ghostBtn}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !disablePassword} style={{ ...primaryBtn, background: '#C0392B' }}>
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}

// ── Sub-components & styles ─────────────────────────────────────────────

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

const cardStyle = {
  background: '#fff',
  border: '1px solid #F2F0EB',
  borderRadius: 20,
  padding: '24px 28px',
  marginTop: 24,
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

const inputStyle = {
  width: '100%', height: 44,
  padding: '0 14px', borderRadius: 10,
  border: '1px solid #E4E1D9', background: '#fff',
  fontSize: 14, color: '#0F172A',
  outline: 'none',
  fontFamily: 'monospace', letterSpacing: '0.15em',
}
