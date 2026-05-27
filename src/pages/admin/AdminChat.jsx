import { useState, useEffect, useRef } from 'react'
import { getAdminConversations, getAdminChatMessages, sendAdminChat, setConversationStatus } from '../../api/chatApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const fmtDay  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function AdminChat() {
  const toast = useToast()
  const [convs,    setConvs]    = useState([])
  const [activeId, setActiveId] = useState(null)
  const [active,   setActive]   = useState(null)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loadingList,   setLoadingList]   = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)

  const lastIdRef = useRef(0)
  const scrollRef = useRef(null)

  const scrollToBottom = () => requestAnimationFrame(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  const loadConversations = () => getAdminConversations()
    .then(r => setConvs(r.data.data || []))
    .catch(() => {})
    .finally(() => setLoadingList(false))

  // Conversation list + poll.
  useEffect(() => {
    loadConversations()
    const iv = setInterval(loadConversations, 8000)
    return () => clearInterval(iv)
  }, [])

  // Active thread — load, mark read, then poll.
  useEffect(() => {
    if (!activeId) return
    let alive = true
    setLoadingThread(true)
    lastIdRef.current = 0
    getAdminChatMessages(activeId)
      .then(r => {
        if (!alive) return
        setActive(r.data.data.conversation)
        const msgs = r.data.data.messages || []
        setMessages(msgs)
        lastIdRef.current = msgs.length ? msgs[msgs.length - 1].id : 0
        scrollToBottom()
        loadConversations()   // refresh unread badges after marking read
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingThread(false) })

    const iv = setInterval(() => {
      getAdminChatMessages(activeId, lastIdRef.current)
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
  }, [activeId])

  const handleSend = async () => {
    const body = input.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    try {
      const { data } = await sendAdminChat(activeId, body)
      const id = data.data.id
      setMessages(m => [...m, { id, sender_role: 'admin', body, created_at: new Date().toISOString() }])
      lastIdRef.current = Math.max(lastIdRef.current, id)
      setInput('')
      scrollToBottom()
    } catch {
      toast.error('Could not send message')
    } finally {
      setSending(false)
    }
  }

  const toggleStatus = async () => {
    if (!active) return
    const next = active.status === 'closed' ? 'open' : 'closed'
    try {
      await setConversationStatus(activeId, next)
      setActive(a => ({ ...a, status: next }))
      setConvs(cs => cs.map(c => c.id === activeId ? { ...c, status: next } : c))
    } catch {
      toast.error('Could not update')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-3.5rem)] lg:h-dvh" style={{ background: '#fff' }}>

      {/* Conversation list */}
      <div className={`${activeId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 shrink-0`} style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="px-5 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h1 className="font-black tracking-tight text-xl" style={{ color: '#0F0F0F' }}>Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center py-10"><Spinner className="text-ink-tertiary" /></div>
          ) : convs.length === 0 ? (
            <p className="text-center text-sm py-10" style={{ color: '#9C9894' }}>No conversations yet.</p>
          ) : convs.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/[0.02] transition-colors"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', background: activeId === c.id ? '#F0EEE9' : 'transparent' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0" style={{ background: '#F0EEE9', color: '#5C5854' }}>
                {c.user_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate" style={{ color: '#0F0F0F' }}>{c.user_name}</span>
                  <span className="text-[10px] shrink-0" style={{ color: '#9C9894' }}>{c.last_message_at ? fmtDay(c.last_message_at) : ''}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs truncate" style={{ color: '#9C9894' }}>
                    {c.last_role === 'admin' ? 'You: ' : ''}{c.last_body || 'No messages'}
                  </span>
                  {Number(c.unread) > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0" style={{ background: '#C0392B' }}>{c.unread}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`${activeId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`} style={{ background: '#FAFAF8' }}>
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#9C9894' }}>
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="px-4 h-16 flex items-center gap-3 shrink-0" style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => setActiveId(null)} className="lg:hidden text-ink-tertiary" aria-label="Back">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: '#0F0F0F' }}>{active?.user_name}</p>
                <p className="text-[11px] truncate" style={{ color: '#9C9894' }}>{active?.user_email}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={active?.status === 'closed' ? { background: '#F4F4F4', color: '#9C9894' } : { background: '#F0FDF4', color: '#16A34A' }}>{active?.status}</span>
              <button onClick={toggleStatus} className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors hover:bg-black/[0.03]" style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#5C5854' }}>
                {active?.status === 'closed' ? 'Reopen' : 'Close'}
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingThread ? (
                <div className="flex justify-center py-10"><Spinner className="text-ink-tertiary" /></div>
              ) : messages.map(m => {
                const mine = m.sender_role === 'admin'
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[70%] px-3 py-2 rounded-2xl text-sm"
                      style={mine
                        ? { background: '#0F0F0F', color: '#fff', borderBottomRightRadius: 4 }
                        : { background: '#fff', color: '#0F0F0F', border: '1px solid rgba(0,0,0,0.08)', borderBottomLeftRadius: 4 }}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] mt-1 text-right" style={{ color: mine ? 'rgba(255,255,255,0.5)' : '#9C9894' }}>{fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 flex items-end gap-2 shrink-0" style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                rows={1}
                placeholder="Type your reply…"
                className="flex-1 resize-none text-sm rounded-xl px-3 py-2 outline-none max-h-32"
                style={{ border: '1.5px solid #E4E1D9' }}
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} className="px-4 h-10 rounded-xl text-sm font-bold text-white shrink-0 transition-opacity disabled:opacity-40" style={{ background: '#0F0F0F' }}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
