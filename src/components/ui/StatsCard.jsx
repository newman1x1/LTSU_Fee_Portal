export default function StatsCard({ icon: Icon, label, value, borderColor = 'var(--color-pending)' }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '16px',
        borderLeft: `3px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      {Icon && <Icon size={18} style={{ color: borderColor, flexShrink: 0 }} />}
      <span className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}
