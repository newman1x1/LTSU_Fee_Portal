import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Navbar />
      <div className="fade-in" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <h1 className="font-display" style={{ fontSize: 'var(--text-4xl)', color: 'var(--color-navy)', fontWeight: 700 }}>
          404
        </h1>
        <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-muted)', margin: '16px 0 32px' }}>
          Page not found
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </div>
  )
}
