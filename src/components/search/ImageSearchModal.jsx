import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchByImage } from '../../api/searchApi'
import { resolveImg } from '../../lib/img'
import { useCurrency } from '../../context/CurrencyContext'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

// Lifecycle:
//   idle      → camera + gallery CTAs
//   camera    → live webcam preview + snap button (desktop / mobile w/ permission)
//   preview   → file picked, "Search" + "Pick another" buttons
//   searching → spinner over preview, API call in flight
//   done      → labels chip row + product grid (or "no matches")
//   error     → error message + try-again button
export default function ImageSearchModal({ open, onClose }) {
  const [file,    setFile]    = useState(null)
  const [preview, setPreview] = useState('')
  const [state,   setState]   = useState('idle')
  const [labels,  setLabels]  = useState([])
  const [results, setResults] = useState([])
  const [error,   setError]   = useState('')
  const [stream,  setStream]  = useState(null)
  const inputRef  = useRef(null)   // gallery picker — no capture attr
  const cameraRef = useRef(null)   // mobile fallback — capture="environment"
  const videoRef  = useRef(null)
  const { format } = useCurrency()

  // Stop any live camera stream — used on cancel, snap, modal close.
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }

  // Reset when the modal closes so the next open is clean.
  useEffect(() => {
    if (!open) {
      setFile(null); setPreview(''); setState('idle')
      setLabels([]); setResults([]); setError('')
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Wire the live stream onto the <video> element whenever it mounts.
  useEffect(() => {
    if (state === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [state, stream])

  // Revoke object-URL when we move on to a new preview / unmount.
  useEffect(() => {
    return () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview) }
  }, [preview])

  if (!open) return null

  const pick = (f) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image is too large (max 5 MB).'); setState('error'); return }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
    setLabels([]); setResults([])
    setState('preview')
  }

  const run = async () => {
    if (!file) return
    setState('searching')
    setError('')
    try {
      const { data } = await searchByImage(file)
      setLabels(data.data?.labels   || [])
      setResults(data.data?.products || [])
      setState('done')
    } catch (e) {
      setError(e.response?.data?.message || 'Search failed. Please try again.')
      setState('error')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    pick(e.dataTransfer.files?.[0])
  }

  // Try to open the device camera via MediaDevices (works on desktop too).
  // On mobile browsers without getUserMedia or on permission denial, fall back
  // to the native file input with capture="environment" so users still get
  // their phone camera via the OS picker.
  const startCamera = async () => {
    setError('')
    const hasMediaDevices = typeof navigator !== 'undefined'
      && navigator.mediaDevices?.getUserMedia
    if (!hasMediaDevices) {
      cameraRef.current?.click()
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(s)
      setState('camera')
    } catch {
      // Permission denied / no camera / blocked by the browser — fall back.
      cameraRef.current?.click()
    }
  }

  // Capture the current video frame into a JPEG File, then run it through pick().
  const snap = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const f = new File([blob], `snap-${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        pick(f)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl relative overflow-hidden"
        style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#fff' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,209,193,0.18)', color: '#00D1C1' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </span>
            <div>
              <p className="font-bold text-base leading-tight">Search by image</p>
              <p className="text-[11px] opacity-75 mt-0.5">Upload a photo, we'll find similar products.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(90vh - 72px)' }}>
          {/* Idle: camera + gallery side by side, drop-zone hint below */}
          {state === 'idle' && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {/* Take photo — uses MediaDevices on desktop, falls back to
                    native picker (capture="environment") on mobile when blocked. */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-colors"
                  style={{
                    padding: '24px 12px',
                    background: 'linear-gradient(135deg, #00D1C1 0%, #0AAFA3 100%)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </span>
                  <p className="font-bold text-sm">Take photo</p>
                  <p className="text-[11px] opacity-85">Use your camera</p>
                </button>

                {/* From gallery — standard file picker */}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors"
                  style={{
                    padding: '24px 12px',
                    borderColor: '#E4E1D9', background: '#FAFAF8',
                    color: '#0F172A', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(0,209,193,0.12)', color: '#00D1C1',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </span>
                  <p className="font-bold text-sm">From gallery</p>
                  <p className="text-[11px] text-ink-tertiary">or drag &amp; drop</p>
                </button>
              </div>
              <p className="text-[11px] text-ink-tertiary text-center mt-3">
                JPG, PNG, WebP, GIF · max 5 MB
              </p>
            </div>
          )}

          {/* Live camera preview + snap / cancel buttons */}
          {state === 'camera' && (
            <div>
              <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '4/3', background: '#000' }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Corner brackets — purely cosmetic, hints "frame your subject" */}
                {[
                  { top: 10, left: 10,   br: '14px 0 0 0' },
                  { top: 10, right: 10,  br: '0 14px 0 0' },
                  { bottom: 10, left: 10,  br: '0 0 0 14px' },
                  { bottom: 10, right: 10, br: '0 0 14px 0' },
                ].map((s, i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 24, height: 24,
                    borderTop:    s.top    !== undefined ? '2px solid #00D1C1' : 'none',
                    borderBottom: s.bottom !== undefined ? '2px solid #00D1C1' : 'none',
                    borderLeft:   s.left   !== undefined ? '2px solid #00D1C1' : 'none',
                    borderRight:  s.right  !== undefined ? '2px solid #00D1C1' : 'none',
                    borderRadius: s.br,
                    ...s,
                  }} />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { stopStream(); setState('idle') }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border"
                  style={{ borderColor: '#E4E1D9', color: '#0F172A', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  onClick={snap}
                  className="flex-[2] py-3 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #00D1C1 0%, #0AAFA3 100%)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Snap
                </button>
              </div>
            </div>
          )}

          {/* Preview / Searching / Done — all share a top image area */}
          {state !== 'idle' && state !== 'camera' && preview && (
            <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '4/3', background: '#F2F0EB' }}>
              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {state === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(15,23,42,0.6)', color: '#fff' }}>
                  <div
                    style={{
                      width: 36, height: 36,
                      border: '3px solid rgba(255,255,255,0.25)',
                      borderTopColor: '#00D1C1',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <p className="text-sm font-semibold">Looking for similar products…</p>
                </div>
              )}
            </div>
          )}

          {/* Preview actions */}
          {state === 'preview' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 py-3 rounded-xl text-sm font-bold border"
                style={{ borderColor: '#E4E1D9', color: '#0F172A', background: '#fff' }}
              >
                Pick another
              </button>
              <button
                onClick={run}
                className="flex-[2] py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #00D1C1 0%, #0AAFA3 100%)' }}
              >
                Search
              </button>
            </div>
          )}

          {/* Done: labels + products */}
          {state === 'done' && (
            <>
              {labels.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">
                    Detected in your photo
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.slice(0, 8).map(l => (
                      <span
                        key={l}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(0,209,193,0.12)', color: '#0AAFA3' }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                {results.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="font-bold text-ink">No matching products</p>
                    <p className="text-sm text-ink-tertiary mt-1">Try a clearer photo of a single item.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">
                      {results.length} match{results.length === 1 ? '' : 'es'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {results.map(p => {
                        const price = Number(p.sale_price || p.base_price)
                        return (
                          <Link
                            key={p.id}
                            to={`/products/${p.slug}`}
                            onClick={onClose}
                            className="block rounded-xl overflow-hidden border hover:shadow-md transition-shadow"
                            style={{ borderColor: '#E4E1D9', background: '#fff' }}
                          >
                            <div style={{ aspectRatio: '1/1', background: '#F2F0EB' }}>
                              <img
                                src={p.primary_image ? resolveImg(p.primary_image) : 'https://placehold.co/200/F2F0EB/9C9894?text=P'}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-semibold text-ink line-clamp-2 leading-snug">{p.name}</p>
                              <p className="text-sm font-bold text-ink mt-1">{format(price)}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-bold border"
                  style={{ borderColor: '#E4E1D9', color: '#0F172A', background: '#fff' }}
                >
                  Try another photo
                </button>
              </div>
            </>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="mt-4 text-center">
              <p className="text-4xl mb-2">⚠️</p>
              <p className="font-bold text-ink">Search didn't work</p>
              <p className="text-sm text-ink-tertiary mt-1 mb-4">{error}</p>
              <button
                onClick={() => { setState('idle'); setError('') }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#0F172A' }}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Hidden inputs — gallery picker + camera capture.
            Two inputs because `capture` is sticky once set: a single input with
            capture attached would always force the camera. */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => pick(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT}
          capture="environment"
          onChange={(e) => pick(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
