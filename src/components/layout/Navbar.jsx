export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '10px 16px',
      background: 'var(--color-navy)',
      height: 48,
      boxSizing: 'border-box',
    }}>
      <span className="font-display" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gold)', letterSpacing: '0.02em' }}>
        LTSU Fee Portal
      </span>
    </nav>
  )
}
