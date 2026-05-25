import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAdminProducts, adminDeleteProduct, exportProductsCsv, importProductsCsv } from '../../api/adminApi'
import { getCategoriesFlat } from '../../api/productApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/common/Pagination'

const STATUS_STYLE = {
  active:   { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' },
  draft:    { bg: '#F5F4F0', text: '#5C5854', dot: '#9C9894' },
  archived: { bg: '#F0EEE9', text: '#9C9894', dot: '#C4C0BB' },
}

export default function AdminProducts() {
  const toast    = useToast()
  const navigate = useNavigate()
  const [products,    setProducts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [search,      setSearch]      = useState('')
  const [categories,  setCategories]  = useState([])
  const [parentId,    setParentId]    = useState('')   // selected top-level category
  const [subId,       setSubId]       = useState('')   // selected subcategory
  const [deleting,    setDeleting]    = useState(null)
  const [view,        setView]        = useState('table') // 'table' | 'grid'
  const [importing,   setImporting]   = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    getCategoriesFlat()
      .then(r => setCategories(r.data.data || []))
      .catch(() => {})
  }, [])

  const parents  = categories.filter(c => !c.parent_id)
  const children = categories.filter(c => c.parent_id && String(c.parent_id) === parentId)

  const load = (pg = page, q = search, catId = subId || parentId) => {
    setLoading(true)
    getAdminProducts({ page: pg, search: q || undefined, category_id: catId || undefined })
      .then(r => {
        setProducts(r.data.data || [])
        setTotalPages(r.data.meta?.last_page || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const handleSearch = e => { e.preventDefault(); setPage(1); load(1, search, subId || parentId) }

  const handleExport = async () => {
    try {
      const res = await exportProductsCsv()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await importProductsCsv(fd)
      const d = data.data || {}
      toast.success(`Imported: ${d.created || 0} new, ${d.updated || 0} updated${d.errors?.length ? `, ${d.errors.length} skipped` : ''}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const selectParent = (pid) => {
    setParentId(pid)
    setSubId('')
    setPage(1)
    load(1, search, pid)
  }

  const selectSub = (sid) => {
    setSubId(sid)
    setPage(1)
    load(1, search, sid || parentId)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Permanently delete "${name}"?`)) return
    setDeleting(id)
    try {
      await adminDeleteProduct(id); toast.success('Product deleted'); load()
    } catch { toast.error('Cannot delete this product') }
    finally { setDeleting(null) }
  }

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#F0EEE9' }}>

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#9C9894' }}>Catalog</p>
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0F0F0F', letterSpacing: '0.03em' }}>
            PRODUCTS
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:bg-surface-alt"
            style={{ background: '#fff', color: '#0F0F0F', border: '1px solid rgba(0,0,0,0.12)' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:bg-surface-alt disabled:opacity-60"
            style={{ background: '#fff', color: '#0F0F0F', border: '1px solid rgba(0,0,0,0.12)' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6.707-12.707a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L8 7.414V13a1 1 0 102 0V7.414l1.293 1.293a1 1 0 001.414-1.414l-3-3z" clipRule="evenodd" /></svg>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
          <button
            onClick={() => navigate('/admin/products/new')}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: '#0F0F0F' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Category filter — row 1: parent categories */}
      {parents.length > 0 && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button
            onClick={() => selectParent('')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={parentId === ''
              ? { background: '#0F0F0F', color: '#fff' }
              : { background: '#fff', color: '#5C5854', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            All
          </button>
          {parents.map(p => (
            <button
              key={p.id}
              onClick={() => selectParent(String(p.id))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              style={parentId === String(p.id)
                ? { background: '#0F0F0F', color: '#fff' }
                : { background: '#fff', color: '#5C5854', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Category filter — row 2: subcategories of selected parent */}
      {parentId && children.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap pl-1">
          <span className="text-[10px] font-bold tracking-widest uppercase mr-1" style={{ color: '#C4C0BB' }}>
            {parents.find(p => String(p.id) === parentId)?.name}
          </span>
          <button
            onClick={() => selectSub('')}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={subId === ''
              ? { background: '#5C5854', color: '#fff' }
              : { background: '#ECEAE6', color: '#5C5854' }}
          >
            All
          </button>
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => selectSub(String(c.id))}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={subId === String(c.id)
                ? { background: '#5C5854', color: '#fff' }
                : { background: '#ECEAE6', color: '#5C5854' }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* spacer when no subcategory row */}
      {(!parentId || children.length === 0) && parents.length > 0 && <div className="mb-4" />}

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9C9894' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products or SKU…"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: '#0F0F0F' }}
              onFocus={e => e.target.style.borderColor = '#0F0F0F'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
            />
          </div>
          <button
            type="submit"
            className="text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: '#0F0F0F', color: '#fff' }}
          >
            Search
          </button>
        </form>

        {/* View toggle */}
        <div className="flex items-center rounded-xl p-1 ml-auto" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
          {[
            { k: 'table', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" /></svg> },
            { k: 'grid',  icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
          ].map(({ k, icon }) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className="p-2 rounded-lg transition-all"
              style={view === k ? { background: '#0F0F0F', color: '#fff' } : { color: '#9C9894' }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: '#9C9894' }}>No products found</p>
          <button onClick={() => navigate('/admin/products/new')} className="text-sm font-bold" style={{ color: '#C0392B' }}>
            Add the first one →
          </button>
        </div>
      ) : view === 'table' ? (

        /* ── TABLE VIEW ── */
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
                  {['Product', 'SKU', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: '#9C9894' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const img   = p.primary_image ? `/MyShop/backend/${p.primary_image}` : null
                  const price = Number(p.sale_price || p.base_price || 0)
                  const ss    = STATUS_STYLE[p.status] || STATUS_STYLE.active
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < products.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9F8F6'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#F0EEE9' }}>
                            {img
                              ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              : <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: '#C4C0BB' }}><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                            }
                          </div>
                          <div className="min-w-0">
                            <Link to={`/products/${p.slug}`} className="font-semibold text-sm truncate block hover:opacity-70 transition-opacity" style={{ color: '#0F0F0F' }}>
                              {p.name}
                            </Link>
                            <p className="text-xs truncate mt-0.5" style={{ color: '#9C9894' }}>{p.category_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background: '#F0EEE9', color: '#5C5854' }}>{p.sku}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-sm" style={{ color: '#0F0F0F' }}>${price.toFixed(2)}</span>
                        {p.sale_price && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: '#C0392B' }}>SALE</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="font-bold text-sm"
                          style={{ color: p.stock_qty === 0 ? '#C0392B' : p.stock_qty <= 5 ? '#D97706' : '#0F0F0F' }}
                        >
                          {p.stock_qty}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
                          style={{ background: ss.bg, color: ss.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                          {p.status || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background: '#F0EEE9', color: '#0F0F0F' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ background: '#FEF2F2', color: '#C0392B' }}
                          >
                            {deleting === p.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ── GRID VIEW ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4">
          {products.map(p => {
            const img   = p.primary_image ? `/MyShop/backend/${p.primary_image}` : null
            const price = Number(p.sale_price || p.base_price || 0)
            const ss    = STATUS_STYLE[p.status] || STATUS_STYLE.active
            return (
              <div
                key={p.id}
                className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', transitionDuration: '150ms' }}
              >
                {/* Image */}
                <div className="aspect-square flex items-center justify-center" style={{ background: '#F0EEE9' }}>
                  {img
                    ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                    : <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8" style={{ color: '#C4C0BB' }}><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                  }
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div>
                    <p className="font-semibold text-xs line-clamp-2 leading-snug" style={{ color: '#0F0F0F' }}>{p.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#9C9894' }}>{p.category_name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-sm" style={{ color: '#0F0F0F' }}>${price.toFixed(2)}</span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                      style={{ background: ss.bg, color: ss.text }}
                    >
                      {p.status || 'active'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button
                      onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                      className="flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background: '#F0EEE9', color: '#0F0F0F' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleting === p.id}
                      className="flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ background: '#FEF2F2', color: '#C0392B' }}
                    >
                      {deleting === p.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={p => { setPage(p); load(p) }} />
    </div>
  )
}
