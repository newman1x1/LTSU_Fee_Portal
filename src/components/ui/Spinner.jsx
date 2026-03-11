import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 24, className = '' }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: '60vh' }}>
      <Loader2 size={size} className={`animate-spin ${className}`} style={{ color: 'var(--color-gold)' }} />
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Loading...</span>
    </div>
  )
}
