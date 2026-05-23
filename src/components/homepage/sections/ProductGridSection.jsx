import { Link } from 'react-router-dom'
import ProductGrid from '../../product/ProductGrid'

function SectionHeader({ title, subtitle, to, label }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="hero-display text-4xl text-ink tracking-wide">{title}</h2>
        {subtitle && <p className="text-sm text-ink-secondary mt-1">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-bold text-ink hover:text-accent transition-colors flex items-center gap-1 group">
          {label || 'View all'}
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      )}
    </div>
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
