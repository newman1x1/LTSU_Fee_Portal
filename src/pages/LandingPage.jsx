import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="fade-in" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 16px 40px',
        textAlign: 'center',
      }}>
        <h1 className="font-display" style={{ color: 'var(--color-navy)', letterSpacing: '0.02em' }}>
          <span style={{ display: 'block', fontWeight: 400, fontSize: 'clamp(28px, 5vw, 48px)' }}>
            Lamrin Tech Skills
          </span>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 6vw, 56px)' }}>
            University <span style={{ color: 'var(--color-gold)' }}>Punjab</span>
          </span>
        </h1>

        <div style={{ width: 80, height: 1, background: 'var(--color-gold)', margin: '24px auto' }} />

        <p style={{
          fontSize: 'var(--text-md)',
          color: 'var(--color-text-muted)',
          marginBottom: 48,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Semester Registration Fee Portal
        </p>

        <div style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 960,
          width: '100%',
        }}>
          <GlassCard style={{ flex: '1 1 260px', maxWidth: 300, textAlign: 'center', padding: 32 }}>
            <h2 className="font-display" style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 8,
            }}>
              Student
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              marginBottom: 24,
            }}>
              Submit your semester fee
            </p>
            <Button variant="secondary" onClick={() => navigate('/submit')} style={{ width: '100%' }}>
              Continue as Student
            </Button>
          </GlassCard>

          <GlassCard style={{ flex: '1 1 260px', maxWidth: 300, textAlign: 'center', padding: 32 }}>
            <h2 className="font-display" style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 8,
            }}>
              Staff Login
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              marginBottom: 24,
            }}>
              CR and Teacher access
            </p>
            <Button variant="secondary" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              Staff Login
            </Button>
          </GlassCard>

          <GlassCard style={{ flex: '1 1 260px', maxWidth: 300, textAlign: 'center', padding: 32 }}>
            <h2 className="font-display" style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 8,
            }}>
              Track Request
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              marginBottom: 24,
            }}>
              Check your submission status
            </p>
            <Button variant="secondary" onClick={() => navigate('/track')} style={{ width: '100%' }}>
              Track Request
            </Button>
          </GlassCard>
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
      }}>
        Lamrin Tech Skills University Punjab &middot; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
