import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../utils/logAction'
import { useToast } from '../context/ToastContext'
import { isValidEmail } from '../utils/validators'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminOverview from '../components/admin/AdminOverview'
import BranchManager from '../components/admin/BranchManager'
import SpecManager from '../components/admin/SpecManager'
import SectionManager from '../components/admin/SectionManager'
import BatchManager from '../components/admin/BatchManager'
import SemesterManager from '../components/admin/SemesterManager'
import StaffManager from '../components/admin/StaffManager'
import CSVUploader from '../components/admin/CSVUploader'
import StudentManager from '../components/admin/StudentManager'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { Menu, X, Shield } from 'lucide-react'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function AdminPage() {
  const { addToast } = useToast()
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase()) {
        setAuthenticated(true)
      }
      setCheckingSession(false)
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      addToast('Please enter email and password', 'error')
      return
    }
    if (!isValidEmail(email)) {
      addToast('Invalid email address', 'error')
      return
    }

    setLoginLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Check admin role AFTER successful auth (prevents email enumeration)
      if (email.toLowerCase() !== ADMIN_EMAIL?.toLowerCase()) {
        await supabase.auth.signOut()
        addToast('Login failed. Please check your credentials.', 'error')
        return
      }

      setAuthenticated(true)

      await logAction({
        actionType: 'admin_login',
        performedByRole: 'admin',
        performedByName: 'Administrator',
        details: { email },
      })
    } catch (err) {
      addToast('Login failed. Please check your credentials.', 'error')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthenticated(false)
    setEmail('')
    setPassword('')
    setActiveSection('overview')
  }

  const handleNavigate = (section) => {
    setActiveSection(section)
    if (isMobile) setSidebarOpen(false)
  }

  if (checkingSession) return <Spinner />

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div className="glass-card fade-in" style={{ maxWidth: 400, width: '100%', padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-navy), #1a2d5a)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, boxShadow: '0 4px 16px rgba(11,27,62,0.25)',
            }}>
              <Shield size={28} style={{ color: 'var(--color-gold)' }} />
            </div>
            <h1 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--color-navy)' }}>
              Admin Panel
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Sign in with your administrator account
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@university.edu"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Button
            onClick={handleLogin}
            loading={loginLoading}
            style={{ width: '100%', marginTop: 8 }}
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <AdminOverview onNavigate={handleNavigate} />
      case 'branches': return <BranchManager />
      case 'specialisations': return <SpecManager />
      case 'sections': return <SectionManager />
      case 'batches': return <BatchManager />
      case 'semesters': return <SemesterManager />
      case 'staff': return <StaffManager />
      case 'upload': return <CSVUploader />
      case 'students': return <StudentManager />
      default: return <AdminOverview onNavigate={handleNavigate} />
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <>
          <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            background: 'var(--color-white)',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 100,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)' }}
            >
              <Menu size={24} />
            </button>
            <span className="font-display" style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-navy)' }}>
              Admin Panel
            </span>
            <div style={{ width: 32 }} />
          </header>

          {sidebarOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: 'rgba(11, 27, 62, 0.5)',
                backdropFilter: 'blur(4px)',
              }}
              onClick={() => setSidebarOpen(false)}
            >
              <div
                style={{ width: 260, height: '100%', position: 'relative' }}
                onClick={e => e.stopPropagation()}
              >
                <AdminSidebar
                  activeSection={activeSection}
                  onNavigate={handleNavigate}
                  onLogout={handleLogout}
                />
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: -40,
                    background: 'var(--color-white)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  <X size={18} style={{ color: 'var(--color-text)' }} />
                </button>
              </div>
            </div>
          )}

          <main style={{ padding: '72px 16px 24px' }}>
            {renderContent()}
          </main>
        </>
      ) : (
        <>
          <AdminSidebar
            activeSection={activeSection}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
          <main style={{ marginLeft: 260, padding: '24px 32px' }}>
            {renderContent()}
          </main>
        </>
      )}
    </div>
  )
}
