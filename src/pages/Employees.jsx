import { useState, useEffect } from 'react'
import { employeeService, serviceService, exportService } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import dayjs from 'dayjs'

const Employees = () => {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState({
    numero: '',
    matricule: '',
    nom: '',
    prenom: '',
    poste: '',
    photo: null,
    genre: 'Homme',
    dateNaissance: '',
    age: '',
    lieuNaissance: '',
    lieuResidence: '',
    nationalite: '',
    dateEmbauche: '',
    dateFinContrat: '', // Nouveau champ pour les contrats temporaires
    filiation: '',
    situationMatrimoniale: 'Célibataire',
    nombreEnfants: 0,
    statutJuridique: 'CDI',
    niveauEtude: '',
    cadre: '',
    service: '',
    typeContrat: 'permanent' // Nouveau champ: 'permanent', 'cdd', 'interim', 'stage'
  })
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employeesRes, servicesRes] = await Promise.all([
        employeeService.getAll(),
        serviceService.getAll()
      ])
      setEmployees(employeesRes.data)
      setServices(servicesRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = new FormData()
      Object.keys(formData).forEach(key => {
        if (key === 'photo') return // On gère le fichier à part
        data.append(key, formData[key])
      })
      if (selectedFile) {
        data.append('photo', selectedFile)
      }

      if (editingEmployee) {
        await employeeService.update(editingEmployee._id, data)
        toast.success('Employé modifié avec succès')
      } else {
        await employeeService.create(data)
        toast.success('Employé créé avec succès')
      }
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'opération')
    }
  }

  const resetForm = () => {
    setFormData({
      numero: '',
      matricule: '',
      nom: '',
      prenom: '',
      poste: '',
      genre: 'Homme',
      dateNaissance: '',
      age: '',
      lieuResidence: '',
      nationalite: '',
      dateEmbauche: '',
      dateFinContrat: '',
      filiation: '',
      situationMatrimoniale: 'Célibataire',
      nombreEnfants: 0,
      statutJuridique: 'CDI',
      typeContrat: 'permanent',
      niveauEtude: '',
      cadre: '',
      service: ''
    })
    setEditingEmployee(null)
    setSelectedFile(null)
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    const { anciennete, ...employeeData } = employee
    setFormData({
      ...employeeData,
      dateNaissance: dayjs(employee.dateNaissance).format('YYYY-MM-DD'),
      age: employee.dateNaissance ? dayjs().diff(dayjs(employee.dateNaissance), 'year') : '',
      dateEmbauche: employee.dateEmbauche ? dayjs(employee.dateEmbauche).format('YYYY-MM-DD') : '',
      dateFinContrat: employee.dateFinContrat ? dayjs(employee.dateFinContrat).format('YYYY-MM-DD') : '',
      service: employee.service._id || employee.service,
      typeContrat: employee.typeContrat || 'permanent'
    })
    setSelectedFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return

    try {
      await employeeService.delete(id)
      toast.success('Employé supprimé avec succès')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const handleExportPDF = async () => {
    try {
      setExportLoading(true)
      const response = await exportService.employeesPDF()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `employees-directory-${dayjs().format('DD-MM-YYYY')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('✅ Export PDF réussi')
    } catch (error) {
      toast.error('❌ Erreur lors de l\'export PDF')
    } finally {
      setExportLoading(false)
      setShowExportModal(false)
    }
  }

  const handleExportEmployeePDF = async (employeeId, employeeName) => {
    try {
      setExportLoading(true)
      if (!employeeId) {
        toast.error('❌ ID employé manquant')
        return
      }

      const response = await exportService.employeePDF(employeeId)

      if (!response || !response.data) {
        toast.error('❌ Aucune donnée reçue du serveur')
        return
      }

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${employeeName.replace(/\s+/g, '-')}-${dayjs().format('DD-MM-YYYY')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('✅ Fiche PDF téléchargée')
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du téléchargement'
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExportLoading(true)
      const response = await exportService.employeesExcel()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `employees-${dayjs().format('DD-MM-YYYY')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('✅ Export Excel réussi')
    } catch (error) {
      toast.error('❌ Erreur lors de l\'export Excel')
    } finally {
      setExportLoading(false)
      setShowExportModal(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80)',
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
              backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80)',
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}
          >
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
          <div className="relative z-10 p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Gestion des Employés</h1>
                  <p className="text-white/90 text-base sm:text-lg">Gérez votre effectif et vos collaborateurs</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm border-2 border-blue-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6-4m6 4l6-4" />
                  </svg>
                  Télécharger
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      resetForm()
                      setShowModal(true)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter un employé
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques des employés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Total Employés</div>
            <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">Employés Permanents</div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(emp => emp.typeContrat === 'permanent' || !emp.typeContrat).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Employés Temporaires</div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(emp => ['cdd', 'interim', 'stage'].includes(emp.typeContrat)).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="text-sm text-gray-600 mb-1">Contrats à échéance</div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(emp => emp.dateFinContrat && dayjs(emp.dateFinContrat).isBefore(dayjs().add(30, 'day'))).length}
            </div>
          </div>
        </div>

        {/* Vue tableau pour écrans moyens et grands */}
        <div className="bg-white rounded-xl shadow-lg hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Matricule</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom & Prénom</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Poste</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sexe</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Âge</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date de naissance</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lieu de naissance</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Résidence</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nationalité</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date d'embauche</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ancienneté</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Situation matrimoniale</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Enfants</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut juridique</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type de contrat</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fin de contrat</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Niveau d'étude</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Catégorie professionnelle</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Filiation</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp, index) => (
                  <tr key={emp._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{emp.matricule}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 font-medium">{emp.nom} {emp.prenom}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{emp.poste}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{emp.service?.nom || '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{emp.genre}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{emp.dateNaissance ? dayjs().diff(dayjs(emp.dateNaissance), 'year') + ' ans' : '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.dateNaissance ? dayjs(emp.dateNaissance).format('DD/MM/YYYY') : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.lieuNaissance || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.lieuResidence || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.nationalite || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.dateEmbauche ? dayjs(emp.dateEmbauche).format('DD/MM/YYYY') : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {formatAnciennete(emp.dateEmbauche)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.situationMatrimoniale || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.nombreEnfants ?? '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.statutJuridique || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        emp.typeContrat === 'permanent' || !emp.typeContrat
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : emp.typeContrat === 'cdd'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : emp.typeContrat === 'interim'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : emp.typeContrat === 'stage'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {emp.typeContrat === 'permanent' || !emp.typeContrat ? 'Permanent' :
                         emp.typeContrat === 'cdd' ? 'CDD' :
                         emp.typeContrat === 'interim' ? 'Intérim' :
                         emp.typeContrat === 'stage' ? 'Stage' : 'Non défini'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.dateFinContrat ? (
                        <span className={`font-medium ${
                          dayjs(emp.dateFinContrat).isBefore(dayjs().add(30, 'day')) 
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {dayjs(emp.dateFinContrat).format('DD/MM/YYYY')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.niveauEtude || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.cadre || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                      {emp.filiation || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <button
                          onClick={() => handleExportEmployeePDF(emp._id, emp.nom)}
                          className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                          title="Télécharger la fiche PDF"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setShowQRModal(true)
                          }}
                          className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                        >
                          📱 QR
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleEdit(emp)}
                              className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(emp._id)}
                              className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                            >
                              🗑️ Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vue cartes responsive pour petits écrans */}
        <div className="space-y-4 md:hidden mt-4">
          {employees.map((emp) => (
            <div
              key={emp._id}
              className="bg-white rounded-xl shadow-md p-4 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">Matricule</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.matricule}</p>
                </div>
                <span className="px-2 py-1 text-[11px] rounded-full bg-gray-100 text-gray-700">
                  {emp.service?.nom || '-'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">{emp.nom} {emp.prenom}</p>
              <p className="text-xs text-gray-600 mb-3">{emp.poste}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 mb-3">
                <div>
                  <p className="text-gray-500 text-[10px]">Sexe</p>
                  <p>{emp.genre}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Âge</p>
                  <p>{emp.dateNaissance ? dayjs().diff(dayjs(emp.dateNaissance), 'year') + ' ans' : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Date de naissance</p>
                  <p>{emp.dateNaissance ? dayjs(emp.dateNaissance).format('DD/MM/YYYY') : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Lieu de naissance</p>
                  <p>{emp.lieuNaissance || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Résidence</p>
                  <p>{emp.lieuResidence || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Nationalité</p>
                  <p>{emp.nationalite || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Date d'embauche</p>
                  <p>{emp.dateEmbauche ? dayjs(emp.dateEmbauche).format('DD/MM/YYYY') : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Ancienneté</p>
                  <p>{formatAnciennete(emp.dateEmbauche)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Situation matrimoniale</p>
                  <p>{emp.situationMatrimoniale || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Enfants</p>
                  <p>{emp.nombreEnfants ?? '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Statut juridique</p>
                  <p>{emp.statutJuridique || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Niveau d'étude</p>
                  <p>{emp.niveauEtude || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Catégorie professionnelle</p>
                  <p>{emp.cadre || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px]">Filiation</p>
                  <p>{emp.filiation || '-'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleExportEmployeePDF(emp._id, emp.nom)}
                  className="px-2.5 py-1 bg-blue-600 text-white text-[11px] rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
                  title="Télécharger la fiche PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedEmployee(emp)
                    setShowQRModal(true)
                  }}
                  className="px-2.5 py-1 bg-gray-800 text-white text-[11px] rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                >
                  📱 QR
                </button>
                {user?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => handleEdit(emp)}
                      className="px-2.5 py-1 bg-gray-800 text-white text-[11px] rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id)}
                      className="px-2.5 py-1 bg-gray-800 text-white text-[11px] rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white">
                {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative w-24 h-24 mb-2">
                    {selectedFile ? (
                      <img src={URL.createObjectURL(selectedFile)} alt="Aperçu" className="w-full h-full object-cover rounded-full border-2 border-white shadow-md" />
                    ) : formData.photo ? (
                      <img src={`${import.meta.env.VITE_API_URL}/${formData.photo}`} alt="Actuel" className="w-full h-full object-cover rounded-full border-2 border-white shadow-md" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-2xl font-bold border-2 border-dashed border-gray-400">
                        ?
                      </div>
                    )}
                    <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full cursor-pointer shadow-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                  <p className="text-white text-xs opacity-70">Cliquez sur l'icône pour ajouter une photo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Numéro *</label>
                    <input type="text" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Numéro" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Matricule *</label>
                    <input type="text" value={formData.matricule} onChange={(e) => setFormData({ ...formData, matricule: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Matricule" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nom *</label>
                    <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Nom" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Prénom *</label>
                    <input type="text" value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Prénom" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Poste *</label>
                    <input type="text" value={formData.poste} onChange={(e) => setFormData({ ...formData, poste: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Poste" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Niveau d'étude</label>
                    <select value={formData.niveauEtude} onChange={(e) => setFormData({ ...formData, niveauEtude: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="" className="bg-gray-800">Sélectionner un niveau</option>
                      <option value="Primaire" className="bg-gray-800">Primaire</option>
                      <option value="Secondaire" className="bg-gray-800">Secondaire</option>
                      <option value="Baccalauréat" className="bg-gray-800">Baccalauréat</option>
                      <option value="BTS" className="bg-gray-800">BTS</option>
                      <option value="Licence" className="bg-gray-800">Licence</option>
                      <option value="Maitrise" className="bg-gray-800">Maitrise</option>
                      <option value="Master" className="bg-gray-800">Master</option>
                      <option value="Doctorat" className="bg-gray-800">Doctorat</option>
                      <option value="Autre" className="bg-gray-800">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Catégorie professionnelle</label>
                    <select value={formData.cadre} onChange={(e) => setFormData({ ...formData, cadre: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="" className="bg-gray-800">Sélectionner</option>
                      <option value="Cadre supérieur" className="bg-gray-800">Cadre supérieur</option>
                      <option value="Cadre moyen" className="bg-gray-800">Cadre moyen</option>
                      <option value="Employé" className="bg-gray-800">Employé</option>
                      <option value="Cadre" className="bg-gray-800">Cadre</option>
                      <option value="Chargé d'étude" className="bg-gray-800">Chargé d'étude</option>
                      <option value="Agent de maîtrise" className="bg-gray-800">Agent de maîtrise</option>
                      <option value="Cadre dirigeant" className="bg-gray-800">Cadre dirigeant</option>
                      <option value="Autre" className="bg-gray-800">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Sexe *</label>
                    <select value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="Homme" className="bg-gray-800">Homme</option>
                      <option value="Femme" className="bg-gray-800">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Âge (optionnel)</label>
                    <input type="number" value={formData.age} onChange={(e) => {
                      const ageVal = e.target.value
                      const newDate = ageVal ? dayjs().subtract(parseInt(ageVal), 'year').format('YYYY-MM-DD') : ''
                      setFormData({ ...formData, age: ageVal, dateNaissance: newDate })
                    }} min="0" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Âge en années" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Date de naissance *</label>
                    <input type="date" value={formData.dateNaissance} onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value, age: e.target.value ? dayjs().diff(dayjs(e.target.value), 'year') : '' })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Lieu de naissance *</label>
                    <input type="text" value={formData.lieuNaissance || ''} onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Lieu de naissance" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Lieu de résidence *</label>
                    <input type="text" value={formData.lieuResidence} onChange={(e) => setFormData({ ...formData, lieuResidence: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Lieu de résidence" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nationalité *</label>
                    <input type="text" value={formData.nationalite} onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Nationalité" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Date d'embauche *</label>
                    <input type="date" value={formData.dateEmbauche} onChange={(e) => setFormData({ ...formData, dateEmbauche: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Filiation</label>
                    <input type="text" value={formData.filiation} onChange={(e) => setFormData({ ...formData, filiation: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="Filiation" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Situation matrimoniale *</label>
                    <select value={formData.situationMatrimoniale} onChange={(e) => setFormData({ ...formData, situationMatrimoniale: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="Célibataire" className="bg-gray-800">Célibataire</option>
                      <option value="Marié(e)" className="bg-gray-800">Marié(e)</option>
                      <option value="Divorcé(e)" className="bg-gray-800">Divorcé(e)</option>
                      <option value="Veuf(ve)" className="bg-gray-800">Veuf(ve)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nombre d'enfants</label>
                    <input type="number" value={formData.nombreEnfants} onChange={(e) => setFormData({ ...formData, nombreEnfants: parseInt(e.target.value) })} min="0" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Statut juridique *</label>
                    <select value={formData.statutJuridique} onChange={(e) => setFormData({ ...formData, statutJuridique: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="Décret" className="bg-gray-800">Décret</option>
                      <option value="Affecter" className="bg-gray-800">Affecter</option>
                      <option value="Détacher" className="bg-gray-800">Détacher</option>
                      <option value="CDI" className="bg-gray-800">CDI</option>
                      <option value="CDD" className="bg-gray-800">CDD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Service *</label>
                    <select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="" className="bg-gray-800">Sélectionner un service</option>
                      {services.map(s => (
                        <option key={s._id} value={s._id} className="bg-gray-800">{s.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Type de contrat *</label>
                    <select value={formData.typeContrat} onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm">
                      <option value="permanent" className="bg-gray-800">Permanent (CDI)</option>
                      <option value="cdd" className="bg-gray-800">CDD (Contrat à durée déterminée)</option>
                      <option value="interim" className="bg-gray-800">Intérim</option>
                      <option value="stage" className="bg-gray-800">Stage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Date de fin de contrat</label>
                    <input 
                      type="date" 
                      value={formData.dateFinContrat} 
                      onChange={(e) => setFormData({ ...formData, dateFinContrat: e.target.value })} 
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-sm"
                      placeholder="Laissez vide pour contrat permanent"
                    />
                    <p className="text-xs text-white/60 mt-1">Requis pour CDD, Intérim et Stage</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 backdrop-blur-sm font-medium text-sm">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showQRModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white text-center">QR Code - {selectedEmployee.nom}</h2>
              <div className="flex justify-center mb-6 p-4 bg-white rounded-xl">
                <QRCodeSVG value={selectedEmployee.matricule} size={200} />
              </div>
              <p className="text-center text-white/90 mb-6 font-semibold">Matricule: {selectedEmployee.matricule}</p>
              <button onClick={() => setShowQRModal(false)} className="w-full px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-md font-medium text-sm">Fermer</button>
            </div>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Télécharger</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 mb-6">Choisissez le format de téléchargement qui vous convient :</p>

              <div className="space-y-3">
                <button
                  onClick={handleExportPDF}
                  disabled={exportLoading}
                  className="w-full p-4 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Répertoire complet PDF</div>
                    <div className="text-xs text-gray-600">Tous les employés sur une seule page</div>
                  </div>
                  {exportLoading && <svg className="animate-spin h-5 w-5 text-blue-600 ml-auto" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                  className="w-full p-4 border-2 border-green-600 rounded-xl hover:bg-green-50 transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Feuille Excel</div>
                    <div className="text-xs text-gray-600">Tableau éditables avec tous les détails</div>
                  </div>
                  {exportLoading && <svg className="animate-spin h-5 w-5 text-green-600 ml-auto" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>💡 Conseil :</strong> Utilisez le PDF pour une vue d'ensemble, et l'Excel pour des analyses plus détaillées.
                </p>
              </div>

              <button
                onClick={() => setShowExportModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-all duration-300 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Employees

