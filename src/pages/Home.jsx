import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategories } from '../api/productApi'
import { getHomepageSections } from '../api/adminApi'
import SectionRenderer from '../components/homepage/SectionRenderer'
import RecentlyViewedRow from '../components/product/RecentlyViewedRow'
import TestimonialsCarousel from '../components/common/TestimonialsCarousel'
import Seo from '../components/common/Seo'

const QUICK_CHIPS = [
  {
    to:    '/shop?on_sale=1',
    label: 'Top Deals',
    icon:  'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
    bg:    'linear-gradient(135deg, rgba(255,69,107,0.12), rgba(255,150,80,0.08))',
    border:'rgba(255,69,107,0.35)',
    color: '#FF456B',
  },
  {
    to:    '/shop?sort=newest',
    label: 'New Arrivals',
    icon:  'M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z',
    bg:    'linear-gradient(135deg, rgba(0,209,193,0.12), rgba(163,255,18,0.10))',
    border:'rgba(0,209,193,0.40)',
    color: '#00D1C1',
  },
  {
    to:    '/shop?sort=popular',
    label: 'Best Sellers',
    icon:  'M8 21V11M16 21V7M3 21h18M5 21V14',
    bg:    'linear-gradient(135deg, rgba(163,255,18,0.14), rgba(0,209,193,0.08))',
    border:'rgba(163,255,18,0.40)',
    color: '#7CC400',
  },
  {
    to:    '/shop',
    label: 'Free Shipping',
    icon:  'M3 7h11v8H3V7zm11 3h4l3 3v2h-7v-5zM6.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    bg:    'linear-gradient(135deg, rgba(15,23,42,0.08), rgba(0,209,193,0.10))',
    border:'rgba(15,23,42,0.20)',
    color: '#0F172A',
  },
]

function QuickChips() {
  return (
    <div
      className="quick-chips-row"
      style={{
        display:        'flex',
        gap:            10,
        padding:        '14px 16px 6px',
        overflowX:      'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {QUICK_CHIPS.map(chip => (
        <Link
          key={chip.label}
          to={chip.to}
          className="quick-chip"
          style={{
            flex:            '0 0 auto',
            display:         'inline-flex',
            alignItems:      'center',
            gap:             8,
            padding:         '10px 16px',
            borderRadius:    999,
            background:      chip.bg,
            border:          `1px solid ${chip.border}`,
            color:           '#0F172A',
            fontWeight:      600,
            fontSize:        13,
            scrollSnapAlign: 'start',
            textDecoration:  'none',
            transition:      'transform .15s ease, box-shadow .15s ease',
          }}
        >
          <span
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          22,
              height:         22,
              borderRadius:   '50%',
              background:     '#fff',
              color:          chip.color,
              flexShrink:     0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={chip.icon} />
            </svg>
          </span>
          {chip.label}
        </Link>
      ))}
    </div>
  )
}

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''
const HOME_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Pick&Go LB',
  url: ORIGIN || undefined,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${ORIGIN}/shop?search={query}`,
    'query-input': 'required name=query',
  },
}

export default function Home() {
  const [sections,   setSections]   = useState([])
  const [categories, setCategories] = useState([])
  const [products,   setProducts]   = useState({})
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      getHomepageSections(),
      getCategories(),
    ])
      .then(([secRes, catRes]) => {
        const sects = secRes.data.data || []
        setSections(sects)
        setCategories(catRes.data.data || [])

        // Collect unique product queries from all product_grid sections
        const grids   = sects.filter(s => s.type === 'product_grid')
        const queries  = [...new Set(grids.map(s => s.section_data?.query || 'bestselling'))]
        const maxLimit = {}
        grids.forEach(s => {
          const q = s.section_data?.query || 'bestselling'
          maxLimit[q] = Math.max(maxLimit[q] || 0, s.section_data?.limit || 8)
        })

        if (queries.length === 0) return
        // Map admin query names to the actual API params the backend understands
        const QUERY_API = {
          bestselling: { sort: 'popular' },
          newest:      { sort: 'newest' },
          featured:    { featured: 1, sort: 'newest' },
          sale:        { on_sale: 1, sort: 'price_asc' },
        }
        Promise.all(
          queries.map(q =>
            getProducts({ limit: maxLimit[q] || 8, ...(QUERY_API[q] || { sort: q }) })
              .then(r => [q, r.data.data || []])
          )
        ).then(results => {
          const cache = {}
          results.forEach(([q, prods]) => { cache[q] = prods })
          setProducts(cache)
        }).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-bg">
      <Seo canonical={ORIGIN ? `${ORIGIN}/` : undefined} jsonLd={HOME_JSONLD} />
      <QuickChips />
      {sections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          products={products}
          categories={categories}
          loading={loading}
        />
      ))}
      <TestimonialsCarousel />
      <RecentlyViewedRow />
    </div>
  )
}
