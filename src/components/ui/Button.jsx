import Spinner from './Spinner'

const variants = {
  primary:  'bg-ink text-white hover:bg-ink/80 active:scale-[0.98]',
  secondary:'bg-surface-alt text-ink border border-border hover:bg-border',
  accent:   'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]',
  ghost:    'text-ink hover:bg-surface-alt',
  outline:  'border border-ink text-ink hover:bg-ink hover:text-white',
  danger:   'bg-accent/10 text-accent border border-accent/30 hover:bg-accent hover:text-white',
  success:  'bg-success text-white hover:bg-success/90',
}

const sizes = {
  xs: 'px-2.5 py-1   text-xs  h-7',
  sm: 'px-3.5 py-1.5 text-sm  h-8',
  md: 'px-5   py-2.5 text-sm  h-10',
  lg: 'px-7   py-3   text-base h-12',
  xl: 'px-9   py-4   text-base h-14',
}

// Filled variants get a subtle light sweep on hover for a premium feel
const SHINE_VARIANTS = new Set(['primary', 'accent', 'success'])

export default function Button({
  variant = 'primary', size = 'md', className = '',
  children, loading = false, icon, iconRight, ...props
}) {
  const shine = SHINE_VARIANTS.has(variant) ? 'shine relative overflow-hidden' : ''
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg
        transition-all duration-200 ease-(--ease-out-soft) cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${shine} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
