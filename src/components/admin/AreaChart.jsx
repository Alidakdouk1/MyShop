import { useRef, useState, useEffect } from 'react'

/**
 * Dependency-free area + line chart with hover tooltip.
 * data: [{ label, value }]. `format` formats the value for axis + tooltip.
 */
export default function AreaChart({ data = [], height = 220, format = (v) => v, color = '#C0392B' }) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(720)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width
      if (cw) setW(cw)
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm" style={{ height, color: '#9C9894' }}>
        No data for this period yet.
      </div>
    )
  }

  const padL = 44, padR = 12, padT = 14, padB = 26
  const plotW = Math.max(10, w - padL - padR)
  const plotH = height - padT - padB
  const n = data.length
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1)

  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v) => padT + plotH * (1 - (Number(v) || 0) / max)

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const areaPts = `${padL},${padT + plotH} ${linePts} ${padL + plotW},${padT + plotH}`

  const ticks = 4
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i)

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel  = (e.clientX - rect.left) / rect.width
    const idx  = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))))
    setHover(idx)
  }

  const gradId = `area-grad-${color.replace('#', '')}`

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {gridVals.map((gv, i) => {
          const gy = y(gv)
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={padL + plotW} y2={gy} stroke="#EFEDE8" strokeWidth="1" />
              <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="10" fill="#9C9894">{format(gv)}</text>
            </g>
          )
        })}

        {/* area + line */}
        <polygon points={areaPts} fill={`url(#${gradId})`} />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* x labels: first, middle, last */}
        {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#9C9894">
            {data[i].label}
          </text>
        ))}

        {/* hover marker */}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + plotH} stroke="#0F0F0F" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill={color} stroke="#fff" strokeWidth="2" />
          </g>
        )}

        {/* hover capture */}
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {hover != null && (
        <div style={{
          position: 'absolute', top: 0,
          left: `${(x(hover) / w) * 100}%`, transform: 'translateX(-50%)',
          background: '#0F0F0F', color: '#fff', borderRadius: 8, padding: '6px 10px',
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}>
          <div style={{ opacity: 0.6, fontWeight: 500 }}>{data[hover].label}</div>
          <div>{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  )
}
