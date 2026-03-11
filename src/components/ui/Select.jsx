import { useId } from 'react'

export default function Select({
  label,
  error,
  options = [],
  placeholder = 'Select...',
  className = '',
  id: propId,
  ...props
}) {
  const autoId = useId()
  const selectId = propId || autoId
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={selectId} className="input-label">{label}</label>}
      <select
        id={selectId}
        className={`input-field ${error ? 'error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId || undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
        {(options || []).map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} role="alert" className="input-error">{error}</p>}
    </div>
  )
}
