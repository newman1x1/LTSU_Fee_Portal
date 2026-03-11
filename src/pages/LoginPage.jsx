import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import GlassCard from '../components/ui/GlassCard'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { logAction } from '../utils/logAction'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { addToast } = useToast()

  const [role, setRole] = useState('cr')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setError(`Too many attempts. Try again in ${secs}s.`)
      setLoading(false)
      return
    }

    try {
      const { user } = await login(email, password)

      const { data: profile } = await (await import('../lib/supabase')).supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setError('Account not found. Contact your administrator.')
        setLoading(false)
        return
      }

      if (!profile.is_active) {
        setError('Your account has been deactivated. Contact the administrator.')
        setLoading(false)
        return
      }

      if (profile.role !== role) {
        await (await import('../lib/supabase')).supabase.auth.signOut()
        setError('Incorrect role selected.')
        setLoading(false)
        return
      }

      await logAction({
        actionType: 'staff_login',
        performedByRole: profile.role,
        performedByName: profile.full_name,
        performedById: profile.staff_id,
      })

      addToast('Login successful', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid email or password.')
      setAttempts(prev => {
        const next = prev + 1
        if (next >= 5) setLockoutUntil(Date.now() + 60_000)
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const pillStyle = (active) => ({
    flex: 1,
    padding: '10px 20px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    background: active ? 'var(--color-navy)' : 'transparent',
    color: active ? 'var(--color-gold)' : 'var(--color-text)',
    transition: 'all 0.2s ease',
    outline: active ? 'none' : '1px solid var(--color-border)',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Navbar />

      <div className="fade-in" style={{ width: '100%', maxWidth: 440, padding: '80px 16px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="font-display" style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-navy)',
          }}>
            Lamrin Tech Skills University Punjab
          </span>
        </div>

        <GlassCard style={{ padding: 32 }}>
          <h2 className="font-display" style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 24,
            color: 'var(--color-text)',
          }}>
            Staff Login
          </h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={() => setRole('cr')} style={pillStyle(role === 'cr')}>CR</button>
            <button onClick={() => setRole('teacher')} style={pillStyle(role === 'teacher')}>Teacher</button>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your.email@ltsu.edu.in"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />

            {error && (
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-error)',
                textAlign: 'center',
                marginBottom: 16,
              }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              style={{ width: '100%', marginBottom: 16 }}
            >
              Sign In
            </Button>
          </form>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '10px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-navy)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            ← Back to Homepage
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
