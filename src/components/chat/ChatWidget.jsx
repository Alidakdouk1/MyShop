import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import { getMyChat, pollMyChat, sendChat, getChatUnread } from '../../api/chatApi'
import { useToast } from '../../hooks/useToast'

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

// Floating live-chat for logged-in customers. Polls every 3s while open.
export default function ChatWidget() {
  const user  = useSelector(selectUser)
  const toast = useToast()
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(0)

  const lastIdRef = useRef(0)
  const scrollRef = useRef(null)
  const isCustomer = user && user.role !== 'admin'

  const scrollToBottom = () => requestAnimationFrame(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  // Unread badge — poll while the panel is closed.
  useEffect(() => {
    if (!isCustomer || open) return
    let alive = true
    const tick = () => getChatUnread()
      .then(r => { if (alive) setUnread(r.data.data.unread || 0) })
      .catch(() => {})
    tick()
    const iv = setInterval(tick, 12000)
    return () => { alive = false; clearInterval(iv) }
  }, [isCustomer, open])

  // Open — load history, then poll for new messages.
  useEffect(() => {
    if (!isCustomer || !open) return
    let alive = true
    setLoading(true)
    getMyChat()
      .then(r => {
        if (!alive) return
        const msgs = r.data.data.messages || []
        setMessages(msgs)
        lastIdRef.current = msgs.length ? msgs[msgs.length - 1].id : 0
        setUnread(0)
        scrollToBottom()
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })

    const iv = setInterval(() => {
      pollMyChat(lastIdRef.current)
        .then(r => {
          const fresh = r.data.data.messages || []
          if (!alive || !fresh.length) return
          setMessages(m => [...m, ...fresh])
          lastIdRef.current = fresh[fresh.length - 1].id
          scrollToBottom()
        })
        .catch(() => {})
    }, 3000)
    return () => { alive = false; clearInterval(iv) }
  }, [isCustomer, open])

  const handleSend = async () => {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const { data } = await sendChat(body)
      const id = data.data.id
      setMessages(m => [...m, { id, sender_role: 'user', body, created_at: new Date().toISOString() }])
      lastIdRef.current = Math.max(lastIdRef.current, id)
      setInput('')
      scrollToBottom()
    } catch {
      toast.error('Could not send message')
    } finally {
      setSending(false)
    }
  }

  if (!isCustomer) return null

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Live chat"
        className="fixed right-4 bottom-20 md:bottom-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform print:hidden"
        style={{ background: '#0F0F0F' }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {open
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
        </svg>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ background: '#C0392B' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-40 right-4 left-4 bottom-36 sm:left-auto sm:w-[360px] md:bottom-24 rounded-2xl overflow-hidden shadow-2xl flex flex-col print:hidden"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', height: 'min(70vh, 520px)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#0F0F0F' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v6m0 0l3-3m-3 3L9 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">MyShop Support</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>We usually reply within a few hours</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2" style={{ background: '#FAFAF8' }}>
            {loading ? (
              <p className="text-center text-xs" style={{ color: '#9C9894' }}>Loading…</p>
            ) : messages.length === 0 ? (
              <div className="text-center px-6 py-10">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>How can we help?</p>
                <p className="text-xs mt-1" style={{ color: '#9C9894' }}>Send us a message and we&apos;ll reply right here.</p>
              </div>
            ) : messages.map(m => {
              const mine = m.sender_role === 'user'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[78%] px-3 py-2 rounded-2xl text-sm"
                    style={mine
                      ? { background: '#0F0F0F', color: '#fff', borderBottomRightRadius: 4 }
                      : { background: '#fff', color: '#0F0F0F', border: '1px solid rgba(0,0,0,0.08)', borderBottomLeftRadius: 4 }}
                  >
                    {!mine && <p className="text-[10px] font-bold mb-0.5" style={{ color: '#C0392B' }}>Support</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[10px] mt-1 text-right" style={{ color: mine ? 'rgba(255,255,255,0.5)' : '#9C9894' }}>{fmtTime(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Composer */}
          <div className="p-2 flex items-end gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              rows={1}
              placeholder="Type a message…"
              className="flex-1 resize-none text-sm rounded-xl px-3 py-2 outline-none max-h-24"
              style={{ border: '1.5px solid #E4E1D9' }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
              style={{ background: '#0F0F0F' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
