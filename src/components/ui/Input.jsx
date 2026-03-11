import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react'
import { useState, useId } from 'react'

export default function Input({
  label,
  error,
  success,
  loading: inputLoading,
  type = 'text',
  className = '',
  id: propId,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const autoId = useId()
  const inputId = propId || autoId
  const errorId = error ? `${inputId}-error` : undefined
  const successId = success ? `${inputId}-success` : undefined
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const stateClass = error ? 'error' : success ? 'success' : ''

  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type={inputType}
          className={`input-field ${stateClass}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId || successId || undefined}
          {...props}
        />
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {inputLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
          {!inputLoading && success && <Check size={16} style={{ color: 'var(--color-success)' }} />}
          {!inputLoading && error && <X size={16} style={{ color: 'var(--color-error)' }} />}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>
      {error && typeof error === 'string' && <p id={errorId} role="alert" className="input-error">{error}</p>}
      {success && typeof success === 'string' && <p id={successId} className="input-success">{success}</p>}
    </div>
  )
}
