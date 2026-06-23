// Dependency-free shimmer skeletons. Use these in place of spinners while a
// page or list is loading — they communicate the layout shoppers are about to
// see, which feels noticeably more premium than a centered spinner.

const shimmer = {
  background: 'linear-gradient(90deg, #EEECE6 0%, #F4F2EB 50%, #EEECE6 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
}

export function SkeletonBox({ width = '100%', height = 16, style }) {
  return <div style={{ ...shimmer, width, height, ...style }} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-surface ring-1 ring-border/60">
      <div style={{ ...shimmer, aspectRatio: '3/4', borderRadius: 0 }} />
      <div className="p-3.5 space-y-2">
        <SkeletonBox height={14} width="85%" />
        <SkeletonBox height={14} width="55%" />
        <SkeletonBox height={16} width="40%" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

/** Order card on /account/orders — same shape as the real row so the page doesn't reflow. */
export function OrderRowSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
        <div className="flex items-center gap-3">
          <SkeletonBox height={12} width={90} />
          <SkeletonBox height={12} width={70} />
        </div>
        <div style={{ ...shimmer, height: 20, width: 70, borderRadius: 999 }} />
      </div>
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ ...shimmer, width: 64, height: 64, borderRadius: 12 }} />
          ))}
        </div>
        <div className="shrink-0 text-right" style={{ minWidth: 80 }}>
          <SkeletonBox height={18} width={70} />
          <div style={{ marginTop: 6, marginLeft: 'auto', width: 50 }}>
            <SkeletonBox height={10} width={50} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Order detail (the /account/orders/:id page). */
export function OrderDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SkeletonBox height={12} width={120} />
      <SkeletonBox height={28} width={200} style={{ marginTop: 16 }} />
      <SkeletonBox height={12} width={180} style={{ marginTop: 8 }} />

      <div className="rounded-2xl mt-6 p-5" style={{ background: '#fff', border: '1px solid #F2F0EB' }}>
        <SkeletonBox height={14} width={140} />
        <div className="flex justify-between mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2" style={{ width: 70 }}>
              <div style={{ ...shimmer, width: 40, height: 40, borderRadius: '50%' }} />
              <SkeletonBox height={10} width={56} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl mt-4 p-5" style={{ background: '#fff', border: '1px solid #F2F0EB' }}>
        <SkeletonBox height={14} width={120} />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div style={{ ...shimmer, width: 56, height: 56, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <SkeletonBox height={12} width="60%" />
                <SkeletonBox height={10} width="30%" style={{ marginTop: 6 }} />
              </div>
              <SkeletonBox height={14} width={50} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A row of skeleton cells inside an existing <table>. Used by admin tables. */
export function TableRowSkeleton({ cells = 6 }) {
  return (
    <tr>
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBox height={14} width={i === 0 ? 60 : '70%'} />
        </td>
      ))}
    </tr>
  )
}

/** Stack of text lines — for profile fields, descriptions. */
export function TextLinesSkeleton({ lines = 3, lastWidth = '60%' }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : 8 }}>
          <SkeletonBox height={12} width={i === lines - 1 ? lastWidth : '100%'} />
        </div>
      ))}
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-5 md:px-10 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 lg:gap-16 items-start">
        <div>
          <div style={{ ...shimmer, aspectRatio: '1/1', borderRadius: 20 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ ...shimmer, width: 72, height: 72, borderRadius: 12 }} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <SkeletonBox height={12} width={120} />
          <SkeletonBox height={36} width="80%" />
          <SkeletonBox height={20} width={140} />
          <div style={{ height: 1, background: '#E4E1D9', margin: '8px 0' }} />
          <SkeletonBox height={36} width={140} />
          <div style={{ height: 1, background: '#E4E1D9', margin: '8px 0' }} />
          <SkeletonBox height={48} width="100%" />
          <SkeletonBox height={52} width="100%" />
          <div className="space-y-2 pt-2">
            <SkeletonBox height={14} width="60%" />
            <SkeletonBox height={14} width="70%" />
            <SkeletonBox height={14} width="50%" />
          </div>
        </div>
      </div>
    </div>
  )
}
