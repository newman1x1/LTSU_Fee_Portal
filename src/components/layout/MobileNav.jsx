import { LayoutDashboard, ScrollText, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const tabs = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ScrollText, label: 'Log', path: '/log' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav aria-label="Mobile navigation" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--color-white)',
      borderTop: '1px solid var(--color-border-light)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              minHeight: 44,
              color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        )
      })}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 16px',
          minHeight: 44,
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </nav>
  )
}
