import Reveal from '../../common/Reveal'

export default function TrustBadgesSection({ data = {} }) {
  const badges = data.badges || []
  const cols   = data.cols   || 4

  const colMap = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' }
  const gridCls = colMap[cols] || 'grid-cols-2 md:grid-cols-4'

  return (
    <section
      className="border-y border-border py-10"
      style={data.bg_color ? { background: data.bg_color } : { background: 'var(--color-surface-alt)' }}
    >
      <div className="max-w-screen-xl mx-auto px-4">
        <Reveal variant="stagger" className={`grid ${gridCls} gap-6`}>
          {badges.map((b, i) => (
            <div key={i} className="flex items-start gap-4 group">
              <span className="text-3xl transition-transform duration-300 ease-(--ease-out-back) group-hover:scale-110 group-hover:-rotate-6">
                {b.icon}
              </span>
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ color: data.text_color || 'var(--color-ink)' }}
                >
                  {b.title}
                </p>
                <p className="text-xs mt-0.5 text-ink-tertiary">{b.desc}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
