export default function StarRating({ value = 0, max = 5, size = 'sm', showValue = false, count }) {
  const sizes = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => {
          const fill = i < Math.floor(value) ? 1 : i < value ? 0.5 : 0
          return (
            <svg key={i} className={sizes[size]} viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`star-${i}-${value}`}>
                  <stop offset={`${fill * 100}%`} stopColor="#B8922E" />
                  <stop offset={`${fill * 100}%`} stopColor="#E4E1D9" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={`url(#star-${i}-${value})`}
                stroke="#B8922E"
                strokeWidth="0.5"
              />
            </svg>
          )
        })}
      </span>
      {showValue && <span className="text-xs font-semibold text-ink-secondary">{Number(value).toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-ink-tertiary">({count})</span>}
    </span>
  )
}
