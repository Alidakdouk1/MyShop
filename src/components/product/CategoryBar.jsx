import { useState, useEffect, useRef } from 'react'
import { useHeaderUI } from '../layout/Layout'

function resolveImg(raw) {
  if (!raw) return null
  if (raw.startsWith('http') || raw.startsWith('/')) return raw
  return `/MyShop/backend/${raw}`
}

export default function CategoryBar({ categories = [], sections = [], activeId, onSelect }) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [hoverParent, setHoverParent] = useState(null)
  const scrollRef = useRef(null)
  const menuRef   = useRef(null)
  const menuBtnRef = useRef(null)
  const closeTimer = useRef(null)

  // Header height + hidden state, so this bar sits flush under the header and
  // hides/shows together with it as one block on scroll.
  const { hidden, headerHeight } = useHeaderUI()

  // Hover open/close with a small grace delay so moving from the button to the
  // menu doesn't flicker it shut.
  const openMenu  = () => { clearTimeout(closeTimer.current); setMenuOpen(true) }
  const closeSoon = () => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setMenuOpen(false), 140) }
  // Open the mega menu focused on a parent (defaults to the first with subcategories).
  const openMenuFor = (parentId) => {
    clearTimeout(closeTimer.current)
    const target = parentId ?? (parents.find(p => (childMap[p.id] || []).length) || parents[0])?.id
    setHoverParent(target ?? null)
    setMenuOpen(true)
  }
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const parents  = categories.filter(c => !c.parent_id)
  const childMap = {}
  categories.filter(c => c.parent_id).forEach(c => {
    if (!childMap[c.parent_id]) childMap[c.parent_id] = []
    childMap[c.parent_id].push(c)
  })

  // Close menu on Esc / click outside
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return
      if (menuBtnRef.current?.contains(e.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [menuOpen])

  const scrollBy = (dx) => {
    scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

  const handlePick = (id) => {
    setMenuOpen(false)
    onSelect?.(id)
  }

  if (parents.length === 0) return null

  const activeChildren = hoverParent != null ? (childMap[hoverParent] || []) : []
  const activeParentObj = parents.find(p => p.id === hoverParent)

  // Titled "others" blocks for the hovered parent, in display order.
  const activeSections = hoverParent != null
    ? [...sections]
        .filter(s => String(s.category_id) === String(hoverParent))
        .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
    : []
  const sectionIds   = new Set(activeSections.map(s => String(s.id)))
  // Children with no section (or a stale one) make up the category's main block.
  const mainChildren = activeChildren.filter(c => !c.section_id || !sectionIds.has(String(c.section_id)))
  const childrenOfSection = (sid) => activeChildren.filter(c => String(c.section_id) === String(sid))
  const sectionsWithItems = activeSections.filter(s => childrenOfSection(s.id).length > 0)

  // One circular sub-category tile — shared by every block.
  const renderItem = (child) => {
    const img = resolveImg(child.image_url || child.image)
    return (
      <button
        key={child.id}
        onClick={() => handlePick(child.id)}
        className="group flex flex-col items-center gap-2 w-[78px]"
      >
        {img ? (
          <img
            src={img}
            alt={child.name}
            className="w-[78px] h-[78px] rounded-full object-cover border-2 border-transparent group-hover:border-ink transition-colors"
          />
        ) : (
          <div className="w-[78px] h-[78px] rounded-full bg-surface-alt flex items-center justify-center text-lg font-bold uppercase text-ink-tertiary border-2 border-transparent group-hover:border-ink transition-colors">
            {child.name[0]}
          </div>
        )}
        <span className="text-xs text-center text-ink-secondary group-hover:text-ink leading-tight line-clamp-2">
          {child.name}
        </span>
      </button>
    )
  }

  return (
    <div
      className="sticky z-40 bg-surface border-b border-border transition-transform duration-300 will-change-transform"
      style={{
        top: headerHeight,
        // When the header hides, slide this bar fully off the top with it
        // (its own height + the header's height) so they move as one block.
        transform: hidden ? `translateY(calc(-100% - ${headerHeight}px))` : 'translateY(0)',
      }}
    >
      <div className="relative max-w-screen-xl mx-auto px-4">
        {/* ── Scrollable row ───────────────────────────────────── */}
        <div className="relative flex items-center">
          {/* Left arrow */}
          <button
            aria-label="Scroll left"
            onClick={() => scrollBy(-240)}
            className="hidden md:flex absolute -left-3 z-10 w-8 h-8 rounded-full bg-surface border border-border items-center justify-center shadow-sm hover:bg-surface-alt transition-colors"
          >
            <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={scrollRef}
            className="cat-row flex items-center gap-2 overflow-x-auto scroll-smooth py-2 px-1 md:px-6"
            style={{ scrollbarWidth: 'none' }}
          >
            <style>{`.cat-row::-webkit-scrollbar { display: none; }`}</style>

            {/* "Categories" trigger */}
            <button
              ref={menuBtnRef}
              onClick={() => (menuOpen ? setMenuOpen(false) : openMenuFor())}
              onMouseEnter={() => openMenuFor()}
              onMouseLeave={closeSoon}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                ${menuOpen
                  ? 'bg-ink text-white'
                  : 'bg-surface-alt text-ink hover:bg-border/70'}`}
            >
              Categories
              <svg
                className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Parent links — plain text that turn into a "Categories"-style box on hover */}
            {parents.map(p => {
              const isActive = String(activeId) === String(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => handlePick(p.id)}
                  onMouseEnter={() => { if ((childMap[p.id] || []).length) openMenuFor(p.id) }}
                  onMouseLeave={closeSoon}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm transition-colors
                    ${isActive
                      ? 'bg-surface-alt text-ink font-semibold'
                      : 'text-ink font-medium hover:bg-surface-alt'}`}
                >
                  {p.name}
                </button>
              )
            })}
          </div>

          {/* Right arrow */}
          <button
            aria-label="Scroll right"
            onClick={() => scrollBy(240)}
            className="hidden md:flex absolute -right-3 z-10 w-8 h-8 rounded-full bg-surface border border-border items-center justify-center shadow-sm hover:bg-surface-alt transition-colors"
          >
            <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* ── Mega menu ────────────────────────────────────────── */}
        {menuOpen && (
          <div
            ref={menuRef}
            onMouseEnter={openMenu}
            onMouseLeave={closeSoon}
            className="absolute left-4 right-4 top-full z-40 bg-surface border border-border border-t-0 rounded-b-2xl shadow-2xl animate-slide-down overflow-hidden"
          >
            <div className="flex" style={{ maxHeight: '70vh' }}>
              {/* Left: parent list */}
              <div className="w-52 shrink-0 border-r border-border bg-surface-alt/40 overflow-y-auto py-2">
                {parents.map(p => {
                  const isHover = hoverParent === p.id
                  return (
                    <button
                      key={p.id}
                      onMouseEnter={() => setHoverParent(p.id)}
                      onClick={() => handlePick(p.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors
                        ${isHover
                          ? 'bg-surface text-ink font-semibold'
                          : 'text-ink-secondary hover:bg-surface hover:text-ink'}`}
                    >
                      <span className="truncate">{p.name}</span>
                      <svg className="w-3.5 h-3.5 shrink-0 text-ink-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>

              {/* Right: main subcategories | divider | section blocks */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex gap-x-10">
                  {/* Main block — the parent's own subcategories, with a View All tile */}
                  {activeParentObj && (
                    <section className="min-w-0 shrink-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                        </svg>
                        <span className="truncate">{activeParentObj.name}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                        {/* "View All" tile */}
                        <button
                          onClick={() => handlePick(activeParentObj.id)}
                          className="group flex flex-col items-center gap-2 w-[78px]"
                        >
                          <div className="w-[78px] h-[78px] rounded-full bg-surface-alt flex items-center justify-center border-2 border-transparent group-hover:border-ink transition-colors">
                            <svg className="w-7 h-7 text-ink-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v4H4zM14 16h6v4h-6z" />
                            </svg>
                          </div>
                          <span className="text-xs text-center text-ink-secondary group-hover:text-ink leading-tight">
                            View All
                          </span>
                        </button>
                        {mainChildren.map(renderItem)}
                      </div>
                    </section>
                  )}

                  {/* Vertical divider between subcategories and sections */}
                  {activeParentObj && sectionsWithItems.length > 0 && (
                    <div className="w-px self-stretch bg-border shrink-0" aria-hidden="true" />
                  )}

                  {/* One block per section ("others") */}
                  {sectionsWithItems.length > 0 && (
                    <div className="flex flex-wrap gap-x-10 gap-y-7 min-w-0 flex-1">
                      {sectionsWithItems.map(sec => (
                        <section key={sec.id} className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-ink mb-4 flex items-center gap-2">
                            <span className="truncate">{sec.title}</span>
                          </p>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                            {childrenOfSection(sec.id).map(renderItem)}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {activeParentObj && activeChildren.length === 0 && activeSections.length === 0 && (
                    <div className="text-sm text-ink-tertiary">
                      No subcategories.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
