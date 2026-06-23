import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../store/slices/authSlice'
import { createAd, updateAd, uploadAdImage, getAd, getMarketplaceSettings } from '../api/marketplaceApi'
import { AD_CATEGORIES, AD_CONDITIONS } from '../lib/marketplace'
import { useToast } from '../hooks/useToast'
import { resolveImg } from '../lib/img'
import Seo from '../components/common/Seo'

const field = 'w-full text-sm rounded-xl px-3.5 py-2.5 outline-none border border-border bg-surface text-ink focus:border-ink transition-colors'
const lbl   = 'text-xs font-bold uppercase tracking-wider text-ink-secondary block mb-1.5'

export default function MarketplacePost() {
  const { id }   = useParams()       // present when editing
  const isEdit   = !!id
  const navigate = useNavigate()
  const toast    = useToast()
  const user     = useSelector(selectUser)
  const fileRef  = useRef(null)

  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', condition: 'good',
    location: '', contact_phone: '',
  })
  const [images, setImages]   = useState([])   // existing image paths (edit mode)
  const [pending, setPending] = useState([])   // File objects to upload after save
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [cfg, setCfg] = useState({ categories: AD_CATEGORIES, require_phone: 1, max_images: 6, guidelines: '' })

  useEffect(() => {
    getMarketplaceSettings().then(r => {
      const s = r.data.data || {}
      setCfg({
        categories:    Array.isArray(s.categories) && s.categories.length ? s.categories : AD_CATEGORIES,
        require_phone: Number(s.require_phone ?? 1),
        max_images:    Number(s.max_images ?? 6),
        guidelines:    s.guidelines || '',
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) { toast.info('Please log in to post an ad'); navigate('/login'); return }
    if (isEdit) {
      getAd(id).then(r => {
        const a = r.data.data
        setForm({
          title: a.title || '', description: a.description || '',
          price: a.price ?? '', category: a.category || '',
          condition: a.condition || 'good', location: a.location || '',
          contact_phone: a.contact_phone || '',
        })
        setImages(a.images || [])
      }).catch(() => toast.error('Could not load ad')).finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || [])
    const room  = cfg.max_images - images.length - pending.length
    if (files.length > room) toast.info(`You can add ${room} more image${room === 1 ? '' : 's'}.`)
    setPending(p => [...p, ...files.slice(0, room)])
    e.target.value = ''
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.title.trim().length < 3) { toast.error('Title must be at least 3 characters.'); return }
    if (cfg.require_phone && !form.contact_phone.trim()) { toast.error('A WhatsApp number is required.'); return }
    setSaving(true)
    try {
      let adId = id
      if (isEdit) {
        await updateAd(id, form)
      } else {
        const { data } = await createAd(form)
        adId = data.data.id
      }
      // Upload any newly-picked images to the (now-existing) ad.
      for (const file of pending) {
        const fd = new FormData(); fd.append('image', file)
        await uploadAdImage(adId, fd)
      }
      toast.success(isEdit ? 'Ad updated — pending review.' : 'Ad submitted — pending review.')
      navigate('/account/ads')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save ad')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-[50vh]" />

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Seo title={isEdit ? 'Edit Ad' : 'Post an Ad'} />
      <h1 className="hero-display text-3xl text-ink tracking-wide mb-1">{isEdit ? 'EDIT AD' : 'POST AN AD'}</h1>
      <p className="text-sm text-ink-tertiary mb-4">Your ad is reviewed by our team before it goes live.</p>
      {cfg.guidelines && (
        <div className="mb-6 rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: '#FEF9EC', border: '1px solid #F5DFA0', color: '#92700A' }}>
          {cfg.guidelines}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        {/* Photos */}
        <div>
          <label className={lbl}>Photos <span className="font-normal lowercase tracking-normal text-ink-tertiary">(up to {cfg.max_images})</span></label>
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={`e${i}`} className="w-20 h-20 rounded-xl overflow-hidden bg-surface-alt border border-border">
                <img src={resolveImg(src)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {pending.map((f, i) => (
              <div key={`p${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-alt border border-border">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPending(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">×</button>
              </div>
            ))}
            {images.length + pending.length < cfg.max_images && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-ink-tertiary hover:border-ink/40">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
        </div>

        <div>
          <label className={lbl}>Title *</label>
          <input className={field} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. iPhone 13 128GB — excellent condition" maxLength={160} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Price ($)</label>
            <input className={field} type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Leave blank = negotiable" />
          </div>
          <div>
            <label className={lbl}>Condition</label>
            <select className={field} value={form.condition} onChange={e => set('condition', e.target.value)}>
              {AD_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Category</label>
            <select className={field} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select…</option>
              {cfg.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Location</label>
            <input className={field} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Beirut" />
          </div>
        </div>

        <div>
          <label className={lbl}>WhatsApp number {cfg.require_phone ? '*' : <span className="font-normal lowercase tracking-normal text-ink-tertiary">(optional)</span>}</label>
          <input className={field} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+961 …" required={!!cfg.require_phone} />
          <p className="text-[11px] text-ink-tertiary mt-1">Buyers will message you on WhatsApp at this number.</p>
        </div>

        <div>
          <label className={lbl}>Description</label>
          <textarea rows={5} className={field} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the item, condition, what's included…" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="cta-glow flex-1 text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)' }}>
            {saving ? 'Submitting…' : isEdit ? 'Save changes' : 'Submit ad'}
          </button>
          <button type="button" onClick={() => navigate('/account/ads')}
            className="px-5 py-3 rounded-xl border border-border text-ink font-bold text-sm">Cancel</button>
        </div>
      </form>
    </div>
  )
}
