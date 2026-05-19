export default function Input({
  label, error, hint, icon, iconRight, className = '', containerClassName = '', ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-semibold text-ink">
          {label}
          {props.required && <span className="text-accent ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-white border rounded-lg text-sm text-ink placeholder-ink-tertiary
            transition-all duration-200 outline-none
            focus:border-ink focus:ring-2 focus:ring-ink/10
            disabled:bg-surface-alt disabled:cursor-not-allowed
            ${error ? 'border-accent ring-2 ring-accent/10' : 'border-border'}
            ${icon      ? 'pl-10' : 'pl-3.5'}
            ${iconRight ? 'pr-10' : 'pr-3.5'}
            py-2.5 h-10
            ${className}`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-accent font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', containerClassName = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-semibold text-ink">
          {label}
          {props.required && <span className="text-accent ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`w-full bg-white border rounded-lg text-sm text-ink placeholder-ink-tertiary
          transition-all duration-200 outline-none resize-y
          focus:border-ink focus:ring-2 focus:ring-ink/10
          disabled:bg-surface-alt disabled:cursor-not-allowed
          ${error ? 'border-accent ring-2 ring-accent/10' : 'border-border'}
          px-3.5 py-2.5 min-h-[100px]
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-accent font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, className = '', containerClassName = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-semibold text-ink">
          {label}
          {props.required && <span className="text-accent ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full bg-white border rounded-lg text-sm text-ink
            transition-all duration-200 outline-none appearance-none
            focus:border-ink focus:ring-2 focus:ring-ink/10
            ${error ? 'border-accent' : 'border-border'}
            px-3.5 py-2.5 h-10 pr-9 cursor-pointer
            ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>
      {error && <p className="text-xs text-accent font-medium">{error}</p>}
    </div>
  )
}
