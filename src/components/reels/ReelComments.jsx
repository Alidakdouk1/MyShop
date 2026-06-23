import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import { getReelComments, postReelComment, deleteReelComment } from '../../api/reelsApi'
import { resolveImg } from '../../lib/img'

/**
 * Bottom-sheet comments drawer for a single reel. Mounts via portal so the
 * fixed positioning isn't trapped by any transformed ancestor of the Reels
 * page (we learned this lesson on the lightbox).
 *
 * Props:
 *   reelId       – id of the reel
 *   open         – whether the drawer is mounted
 *   onClose      – dismiss handler
 *   onCountChange – called with the new comment count after add/delete so the
 *                   parent can keep the on-screen badge in sync
 */
export default function ReelComments({ reelId, open, onClose, onCountChange }) {
  const user  = useSelector(selectUser)
  const toast = useToast()
  const [list,    setList]    = useState(null)  // null = loading
  const [text,    setText]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open || !reelId) return
    let cancelled = false
    setList(null)
    getReelComments(reelId)
      .then(r => { if (!cancelled) setList(r.data.data?.comments || []) })
      .catch(() => { if (!cancelled) setList([]) })
    return () => { cancelled = true }
  }, [open, reelId])

  // Auto-focus the input when the drawer opens, but only on devices where a
  // keyboard popup won't shove the layout (skip on touch).
  useEffect(() => {
    if (open && !('ontouchstart' in window)) {
      setTimeout(() => inputRef.current?.focus(), 240)
    }
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (!user)        { toast.info('Please log in to comment'); return }
    if (!text.trim()) return
    setBusy(true)
    try {
      const { data } = await postReelComment(reelId, text.trim())
      const newRow = data.data?.comment
      if (newRow) {
        setList(prev => [newRow, ...(prev || [])])
        onCountChange?.((list?.length || 0) + 1)
      }
      setText('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post comment')
    } finally { setBusy(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteReelComment(id)
      setList(prev => prev.filter(c => c.id !== id))
      onCountChange?.(Math.max(0, (list?.length || 1) - 1))
    } catch {
      toast.error('Could not delete')
    }
  }

  if (!open) return null

  return createPortal((
    <div
      role="dialog"
      aria-label="Comments"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '78dvh',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Handle + title */}
        <div style={{ padding: '10px 16px 0', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', width: 36, height: 4, borderRadius: 2,
            background: '#E5E2DA',
          }} />
        </div>
        <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid #F2F0EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>
            Comments {list && <span style={{ color: '#9C9894', fontWeight: 500 }}>· {list.length}</span>}
          </p>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9C9894', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {list === null ? (
            <p style={{ textAlign: 'center', color: '#9C9894', fontSize: 13, padding: '24px 0' }}>Loading…</p>
          ) : list.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9C9894', fontSize: 13, padding: '32px 0' }}>
              Be the first to comment.
            </p>
          ) : (
            list.map(c => {
              const canDelete = user && (user.role === 'admin' || Number(user.id) === Number(c.user_id))
              const initials  = (c.user_name || '?').slice(0, 1).toUpperCase()
              const avatar    = c.avatar_url ? resolveImg(c.avatar_url) : null
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #F8F6F1' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: avatar ? `url(${avatar}) center/cover` : '#0F172A',
                    color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {!avatar && initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                        {c.user_name || 'Anonymous'}
                      </span>
                      <span style={{ fontSize: 11, color: '#9C9894' }}>
                        {fmtTime(c.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#3F3D3B', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {c.body}
                    </p>
                  </div>
                  {canDelete && (
                    <button onClick={() => del(c.id)} aria-label="Delete comment"
                      style={{ background: 'none', border: 'none', color: '#9C9894', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={submit}
          style={{
            display: 'flex', gap: 8, padding: '10px 14px',
            borderTop: '1px solid #F2F0EB', background: '#FAFAFC',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
          }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={user ? 'Add a comment…' : 'Log in to comment'}
            disabled={!user || busy}
            maxLength={600}
            style={{
              flex: 1, height: 40, padding: '0 14px',
              border: '1.5px solid #E5E2DA', borderRadius: 999, background: '#fff',
              fontSize: 14, color: '#0F172A', outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!user || busy || !text.trim()}
            style={{
              height: 40, padding: '0 18px', borderRadius: 999, border: 'none',
              background: !user || !text.trim() ? '#E5E2DA' : 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {busy ? '…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  ), document.body)
}

// "5m ago" / "2h ago" / "3d ago" — keeps timestamps compact in the list.
function fmtTime(iso) {
  if (!iso) return ''
  const t = new Date(String(iso).replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
