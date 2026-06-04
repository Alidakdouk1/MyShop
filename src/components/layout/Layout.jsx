import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import BottomNav from './BottomNav'
import ToastContainer from '../ui/Toast'
import WhatsAppButton from '../common/WhatsAppButton'
import ChatWidget from '../chat/ChatWidget'
import ScrollToTop from '../common/ScrollToTop'
import LiveActivityTicker from '../common/LiveActivityTicker'
import NewsletterPopup from '../common/NewsletterPopup'
import CompareBar from '../compare/CompareBar'

// Shared header state so sticky sub-bars (e.g. the Shop category bar) can
// follow the header as it hides/shows on scroll.
const HeaderUIContext = createContext({ hidden: false, headerHeight: 0 })
export const useHeaderUI = () => useContext(HeaderUIContext)

export default function Layout({ children }) {
  const [hidden, setHidden]             = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef(null)
  const lastY     = useRef(0)

  // Keep the measured header height up to date (announcement bar loads async).
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Hide the header when scrolling down past its own height, reveal on scroll up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const h = headerRef.current?.offsetHeight || 0
      if (y > lastY.current && y > h) {
        setHidden(true)        // scrolling down, past the header
      } else if (y < lastY.current) {
        setHidden(false)       // scrolling up
      }
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <HeaderUIContext.Provider value={{ hidden, headerHeight }}>
      <div className="min-h-dvh flex flex-col bg-bg">
        <Navbar headerRef={headerRef} hidden={hidden} />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Spacer so page content clears the fixed mobile bottom nav */}
        <div className="h-[68px] md:hidden" aria-hidden="true" />
        <BottomNav />
        <WhatsAppButton />
        <ChatWidget />
        <ScrollToTop />
        <LiveActivityTicker />
        <NewsletterPopup />
        <CompareBar />
        <ToastContainer />
      </div>
    </HeaderUIContext.Provider>
  )
}

export function DashboardLayout({ children, sidebar }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-8">
        <div className="flex gap-8">
          {sidebar && <aside className="w-60 shrink-0 hidden lg:block">{sidebar}</aside>}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
      <ToastContainer />
    </div>
  )
}
