import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface Props {
  children: React.ReactElement
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

