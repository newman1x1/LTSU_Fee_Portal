import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../ui/Spinner'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <Spinner />

  if (!user || !profile) return <Navigate to="/login" replace />

  if (!profile.is_active) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}
