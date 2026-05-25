import { Link } from 'react-router-dom'
import Reveal from '../../common/Reveal'

const SIZE_MAP = { sm: 56, md: 76, lg: 96, xl: 112 }

const SHAPE_STYLES = {
  circle:   { borderRadius: '9999px' },
  rounded:  { borderRadius: '24px' },
  square:   { borderRadius: '8px' },
  sharp:    { borderRadius: '0px' },
  hexagon:  { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' },
  diamond:  { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
}

export default function CategoryCirclesSection({ data = {}, categories = [] }) {
  const maxItems   = data.max_items || 12
  const rows       = Math.max(1, data.rows || 1)
  const sizePx     = SIZE_MAP[data.size || 'md'] || 76
  const shapeKey   = data.shape || 'circle'

  const cats = categories.slice(0, maxItems)
  if (!cats.length) return null

  // ─── Image Banner variant: wide rectangles, always horizontal scroll ─────
  if (shapeKey === 'image_banner') {
    const bannerH = Math.round(sizePx * 1.6)
    const bannerW = Math.round(sizePx * 2.4)
    return (
      <Reveal className="max-w-screen-xl mx-auto px-4 py-8">
        <div
          className="cat-banner-row flex items-start gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          <style>{`.cat-banner-row::-webkit-scrollbar { display: none; }`}</style>
          {cats.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category_id=${cat.id}`}
              className="shrink-0 flex flex-col items-center gap-2 group"
              style={{ width: bannerW }}
            >
              <div
                className="bg-surface-alt overflow-hidden flex items-center justify-center shadow-sm border-2 border-transparent group-hover:border-ink/20 group-hover:shadow-premium group-hover:-translate-y-1 transition-all duration-300 ease-(--ease-out-soft)"
                style={{ width: bannerW, height: bannerH, borderRadius: '12px' }}
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url.startsWith('http') ? cat.image_url : `/MyShop/backend/${cat.image_url}`}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-(--ease-out-soft)"
                  />
                ) : (
                  <span style={{ fontSize: bannerH * 0.42 }}>🛍️</span>
                )}
              </div>
              <span
                className="text-sm font-semibold text-ink-secondary group-hover:text-ink transition-colors text-center leading-tight"
                style={{ width: bannerW }}
              >
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    )
  }

  // ─── Original circle/rounded/etc. variants ───────────────────────────────
  const shapeStyle = SHAPE_STYLES[shapeKey] || SHAPE_STYLES.circle
  const isClipPath = Boolean(shapeStyle.clipPath)
  const itemWidth  = sizePx + 16
  const labelCls   = sizePx < 70 ? 'text-[10px]' : 'text-[11px]'
  const isScroll   = rows === 1
  // Use actual cat count so multi-row layouts distribute items correctly
  const cols       = isScroll ? cats.length : Math.ceil(cats.length / rows)

  return (
    <Reveal className="max-w-screen-xl mx-auto px-4 py-8">
      <div
        className={isScroll ? 'flex items-start gap-4 overflow-x-auto pb-2' : 'grid gap-4 justify-center'}
        style={{
          scrollbarWidth: 'none',
          ...(!isScroll && { gridTemplateColumns: `repeat(${cols}, ${itemWidth}px)` }),
        }}
      >
        {cats.map((cat) => (
          <Link
            key={cat.id}
            to={`/shop?category_id=${cat.id}`}
            className="shrink-0 flex flex-col items-center gap-2 group"
            style={{ width: itemWidth }}
          >
            <div
              className={`bg-surface-alt overflow-hidden flex items-center justify-center shadow-sm transition-all duration-300 ease-(--ease-out-soft) group-hover:-translate-y-1 group-hover:shadow-premium ${isClipPath ? '' : 'border-2 border-transparent group-hover:border-ink/20'}`}
              style={{ width: sizePx, height: sizePx, ...shapeStyle }}
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url.startsWith('http') ? cat.image_url : `/MyShop/backend/${cat.image_url}`}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-110"
                />
              ) : (
                <span style={{ fontSize: sizePx * 0.42 }}>🛍️</span>
              )}
            </div>
            <span
              className={`${labelCls} font-semibold text-ink-secondary group-hover:text-ink transition-colors text-center leading-tight`}
              style={{ width: itemWidth }}
            >
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </Reveal>
  )
}
