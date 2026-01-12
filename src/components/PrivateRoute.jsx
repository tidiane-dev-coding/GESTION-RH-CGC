import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Chargement...</p>
        </div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" replace />
}

export default PrivateRoute

