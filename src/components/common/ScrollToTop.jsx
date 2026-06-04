import { useEffect, useState } from 'react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goUp = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      onClick={goUp}
      aria-label="Scroll to top"
      className="fixed right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 print:hidden"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 144px)',
        background: '#0F0F0F',
        color: '#fff',
        boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.85)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#C0392B' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#0F0F0F' }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
