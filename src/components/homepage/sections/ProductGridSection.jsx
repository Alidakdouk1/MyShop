import { Link } from 'react-router-dom'
import ProductGrid from '../../product/ProductGrid'
import Reveal from '../../common/Reveal'

function SectionHeader({ title, subtitle, to, label }) {
  return (
    <Reveal className="flex items-end justify-between mb-6">
      <div>
        <h2 className="hero-display text-4xl text-ink tracking-wide">{title}</h2>
        <span className="block mt-2 h-1 w-12 rounded-full bg-accent/80" aria-hidden="true" />
        {subtitle && <p className="text-sm text-ink-secondary mt-2">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-bold text-ink hover:text-accent transition-colors flex items-center gap-1 group shrink-0">
          {label || 'View all'}
          <span className="group-hover:translate-x-1 transition-transform duration-300 ease-(--ease-out-soft)">→</span>
        </Link>
      )}
    </Reveal>
  )
}

export default function ProductGridSection({ data = {}, products = {}, loading = false }) {
  const query      = data.query       || 'bestselling'
  const limit      = data.limit       || 8
  const cols       = data.cols        || 4
  const mobileCols = data.mobile_cols || 2
  const cardShape  = data.card_shape  || 'rounded'
  const layoutMode = data.layout_mode || 'grid'
  const scrollSize = data.scroll_size || 'md'
  const prods      = (products[query] || []).slice(0, limit)

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-6">
      <SectionHeader
        title={data.title || 'Products'}
        subtitle={data.subtitle}
        to={data.view_all_link}
        label={data.view_all_label}
      />
      <ProductGrid
        products={prods}
        loading={loading}
        cols={cols}
        mobileCols={mobileCols}
        cardShape={cardShape}
        layoutMode={layoutMode}
        scrollSize={scrollSize}
      />
    </section>
  )
}
