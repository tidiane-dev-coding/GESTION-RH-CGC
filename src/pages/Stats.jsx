import { useEffect, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Pie, Bar } from 'react-chartjs-2'
import { statsService } from '../services/api'
import { toast } from 'react-toastify'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels)

const Stats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await statsService.getDashboard()
      setStats(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  const genreData = {
    labels: stats?.repartitionGenre?.map(item => item._id) || [],
    datasets: [{
      data: stats?.repartitionGenre?.map(item => item.count) || [],
      backgroundColor: ['#3b82f6', '#ec4899'],
      borderWidth: 2
    }]
  }

  const situationData = {
    labels: stats?.situationMatrimoniale?.map(item => item._id) || [],
    datasets: [{
      data: stats?.situationMatrimoniale?.map(item => item.count) || [],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 2
    }]
  }

  const tranchesAgeData = {
    labels: Object.keys(stats?.tranchesAge || {}),
    datasets: [{
      label: 'Nombre d\'employés',
      data: Object.values(stats?.tranchesAge || {}),
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      borderWidth: 2
    }]
  }

  const servicesData = {
    labels: stats?.employeesByService?.map(item => item.service) || [],
    datasets: [{
      label: 'Nombre d\'employés',
      data: stats?.employeesByService?.map(item => item.count) || [],
      backgroundColor: '#10b981',
      borderColor: '#059669',
      borderWidth: 2
    }]
  }

  const chartOptions = {
    plugins: {
      datalabels: {
        color: '#000',
        font: {
          weight: 'bold',
          size: 20
        },
        formatter: (value) => value
      }
    }
  }

  const barChartOptions = {
    plugins: {
      datalabels: {
        color: '#000',
        font: {
          weight: 'bold',
          size: 20
        },
        formatter: (value) => value,
        anchor: 'end',
        align: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 14
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 14
          }
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          zIndex: 0
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-black/20"></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 min-h-screen w-full p-6 sm:p-8">
      {/* En-tête avec image de fond professionnelle */}
      <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80)',
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative z-10 p-8 sm:p-12">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Statistiques</h1>
              <p className="text-white/90 text-base sm:text-lg">Analysez vos données RH en détail</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Répartition par genre</h2>
          {stats?.repartitionGenre?.length > 0 ? (
            <Pie data={genreData} options={chartOptions} />
          ) : (
            <p className="text-gray-500">Aucune donnée disponible</p>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Situation matrimoniale</h2>
          {stats?.situationMatrimoniale?.length > 0 ? (
            <Pie data={situationData} options={chartOptions} />
          ) : (
            <p className="text-gray-500">Aucune donnée disponible</p>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Tranches d'âge</h2>
          {stats?.tranchesAge && Object.keys(stats.tranchesAge).length > 0 ? (
            <Bar data={tranchesAgeData} options={barChartOptions} />
          ) : (
            <p className="text-gray-500">Aucune donnée disponible</p>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Employés par service</h2>
          {stats?.employeesByService?.length > 0 ? (
            <Bar data={servicesData} options={barChartOptions} />
          ) : (
            <p className="text-gray-500">Aucune donnée disponible</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

export default Stats

