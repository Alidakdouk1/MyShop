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
