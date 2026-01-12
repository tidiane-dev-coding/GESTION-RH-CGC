import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { employeeService, attendanceService } from '../services/api'
import { toast } from 'react-toastify'
import { QRCodeSVG } from 'qrcode.react'
import dayjs from 'dayjs'

const Profile = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState(null)
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [activeTab, setActiveTab] = useState('info')
  const [showQRModal, setShowQRModal] = useState(false)
  const [form, setForm] = useState({
    numero: '',
    matricule: '',
    nom : '',
    poste: '',
    genre: 'Homme',
    dateNaissance: '',
    lieuResidence: '',
    nationalite: '',
    dateEmbauche: '',
    filiation: '',
    situationMatrimoniale: 'Célibataire',
    nombreEnfants: 0,
    statutJuridique: 'CDI',
    service: user?.service?._id || user?.service || ''
  })

  // Fonction pour calculer et formater l'ancienneté (années, mois, jours)
  const formatAnciennete = (dateEmbauche) => {
    if (!dateEmbauche) return '-'
    const today = dayjs()
    const hireDate = dayjs(dateEmbauche)
    
    if (hireDate.isAfter(today)) return '0 an(s)'
    
    const years = today.diff(hireDate, 'year')
    const months = today.diff(hireDate.add(years, 'year'), 'month')
    const days = today.diff(hireDate.add(years, 'year').add(months, 'month'), 'day')
    
    const parts = []
    if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`)
    if (months > 0) parts.push(`${months} mois`)
    if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`)
    
    return parts.length > 0 ? parts.join(', ') : '0 an(s)'
  }

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await employeeService.getMy()
        setEmployee(res.data)
        const { anciennete, ...employeeData } = res.data
        setForm({
          ...form,
          ...employeeData,
          dateNaissance: res.data.dateNaissance ? dayjs(res.data.dateNaissance).format('YYYY-MM-DD') : '',
          dateEmbauche: res.data.dateEmbauche ? dayjs(res.data.dateEmbauche).format('YYYY-MM-DD') : ''
        })
        
        // Charger l'historique des pointages (30 derniers jours)
        const endDate = dayjs().format('YYYY-MM-DD')
        const startDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD')
        const attendanceRes = await attendanceService.getAll({ startDate, endDate })
        setAttendanceHistory(attendanceRes.data.slice(0, 10)) // 10 derniers pointages
      } catch (err) {
        // 404 means no profile yet
      } finally {
        setLoading(false)
      }
    }
    fetch()
    // eslint-disable-next-line
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (employee) {
        await employeeService.update(employee._id, form)
        toast.success('Profil mis à jour')
        // Recharger les données
        const res = await employeeService.getMy()
        setEmployee(res.data)
      } else {
        await employeeService.create(form)
        toast.success('Profil créé')
      }
      // Ne pas naviguer, rester sur la page
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // Calculer les statistiques
  const stats = {
    totalPresences: attendanceHistory.length,
    presencesCeMois: attendanceHistory.filter(a => dayjs(a.date).isSame(dayjs(), 'month')).length,
    heuresTotales: attendanceHistory.reduce((sum, a) => sum + (a.heuresTotales || 0), 0)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80)',
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
        {/* En-tête */}
        <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80)',
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                  {employee ? employee.nom : 'Mon Profil'}
                </h1>
                <p className="text-white/90 text-base sm:text-lg">
                  {employee ? `${employee.poste} - ${employee.service?.nom || 'Service'}` : 'Gérez vos informations personnelles'}
                </p>
              </div>
              {employee && (
                <button
                  onClick={() => setShowQRModal(true)}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
                >
                  📱 Voir QR Code
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        {employee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Présences ce mois</p>
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.presencesCeMois}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Heures totales (30j)</p>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.heuresTotales.toFixed(1)}h</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Ancienneté</p>
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatAnciennete(employee.dateEmbauche)}</p>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'info'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📝 Informations
              </button>
              {employee && (
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'attendance'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  📅 Pointages récents
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Numéro *</label>
                    <input required value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Matricule *</label>
                    <input required value={form.matricule} onChange={(e) => setForm({...form, matricule: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom *</label>
                    <input required value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Poste *</label>
                    <input required value={form.poste} onChange={(e) => setForm({...form, poste: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sexe *</label>
                    <select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Homme</option>
                      <option>Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date de naissance *</label>
                    <input type="date" required value={form.dateNaissance} onChange={(e) => setForm({...form, dateNaissance: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lieu de résidence *</label>
                    <input required value={form.lieuResidence} onChange={(e) => setForm({...form, lieuResidence: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nationalité *</label>
                    <input required value={form.nationalite} onChange={(e) => setForm({...form, nationalite: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date d'embauche</label>
                    <input type="date" value={form.dateEmbauche} onChange={(e) => setForm({...form, dateEmbauche: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Situation matrimoniale *</label>
                    <select required value={form.situationMatrimoniale} onChange={(e) => setForm({...form, situationMatrimoniale: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Célibataire</option>
                      <option>Marié(e)</option>
                      <option>Divorcé(e)</option>
                      <option>Veuf(ve)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre d'enfants</label>
                    <input type="number" min="0" value={form.nombreEnfants} onChange={(e) => setForm({...form, nombreEnfants: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Statut juridique *</label>
                    <select required value={form.statutJuridique} onChange={(e) => setForm({...form, statutJuridique: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Décret</option>
                      <option>Affecter</option>
                      <option>Détacher</option>
                      <option>CDI</option>
                      <option>CDD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Filiation</label>
                    <input value={form.filiation} onChange={(e) => setForm({...form, filiation: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-300 font-medium">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium">
                    {employee ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'attendance' && employee && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Historique des pointages (30 derniers jours)</h3>
                {attendanceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceHistory.map((attendance) => (
                      <div key={attendance._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{dayjs(attendance.date).format('DD/MM/YYYY')}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              {attendance.heureArrivee && (
                                <span>🟢 Arrivée: {dayjs(attendance.heureArrivee).format('HH:mm')}</span>
                              )}
                              {attendance.heureDepart && (
                                <span>🔴 Départ: {dayjs(attendance.heureDepart).format('HH:mm')}</span>
                              )}
                              {attendance.heuresTotales > 0 && (
                                <span className="font-semibold text-blue-600">{attendance.heuresTotales}h</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            attendance.statut === 'present' ? 'bg-green-100 text-green-700' :
                            attendance.statut === 'absent' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {attendance.statut === 'present' ? 'Présent' : attendance.statut === 'absent' ? 'Absent' : 'Retard'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Aucun pointage enregistré</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal QR Code */}
      {showQRModal && employee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">QR Code - {employee.nom}</h2>
            <div className="flex justify-center mb-6 p-4 bg-white rounded-xl">
              <QRCodeSVG value={employee.matricule} size={200} />
            </div>
            <p className="text-center text-white/90 mb-6 font-semibold">Matricule: {employee.matricule}</p>
            <button onClick={() => setShowQRModal(false)} className="w-full px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-md font-medium text-sm">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
