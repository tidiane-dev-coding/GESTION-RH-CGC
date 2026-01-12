import { createContext, useState, useContext, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await authService.getMe()
      setUser(response.data)
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      // Si erreur 401, le token est invalide, on nettoie
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setUser(user)
      // Recharger les infos utilisateur après connexion
      await fetchUser()
      return { success: true }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return {
          success: false,
          message: 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.'
        }
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur de connexion'
      }
    }
  }

  const register = async (username, email, password, service) => {
    try {
      const response = await authService.register({ username, email, password, service })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setUser(user)
      // Recharger les infos utilisateur après inscription
      await fetchUser()
      return { success: true }
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return {
          success: false,
          message: 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.'
        }
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur lors de l\'inscription'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

