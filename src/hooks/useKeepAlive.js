import { useEffect } from 'react'
import api from '../services/api'

/**
 * Hook anti-sommeil - Ping le serveur toutes les 5 minutes
 * pour éviter que l'application ne soit mise en veille sur Render
 */
export const useKeepAlive = () => {
  useEffect(() => {
    // Ping initial au montage du composant
    const pingServer = async () => {
      try {
        await api.get('/health')
        console.log('✅ Ping serveur réussi')
      } catch (error) {
        console.error('⚠️ Erreur ping serveur:', error.message)
      }
    }

    // Appel initial
    pingServer()

    // Intervalle de 5 minutes (300000 ms)
    const interval = setInterval(pingServer, 5 * 60 * 1000)

    // Cleanup
    return () => clearInterval(interval)
  }, [])
}
