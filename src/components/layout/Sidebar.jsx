import { LayoutDashboard, ScrollText, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ScrollText, label: 'Activity Log', path: '/log' },
  ]

  return (
    <aside style={{
      width: 240,
      height: 'calc(100vh - 48px)',
      position: 'fixed',
      top: 48,
      left: 0,
      background: 'var(--color-white)',
      borderRight: '1px solid var(--color-border-light)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      zIndex: 50,
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
        <span className="font-display" style={{
          fontSize: 'var(--text-md)',
          fontWeight: 600,
          color: 'var(--color-navy)',
        }}>
          LTSU Fee Portal
        </span>
        {profile && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {profile.full_name} ({profile.role?.toUpperCase() || 'STAFF'})
          </p>
        )}
      </div>

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {items.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
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
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '0 12px' }}>
        <button
          onClick={handleLogout}
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
