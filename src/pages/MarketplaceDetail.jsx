import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getAd, reportAd } from '../api/marketplaceApi'
import { conditionLabel, REPORT_REASONS } from '../lib/marketplace'
import { selectUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import { resolveImg } from '../lib/img'
import Spinner from '../components/ui/Spinner'
import Seo from '../components/common/Seo'

export default function MarketplaceDetail() {
  const { id } = useParams()
  const { format } = useCurrency()
  const user  = useSelector(selectUser)
  const toast = useToast()
  const [ad, setAd]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx]   = useState(0)
  const [notFound, setNotFound] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote]     = useState('')
  const [reporting, setReporting] = useState(false)

  const submitReport = async () => {
    if (!user) { toast.info('Please log in to report'); return }
    if (!reason) { toast.error('Pick a reason'); return }
    setReporting(true)
    try {
      await reportAd(id, reason, note)
      toast.success("Thanks — we'll review this listing.")
      setReportOpen(false); setReason(''); setNote('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not submit report')
    } finally { setReporting(false) }
  }

  useEffect(() => {
    setLoading(true)
    getAd(id)
      .then(r => setAd(r.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
  if (notFound || !ad) return <div className="text-center py-20 text-ink-secondary">Ad not found.</div>

  const images = (ad.images || []).map(resolveImg)
  const hero   = images[imgIdx] || images[0] || 'https://placehold.co/800/F2F0EB/9C9894?text=No+Photo'

  // Click-to-chat WhatsApp link to the seller's number.
  const waDigits = String(ad.contact_phone || '').replace(/[^\d]/g, '')
  const waText   = encodeURIComponent(`Hi! I'm interested in your "${ad.title}" listed on Pick&Go LB Marketplace.`)
  const waUrl    = waDigits ? `https://wa.me/${waDigits}?text=${waText}` : null

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <Seo title={ad.title} />
      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium mb-5 text-ink-tertiary hover:text-ink">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" data-rtl-flip><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-alt border border-border">
            <img src={hero} alt={ad.title} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {images.map((src, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden bg-surface-alt border-2 shrink-0 ${i === imgIdx ? 'border-ink' : 'border-transparent'}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {ad.is_featured == 1 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #B8922E 0%, #D4AF37 100%)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                Featured
              </span>
            )}
            {ad.status === 'sold' && (
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: '#F4F4F4', color: '#9C9894' }}>
                Sold
              </span>
            )}
          </div>
          <p className="text-3xl font-black text-ink" style={{ letterSpacing: '-0.01em' }}>
            {ad.price != null ? format(ad.price) : 'Contact for price'}
          </p>
          <h1 className="text-xl font-bold text-ink mt-2 leading-snug">{ad.title}</h1>

          <div className="flex flex-wrap gap-2 mt-4">
            {ad.category && <Tag>{ad.category}</Tag>}
            <Tag>{conditionLabel(ad.condition)}</Tag>
            {ad.location && (
              <Tag>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline -mt-0.5 mr-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {ad.location}
              </Tag>
            )}
          </div>

          {ad.description && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Description</p>
              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{ad.description}</p>
            </div>
          )}

          <div className="mt-6 p-4 rounded-2xl border border-border bg-surface">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">Seller</p>
            <p className="font-semibold text-ink">{ad.seller_name || 'Private seller'}</p>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: '#25D366' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Chat on WhatsApp
              </a>
            ) : (
              <p className="text-xs text-ink-tertiary mt-2">No contact number provided for this listing.</p>
            )}
          </div>

          {/* Report link — only for logged-in users who aren't the seller */}
          {user && Number(user.id) !== Number(ad.user_id) && (
            <button onClick={() => setReportOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-tertiary hover:text-accent transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              Report this ad
            </button>
          )}
        </div>
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div onClick={() => setReportOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5"
            style={{ animation: 'popIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <h2 className="font-bold text-ink text-lg mb-1">Report this ad</h2>
            <p className="text-xs text-ink-tertiary mb-4">Tell us what's wrong. Our team reviews every report.</p>
            <div className="space-y-1.5 mb-3">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                  style={{ background: reason === r.value ? '#F2F0EB' : 'transparent' }}>
                  <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-ink" />
                  <span className="text-sm text-ink">{r.label}</span>
                </label>
              ))}
            </div>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a detail (optional)" maxLength={300}
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-border bg-white text-ink outline-none focus:border-ink mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-ink font-bold text-sm">Cancel</button>
              <button onClick={submitReport} disabled={reporting || !reason}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: '#C0392B' }}>
                {reporting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-alt text-ink-secondary">{children}</span>
  )
}
