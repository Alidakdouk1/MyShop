const variants = {
  default:  'bg-surface-alt text-ink-secondary border border-border',
  accent:   'bg-accent text-white',
  success:  'bg-success text-white',
  warning:  'bg-warning text-white',
  info:     'bg-info text-white',
  gold:     'bg-gold text-white',
  outline:  'border border-ink text-ink',
  sale:     'bg-accent text-white font-bold',
  new:      'bg-ink text-white',
  featured: 'bg-gold text-white',
}

const sizes = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export default function Badge({ variant = 'default', size = 'sm', className = '', children }) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-full uppercase tracking-wide
      ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  )
}
