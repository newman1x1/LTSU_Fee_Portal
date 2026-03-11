export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="hide-scrollbar" style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border-light)', marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: active === tab.id ? '2px solid var(--color-gold)' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 'var(--text-sm)',
            fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? 'var(--color-navy)' : 'var(--color-text-muted)',
            transition: 'color 0.2s ease, font-weight 0.2s ease, border-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              background: active === tab.id ? 'var(--color-navy)' : 'var(--color-border-light)',
              color: active === tab.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
              borderRadius: 10,
              padding: '2px 8px',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
