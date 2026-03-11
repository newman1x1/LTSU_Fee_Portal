export default function SectionSwitcher({ sections = [], activeSection, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
      <button
        onClick={() => onChange('all')}
        style={{
          padding: '8px 16px',
          borderRadius: 20,
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          background: activeSection === 'all' ? 'var(--color-navy)' : 'transparent',
          color: activeSection === 'all' ? 'var(--color-gold)' : 'var(--color-text)',
          outline: activeSection === 'all' ? 'none' : '1px solid var(--color-border)',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        All Sections
      </button>
      {sections.map(sec => (
        <button
          key={sec.id}
          onClick={() => onChange(sec.id)}
          style={{
            padding: '8px 16px',
            borderRadius: 20,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            background: activeSection === sec.id ? 'var(--color-navy)' : 'transparent',
            color: activeSection === sec.id ? 'var(--color-gold)' : 'var(--color-text)',
            outline: activeSection === sec.id ? 'none' : '1px solid var(--color-border)',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
        >
          <span>{sec.name}</span>
          {(sec.branches?.name || sec.semesters?.name) && (
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.75, marginLeft: 4 }}>
              ({[sec.branches?.name, sec.semesters?.name].filter(Boolean).join(' · ')})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
