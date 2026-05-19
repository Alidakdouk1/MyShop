export default function TextSection({ data = {} }) {
  const alignment = data.alignment || 'center'
  const alignCls  = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'

  return (
    <section
      className="px-4 py-12"
      style={data.bg_color ? { background: data.bg_color } : {}}
    >
      <div className={`max-w-2xl mx-auto ${alignCls}`}>
        {data.title && (
          <h2
            className="text-3xl font-black mb-4"
            style={{ color: data.text_color || 'var(--color-ink)' }}
          >
            {data.title}
          </h2>
        )}
        {data.content && (
          <p
            className="leading-relaxed whitespace-pre-line"
            style={{ color: data.text_color ? `${data.text_color}bb` : 'var(--color-ink-secondary)' }}
          >
            {data.content}
          </p>
        )}
      </div>
    </section>
  )
}
