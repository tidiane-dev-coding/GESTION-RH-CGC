import { useState, useEffect, useRef } from 'react'
import { attendanceService, exportService, employeeService, leaveService } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

const Attendance = () => {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [absenceForm, setAbsenceForm] = useState({
    employeeId: '',
    date: dayjs().format('YYYY-MM-DD')
  , reason: ''
  })
  const [absenceProof, setAbsenceProof] = useState(null)
  const [absenceProofName, setAbsenceProofName] = useState('')
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    employeeId: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    averageHours: 0,
    totalHours: 0,
    lateCount: 0, // Nombre de retards
    totalLateMinutes: 0 // Total des minutes de retard
  })
  const [myTodayAttendance, setMyTodayAttendance] = useState(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showLateModal, setShowLateModal] = useState(false)
  const [lateForm, setLateForm] = useState({
    attendanceId: '',
    reason: '',
    minutes: 0
  })
  const [lateProof, setLateProof] = useState(null)
  const [lateProofName, setLateProofName] = useState('')
  const EXPECTED_ARRIVAL_TIME = '08:00' // Heure d'arrivée attendue

  // Refs pour la caméra
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Fonction pour calculer le retard en minutes
  const calculateLateMinutes = (arrivalTime) => {
    if (!arrivalTime) return 0
    
    const expected = dayjs(`${dayjs().format('YYYY-MM-DD')} ${EXPECTED_ARRIVAL_TIME}`)
    const actual = dayjs(`${dayjs().format('YYYY-MM-DD')} ${arrivalTime}`)
    
    const diff = actual.diff(expected, 'minute')
    return diff > 0 ? diff : 0
  }

  // Fonction pour déterminer si un employé est en retard
  const isLate = (arrivalTime) => {
    return calculateLateMinutes(arrivalTime) > 0
  }
  
  // États pour les congés
  const [activeTab, setActiveTab] = useState('presences') // 'presences' ou 'conges'
  const [leaves, setLeaves] = useState([])
  const [loadingLeaves, setLoadingLeaves] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showLeaveDetailModal, setShowLeaveDetailModal] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    dateDebut: dayjs().format('YYYY-MM-DD'),
    dateFin: dayjs().format('YYYY-MM-DD'),
    type: 'annuel',
    raison: ''
  })
  const [leaveProof, setLeaveProof] = useState(null)
  const [leaveProofName, setLeaveProofName] = useState('')
  const [leaveFilters, setLeaveFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    employeeId: '',
    statut: '',
    type: ''
  })

  useEffect(() => {
    fetchAttendance()
    fetchMyTodayAttendance()
    
    // Rafraîchir la présence de l'employé toutes les 30 secondes
    const interval = setInterval(() => {
      if (user?.role !== 'admin' && user?.role !== 'service_admin') {
        fetchMyTodayAttendance()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [filters, user])

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeService.getAll()
        setEmployees(res.data)
      } catch (error) {
        toast.error('Erreur lors du chargement des employés')
      }
    }
    fetchEmployees()
  }, [])

  // Récupérer la présence du jour de l'employé connecté
  const fetchMyTodayAttendance = async () => {
    try {
      // Récupérer l'employé de l'utilisateur connecté
      const employeeRes = await employeeService.getMy()
      if (!employeeRes || !employeeRes.data) {
        setMyTodayAttendance(null)
        return
      }

      const today = dayjs().format('YYYY-MM-DD')
      const response = await attendanceService.getAll({
        startDate: today,
        endDate: today,
        employeeId: employeeRes.data._id
      })
      
      const todayData = response.data || []
      if (todayData.length > 0) {
        // Prendre le premier élément qui correspond à aujourd'hui
        const todayAttendance = todayData.find(att => {
          const attDate = dayjs(att.date).format('YYYY-MM-DD')
          return attDate === today
        }) || todayData[0]
        
        // S'assurer que les champs sont bien présents
        const formattedAttendance = {
          ...todayAttendance,
          heureArrivee: todayAttendance.heureArrivee || null,
          heureDepart: todayAttendance.heureDepart || null
        }
        
        setMyTodayAttendance(formattedAttendance)
      } else {
        setMyTodayAttendance(null)
      }
    } catch (error) {
      // Si l'utilisateur n'est pas un employé (404) ou autre erreur, on ignore silencieusement
      // 404 est normal si l'utilisateur n'a pas de profil employé (admin, etc.)
      if (error.response?.status !== 404) {
        // Logger seulement les erreurs autres que 404
        console.error('Erreur fetchMyTodayAttendance:', error)
      }
      setMyTodayAttendance(null)
    }
  }

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const response = await attendanceService.getAll(filters)
      const data = response.data || []
      setAttendance(data)
      
      // Calculer les statistiques résumées
      const present = data.filter(att => att.heureArrivee).length
      const absent = data.filter(att => att.statut === 'absent').length
      const totalHours = data
        .filter(att => att.heuresTotales)
        .reduce((sum, att) => sum + parseFloat(att.heuresTotales || 0), 0)
      const averageHours = present > 0 ? (totalHours / present).toFixed(1) : 0
      
      // Calculer les statistiques de retard
      const lateRecords = data.filter(att => isLate(att.heureArrivee))
      const lateCount = lateRecords.length
      const totalLateMinutes = lateRecords.reduce((sum, att) => sum + calculateLateMinutes(att.heureArrivee), 0)
      
      setSummaryStats({
        total: data.length,
        present,
        absent,
        averageHours: parseFloat(averageHours),
        totalHours: totalHours.toFixed(1),
        lateCount,
        totalLateMinutes
      })
    } catch (error) {
      toast.error('Erreur lors du chargement des présences')
    } finally {
      setLoading(false)
    }
  }

  // Fonction de tri
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Fonction pour obtenir les données triées et filtrées
  const getFilteredAndSortedData = () => {
    let filtered = attendance

    // Filtre de recherche
    if (searchTerm) {
      filtered = filtered.filter(att => 
        (att.employee?.nom || att.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (att.employee?.matricule || att.matricule || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtre par employé
    if (filters.employeeId) {
      filtered = filtered.filter(att => 
        att.employee?._id === filters.employeeId || att.employee === filters.employeeId
      )
    }

    // Tri
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue

        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a.date)
            bValue = new Date(b.date)
            break
          case 'nom':
            aValue = (a.employee?.nom || a.nom || '').toLowerCase()
            bValue = (b.employee?.nom || b.nom || '').toLowerCase()
            break
          case 'matricule':
            aValue = (a.employee?.matricule || a.matricule || '').toLowerCase()
            bValue = (b.employee?.matricule || b.matricule || '').toLowerCase()
            break
          case 'heureArrivee':
            aValue = a.heureArrivee ? new Date(a.heureArrivee) : null
            bValue = b.heureArrivee ? new Date(b.heureArrivee) : null
            break
          case 'heureDepart':
            aValue = a.heureDepart ? new Date(a.heureDepart) : null
            bValue = b.heureDepart ? new Date(b.heureDepart) : null
            break
          case 'heuresTotales':
            aValue = parseFloat(a.heuresTotales || 0)
            bValue = parseFloat(b.heuresTotales || 0)
            break
          default:
            return 0
        }

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }

  // Filtres rapides
  const applyQuickFilter = (period) => {
    const today = dayjs()
    let startDate, endDate

    switch (period) {
      case 'today':
        startDate = today.format('YYYY-MM-DD')
        endDate = today.format('YYYY-MM-DD')
        break
      case 'week':
        startDate = today.startOf('week').format('YYYY-MM-DD')
        endDate = today.endOf('week').format('YYYY-MM-DD')
        break
      case 'month':
        startDate = today.startOf('month').format('YYYY-MM-DD')
        endDate = today.endOf('month').format('YYYY-MM-DD')
        break
      case 'year':
        startDate = today.startOf('year').format('YYYY-MM-DD')
        endDate = today.endOf('year').format('YYYY-MM-DD')
        break
      default:
        return
    }

    // Réinitialiser le filtre par employé pour voir tous les employés
    setFilters({ ...filters, startDate, endDate, employeeId: '' })
    // Réinitialiser aussi le terme de recherche
    setSearchTerm('')
  }

  const handleExportPDF = async () => {
    try {
      const response = await exportService.attendancePDF(filters)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'attendance.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export PDF réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportService.attendanceExcel(filters)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'attendance.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export Excel réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  // Gérer la caméra pour la photo d'arrivée
  useEffect(() => {
    const startCamera = async () => {
      if (!showCameraModal) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch (err) {
        toast.error('Impossible d\'accéder à la caméra : autorisation refusée')
        setShowCameraModal(false)
      }
    }

    if (showCameraModal) {
      startCamera()
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [showCameraModal])

  // Fonction pour signaler l'arrivée
  const handleCheckIn = async () => {
    try {
      const employeeRes = await employeeService.getMy()
      if (!employeeRes.data) {
        toast.error('Vous n\'avez pas de profil employé')
        return
      }

      setShowCameraModal(true)
    } catch (error) {
      toast.error('Erreur lors de la récupération de votre profil')
    }
  }

  // Capturer la photo et enregistrer l'arrivée
  const captureAndCheckIn = async () => {
    try {
      setIsProcessing(true)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) throw new Error('Caméra indisponible')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Arrêter la caméra
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      setShowCameraModal(false)

      // Récupérer le matricule de l'employé
      const employeeRes = await employeeService.getMy()
      if (!employeeRes.data) {
        toast.error('Vous n\'avez pas de profil employé')
        return
      }

      // Envoyer le check-in avec photo
      const payload = {
        matricule: employeeRes.data.matricule,
        photo: dataUrl,
        photoTimestamp: new Date().toISOString()
      }
      
      const result = await attendanceService.checkIn(payload)
      toast.success(`Arrivée enregistrée à ${dayjs().format('HH:mm')}`)
      
      // Mettre à jour immédiatement avec la réponse du serveur
      if (result && result.data) {
        // S'assurer que les données sont bien formatées
        const attendanceData = {
          ...result.data,
          heureArrivee: result.data.heureArrivee || new Date(),
          heureDepart: result.data.heureDepart || null
        }
        // Forcer la mise à jour de l'état
        setMyTodayAttendance(attendanceData)
      }
      
      // Rafraîchir les données immédiatement (après un petit délai pour laisser le serveur traiter)
      setTimeout(async () => {
        await fetchMyTodayAttendance()
        await fetchAttendance()
      }, 500)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'arrivée')
    } finally {
      setIsProcessing(false)
    }
  }

  // Fonction pour signaler le départ
  const handleCheckOut = async () => {
    try {
      setIsProcessing(true)
      const employeeRes = await employeeService.getMy()
      if (!employeeRes.data) {
        toast.error('Vous n\'avez pas de profil employé')
        return
      }

      const result = await attendanceService.checkOut(employeeRes.data.matricule)
      toast.success(`Départ enregistré à ${dayjs().format('HH:mm')}`)
      
      // Mettre à jour immédiatement avec la réponse du serveur
      if (result && result.data) {
        setMyTodayAttendance(result.data)
      }
      
      // Rafraîchir les données après un petit délai pour être sûr
      setTimeout(async () => {
        await fetchMyTodayAttendance()
        await fetchAttendance()
      }, 500)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement du départ')
    } finally {
      setIsProcessing(false)
    }
  }

  // Annuler la prise de photo
  const cancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCameraModal(false)
  }

  // Fonctions pour gérer les congés
  const fetchLeaves = async () => {
    try {
      setLoadingLeaves(true)
      const response = await leaveService.getAll(leaveFilters)
      setLeaves(response.data || [])
    } catch (error) {
      toast.error('Erreur lors du chargement des congés')
    } finally {
      setLoadingLeaves(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'conges') {
      fetchLeaves()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leaveFilters])

  const handleCreateLeave = async (e) => {
    e.preventDefault()
    try {
      // Pour les utilisateurs non-admin, récupérer leur employé
      let employeeIdToUse = leaveForm.employeeId
      if (user?.role !== 'admin' && user?.role !== 'service_admin') {
        try {
          const employeeRes = await employeeService.getMy()
          if (!employeeRes || !employeeRes.data) {
            toast.error('Vous n\'avez pas de profil employé')
            return
          }
          employeeIdToUse = employeeRes.data._id
        } catch (error) {
          toast.error('Erreur lors de la récupération de votre profil')
          return
        }
      }
      
      if (!employeeIdToUse || !leaveForm.dateDebut || !leaveForm.dateFin || !leaveForm.raison) {
        toast.error('Veuillez remplir tous les champs obligatoires')
        return
      }

      const dateDebut = dayjs(leaveForm.dateDebut)
      const dateFin = dayjs(leaveForm.dateFin)

      if (dateFin.isBefore(dateDebut)) {
        toast.error('La date de fin doit être supérieure ou égale à la date de début')
        return
      }

      let processedProof = leaveProof
      if (leaveProof && leaveProof.startsWith('data:image')) {
        try {
          const img = new Image()
          processedProof = await new Promise((resolve) => {
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                const maxWidth = 800
                const maxHeight = 800
                let width = img.width
                let height = img.height
                
                if (width > height) {
                  if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                  }
                } else {
                  if (height > maxHeight) {
                    width = (width * maxHeight) / height
                    height = maxHeight
                  }
                }
                
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', 0.7))
              } catch (err) {
                resolve(leaveProof)
              }
            }
            img.onerror = () => resolve(leaveProof)
            img.src = leaveProof
          })
        } catch (err) {
          processedProof = leaveProof
        }
      }

      const payload = {
        ...leaveForm,
        employeeId: employeeIdToUse,
        preuve: processedProof || null
      }

      await leaveService.create(payload)
      toast.success('Demande de congé enregistrée avec succès')
      setShowLeaveModal(false)
      setLeaveForm({
        employeeId: '',
        dateDebut: dayjs().format('YYYY-MM-DD'),
        dateFin: dayjs().format('YYYY-MM-DD'),
        type: 'annuel',
        raison: ''
      })
      setLeaveProof(null)
      setLeaveProofName('')
      fetchLeaves()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement du congé')
    }
  }

  const handleApproveLeave = async (leaveId, commentaireAdmin) => {
    try {
      await leaveService.approve(leaveId, commentaireAdmin || '')
      toast.success('Congé approuvé')
      fetchLeaves()
      setShowLeaveDetailModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation')
    }
  }

  const handleRejectLeave = async (leaveId, commentaireAdmin) => {
    try {
      await leaveService.reject(leaveId, commentaireAdmin || '')
      toast.success('Congé refusé')
      fetchLeaves()
      setShowLeaveDetailModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du refus')
    }
  }

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) return
    try {
      await leaveService.delete(leaveId)
      toast.success('Congé supprimé')
      fetchLeaves()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const getLeaveTypeLabel = (type) => {
    const labels = {
      annuel: 'Congé annuel',
      maladie: 'Congé maladie',
      maternite: 'Congé maternité',
      paternite: 'Congé paternité',
      exceptionnel: 'Congé exceptionnel',
      sans_solde: 'Congé sans solde',
      autre: 'Autre'
    }
    return labels[type] || type
  }

  const getLeaveStatusLabel = (statut) => {
    const labels = {
      en_attente: 'En attente',
      approuve: 'Approuvé',
      refuse: 'Refusé'
    }
    return labels[statut] || statut
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
          backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&q=80)',
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
            backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80)',
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Présences & Congés</h1>
                <p className="text-white/90 text-base sm:text-lg">Gérez les pointages, horaires et congés</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
              >
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('presences')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'presences'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📅 Présences
            </button>
            <button
              onClick={() => setActiveTab('conges')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'conges'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🏖️ Congés
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques résumées - Affichées uniquement pour les présences */}
      {activeTab === 'presences' && (
      <>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Présents</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.present}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-600 mb-1">Absents</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.absent}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600 mb-1">En retard</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.lateCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">Moy. heures</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.averageHours}h</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-1">Total heures</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.totalHours}h</div>
        </div>
      </div>

      {/* Section de pointage pour les employés */}
      {user?.role !== 'admin' && user?.role !== 'service_admin' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Mon pointage du jour</h2>
                <button
                  onClick={fetchMyTodayAttendance}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  title="Rafraîchir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualiser
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {dayjs().format('DD/MM/YYYY')}
              </p>
              {myTodayAttendance ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Arrivée :</span>
                    <span className={`text-sm font-semibold ${
                      myTodayAttendance.heureArrivee ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {myTodayAttendance.heureArrivee 
                        ? dayjs(myTodayAttendance.heureArrivee).format('HH:mm')
                        : 'Non enregistrée'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Départ :</span>
                    <span className={`text-sm font-semibold ${
                      myTodayAttendance.heureDepart ? 'text-orange-700' : 'text-gray-500'
                    }`}>
                      {myTodayAttendance.heureDepart 
                        ? dayjs(myTodayAttendance.heureDepart).format('HH:mm')
                        : 'Non enregistré'}
                    </span>
                  </div>
                  {myTodayAttendance.heuresTotales && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Heures travaillées :</span>
                      <span className="text-sm font-bold text-blue-700">
                        {myTodayAttendance.heuresTotales}h
                      </span>
                    </div>
                  )}
                  {/* Message d'aide pour le départ */}
                  {myTodayAttendance.heureArrivee && !myTodayAttendance.heureDepart && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-orange-900 mb-1">
                            ⏰ Arrivée enregistrée - Départ à signaler
                          </p>
                          <p className="text-xs text-orange-700">
                            Vous avez signalé votre arrivée à {dayjs(myTodayAttendance.heureArrivee).format('HH:mm')}. 
                            Le scanner QR est bloqué jusqu'à 17h. Utilisez le bouton ci-dessous pour signaler votre départ.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Aucun pointage enregistré aujourd'hui</p>
                  <p className="text-xs text-gray-500">Cliquez sur "Signaler mon arrivée" pour commencer</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {/* Bouton Arrivée - affiché si pas de présence ou pas d'heure d'arrivée */}
              {(!myTodayAttendance || !myTodayAttendance.heureArrivee) && (
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Signaler mon arrivée
                </button>
              )}
              
              {/* Bouton Départ - affiché si arrivée enregistrée mais pas de départ */}
              {myTodayAttendance && myTodayAttendance.heureArrivee && !myTodayAttendance.heureDepart && (
                <button
                  onClick={handleCheckOut}
                  disabled={isProcessing}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-2xl hover:shadow-orange-500/50 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Signaler mon départ</span>
                </button>
              )}
              
              {/* Message Pointage complet */}
              {myTodayAttendance && myTodayAttendance.heureArrivee && myTodayAttendance.heureDepart && (
                <div className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Pointage complet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour la caméra (arrivée) */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Prendre une photo pour l'arrivée</h2>
            <p className="text-sm text-gray-600 mb-4">
              Veuillez prendre une photo pour confirmer votre arrivée
            </p>
            <div className="flex flex-col items-center gap-4">
              <video 
                ref={videoRef} 
                className="w-full rounded-lg border-2 border-gray-200" 
                playsInline 
                autoPlay
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="w-full flex justify-between gap-3">
                <button 
                  onClick={cancelCamera} 
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button 
                  onClick={captureAndCheckIn} 
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Prendre la photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
        {/* Filtres rapides */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => applyQuickFilter('today')}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => applyQuickFilter('week')}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
          >
            Cette semaine
          </button>
          <button
            onClick={() => applyQuickFilter('month')}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
          >
            Ce mois
          </button>
          <button
            onClick={() => applyQuickFilter('year')}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
          >
            Cette année
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom ou matricule..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={fetchAttendance}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
            >
              Filtrer
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
              >
                Absence
              </button>
            )}
          </div>
        </div>

        {/* Filtre par employé */}
        {user?.role === 'admin' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par employé</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
              className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les employés</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.matricule} - {emp.nom}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-2">
                  Date
                  {sortConfig.key === 'date' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('matricule')}
              >
                <div className="flex items-center gap-2">
                  Matricule
                  {sortConfig.key === 'matricule' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('nom')}
              >
                <div className="flex items-center gap-2">
                  Nom
                  {sortConfig.key === 'nom' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('heureArrivee')}
              >
                <div className="flex items-center gap-2">
                  Heure Arrivée
                  {sortConfig.key === 'heureArrivee' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('heureDepart')}
              >
                <div className="flex items-center gap-2">
                  Heure Départ
                  {sortConfig.key === 'heureDepart' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('heuresTotales')}
              >
                <div className="flex items-center gap-2">
                  Heures Totales
                  {sortConfig.key === 'heuresTotales' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Retard</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
              {user?.role === 'admin' && (
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getFilteredAndSortedData().length > 0 ? (
              getFilteredAndSortedData().map((att) => (
                <tr 
                  key={att._id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedAttendance(att)
                    setShowDetailModal(true)
                  }}
                >
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dayjs(att.date).format('DD/MM/YYYY')}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{att.employee?.matricule || att.matricule}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{att.employee?.nom || att.nom}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{att.heureArrivee ? dayjs(att.heureArrivee).format('HH:mm') : '-'}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{att.heureDepart ? dayjs(att.heureDepart).format('HH:mm') : '-'}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{att.heuresTotales ? `${att.heuresTotales}h` : '-'}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    {att.heureArrivee ? (
                      <span className={`font-medium ${isLate(att.heureArrivee) ? 'text-red-600' : 'text-green-600'}`}>
                        {isLate(att.heureArrivee) ? `${calculateLateMinutes(att.heureArrivee)} min` : 'À l\'heure'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      att.statut === 'present' ? 'bg-green-100 text-green-800 border border-green-200' :
                      att.statut === 'retard' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {att.statut || 'present'}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        {isLate(att.heureArrivee) && (
                          <button
                            onClick={() => {
                              setLateForm({
                                attendanceId: att._id,
                                reason: '',
                                minutes: calculateLateMinutes(att.heureArrivee)
                              })
                              setShowLateModal(true)
                            }}
                            className="px-2 py-1 bg-yellow-600 text-white rounded-lg text-xs hover:bg-yellow-700 transition-all duration-200"
                            title="Justifier le retard"
                          >
                            Justifier
                          </button>
                        )}
                        {att.statut === 'absent' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRecord(att)
                                setShowEditModal(true)
                              }}
                              className="px-2 py-1 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-900 transition-all duration-200"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm('Supprimer cette absence ?')) return
                                try {
                                  await attendanceService.delete(att._id)
                                  toast.success('Absence supprimée')
                                  fetchAttendance()
                                } catch (error) {
                                  toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
                                }
                              }}
                              className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-all duration-200"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={user?.role === 'admin' ? 8 : 7} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                  Aucune présence trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        {getFilteredAndSortedData().length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-gray-50 text-sm text-gray-600">
            Affichage de {getFilteredAndSortedData().length} résultat(s)
          </div>
        )}
      </div>

      {showAbsenceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Marquer une absence</h2>
            <form
              onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    // Validation côté client
                    if (!absenceForm.employeeId) {
                      toast.error('Veuillez sélectionner un employé pour enregistrer l\'absence')
                      return
                    }
                    if (!absenceForm.date) {
                      toast.error('Veuillez sélectionner une date valide')
                      return
                    }
                    const selectedDate = dayjs(absenceForm.date)
                    if (selectedDate.isAfter(dayjs(), 'day')) {
                      toast.error('La date de l\'absence ne peut pas être dans le futur')
                      return
                    }

                    // Require proof client-side
                    if (!absenceProof) {
                      toast.error('Veuillez joindre une preuve (photo ou PDF) pour l\'absence')
                      return
                    }

                    // Compresser l'image si c'est une image (réduire la taille)
                    let processedProof = absenceProof
                    if (absenceProof.startsWith('data:image')) {
                      try {
                        // Si l'image est trop grande, la compresser
                        const img = new Image()
                        processedProof = await new Promise((resolve, reject) => {
                          img.onload = () => {
                            try {
                              const canvas = document.createElement('canvas')
                              const maxWidth = 800
                              const maxHeight = 800
                              let width = img.width
                              let height = img.height
                              
                              if (width > height) {
                                if (width > maxWidth) {
                                  height = (height * maxWidth) / width
                                  width = maxWidth
                                }
                              } else {
                                if (height > maxHeight) {
                                  width = (width * maxHeight) / height
                                  height = maxHeight
                                }
                              }
                              
                              canvas.width = width
                              canvas.height = height
                              const ctx = canvas.getContext('2d')
                              ctx.drawImage(img, 0, 0, width, height)
                              const compressed = canvas.toDataURL('image/jpeg', 0.7)
                              resolve(compressed)
                            } catch (err) {
                              resolve(absenceProof) // En cas d'erreur, utiliser l'original
                            }
                          }
                          img.onerror = () => resolve(absenceProof) // En cas d'erreur, utiliser l'original
                          img.src = absenceProof
                        })
                      } catch (err) {
                        // Si la compression échoue, utiliser l'original
                        processedProof = absenceProof
                      }
                    }

                    const payload = {
                      employeeId: absenceForm.employeeId,
                      date: absenceForm.date,
                      reason: absenceForm.reason.trim(),
                      proof: processedProof
                    }

                    const res = await attendanceService.markAbsence(payload)

                    // Message détaillé
                    const emp = employees.find(x => x._id === absenceForm.employeeId)
                    const empLabel = emp ? `${emp.nom} (${emp.matricule})` : absenceForm.employeeId
                    const ts = dayjs().format('DD/MM/YYYY HH:mm')
                    toast.success(`Absence enregistrée : ${empLabel} le ${dayjs(absenceForm.date).format('DD/MM/YYYY')} — Enregistré par ${user?.email || 'utilisateur'} à ${ts}`)

                    setShowAbsenceModal(false)
                    setAbsenceForm({ employeeId: '', date: dayjs().format('YYYY-MM-DD'), reason: '' })
                    setAbsenceProof(null)
                    setAbsenceProofName('')
                    fetchAttendance()
                  } catch (error) {
                    toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'absence')
                  }
                }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employé *</label>
                <select
                  value={absenceForm.employeeId}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, employeeId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.matricule} - {emp.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={absenceForm.date}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif (obligatoire)</label>
                <textarea required value={absenceForm.reason} onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="Motif de l'absence (ex: maladie, rendez-vous...)" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preuve (photo ou PDF) *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0]
                    if (!file) return
                    setAbsenceProofName(file.name)
                    const reader = new FileReader()
                    reader.onload = () => {
                      setAbsenceProof(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }}
                  required
                  className="w-full text-sm"
                />
                {absenceProofName && <p className="text-xs text-gray-500 mt-1">Fichier sélectionné: {absenceProofName}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  Enregistrer l'absence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Modifier l'absence</h2>
            <p className="text-sm text-gray-600 mb-3">
              {selectedRecord.matricule} - {selectedRecord.nom}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  await attendanceService.update(selectedRecord._id, {
                    date: selectedRecord.date,
                    statut: selectedRecord.statut
                  })
                  toast.success('Absence modifiée')
                  setShowEditModal(false)
                  setSelectedRecord(null)
                  fetchAttendance()
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Erreur lors de la modification')
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <select
                  value={selectedRecord.statut}
                  onChange={(e) => setSelectedRecord({ ...selectedRecord, statut: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                >
                  <option value="absent">Absent</option>
                  <option value="present">Présent</option>
                  <option value="retard">Retard</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedRecord(null)
                  }}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedAttendance && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Détails du pointage</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Date</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {dayjs(selectedAttendance.date).format('DD/MM/YYYY')}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Statut</div>
                  <div>
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                      selectedAttendance.statut === 'present' ? 'bg-green-100 text-green-800 border border-green-200' :
                      selectedAttendance.statut === 'retard' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {selectedAttendance.statut || 'present'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Employé</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedAttendance.employee?.nom || selectedAttendance.nom || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Matricule: {selectedAttendance.employee?.matricule || selectedAttendance.matricule || 'N/A'}
                </div>
                {selectedAttendance.employee?.poste && (
                  <div className="text-sm text-gray-600 mt-1">
                    Poste: {selectedAttendance.employee.poste}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Heure d'arrivée</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedAttendance.heureArrivee 
                      ? dayjs(selectedAttendance.heureArrivee).format('HH:mm:ss')
                      : '-'}
                  </div>
                  {selectedAttendance.heureArrivee && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dayjs(selectedAttendance.heureArrivee).format('DD/MM/YYYY HH:mm:ss')}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Heure de départ</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedAttendance.heureDepart 
                      ? dayjs(selectedAttendance.heureDepart).format('HH:mm:ss')
                      : '-'}
                  </div>
                  {selectedAttendance.heureDepart && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dayjs(selectedAttendance.heureDepart).format('DD/MM/YYYY HH:mm:ss')}
                    </div>
                  )}
                </div>
              </div>

              {selectedAttendance.heuresTotales && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Heures totales</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {selectedAttendance.heuresTotales}h
                  </div>
                </div>
              )}

              {selectedAttendance.photo && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Photo de pointage</div>
                  <img 
                    src={selectedAttendance.photo} 
                    alt="Photo de pointage" 
                    className="max-w-full h-auto rounded-lg shadow-md"
                  />
                </div>
              )}

              {selectedAttendance.photoTimestamp && (
                <div className="text-xs text-gray-500">
                  Photo prise le: {dayjs(selectedAttendance.photoTimestamp).format('DD/MM/YYYY HH:mm:ss')}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      </>)
      }

      {/* Contenu des congés */}
      {activeTab === 'conges' && (
        <>
          {/* Filtres pour les congés */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={leaveFilters.startDate}
                  onChange={(e) => setLeaveFilters({...leaveFilters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={leaveFilters.endDate}
                  onChange={(e) => setLeaveFilters({...leaveFilters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={leaveFilters.statut}
                  onChange={(e) => setLeaveFilters({...leaveFilters, statut: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="approuve">Approuvé</option>
                  <option value="refuse">Refusé</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={fetchLeaves}
                  className="bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  Filtrer
                </button>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  + Nouveau
                </button>
              </div>
            </div>
            {user?.role === 'admin' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par employé</label>
                <select
                  value={leaveFilters.employeeId}
                  onChange={(e) => setLeaveFilters({...leaveFilters, employeeId: e.target.value})}
                  className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les employés</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.matricule} - {emp.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tableau des congés */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Employé</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date début</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date fin</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Durée</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingLeaves ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : leaves.length > 0 ? (
                    leaves.map((leave) => (
                      <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900">{leave.employee?.nom || leave.nom}</div>
                          <div className="text-gray-500 text-xs">{leave.employee?.matricule || leave.matricule}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getLeaveTypeLabel(leave.type)}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{dayjs(leave.dateDebut).format('DD/MM/YYYY')}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{dayjs(leave.dateFin).format('DD/MM/YYYY')}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {dayjs(leave.dateFin).diff(dayjs(leave.dateDebut), 'day') + 1} jour(s)
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            leave.statut === 'approuve' ? 'bg-green-100 text-green-800 border border-green-200' :
                            leave.statut === 'refuse' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {getLeaveStatusLabel(leave.statut)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedLeave(leave)
                                setShowLeaveDetailModal(true)
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-all"
                            >
                              Voir
                            </button>
                            {(user?.role === 'admin' || user?.role === 'service_admin') && leave.statut === 'en_attente' && (
                              <>
                                <button
                                  onClick={() => handleApproveLeave(leave._id)}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-all"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleRejectLeave(leave._id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-all"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            {(leave.statut === 'en_attente' || user?.role === 'admin' || user?.role === 'service_admin') && (
                              <button
                                onClick={() => handleDeleteLeave(leave._id)}
                                className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-all"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                        Aucun congé trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal pour créer un congé */}
          {showLeaveModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Demander un congé</h2>
                <form onSubmit={handleCreateLeave} className="space-y-4">
                  {user?.role === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employé *</label>
                      <select
                        value={leaveForm.employeeId}
                        onChange={(e) => setLeaveForm({...leaveForm, employeeId: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner un employé</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.matricule} - {emp.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                    <input
                      type="date"
                      value={leaveForm.dateDebut}
                      onChange={(e) => setLeaveForm({...leaveForm, dateDebut: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin *</label>
                    <input
                      type="date"
                      value={leaveForm.dateFin}
                      onChange={(e) => setLeaveForm({...leaveForm, dateFin: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de congé *</label>
                    <select
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="annuel">Congé annuel</option>
                      <option value="maladie">Congé maladie</option>
                      <option value="maternite">Congé maternité</option>
                      <option value="paternite">Congé paternité</option>
                      <option value="exceptionnel">Congé exceptionnel</option>
                      <option value="sans_solde">Congé sans solde</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Raison *</label>
                    <textarea
                      value={leaveForm.raison}
                      onChange={(e) => setLeaveForm({...leaveForm, raison: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Motif du congé..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preuve (optionnel)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0]
                        if (!file) return
                        setLeaveProofName(file.name)
                        const reader = new FileReader()
                        reader.onload = () => {
                          setLeaveProof(reader.result)
                        }
                        reader.readAsDataURL(file)
                      }}
                      className="w-full text-sm"
                    />
                    {leaveProofName && <p className="text-xs text-gray-500 mt-1">Fichier sélectionné: {leaveProofName}</p>}
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveModal(false)
                        setLeaveForm({
                          employeeId: '',
                          dateDebut: dayjs().format('YYYY-MM-DD'),
                          dateFin: dayjs().format('YYYY-MM-DD'),
                          type: 'annuel',
                          raison: ''
                        })
                        setLeaveProof(null)
                        setLeaveProofName('')
                      }}
                      className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal pour voir les détails d'un congé */}
          {showLeaveDetailModal && selectedLeave && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLeaveDetailModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Détails du congé</h2>
                  <button
                    onClick={() => setShowLeaveDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Employé</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedLeave.employee?.nom || selectedLeave.nom}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Matricule: {selectedLeave.employee?.matricule || selectedLeave.matricule}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Statut</div>
                      <div>
                        <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                          selectedLeave.statut === 'approuve' ? 'bg-green-100 text-green-800 border border-green-200' :
                          selectedLeave.statut === 'refuse' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {getLeaveStatusLabel(selectedLeave.statut)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Date de début</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {dayjs(selectedLeave.dateDebut).format('DD/MM/YYYY')}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Date de fin</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {dayjs(selectedLeave.dateFin).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Durée</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {dayjs(selectedLeave.dateFin).diff(dayjs(selectedLeave.dateDebut), 'day') + 1} jour(s)
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Type de congé</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {getLeaveTypeLabel(selectedLeave.type)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Raison</div>
                    <div className="text-gray-900">{selectedLeave.raison}</div>
                  </div>
                  {selectedLeave.commentaireAdmin && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 mb-1">Commentaire admin</div>
                      <div className="text-gray-900">{selectedLeave.commentaireAdmin}</div>
                    </div>
                  )}
                  {selectedLeave.preuve && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">Preuve</div>
                      {selectedLeave.preuve.startsWith('data:image') ? (
                        <img src={selectedLeave.preuve} alt="Preuve" className="max-w-full h-auto rounded-lg shadow-md" />
                      ) : (
                        <a href={selectedLeave.preuve} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Voir le fichier
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  {(user?.role === 'admin' || user?.role === 'service_admin') && selectedLeave.statut === 'en_attente' && (
                    <>
                      <button
                        onClick={() => handleApproveLeave(selectedLeave._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => handleRejectLeave(selectedLeave._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowLeaveDetailModal(false)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal pour justifier un retard */}
      {showLateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Justifier un retard</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const payload = {
                    attendanceId: lateForm.attendanceId,
                    reason: lateForm.reason,
                    minutes: lateForm.minutes,
                    proof: lateProof || null
                  }

                  await attendanceService.justifyLate(payload)
                  toast.success('Justification de retard enregistrée')
                  setShowLateModal(false)
                  setLateForm({ attendanceId: '', reason: '', minutes: 0 })
                  setLateProof(null)
                  setLateProofName('')
                  fetchAttendance()
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Erreur lors de la justification')
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif du retard *</label>
                <textarea
                  value={lateForm.reason}
                  onChange={(e) => setLateForm({ ...lateForm, reason: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Expliquez le motif du retard..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preuve (photo ou PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0]
                    if (!file) return
                    setLateProofName(file.name)
                    const reader = new FileReader()
                    reader.onload = () => {
                      setLateProof(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="w-full text-sm"
                />
                {lateProofName && <p className="text-xs text-gray-500 mt-1">Fichier sélectionné: {lateProofName}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLateModal(false)}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  Justifier le retard
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

export default Attendance

