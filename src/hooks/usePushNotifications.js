import { useCallback, useEffect, useState } from 'react'
import { getPushPublicKey, subscribePush, unsubscribePush } from '../api/pushApi'

// VAPID public key is base64url-encoded. The PushManager wants a Uint8Array.
function urlBase64ToUint8(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const std     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(std)
  const out     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function abToB64Url(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Push subscription state machine.
 *   supported       — browser exposes Notification + Service Worker + Push APIs
 *   permission      — 'default' | 'granted' | 'denied'
 *   subscribed      — does this browser currently have a subscription on file?
 *   busy            — in the middle of a permission/subscribe flow
 *
 * Actions:
 *   enable()  — request permission, subscribe with the server's VAPID public
 *               key, POST the subscription to the backend.
 *   disable() — unsubscribe locally, tell the backend to drop the row.
 */
export function usePushNotifications() {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')

  // Probe current subscription state on mount.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setSubscribed(!!sub)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) { setError('Notifications not supported in this browser.'); return false }
    setBusy(true); setError('')
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError(perm === 'denied'
          ? 'You blocked notifications. Re-enable in your browser site settings to receive order updates.'
          : 'Notifications were not enabled.')
        return false
      }

      const { data: keyResp } = await getPushPublicKey()
      const publicKey = keyResp?.data?.public_key
      if (!publicKey) { setError('Server is not configured for push.'); return false }

      const reg = await navigator.serviceWorker.ready
      let sub  = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8(publicKey),
        })
      }

      const json = sub.toJSON()
      await subscribePush({
        endpoint: json.endpoint,
        p256dh:   json.keys?.p256dh ?? abToB64Url(sub.getKey('p256dh')),
        auth:     json.keys?.auth   ?? abToB64Url(sub.getKey('auth')),
      })
      setSubscribed(true)
      return true
    } catch (e) {
      setError(e?.message || 'Could not enable notifications.')
      return false
    } finally { setBusy(false) }
  }, [supported])

  const disable = useCallback(async () => {
    if (!supported) return false
    setBusy(true); setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await unsubscribePush({ endpoint }).catch(() => {})
      }
      setSubscribed(false)
      return true
    } catch (e) {
      setError(e?.message || 'Could not disable notifications.')
      return false
    } finally { setBusy(false) }
  }, [supported])

  return { supported, permission, subscribed, busy, error, enable, disable }
}
