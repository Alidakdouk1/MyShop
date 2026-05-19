import Navbar from './Navbar'
import Footer from './Footer'
import ToastContainer from '../ui/Toast'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
    </div>
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
