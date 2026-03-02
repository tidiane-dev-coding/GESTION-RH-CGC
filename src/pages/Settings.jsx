import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService, serviceService } from '../services/api'
import { toast } from 'react-toastify'

const Settings = () => {
  const { user } = useAuth()
  const [showUsersSection, setShowUsersSection] = useState(false)

  // États pour la gestion des utilisateurs
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    service: ''
  })

  const settingsLinks = [
    {
      name: 'Présences',
      href: '/attendance',
      icon: '⏰',
      description: 'Consulter les pointages et heures de travail'
    },
    {
      name: 'Scanner QR',
      href: '/qr-scanner',
      icon: '📱',
      description: 'Scanner les badges pour enregistrer les présences'
    },
    {
      name: 'Statistiques',
      href: '/stats',
      icon: '📈',
      description: 'Voir les graphiques et analyses RH détaillées'
    },
    {
      name: 'Mon profil',
      href: '/profile',
      icon: '🙍',
      description: 'Compléter ou modifier vos informations employé'
    }
  ]

  // Fonction pour aplatir la structure hiérarchique des services
  const flattenServices = (services, depth = 0) => {
    let result = []
    if (!Array.isArray(services)) {
      return result
    }

    services.forEach((service) => {
      const prefix = depth > 0 ? '  '.repeat(depth) + '└─ ' : ''
      const serviceName = service.nom || service.name || 'Sans nom'
      result.push({
        ...service,
        displayName: prefix + serviceName,
        depth
      })

      if (service.children && Array.isArray(service.children) && service.children.length > 0) {
        result = result.concat(flattenServices(service.children, depth + 1))
      }
    })

    return result
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await userService.getAll()
      setUsers(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs')
      console.error(error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadServices = async () => {
    try {
      const response = await serviceService.getAll()
      const flattened = flattenServices(response.data)
      setServices(flattened)
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error)
      toast.error('Erreur lors du chargement des services')
    }
  }

  useEffect(() => {
    if (showUsersSection && user?.role === 'admin') {
      loadUsers()
      loadServices()
    }
  }, [showUsersSection, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await userService.update(editingUser._id, updateData)
        toast.success('Utilisateur modifié avec succès')
      } else {
        if (!formData.password) {
          toast.error('Le mot de passe est requis pour créer un utilisateur')
          return
        }
        await userService.create(formData)
        toast.success('Utilisateur créé avec succès')
      }
      setShowModal(false)
      resetForm()
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'opération')
      console.error(error)
    }
  }

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit)
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
      service: userToEdit.service?._id || userToEdit.service || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return
    }
    try {
      await userService.delete(userId)
      toast.success('Utilisateur supprimé avec succès')
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      service: ''
    })
    setEditingUser(null)
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-red-500 text-white',
      service_admin: 'bg-blue-500 text-white',
      user: 'bg-gray-500 text-white'
    }
    return badges[role] || badges.user
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur Principal',
      service_admin: 'Administrateur de Service',
      user: 'Utilisateur'
    }
    return labels[role] || role
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&q=80)',
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
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Paramètres & Outils
          </h1>
          <p className="text-white/90 text-base sm:text-lg">
            Accédez rapidement aux pages avancées de gestion
          </p>
        </div>

        {/* Section Gestion des Utilisateurs (Admin seulement) */}
        {user?.role === 'admin' && (
          <div className="mb-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  👥 Gestion des Utilisateurs
                </h2>
                <p className="text-white/80">
                  Gérez les utilisateurs et nommez des administrateurs de service
                </p>
              </div>
              <button
                onClick={() => setShowUsersSection(!showUsersSection)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {showUsersSection ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {showUsersSection && (
              <div className="mt-6">
                {/* Bouton d'ajout */}
                <div className="mb-6">
                  <button
                    onClick={() => {
                      resetForm()
                      setShowModal(true)
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    + Ajouter un utilisateur
                  </button>
                </div>

                {/* Liste des utilisateurs */}
                {loadingUsers ? (
                  <div className="text-center py-8 text-white">Chargement...</div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-3 px-4 text-white font-semibold">Nom d'utilisateur</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">Email</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">Rôle</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">Service</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-white/60">
                                Aucun utilisateur trouvé
                              </td>
                            </tr>
                          ) : (
                            users.map((u) => (
                              <tr key={u._id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 text-white">{u.username}</td>
                                <td className="py-3 px-4 text-white">{u.email}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadge(u.role)}`}>
                                    {getRoleLabel(u.role)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-white">
                                  {u.service?.nom || u.service?.name || 'Aucun service'}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleEdit(u)}
                                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors text-sm"
                                    >
                                      Modifier
                                    </button>
                                    {u._id !== user.id && (
                                      <button
                                        onClick={() => handleDelete(u._id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
                                      >
                                        Supprimer
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Liens vers les autres pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {settingsLinks.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="group relative overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 flex items-center sm:block"
            >
              <div className="relative z-10 flex items-center sm:block w-full">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xl sm:text-2xl mr-4 sm:mr-0 sm:mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">{item.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-600 sm:mb-3 line-clamp-1 sm:line-clamp-none">{item.description}</p>
                  <div className="hidden sm:flex mt-2 items-center text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
                    <span className="text-sm">Ouvrir la page</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
                <div className="sm:hidden text-gray-400">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Modal de création/édition utilisateur */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Mot de passe {editingUser && '(laisser vide pour ne pas modifier)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Rôle
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="service_admin">Administrateur de Service</option>
                    <option value="admin">Administrateur Principal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Service {formData.role === 'service_admin' && '(requis)'}
                    {services.length > 0 && (
                      <span className="text-gray-500 text-sm font-normal ml-2">
                        ({services.length} service{services.length > 1 ? 's' : ''} disponible{services.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={services.length === 0}
                  >
                    <option value="">Aucun service</option>
                    {services.length === 0 ? (
                      <option disabled>Aucun service disponible</option>
                    ) : (
                      services.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.displayName || service.nom || service.name}
                        </option>
                      ))
                    )}
                  </select>
                  {services.length === 0 && (
                    <p className="text-yellow-600 text-sm mt-1">
                      ⚠️ Aucun service disponible. Créez d'abord un service dans la page Services.
                    </p>
                  )}
                  {formData.role === 'service_admin' && !formData.service && (
                    <p className="text-red-500 text-sm mt-1">
                      Un administrateur de service doit être assigné à un service
                    </p>
                  )}
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    {editingUser ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                  >
                    Annuler
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

export default Settings
