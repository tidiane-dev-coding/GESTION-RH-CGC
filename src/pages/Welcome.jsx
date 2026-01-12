import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { statsService } from '../services/api'
import { toast } from 'react-toastify'

const Welcome = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Mettre à jour l'heure chaque seconde
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    fetchStats()

    return () => clearInterval(timer)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await statsService.getDashboard()
      setStats(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const quickActions = [
    { 
      name: 'Gérer les Services', 
      href: '/services', 
      icon: '🏢', 
      description: 'Créer et organiser vos services'
    },
    { 
      name: 'Gérer les Employés', 
      href: '/employees', 
      icon: '👥', 
      description: 'Ajouter et modifier les employés'
    },
    { 
      name: 'Scanner QR Code', 
      href: '/qr-scanner', 
      icon: '📱', 
      description: 'Enregistrer les présences'
    },
    { 
      name: 'Voir les Statistiques', 
      href: '/stats', 
      icon: '📈', 
      description: 'Analyser les données'
    }
  ]

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          zIndex: 0
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-black/20"></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 min-h-screen w-full animate-fade-in-up p-6 sm:p-8">
        {/* En-tête de bienvenue */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <div className="relative">
              <div className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-5xl shadow-2xl">
                {user?.username?.charAt(0).toUpperCase() || '👤'}
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {getGreeting()}, {user?.username || 'Utilisateur'} !
          </h1>
          <p className="text-xl text-white/90 mb-2">
            Bienvenue dans votre espace de gestion RH
          </p>
          <div className="flex items-center justify-center space-x-4 text-white/80">
            <span className="text-lg">📅 {formatDate(currentTime)}</span>
            <span className="text-2xl">•</span>
            <span className="text-lg font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Statistiques rapides */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                    👥
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Effectif total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.effectifTotal || 0}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                    ⏰
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Présences ce mois</p>
                <p className="text-3xl font-bold text-gray-900">{stats.presencesMois || 0}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                    📅
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Ancienneté moyenne</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.ancienneteStats?.moyenne?.toFixed(1) || 0} <span className="text-lg text-gray-600">ans</span>
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                    👶
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Enfants total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.enfantsStats?.total || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={action.name}
                to={action.href}
                className="group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-3xl mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{action.name}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                  <div className="mt-4 flex items-center text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
                    <span className="text-sm">Accéder</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Section informative */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-3 text-2xl">💡</span>
              Astuce du jour
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Utilisez le scanner QR Code pour enregistrer rapidement les présences de vos employés. 
              C'est rapide, efficace et sans erreur !
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-3 text-2xl">📊</span>
              Vue d'ensemble
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Consultez le tableau de bord pour avoir une vue complète de vos statistiques et données RH. 
              Toutes les informations importantes en un seul endroit.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
            >
              Voir le tableau de bord →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Welcome
