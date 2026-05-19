export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <PagBtn onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </PagBtn>

      {pages[0] > 1 && <>
        <PagBtn onClick={() => onPageChange(1)}>1</PagBtn>
        {pages[0] > 2 && <span className="px-2 text-ink-tertiary">…</span>}
      </>}

      {pages.map(p => (
        <PagBtn key={p} onClick={() => onPageChange(p)} active={p === currentPage}>{p}</PagBtn>
      ))}

      {pages[pages.length - 1] < totalPages && <>
        {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-ink-tertiary">…</span>}
        <PagBtn onClick={() => onPageChange(totalPages)}>{totalPages}</PagBtn>
      </>}

      <PagBtn onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </PagBtn>
    </div>
  )
}

function PagBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-ink text-white'
          : 'hover:bg-surface-alt text-ink-secondary hover:text-ink'
        }`}
    >
      {children}
    </button>
  )
}
