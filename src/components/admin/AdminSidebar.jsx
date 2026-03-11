import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  Layers,
  Grid3X3,
  Calendar,
  GraduationCap,
  Users,
  Upload,
  UserCheck,
  ScrollText,
  LogOut,
} from 'lucide-react'

const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'branches', icon: GitBranch, label: 'Branches' },
  { id: 'specialisations', icon: Layers, label: 'Specialisations' },
  { id: 'semesters', icon: GraduationCap, label: 'Semesters' },
  { id: 'sections', icon: Grid3X3, label: 'Sections' },
  { id: 'batches', icon: Calendar, label: 'Batches' },
  { id: 'staff', icon: Users, label: 'Staff' },
  { id: 'upload', icon: Upload, label: 'Upload' },
  { id: 'students', icon: UserCheck, label: 'Students' },
]

export default function AdminSidebar({ activeSection, onNavigate, onLogout }) {
  const navigate = useNavigate()

  return (
    <aside style={{
      width: 260,
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'var(--color-white)',
      borderRight: '1px solid var(--color-border-light)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      zIndex: 50,
      overflowY: 'auto',
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
        <span className="font-display" style={{
          fontSize: 'var(--text-md)',
          fontWeight: 600,
          color: 'var(--color-navy)',
        }}>
          LTSU Fee Portal
        </span>
        <div style={{
          marginTop: 8,
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 6,
          background: 'var(--color-navy)',
          color: 'var(--color-gold)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          Administrator
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(item => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'var(--color-navy)' : 'transparent',
                color: isActive ? 'var(--color-gold)' : 'var(--color-text)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 500 : 400,
                marginBottom: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}

        <div style={{
          height: 1,
          background: 'var(--color-border-light)',
          margin: '12px 0',
        }} />

        <button
          onClick={() => navigate('/log')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--color-text)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 'var(--text-sm)',
            fontWeight: 400,
            marginBottom: 4,
            transition: 'all 0.2s ease',
          }}
        >
          <ScrollText size={18} />
          <span>Activity Log</span>
        </button>
      </nav>

      <div style={{ padding: '0 12px' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--color-error)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 'var(--text-sm)',
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
