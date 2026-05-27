import { useEffect } from 'react'
import SearchBar from './SearchBar'

export default function MobileSearchOverlay({ open, onClose }) {
  // Lock body scroll and close on Escape while the overlay is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] sm:hidden animate-fade-in">
      <SearchBar overlay autoFocus onClose={onClose} />
    </div>
  )
}
