import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyAds, deleteAd, markAdSold, renewAd } from '../../api/marketplaceApi'
import { STATUS_STYLE } from '../../lib/marketplace'
import { useCurrency } from '../../context/CurrencyContext'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import EmptyState from '../../components/common/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function MyAds() {
  const { format } = useCurrency()
  const toast = useToast()
  const [ads, setAds]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getMyAds().then(r => setAds(r.data.data?.ads || [])).catch(() => setAds([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    if (!confirm('Delete this ad permanently?')) return
    try { await deleteAd(id); setAds(a => a.filter(x => x.id !== id)); toast.success('Deleted') }
    catch { toast.error('Could not delete') }
  }
  const sold = async (id) => {
    try { await markAdSold(id); setAds(a => a.map(x => x.id === id ? { ...x, status: 'sold' } : x)); toast.success('Marked sold') }
    catch { toast.error('Could not update') }
  }
  const renew = async (id) => {
    try {
      await renewAd(id)
      // Re-fetch so the new expires_at (and live status) is reflected.
      load()
      toast.success('Ad renewed')
    } catch (e) { toast.error(e.response?.data?.message || 'Could not renew') }
  }

  // An approved ad whose expiry has passed is shown as Expired (the DB keeps
  // status='approved' so renewing is a clean reset).
  const isExpired = (ad) =>
    ad.status === 'approved' && ad.expires_at && new Date(ad.expires_at.replace(' ', 'T')) < new Date()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">My Ads</h1>
        <Link to="/marketplace/post" className="cta-glow inline-flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)' }}>
          + Post an Ad
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : ads.length === 0 ? (
        <EmptyState
          title="You haven't posted any ads"
          description="Sell something you no longer need — it only takes a minute."
          primary={{ label: 'Post your first ad', to: '/marketplace/post' }}
          secondary={{ label: 'Browse marketplace', to: '/marketplace' }}
        />
      ) : (
        <div className="space-y-3">
          {ads.map(ad => {
            const expired = isExpired(ad)
            const st  = expired
              ? { bg: '#FEF2F2', color: '#C0392B', label: 'Expired' }
              : (STATUS_STYLE[ad.status] || STATUS_STYLE.pending)
            const img = ad.images?.[0] ? resolveImg(ad.images[0]) : 'https://placehold.co/120/F2F0EB/9C9894?text=P'
            return (
              <div key={ad.id} className="flex gap-3 bg-surface rounded-2xl border border-border p-3">
                <Link to={`/marketplace/${ad.id}`} className="shrink-0">
                  <img src={img} alt={ad.title} className="w-20 h-20 rounded-xl object-cover bg-surface-alt" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/marketplace/${ad.id}`} className="font-semibold text-ink text-sm line-clamp-2 hover:text-accent">{ad.title}</Link>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p className="font-bold text-ink text-sm mt-1">{ad.price != null ? format(ad.price) : 'Negotiable'}</p>
                  {ad.status === 'rejected' && ad.reject_reason && (
                    <p className="text-[11px] text-accent mt-1">Reason: {ad.reject_reason}</p>
                  )}
                  <div className="flex gap-3 mt-2">
                    {expired && <button onClick={() => renew(ad.id)} className="text-xs font-bold text-accent hover:underline">Renew</button>}
                    <Link to={`/marketplace/${ad.id}/edit`} className="text-xs font-semibold text-ink-secondary hover:text-ink">Edit</Link>
                    {ad.status !== 'sold' && <button onClick={() => sold(ad.id)} className="text-xs font-semibold text-ink-secondary hover:text-ink">Mark sold</button>}
                    <button onClick={() => remove(ad.id)} className="text-xs font-semibold text-ink-tertiary hover:text-accent">Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
