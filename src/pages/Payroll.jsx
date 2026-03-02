import { useEffect, useState } from 'react'
import { payrollService, employeeService } from '../services/api'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'

const Payroll = () => {
  const { user } = useAuth()
  const [payrolls, setPayrolls] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayroll, setEditingPayroll] = useState(null)
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
  }, [])

  const fetchData = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        payrollService.getAll({
          month: dayjs().month() + 1,
          year: dayjs().year()
        }),
        employeeService.getAll()
      ])
      setPayrolls(payrollRes.data)
      setEmployees(employeesRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des bulletins')
    } finally {
      setLoading(false)
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

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bulletin de paie ?')) return
    try {
      await payrollService.delete(id)
      toast.success('Bulletin supprimé')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
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
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-3a58922a22c3?w=1920&q=80)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          zIndex: 0
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-black/30"></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 min-h-screen w-full animate-fade-in-up p-6 sm:p-8">
        {/* En-tête */}
        <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-3a58922a22c3?w=1200&q=80)',
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}
          >
            <div className="absolute inset-0 bg-black/55"></div>
          </div>
          <div className="relative z-10 p-8 sm:p-12">
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
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Gestion de la paie</h1>
                  <p className="text-white/90 text-base sm:text-lg">
                    Suivez et validez les bulletins de salaire de vos collaborateurs
                  </p>
                </div>
              </div>
              {isAdminOrServiceAdmin && (
                <button
                  onClick={() => {
                    resetForm()
                    setShowModal(true)
                  }}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm flex items-center gap-2"
                >
                  <span>+ Nouveau bulletin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Liste des bulletins */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bulletins du mois en cours</h2>
              <p className="text-xs text-gray-500">
                {months[dayjs().month()]} {dayjs().year()}
              </p>
            </div>
          </div>

          {payrolls.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun bulletin pour cette période.
              {isAdminOrServiceAdmin && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      resetForm()
                      setShowModal(true)
                    }}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-md text-sm"
                  >
                    Créer le premier bulletin
                  </button>
                </div>
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
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employé</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Période</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Salaire de base</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Primes</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Retenues</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Net à payer</th>
                        <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                        {isAdminOrServiceAdmin && (
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrolls.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-900">
                            <div className="font-semibold">
                              {p.employee?.nom} {p.employee?.prenom}
                            </div>
                            <div className="text-xs text-gray-500">{p.employee?.matricule}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-700">
                            {months[(p.periodMonth || 1) - 1]} {p.periodYear}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(p.baseSalary)} {p.currency || 'GNF'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-right text-emerald-700">
                            {formatCurrency(p.allowances)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-right text-red-600">
                            {formatCurrency(p.deductions)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(p.netSalary)} {p.currency || 'GNF'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-center">
                            <span
                              className={
                                'px-2 py-1 rounded-full text-xs font-semibold ' +
                                (p.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : p.status === 'validated'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700')
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
                            <td className="px-4 sm:px-6 py-3 text-sm text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(p)}
                                  className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                                >
                                  🗑️
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
                {payrolls.map((p) => (
                  <div key={p._id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {p.employee?.nom} {p.employee?.prenom}
                        </p>
                        <p className="text-xs text-gray-500">{p.employee?.matricule}</p>
                      </div>
                      <span
                        className={
                          'px-2 py-1 rounded-full text-[11px] font-semibold ' +
                          (p.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status === 'validated'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700')
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
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 mb-3">
                      <div>
                        <p className="text-gray-500 text-[10px]">Salaire de base</p>
                        <p className="font-semibold">
                          {formatCurrency(p.baseSalary)} {p.currency || 'GNF'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px]">Primes</p>
                        <p className="text-emerald-700">{formatCurrency(p.allowances)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px]">Retenues</p>
                        <p className="text-red-600">{formatCurrency(p.deductions)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px]">Net à payer</p>
                        <p className="font-bold">
                          {formatCurrency(p.netSalary)} {p.currency || 'GNF'}
                        </p>
                      </div>
                    </div>
                    {p.note && (
                      <p className="text-xs text-gray-500 italic mb-3">Note : {p.note}</p>
                    )}
                    {isAdminOrServiceAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(p)}
                          className="px-2.5 py-1 bg-gray-800 text-white text-[11px] rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="px-2.5 py-1 bg-gray-800 text-white text-[11px] rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-sm"
                        >
                          🗑️
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                {editingPayroll ? 'Modifier le bulletin' : 'Nouveau bulletin'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Employé *</label>
                  <select
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.nom} {emp.prenom} ({emp.matricule})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mois *</label>
                    <select
                      value={formData.periodMonth}
                      onChange={(e) => setFormData({ ...formData, periodMonth: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Salaire de base *</label>
                    <input
                      type="number"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                      required
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Devise</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Primes / Indemnités</label>
                    <input
                      type="number"
                      value={formData.allowances}
                      onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Retenues</label>
                    <input
                      type="number"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Commentaires, détails de prime, etc."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                  >
                    Enregistrer
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

