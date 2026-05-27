import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { googleLoginThunk } from '../../store/slices/authSlice'
import { STORE_CONFIG } from '../../lib/storeConfig'

export default function GoogleSignInButton({ redirectTo = '/' }) {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const ref        = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const clientId = STORE_CONFIG.googleClientId
    if (!clientId) return

    const init = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError(null)
          const result = await dispatch(googleLoginThunk(credential))
          if (googleLoginThunk.fulfilled.match(result)) {
            const user = result.payload.user
            navigate(user.role === 'admin' ? '/admin' : redirectTo, { replace: true })
          } else {
            setError(result.payload || 'Google sign-in failed')
          }
        },
      })
      if (ref.current) {
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          width: ref.current.offsetWidth || 380,
          text: 'continue_with',
          logo_alignment: 'left',
        })
      }
    }

    if (window.google?.accounts?.id) {
      init()
      return
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', init)
      return () => existing.removeEventListener('load', init)
    }

    const script = document.createElement('script')
    script.src   = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = init
    document.head.appendChild(script)
  }, [])

  if (!STORE_CONFIG.googleClientId) return null

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '1.25rem 0',
        }}
      >
        <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
        <span style={{ fontSize: '0.7rem', color: '#9C9894', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          or
        </span>
        <div style={{ flex: 1, height: 1, background: '#E4E1D9' }} />
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid rgba(192,57,43,0.2)',
            color: '#C0392B',
            fontSize: '0.8rem',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={ref}
        style={{ width: '100%', minHeight: 44, display: 'flex', justifyContent: 'center' }}
      />
    </div>
  )
}
