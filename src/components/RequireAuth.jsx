import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="container py-5 text-center">Cargando...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
