import { useEffect, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { statsService, attendanceService } from '../services/api'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, completed: 0 })
  const [weeklyStats, setWeeklyStats] = useState([])
  const [recentAttendance, setRecentAttendance] = useState([])
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchAllData()
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(async () => {
      // Recharger les stats si nécessaire, puis les autres données
      const currentStats = await fetchStats(false) // Ne pas mettre à jour le loading
      await Promise.all([
        fetchTodayStats(currentStats?.effectifTotal),
        fetchWeeklyStats(),
        fetchRecentAttendance()
      ])
      setLastUpdate(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    // D'abord charger les stats générales
    const statsResponse = await fetchStats()
    // Ensuite charger les stats du jour (qui dépendent de stats)
    await Promise.all([
      fetchTodayStats(statsResponse?.effectifTotal),
      fetchWeeklyStats(),
      fetchRecentAttendance()
    ])
    setLastUpdate(new Date())
  }

  const fetchStats = async (updateLoading = true) => {
    try {
      const response = await statsService.getDashboard()
      setStats(response.data)
      return response.data
    } catch (error) {
      if (updateLoading) {
        toast.error('Erreur lors du chargement des statistiques')
      }
      return null
    } finally {
      if (updateLoading) {
        setLoading(false)
      }
    }
  }

  const fetchTodayStats = async (effectifTotal = null) => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const response = await attendanceService.getAll({
        startDate: today,
        endDate: today
      })
      const todayAttendance = response.data || []
      const present = todayAttendance.filter(att => att.heureArrivee).length
      const completed = todayAttendance.filter(att => att.heureArrivee && att.heureDepart).length
      // Utiliser effectifTotal passé en paramètre ou stats actuel
      const totalEmployees = effectifTotal || stats?.effectifTotal || 0
      const absent = Math.max(0, totalEmployees - present)
      
      setTodayStats({ present, absent, completed })
    } catch (error) {
      console.error('Erreur lors du chargement des stats du jour:', error)
    }
  }

  const fetchWeeklyStats = async () => {
    try {
      const weekStart = dayjs().startOf('week')
      const weekData = []
      
      for (let i = 0; i < 7; i++) {
        const date = weekStart.add(i, 'day')
        const dateStr = date.format('YYYY-MM-DD')
        const response = await attendanceService.getAll({
          startDate: dateStr,
          endDate: dateStr
        })
        const dayAttendance = response.data || []
        const present = dayAttendance.filter(att => att.heureArrivee).length
        weekData.push({
          date: date.format('ddd'),
          present,
          completed: dayAttendance.filter(att => att.heureArrivee && att.heureDepart).length
        })
      }
      
      setWeeklyStats(weekData)
    } catch (error) {
      console.error('Erreur lors du chargement des stats hebdomadaires:', error)
    }
  }

  const fetchRecentAttendance = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const response = await attendanceService.getAll({
        startDate: today,
        endDate: today
      })
      const todayAttendance = response.data || []
      // Trier par heure d'arrivée (plus récent en premier)
      const sorted = todayAttendance
        .filter(att => att.heureArrivee)
        .sort((a, b) => new Date(b.heureArrivee) - new Date(a.heureArrivee))
        .slice(0, 5)
      setRecentAttendance(sorted)
    } catch (error) {
      console.error('Erreur lors du chargement des présences récentes:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80)',
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
      {/* En-tête avec image de fond professionnelle */}
      <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80)',
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative z-10 p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Tableau de bord</h1>
              <p className="text-white/90 text-base sm:text-lg">Vue d'ensemble de votre gestion des ressources humaines</p>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm mb-1">Dernière mise à jour</div>
              <div className="text-white text-lg font-semibold">
                {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cartes statistiques modernes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Effectif total</p>
            <p className="text-4xl font-bold text-gray-900">
              {stats?.effectifTotal || 0}
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Présences ce mois</p>
            <p className="text-4xl font-bold text-gray-900">
              {stats?.presencesMois || 0}
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Ancienneté moyenne</p>
            <p className="text-4xl font-bold text-gray-900">
              {stats?.ancienneteStats?.moyenne?.toFixed(1) || 0} <span className="text-xl text-gray-500">ans</span>
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Enfants total</p>
            <p className="text-4xl font-bold text-gray-900">
              {stats?.enfantsStats?.total || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques du jour */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">📊 Statistiques du jour</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Présents aujourd'hui</p>
                <p className="text-4xl font-bold text-gray-900">{todayStats.present}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats?.effectifTotal ? `${Math.round((todayStats.present / stats.effectifTotal) * 100)}% de l'effectif` : ''}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Pointages complets</p>
                <p className="text-4xl font-bold text-gray-900">{todayStats.completed}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {todayStats.present > 0 ? `${Math.round((todayStats.completed / todayStats.present) * 100)}% des présents` : 'Aucun présent'}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">Absents aujourd'hui</p>
                <p className="text-4xl font-bold text-gray-900">{todayStats.absent}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats?.effectifTotal ? `${Math.round((todayStats.absent / stats.effectifTotal) * 100)}% de l'effectif` : ''}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Graphiques et répartitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl bg-white shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Employés par service
          </h2>
          <div className="space-y-4">
            {stats?.employeesByService?.map((item, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">{item.service}</span>
                  <span className="font-bold text-gray-900 text-lg">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-800 rounded-full transition-all duration-500 group-hover:shadow-lg"
                    style={{ width: `${(item.count / (stats?.effectifTotal || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="rounded-xl bg-white shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Répartition par genre
          </h2>
          <div className="space-y-4">
            {stats?.repartitionGenre?.map((item, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">{item._id}</span>
                  <span className="font-bold text-gray-900 text-lg">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-800 rounded-full transition-all duration-500 group-hover:shadow-lg"
                    style={{ width: `${(item.count / (stats?.effectifTotal || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graphique de tendance hebdomadaire */}
      {weeklyStats.length > 0 && (
        <div className="rounded-xl bg-white shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Tendance hebdomadaire des présences
          </h2>
          <Line
            data={{
              labels: weeklyStats.map(stat => stat.date),
              datasets: [
                {
                  label: 'Présents',
                  data: weeklyStats.map(stat => stat.present),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true
                },
                {
                  label: 'Pointages complets',
                  data: weeklyStats.map(stat => stat.completed),
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  tension: 0.4,
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* Dernières présences et graphique circulaire */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Dernières présences */}
        <div className="rounded-xl bg-white shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Dernières présences
            </h2>
            <button
              onClick={fetchAllData}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              🔄 Actualiser
            </button>
          </div>
          <div className="space-y-3">
            {recentAttendance.length > 0 ? (
              recentAttendance.map((att, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {att.employee?.nom?.charAt(0) || att.nom?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {att.employee?.nom || att.nom || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {att.employee?.matricule || att.matricule || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(att.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dayjs(att.heureArrivee).format('DD/MM')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune présence aujourd'hui</p>
            )}
          </div>
        </div>

        {/* Graphique circulaire - Répartition des présences */}
        <div className="rounded-xl bg-white shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Répartition des présences (aujourd'hui)
          </h2>
          {stats?.effectifTotal > 0 ? (
            <Doughnut
              data={{
                labels: ['Présents', 'Absents'],
                datasets: [{
                  data: [todayStats.present, todayStats.absent],
                  backgroundColor: ['#10b981', '#ef4444'],
                  borderWidth: 2,
                  borderColor: '#fff'
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || ''
                        const value = context.parsed || 0
                        const total = context.dataset.data.reduce((a, b) => a + b, 0)
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0
                        return `${label}: ${value} (${percentage}%)`
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <p className="text-center text-gray-500 py-8">Aucune donnée disponible</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

export default Dashboard
