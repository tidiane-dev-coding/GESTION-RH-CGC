import { useEffect, useState } from 'react'
import { payrollService, employeeService } from '../services/api'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

const Payroll = () => {
  const { user } = useAuth()
  const [payrolls, setPayrolls] = useState([])
  const [filteredPayrolls, setFilteredPayrolls] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayroll, setEditingPayroll] = useState(null)
  const [stats, setStats] = useState({
    totalBulletins: 0,
    totalNetSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0
  })
  const [chartData, setChartData] = useState({
    statusPie: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      }]
    },
    salaryLine: {
      labels: [],
      datasets: [{
        label: 'Total Net à Payer',
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    },
    topBar: {
      labels: [],
      datasets: [{
        label: 'Salaire Net',
        data: [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      }]
    }
  })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    month: dayjs().month() + 1,
    year: dayjs().year()
  })
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [formData, setFormData] = useState({
    employee: '',
    periodMonth: dayjs().month() + 1,
    periodYear: dayjs().year(),
    baseSalary: '',
    allowances: 0,
    deductions: 0,
    currency: 'GNF',
    status: 'draft',
    note: ''
  })

  useEffect(() => {
    fetchData()
  }, [filters.month, filters.year])

  useEffect(() => {
    applyFilters(payrolls)
  }, [filters.search, filters.status, payrolls])

  const fetchData = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        payrollService.getAll({
          month: filters.month,
          year: filters.year
        }),
        employeeService.getAll()
      ])
      setPayrolls(payrollRes.data)
      setEmployees(employeesRes.data)

      // Appliquer les filtres
      applyFilters(payrollRes.data)

      // Calculer les statistiques et graphiques avec les données filtrées
      calculateStatsAndCharts(payrollRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des bulletins')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (payrollData) => {
    let filtered = [...payrollData]

    // Filtre par recherche
    if (filters.search) {
      filtered = filtered.filter(p =>
        `${p.employee?.nom} ${p.employee?.prenom}`.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.employee?.matricule?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status)
    }

    setFilteredPayrolls(filtered)
  }

  const calculateStatsAndCharts = (payrollData) => {
    // Calculer les statistiques
    const totalBulletins = payrollData.length
    const totalNetSalary = payrollData.reduce((sum, p) => sum + (p.netSalary || 0), 0)
    const totalAllowances = payrollData.reduce((sum, p) => sum + (p.allowances || 0), 0)
    const totalDeductions = payrollData.reduce((sum, p) => sum + (p.deductions || 0), 0)
    setStats({
      totalBulletins,
      totalNetSalary,
      totalAllowances,
      totalDeductions
    })

    // Calculer les données des graphiques
    const statusCount = payrollData.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})

    const statusPie = {
      labels: ['Brouillon', 'Validé', 'Payé'],
      datasets: [{
        data: [
          statusCount.draft || 0,
          statusCount.validated || 0,
          statusCount.paid || 0
        ],
        backgroundColor: [
          'rgba(107, 114, 128, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgb(107, 114, 128)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 1,
      }]
    }

    // Top 5 employés par salaire net
    const topEmployees = payrollData
      .sort((a, b) => (b.netSalary || 0) - (a.netSalary || 0))
      .slice(0, 5)

    const topBar = {
      labels: topEmployees.map(p => `${p.employee?.nom} ${p.employee?.prenom}`),
      datasets: [{
        label: 'Salaire Net',
        data: topEmployees.map(p => p.netSalary || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      }]
    }

    // Évolution des salaires (simulée pour les 6 derniers mois)
    const salaryEvolution = []
    const labels = []
    for (let i = 5; i >= 0; i--) {
      const month = dayjs().subtract(i, 'month')
      const monthPayrolls = payrollData.filter(p =>
        p.periodMonth === month.month() + 1 && p.periodYear === month.year()
      )
      const totalMonthSalary = monthPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0)
      salaryEvolution.push(totalMonthSalary)
      labels.push(months[month.month()])
    }

    const salaryLine = {
      labels: labels,
      datasets: [{
        label: 'Total Net à Payer',
        data: salaryEvolution,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    }

    setChartData({
      statusPie,
      salaryLine,
      topBar
    })

    // Générer les notifications
    generateNotifications(payrollData)
  }

  const generateNotifications = (payrollData) => {
    const newNotifications = []

    // Bulletins en attente de validation
    const pendingValidation = payrollData.filter(p => p.status === 'draft').length
    if (pendingValidation > 0) {
      newNotifications.push({
        id: 'pending_validation',
        type: 'warning',
        title: 'Bulletins en attente',
        message: `${pendingValidation} bulletin(s) en attente de validation`,
        icon: '⚠️',
        action: 'Voir les brouillons'
      })
    }

    // Bulletins à payer ce mois-ci
    const currentMonth = dayjs().month() + 1
    const currentYear = dayjs().year()
    const toPayThisMonth = payrollData.filter(p =>
      p.status === 'validated' &&
      p.periodMonth === currentMonth &&
      p.periodYear === currentYear
    ).length
    if (toPayThisMonth > 0) {
      newNotifications.push({
        id: 'to_pay_this_month',
        type: 'info',
        title: 'Paiements à effectuer',
        message: `${toPayThisMonth} bulletin(s) validé(s) à payer ce mois-ci`,
        icon: '💰',
        action: 'Voir les validés'
      })
    }

    // Rappel fin de mois
    const daysInMonth = dayjs().daysInMonth()
    const currentDay = dayjs().date()
    if (currentDay >= daysInMonth - 3) {
      newNotifications.push({
        id: 'end_of_month',
        type: 'reminder',
        title: 'Fin de mois',
        message: 'N\'oubliez pas de finaliser les bulletins de paie',
        icon: '📅',
        action: 'Créer un bulletin'
      })
    }

    // Anniversaires d'embauche (simulé - dans un vrai système, on comparerait avec la date d'embauche)
    const hireAnniversaries = employees.filter(emp => {
      if (!emp.dateEmbauche) return false
      const hireDate = dayjs(emp.dateEmbauche)
      return hireDate.month() === dayjs().month() && hireDate.date() === dayjs().date()
    })
    if (hireAnniversaries.length > 0) {
      newNotifications.push({
        id: 'hire_anniversaries',
        type: 'celebration',
        title: 'Anniversaires d\'embauche',
        message: `${hireAnniversaries.length} employé(s) fête(nt) leur anniversaire d'embauche aujourd'hui`,
        icon: '🎉',
        action: 'Voir les employés'
      })
    }

    setNotifications(newNotifications)
  }

  const exportPayrollToPDF = async (payroll) => {
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // En-tête
      pdf.setFontSize(20)
      pdf.setTextColor(59, 130, 246)
      pdf.text('BULLETIN DE PAIE', pageWidth / 2, 30, { align: 'center' })

      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Période: ${months[(payroll.periodMonth || 1) - 1]} ${payroll.periodYear}`, pageWidth / 2, 45, { align: 'center' })

      // Informations employé
      pdf.setFontSize(14)
      pdf.setTextColor(59, 130, 246)
      pdf.text('INFORMATIONS EMPLOYÉ', 20, 70)

      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Nom: ${payroll.employee?.nom} ${payroll.employee?.prenom}`, 20, 85)
      pdf.text(`Matricule: ${payroll.employee?.matricule}`, 20, 95)
      pdf.text(`Service: ${payroll.employee?.service?.nom || 'N/A'}`, 20, 105)

      // Détails salariaux
      pdf.setFontSize(14)
      pdf.setTextColor(59, 130, 246)
      pdf.text('DÉTAILS SALARIAUX', 20, 125)

      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      let yPos = 140

      pdf.text(`Salaire de base: ${formatCurrency(payroll.baseSalary)} ${payroll.currency || 'GNF'}`, 20, yPos)
      yPos += 10
      pdf.text(`Primes / Indemnités: ${formatCurrency(payroll.allowances)} ${payroll.currency || 'GNF'}`, 20, yPos)
      yPos += 10
      pdf.text(`Retenues: ${formatCurrency(payroll.deductions)} ${payroll.currency || 'GNF'}`, 20, yPos)
      yPos += 15

      // Ligne de séparation
      pdf.setDrawColor(59, 130, 246)
      pdf.setLineWidth(0.5)
      pdf.line(20, yPos, pageWidth - 20, yPos)
      yPos += 15

      // Net à payer
      pdf.setFontSize(14)
      pdf.setTextColor(16, 185, 129)
      pdf.text(`NET À PAYER: ${formatCurrency(payroll.netSalary)} ${payroll.currency || 'GNF'}`, 20, yPos)

      // Statut
      yPos += 20
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      const statusText = payroll.status === 'paid' ? 'Payé' : payroll.status === 'validated' ? 'Validé' : 'Brouillon'
      pdf.text(`Statut: ${statusText}`, 20, yPos)

      // Note
      if (payroll.note) {
        yPos += 20
        pdf.setFontSize(10)
        pdf.text('Note:', 20, yPos)
        yPos += 10
        const splitNote = pdf.splitTextToSize(payroll.note, pageWidth - 40)
        pdf.text(splitNote, 20, yPos)
      }

      // Pied de page
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}`, 20, pageHeight - 20)
      pdf.text('Système de Gestion RH - Douk', pageWidth - 20, pageHeight - 20, { align: 'right' })

      // Sauvegarder
      const fileName = `Bulletin_${payroll.employee?.nom}_${payroll.employee?.prenom}_${payroll.periodMonth}_${payroll.periodYear}.pdf`
      pdf.save(fileName)

      toast.success('Bulletin exporté en PDF avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const exportToExcel = () => {
    try {
      const dataToExport = filteredPayrolls.map(p => ({
        'Matricule': p.employee?.matricule || '',
        'Nom': p.employee?.nom || '',
        'Prénom': p.employee?.prenom || '',
        'Service': p.employee?.service?.nom || '',
        'Période': `${months[(p.periodMonth || 1) - 1]} ${p.periodYear}`,
        'Salaire de base': p.baseSalary || 0,
        'Primes': p.allowances || 0,
        'Retenues': p.deductions || 0,
        'Net à payer': p.netSalary || 0,
        'Devise': p.currency || 'GNF',
        'Statut': p.status === 'paid' ? 'Payé' : p.status === 'validated' ? 'Validé' : 'Brouillon',
        'Note': p.note || ''
      }))

      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Bulletins de paie')

      // Ajuster la largeur des colonnes
      const colWidths = [
        { wch: 12 }, // Matricule
        { wch: 15 }, // Nom
        { wch: 15 }, // Prénom
        { wch: 20 }, // Service
        { wch: 15 }, // Période
        { wch: 15 }, // Salaire de base
        { wch: 10 }, // Primes
        { wch: 12 }, // Retenues
        { wch: 15 }, // Net à payer
        { wch: 8 },  // Devise
        { wch: 10 }, // Statut
        { wch: 30 }  // Note
      ]
      ws['!cols'] = colWidths

      const fileName = `Bulletins_Paie_${filters.month}_${filters.year}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success('Données exportées en Excel avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  const resetForm = () => {
    setFormData({
      employee: '',
      periodMonth: dayjs().month() + 1,
      periodYear: dayjs().year(),
      baseSalary: '',
      allowances: 0,
      deductions: 0,
      currency: 'GNF',
      status: 'draft',
      note: ''
    })
    setEditingPayroll(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        baseSalary: Number(formData.baseSalary),
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0
      }

      if (!payload.employee || !payload.baseSalary) {
        toast.error('Veuillez renseigner au minimum l’employé et le salaire de base')
        return
      }

      if (editingPayroll) {
        await payrollService.update(editingPayroll._id, payload)
        toast.success('Bulletin mis à jour avec succès')
      } else {
        await payrollService.create(payload)
        toast.success('Bulletin créé avec succès')
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l’enregistrement du bulletin')
    }
  }

  const handleEdit = (payroll) => {
    setEditingPayroll(payroll)
    setFormData({
      employee: payroll.employee?._id || payroll.employee,
      periodMonth: payroll.periodMonth,
      periodYear: payroll.periodYear,
      baseSalary: payroll.baseSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      currency: payroll.currency || 'GNF',
      status: payroll.status || 'draft',
      note: payroll.note || ''
    })
    setShowModal(true)
  }

  const handleApproval = async (payrollId, action) => {
    try {
      await payrollService.updateStatus(payrollId, action)
      toast.success(`Bulletin ${action === 'validated' ? 'validé' : action === 'paid' ? 'marqué comme payé' : 'rejeté'}`)
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const formatCurrency = (value) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)
  }

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  if (loading) {
    return (
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isAdminOrServiceAdmin = user?.role === 'admin' || user?.role === 'service_admin'

  return (
    <div className={`relative min-h-screen w-full ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      {/* Contenu */}
      <div className="relative z-10 min-h-screen w-full p-6 sm:p-8">
        {/* En-tête */}
        <div className="mb-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-2.21 0-4 .895-4 2s1.79 2 4 2 4 .895 4 2-1.79 2-4 2m0-8c2.21 0 4 .895 4 2m-4-2V6m0 10v2m8-8a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Gestion de la Paie</h1>
                  <p className="text-blue-100 text-base sm:text-lg">
                    Suivez et validez les bulletins de salaire de vos collaborateurs
                  </p>
                </div>
              </div>
              {isAdminOrServiceAdmin && (
                <div className="flex items-center gap-3">
                  {/* Bouton Mode Sombre/Clair */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300"
                    title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                  >
                    {isDarkMode ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>

                  {/* Bouton Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 012 21h16a17.925 17.925 0 01-2.868-8.317M12 2a8 8 0 110 16 8 8 0 010-16z" />
                      </svg>
                      {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {notifications.length}
                        </span>
                      )}
                    </button>

                    {/* Dropdown Notifications */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 012 21h16a17.925 17.925 0 01-2.868-8.317M12 2a8 8 0 110 16 8 8 0 010-16z" />
                              </svg>
                              Aucune notification
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">{notification.icon}</span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                    <button className="text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium">
                                      {notification.action}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      resetForm()
                      setShowModal(true)
                    }}
                    className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nouveau Bulletin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Nom, prénom ou matricule..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="validated">Validé</option>
                <option value="paid">Payé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Bulletins</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalBulletins}</p>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 .895-4 2s1.79 2 4 2 4 .895 4 2-1.79 2-4 2m0-8c2.21 0 4 .895 4 2m-4-2V6m0 10v2m8-8a8 8 0 11-16 0 8 8 0 0116 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Net à Payer</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.totalNetSalary)} GNF</p>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Primes</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.totalAllowances)} GNF</p>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Retenues</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.totalDeductions)} GNF</p>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques analytiques */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Répartition des statuts */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Statuts</h3>
            <div className="h-64">
              <Pie data={chartData.statusPie} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed} bulletins`
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Évolution des salaires */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des Salaires (6 mois)</h3>
            <div className="h-64">
              <Line data={chartData.salaryLine} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `Total: ${formatCurrency(context.parsed.y)} GNF`
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value)
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Top 5 employés */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Salaires</h3>
            <div className="h-64">
              <Bar data={chartData.topBar} options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `Salaire: ${formatCurrency(context.parsed.x)} GNF`
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value)
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Liste des bulletins */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulletins du mois en cours</h2>
                <p className="text-sm text-gray-500">
                  {months[dayjs().month()]} {dayjs().year()}
                </p>
              </div>
              {filteredPayrolls.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter Excel
                  </button>
                  <button
                    onClick={() => exportPayrollToPDF(filteredPayrolls[0])}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredPayrolls.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bulletin trouvé</h3>
              <p className="text-gray-500 mb-6">
                Il n'y a pas encore de bulletins de paie pour cette période.
              </p>
              {isAdminOrServiceAdmin && (
                <button
                  onClick={() => {
                    resetForm()
                    setShowModal(true)
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Créer le premier bulletin
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tableau desktop */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salaire de base</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Primes</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Retenues</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net à payer</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        {isAdminOrServiceAdmin && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPayrolls.map((p) => (
                        <tr key={p._id} className="hover:bg-blue-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {p.employee?.nom?.charAt(0)}{p.employee?.prenom?.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {p.employee?.nom} {p.employee?.prenom}
                                </div>
                                <div className="text-sm text-gray-500">{p.employee?.matricule}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {months[(p.periodMonth || 1) - 1]} {p.periodYear}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(p.baseSalary)} {p.currency || 'GNF'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-700 font-medium">
                            +{formatCurrency(p.allowances)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                            -{formatCurrency(p.deductions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            {formatCurrency(p.netSalary)} {p.currency || 'GNF'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={
                                'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                                (p.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : p.status === 'validated'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800')
                              }
                            >
                              {p.status === 'paid'
                                ? 'Payé'
                                : p.status === 'validated'
                                ? 'Validé'
                                : 'Brouillon'}
                            </span>
                          </td>
                          {isAdminOrServiceAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(p)}
                                  className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors duration-200"
                                  title="Modifier"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => exportPayrollToPDF(p)}
                                  className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors duration-200"
                                  title="Exporter PDF"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                                {p.status === 'draft' && (
                                  <button
                                    onClick={() => handleApproval(p._id, 'validated')}
                                    className="p-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors duration-200"
                                    title="Valider"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                                {p.status === 'validated' && (
                                  <button
                                    onClick={() => handleApproval(p._id, 'paid')}
                                    className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors duration-200"
                                    title="Marquer comme payé"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors duration-200"
                                  title="Supprimer"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cartes mobiles */}
              <div className="md:hidden p-4 space-y-4">
                {filteredPayrolls.map((p) => (
                  <div key={p._id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {p.employee?.nom?.charAt(0)}{p.employee?.prenom?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {p.employee?.nom} {p.employee?.prenom}
                          </p>
                          <p className="text-xs text-gray-500">{p.employee?.matricule}</p>
                        </div>
                      </div>
                      <span
                        className={
                          'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                          (p.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'validated'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800')
                        }
                      >
                        {p.status === 'paid'
                          ? 'Payé'
                          : p.status === 'validated'
                          ? 'Validé'
                          : 'Brouillon'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Période : {months[(p.periodMonth || 1) - 1]} {p.periodYear}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">Salaire de base</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(p.baseSalary)} {p.currency || 'GNF'}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <p className="text-emerald-600 text-xs mb-1">Primes</p>
                        <p className="text-emerald-700 font-semibold">
                          +{formatCurrency(p.allowances)}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-red-600 text-xs mb-1">Retenues</p>
                        <p className="text-red-600 font-semibold">
                          -{formatCurrency(p.deductions)}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-blue-600 text-xs mb-1">Net à payer</p>
                        <p className="text-blue-700 font-bold">
                          {formatCurrency(p.netSalary)} {p.currency || 'GNF'}
                        </p>
                      </div>
                    </div>
                    {p.note && (
                      <p className="text-xs text-gray-500 italic mb-3 bg-gray-50 rounded-lg p-2">Note : {p.note}</p>
                    )}
                    {isAdminOrServiceAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => exportPayrollToPDF(p)}
                          className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Exporter PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        {p.status === 'draft' && (
                          <button
                            onClick={() => handleApproval(p._id, 'validated')}
                            className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                            title="Valider"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {p.status === 'validated' && (
                          <button
                            onClick={() => handleApproval(p._id, 'paid')}
                            className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                            title="Marquer comme payé"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal création / édition */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">
                  {editingPayroll ? 'Modifier le Bulletin' : 'Nouveau Bulletin de Paie'}
                </h2>
                <p className="text-blue-100 mt-1">
                  {editingPayroll ? 'Modifiez les informations du bulletin' : 'Créez un nouveau bulletin de salaire'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Employé *</label>
                    <select
                      value={formData.employee}
                      onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    >
                      <option value="">Sélectionner un employé</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.nom} {emp.prenom} ({emp.matricule})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Devise</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                      placeholder="GNF"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mois *</label>
                    <select
                      value={formData.periodMonth}
                      onChange={(e) => setFormData({ ...formData, periodMonth: Number(e.target.value) })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    >
                      {months.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Année *</label>
                    <input
                      type="number"
                      value={formData.periodYear}
                      onChange={(e) => setFormData({ ...formData, periodYear: Number(e.target.value) })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salaire de base *</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    required
                    min="0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Primes / Indemnités</label>
                    <input
                      type="number"
                      value={formData.allowances}
                      onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Retenues</label>
                    <input
                      type="number"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="validated">Validé</option>
                    <option value="paid">Payé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optionnel)</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none"
                    placeholder="Commentaires, détails de prime, etc."
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                  >
                    {editingPayroll ? 'Mettre à jour' : 'Créer le bulletin'}
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

export default Payroll

