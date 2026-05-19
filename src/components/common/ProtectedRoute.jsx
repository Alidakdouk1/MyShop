import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { selectUser, selectAuthInitialized } from '../../store/slices/authSlice'
import Spinner from '../ui/Spinner'

export default function ProtectedRoute({ children, role }) {
  const user        = useSelector(selectUser)
  const initialized = useSelector(selectAuthInitialized)
  const location    = useLocation()

  if (!initialized && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" className="text-ink-tertiary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(user.role)) return <Navigate to="/" replace />
  }

  return children
}
