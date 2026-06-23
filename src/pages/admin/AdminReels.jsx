import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminListReels, adminPinReel, adminReorderReels, getAdminReelSettings, updateReelSettings } from '../../api/reelsApi'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import { TableRowSkeleton } from '../../components/ui/Skeleton'

export default function AdminReels() {
  const toast = useToast()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [savingPin, setSavingPin] = useState(null)
  const [settings, setSettings]   = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const load = () => {
    setLoading(true)
    adminListReels()
      .then(r => setRows(r.data.data?.reels || []))
      .catch(() => toast.error('Could not load reels'))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    getAdminReelSettings().then(r => setSettings(r.data.data)).catch(() => {})
  }, [])

  const toggleSetting = (key) => setSettings(s => ({ ...s, [key]: Number(s[key]) ? 0 : 1 }))

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const { data } = await updateReelSettings(settings)
      setSettings(data.data)
      toast.success('Settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally { setSavingSettings(false) }
  }

  const togglePin = async (reel) => {
    setSavingPin(reel.reel_id)
    try {
      await adminPinReel(reel.reel_id, !Number(reel.is_pinned))
      toast.success(reel.is_pinned == 1 ? 'Unpinned' : 'Pinned to top')
      load()
    } catch (e) {
      toast.error('Could not save')
    } finally { setSavingPin(null) }
  }

  // Reorder among pinned reels via up/down arrows. Drag-and-drop would need a
  // library; arrows are zero-dep and admin-friendly.
  const movePinned = async (reelId, direction) => {
    const pinned = rows.filter(r => r.is_pinned == 1)
                       .sort((a, b) => Number(a.pin_order) - Number(b.pin_order))
    const idx = pinned.findIndex(r => r.reel_id == reelId)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= pinned.length) return
    const next = [...pinned]
    ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
    try {
      await adminReorderReels(next.map(r => r.reel_id))
      load()
    } catch { toast.error('Reorder failed') }
  }

  const pinned   = rows.filter(r => r.is_pinned == 1)
  const unpinned = rows.filter(r => r.is_pinned != 1)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Reels</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Every product video shows up here. Pin the ones you want at the top of <Link to="/reels" className="underline">/reels</Link>.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-tertiary">
          <span><strong className="text-ink">{rows.length}</strong> total</span>
          <span><strong className="text-ink">{pinned.length}</strong> pinned</span>
          <span><strong className="text-ink">{rows.reduce((a, r) => a + Number(r.view_count || 0), 0).toLocaleString()}</strong> total views</span>
        </div>
      </div>

      {/* Settings panel */}
      {settings && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">Reels settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {[
              ['enabled',         'Reels enabled',        'Master switch — hides the Reels tab + page when off.'],
              ['autoplay',        'Autoplay',             'Play the visible reel automatically.'],
              ['default_muted',   'Start muted',          'Required for autoplay in most browsers.'],
              ['loop',            'Loop videos',          'Replay each video when it ends.'],
              ['show_comments',   'Show comments',        'Comment button + drawer.'],
              ['show_view_count', 'Show view count',      'The eye + count chip.'],
              ['show_share',      'Show share button',    'Native share / copy link.'],
            ].map(([key, label, hint]) => (
              <label key={key} className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 cursor-pointer">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block text-[11px] text-ink-tertiary leading-snug">{hint}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleSetting(key)}
                  className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 mt-0.5"
                  style={{ background: Number(settings[key]) ? '#00D8C8' : '#D8D4CC' }}
                  aria-pressed={!!Number(settings[key])}
                >
                  <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: Number(settings[key]) ? 'translateX(22px)' : 'translateX(2px)' }} />
                </button>
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <span className="block text-sm font-medium text-ink">Reels per load</span>
                <span className="block text-[11px] text-ink-tertiary">How many videos to fetch at once (6–60).</span>
              </span>
              <input
                type="number" min={6} max={60}
                value={settings.items_per_load}
                onChange={e => setSettings(s => ({ ...s, items_per_load: e.target.value }))}
                className="w-20 text-sm rounded-lg px-3 py-2 border border-border bg-white text-ink text-right outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60"
              style={{ background: '#0F172A' }}
            >
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

      {pinned.length > 0 && (
        <Section title="Pinned (top of feed)" rows={pinned} savingPin={savingPin}
          togglePin={togglePin} movePinned={movePinned} loading={loading} />
      )}

      <Section title="All reels" rows={unpinned} savingPin={savingPin}
        togglePin={togglePin} loading={loading} />
    </div>
  )
}

function Section({ title, rows, savingPin, togglePin, movePinned, loading }) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">{title}</p>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-surface-alt border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">Reel</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">Product</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">Type</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">Views</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cells={5} />)
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-ink-tertiary">
                  {title === 'Pinned (top of feed)' ? 'Nothing pinned yet.' : 'No reels yet.'}
                </td></tr>
              ) : rows.map(r => {
                const poster = r.poster ? resolveImg(r.poster) : null
                const isPinned = r.is_pinned == 1
                return (
                  <tr key={r.reel_id} className={isPinned ? 'bg-surface-alt/30' : ''}>
                    <td className="px-4 py-3">
                      <div style={{
                        width: 60, height: 80, borderRadius: 8, overflow: 'hidden',
                        background: poster ? `url(${poster}) center/cover` : '#1f1f1f',
                        position: 'relative',
                      }}>
                        {!poster && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${r.product_id}`} className="font-medium text-ink hover:underline">
                        {r.product_name}
                      </Link>
                      {r.product_status !== 'active' && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                          {r.product_status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{
                        background: r.media_type === 'youtube' ? '#FEE2E2' : '#EDE9FE',
                        color:      r.media_type === 'youtube' ? '#C0392B' : '#6D28D9',
                      }}>
                        {r.media_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Number(r.view_count || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isPinned && movePinned && (
                          <>
                            <button onClick={() => movePinned(r.reel_id, 'up')} className="p-1.5 rounded hover:bg-surface-alt text-ink-secondary" aria-label="Move up" title="Move up">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button onClick={() => movePinned(r.reel_id, 'down')} className="p-1.5 rounded hover:bg-surface-alt text-ink-secondary" aria-label="Move down" title="Move down">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => togglePin(r)}
                          disabled={savingPin === r.reel_id}
                          className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md disabled:opacity-60`}
                          style={isPinned
                            ? { background: '#0F172A', color: '#A3FF12' }
                            : { background: '#F2F0EB', color: '#0F172A' }}
                        >
                          {savingPin === r.reel_id ? '…' : isPinned ? '★ Pinned' : 'Pin'}
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
    </div>
  )
}
