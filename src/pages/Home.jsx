import { useState, useEffect } from 'react'
import { getProducts, getCategories } from '../api/productApi'
import { getHomepageSections } from '../api/adminApi'
import SectionRenderer from '../components/homepage/SectionRenderer'
import Seo from '../components/common/Seo'

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''
const HOME_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MyShop',
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
      {sections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          products={products}
          categories={categories}
          loading={loading}
        />
      ))}
    </div>
  )
}
