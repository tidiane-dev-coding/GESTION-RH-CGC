import { useState, useEffect } from 'react'
import { serviceService, employeeService, exportService } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

const Services = () => {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [expandedServices, setExpandedServices] = useState({})
  const [formData, setFormData] = useState({ nom: '', description: '', parent: '' })
  const [employeeFormData, setEmployeeFormData] = useState({
    numero: '',
    matricule: '',
    nom: '',
    prenom: '',
    poste: '',
    genre: 'Homme',
    dateNaissance: '',
    lieuNaissance: '',
    age: '',
    lieuResidence: '',
    nationalite: '',
    dateEmbauche: '',
    filiation: '',
    situationMatrimoniale: 'Célibataire',
    nombreEnfants: 0,
    statutJuridique: 'CDI',
    niveauEtude: '',
    cadre: '',
    service: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const getFlattenedServices = (list) => {
    const out = [];
    const walk = (items, depth = 0) => {
      items.forEach((it) => {
        out.push({ ...it, depth });
        if (it.children && it.children.length) walk(it.children, depth + 1);
      });
    };
    walk(list || []);
    return out;
  }

  const fetchData = async () => {
    try {
      const [servicesRes, employeesRes] = await Promise.all([
        serviceService.getAll(),
        employeeService.getAll()
      ])
      setServices(servicesRes.data)
      setEmployees(employeesRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const getEmployeesByService = (serviceId) => {
    return employees.filter(emp =>
      emp.service?._id === serviceId || emp.service === serviceId
    )
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

  const toggleServiceExpansion = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }))
  }

  const handleAddEmployee = (service) => {
    setSelectedService(service)
    setEmployeeFormData({
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
      filiation: '',
      situationMatrimoniale: 'Célibataire',
      nombreEnfants: 0,
      statutJuridique: 'CDI',
      niveauEtude: '',
      cadre: '',
      service: service._id
    })
    setSelectedFile(null)
    setShowEmployeeModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingService) {
        await serviceService.update(editingService._id, formData)
        toast.success('Service modifié avec succès')
      } else {
        await serviceService.create(formData)
        toast.success('Service créé avec succès')
      }
      setShowModal(false)
      setEditingService(null)
      setFormData({ nom: '', description: '', parent: '' })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'opération')
    }
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({ nom: service.nom, description: service.description || '', parent: service.parent?._id || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return
    try {
      await serviceService.delete(id)
      toast.success('Service supprimé avec succès')
      fetchServices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const canManageService = (service) => {
    if (!user) return false
    if (user.role === 'admin') return true
    const userServiceId = user.service?._id || user.service
    return String(userServiceId) === String(service._id)
  }

  const handleExportServicePDF = async (serviceId, serviceName) => {
    try {
      const response = await exportService.serviceEmployeesPDF(serviceId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `employes-${serviceName.replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export PDF réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const fetchServices = async () => {
    try {
      const response = await serviceService.getAll()
      setServices(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des services')
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
          backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80)',
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
              backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80)',
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Gestion des Services</h1>
                  <p className="text-white/90 text-base sm:text-lg">Organisez vos départements et services efficacement</p>
                </div>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setEditingService(null)
                    setFormData({ nom: '', description: '', parent: '' })
                    setShowModal(true)
                  }}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
                >
                  + Ajouter un service
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message si aucun service et pas admin */}
        {services.length === 0 && user?.role !== 'admin' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">Aucun service disponible pour le moment.</p>
          </div>
        )}

        {/* Message si aucun service et admin */}
        {services.length === 0 && user?.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-gray-800 text-xl font-semibold mb-2">Aucun service pour le moment</p>
            <p className="text-gray-600 mb-6">Commencez par ajouter votre premier service</p>
            <button
              onClick={() => {
                setEditingService(null)
                setFormData({ nom: '', description: '', parent: '' })
                setShowModal(true)
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              + Ajouter votre premier service
            </button>
          </div>
        )}

        {/* Liste des services avec employés */}
        {services.length > 0 && (
          <div className="space-y-4">
            {services.map((service) => {
              const serviceEmployees = getEmployeesByService(service._id)
              const isExpanded = expandedServices[service._id]

              return (
                <div key={service._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  {/* En-tête du service */}
                  <div className="p-6 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{service.nom}</h3>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            {serviceEmployees.length} employé{serviceEmployees.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm">{service.description}</p>
                        )}
                      </div>
                      {user?.role === 'admin' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleAddEmployee(service)}
                            className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                          >
                            + Ajouter un employé
                          </button>
                          <button
                            onClick={() => handleEdit(service)}
                            className="px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(service._id)}
                            className="px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Boutons d'action */}
                    <div className="mt-4 flex items-center space-x-3 flex-wrap gap-2">
                      {serviceEmployees.length > 0 && (
                        <>
                          <button
                            onClick={() => toggleServiceExpansion(service._id)}
                            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm"
                          >
                            <span>{isExpanded ? '▼' : '▶'}</span>
                            <span>
                              {isExpanded ? 'Masquer les employés' : 'Voir les employés'}
                            </span>
                          </button>
                          {(user?.role === 'admin' || canManageService(service)) && (
                            <button
                              onClick={() => handleExportServicePDF(service._id, service.nom)}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Télécharger PDF</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Liste des employés (expandable) */}
                  {isExpanded && serviceEmployees.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900">Employés du service</h4>
                          {(user?.role === 'admin' || canManageService(service)) && (
                            <button
                              onClick={() => handleExportServicePDF(service._id, service.nom)}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Télécharger PDF</span>
                            </button>
                          )}
                        </div>

                        {/* Vue tableau pour écrans moyens et grands */}
                        <div className="bg-white rounded-xl shadow-sm hidden md:block">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Matricule</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Nom & Prénom</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Poste</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Sexe</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Âge</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Date de naissance</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Lieu de naissance</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Résidence</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Nationalité</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Date d'embauche</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Ancienneté</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Situation matrimoniale</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Enfants</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Statut juridique</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Niveau d'étude</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Catégorie professionnelle</th>
                                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Filiation</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {serviceEmployees.map((employee) => (
                                  <tr key={employee._id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-4 py-2 text-xs font-semibold text-gray-900">{employee.matricule}</td>
                                    <td className="px-4 py-2 text-xs text-gray-800">{employee.nom} {employee.prenom}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700">{employee.poste}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700">{employee.genre}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700">{employee.dateNaissance ? dayjs().diff(dayjs(employee.dateNaissance), 'year') + ' ans' : '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.dateNaissance ? dayjs(employee.dateNaissance).format('DD/MM/YYYY') : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.lieuNaissance || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.lieuResidence || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.nationalite || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.dateEmbauche ? dayjs(employee.dateEmbauche).format('DD/MM/YYYY') : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {formatAnciennete(employee.dateEmbauche)}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.situationMatrimoniale || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.nombreEnfants ?? '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.statutJuridique || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.niveauEtude || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.cadre || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700">
                                      {employee.filiation || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Vue cartes pour petits écrans */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                          {serviceEmployees.map((employee) => (
                            <div
                              key={employee._id}
                              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-xs text-gray-500">Matricule</p>
                                  <p className="text-sm font-semibold text-gray-900">{employee.matricule}</p>
                                </div>
                                <span className="px-2 py-1 text-[11px] rounded-full bg-emerald-100 text-emerald-700">
                                  {service.nom}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{employee.nom} {employee.prenom}</p>
                              <p className="text-xs text-gray-600 mb-3">{employee.poste}</p>

                              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
                                <div>
                                  <p className="text-gray-500 text-[10px]">Sexe</p>
                                  <p>{employee.genre}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Âge</p>
                                  <p>{employee.dateNaissance ? dayjs().diff(dayjs(employee.dateNaissance), 'year') + ' ans' : '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Date de naissance</p>
                                  <p>{employee.dateNaissance ? dayjs(employee.dateNaissance).format('DD/MM/YYYY') : '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Lieu de naissance</p>
                                  <p>{employee.lieuNaissance || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Résidence</p>
                                  <p>{employee.lieuResidence || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Nationalité</p>
                                  <p>{employee.nationalite || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Date d'embauche</p>
                                  <p>{employee.dateEmbauche ? dayjs(employee.dateEmbauche).format('DD/MM/YYYY') : '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Ancienneté</p>
                                  <p>{formatAnciennete(employee.dateEmbauche)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Situation matrimoniale</p>
                                  <p>{employee.situationMatrimoniale || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Enfants</p>
                                  <p>{employee.nombreEnfants ?? '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Statut juridique</p>
                                  <p>{employee.statutJuridique || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Niveau d'étude</p>
                                  <p>{employee.niveauEtude || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Catégorie professionnelle</p>
                                  <p>{employee.cadre || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[10px]">Filiation</p>
                                  <p>{employee.filiation || '-'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message si aucun employé */}
                  {serviceEmployees.length === 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 p-6 text-center">
                      <p className="text-gray-500 mb-4">Aucun employé dans ce service</p>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleAddEmployee(service)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                        >
                          + Ajouter le premier employé
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                {editingService ? 'Modifier le service' : 'Nouveau service'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Nom du service"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    rows="3"
                    placeholder="Description du service"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent (sous-service de)</label>
                  <select
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  >
                    <option value="">Aucun (niveau racine)</option>
                    {getFlattenedServices(services).map(s => (
                      <option key={s._id} value={s._id}>{'—'.repeat(s.depth)} {s.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingService(null)
                      setFormData({ nom: '', description: '' })
                    }}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                  >
                    {editingService ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal pour ajouter un employé au service */}
        {showEmployeeModal && selectedService && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Ajouter un employé au service "{selectedService.nom}"</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                try {
                  await employeeService.create(employeeFormData)
                  toast.success('Employé ajouté avec succès')
                  setShowEmployeeModal(false)
                  setSelectedService(null)
                  fetchData()
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout')
                }
              }} className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative w-24 h-24 mb-2">
                    {selectedFile ? (
                      <img src={URL.createObjectURL(selectedFile)} alt="Aperçu" className="w-full h-full object-cover rounded-full border-2 border-white shadow-md" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-2xl font-bold border-2 border-dashed border-gray-400">
                        ?
                      </div>
                    )}
                    <label htmlFor="service-photo-upload" className="absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-full cursor-pointer shadow-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </label>
                    <input
                      id="service-photo-upload"
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
                  <p className="text-gray-600 text-xs text-center">Ajouter une photo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Numéro *</label>
                    <input type="text" value={employeeFormData.numero} onChange={(e) => setEmployeeFormData({ ...employeeFormData, numero: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Numéro" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Matricule *</label>
                    <input type="text" value={employeeFormData.matricule} onChange={(e) => setEmployeeFormData({ ...employeeFormData, matricule: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Matricule" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom *</label>
                    <input type="text" value={employeeFormData.nom} onChange={(e) => setEmployeeFormData({ ...employeeFormData, nom: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Nom complet" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom *</label>
                    <input type="text" value={employeeFormData.prenom} onChange={(e) => setEmployeeFormData({ ...employeeFormData, prenom: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Prénom" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Poste *</label>
                    <input type="text" value={employeeFormData.poste} onChange={(e) => setEmployeeFormData({ ...employeeFormData, poste: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Poste" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau d'étude</label>
                    <select value={employeeFormData.niveauEtude} onChange={(e) => setEmployeeFormData({ ...employeeFormData, niveauEtude: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm">
                      <option value="">Sélectionner un niveau</option>
                      <option value="Primaire">Primaire</option>
                      <option value="Secondaire">Secondaire</option>
                      <option value="Baccalauréat">Baccalauréat</option>
                      <option value="BTS">BTS</option>
                      <option value="Licence">Licence</option>
                      <option value="Maitrise">Maitrise</option>
                      <option value="Master">Master</option>
                      <option value="Doctorat">Doctorat</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie professionnelle</label>
                    <select value={employeeFormData.cadre} onChange={(e) => setEmployeeFormData({ ...employeeFormData, cadre: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm">
                      <option value="">Sélectionner</option>
                      <option value="Cadre supérieur">Cadre supérieur</option>
                      <option value="Cadre moyen">Cadre moyen</option>
                      <option value="Employé">Employé</option>
                      <option value="Cadre">Cadre</option>
                      <option value="Chargé d'étude">Chargé d'étude</option>
                      <option value="Agent de maîtrise">Agent de maîtrise</option>
                      <option value="Cadre dirigeant">Cadre dirigeant</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sexe *</label>
                    <select value={employeeFormData.genre} onChange={(e) => setEmployeeFormData({ ...employeeFormData, genre: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm">
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Âge (optionnel)</label>
                    <input type="number" value={employeeFormData.age} onChange={(e) => {
                      const ageVal = e.target.value
                      const newDate = ageVal ? dayjs().subtract(parseInt(ageVal), 'year').format('YYYY-MM-DD') : ''
                      setEmployeeFormData({ ...employeeFormData, age: ageVal, dateNaissance: newDate })
                    }} min="0" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Âge en années" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date de naissance *</label>
                    <input type="date" value={employeeFormData.dateNaissance} onChange={(e) => setEmployeeFormData({ ...employeeFormData, dateNaissance: e.target.value, age: e.target.value ? dayjs().diff(dayjs(e.target.value), 'year') : '' })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lieu de naissance *</label>
                    <input type="text" value={employeeFormData.lieuNaissance || ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, lieuNaissance: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Lieu de naissance" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lieu de résidence *</label>
                    <input type="text" value={employeeFormData.lieuResidence} onChange={(e) => setEmployeeFormData({ ...employeeFormData, lieuResidence: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Lieu de résidence" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nationalité *</label>
                    <input type="text" value={employeeFormData.nationalite} onChange={(e) => setEmployeeFormData({ ...employeeFormData, nationalite: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Nationalité" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date d'embauche *</label>
                    <input type="date" value={employeeFormData.dateEmbauche} onChange={(e) => setEmployeeFormData({ ...employeeFormData, dateEmbauche: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Filiation</label>
                    <input type="text" value={employeeFormData.filiation} onChange={(e) => setEmployeeFormData({ ...employeeFormData, filiation: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Filiation" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Situation matrimoniale *</label>
                    <select value={employeeFormData.situationMatrimoniale} onChange={(e) => setEmployeeFormData({ ...employeeFormData, situationMatrimoniale: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm">
                      <option value="Célibataire">Célibataire</option>
                      <option value="Marié(e)">Marié(e)</option>
                      <option value="Divorcé(e)">Divorcé(e)</option>
                      <option value="Veuf(ve)">Veuf(ve)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre d'enfants</label>
                    <input type="number" value={employeeFormData.nombreEnfants} onChange={(e) => setEmployeeFormData({ ...employeeFormData, nombreEnfants: parseInt(e.target.value) })} min="0" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Statut juridique *</label>
                    <select value={employeeFormData.statutJuridique} onChange={(e) => setEmployeeFormData({ ...employeeFormData, statutJuridique: e.target.value })} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm">
                      <option value="Décret">Décret</option>
                      <option value="Affecter">Affecter</option>
                      <option value="Détacher">Détacher</option>
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmployeeModal(false)
                      setSelectedService(null)
                    }}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                  >
                    Ajouter l'employé
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Services
