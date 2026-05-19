import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[95vw]' }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const onKey = (e) => e.key === 'Escape' && onClose?.()
      window.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
    }
    document.body.style.overflow = ''
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-surface rounded-2xl shadow-2xl w-full animate-scale-in flex flex-col max-h-[90vh] ${widths[size]}`}>
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            {title && <h3 className="text-lg font-bold text-ink">{title}</h3>}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-ink-secondary hover:text-ink"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
