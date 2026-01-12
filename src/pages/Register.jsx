import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { serviceService } from '../services/api'

const Register = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState([])
  const [focused, setFocused] = useState({ username: false, email: false, password: false, confirmPassword: false })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' })
  const [errors, setErrors] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const { register, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Rediriger si déjà connecté
    if (user) {
      navigate('/dashboard', { replace: true })
    }
    // charger services pour le select (route publique pour l'inscription)
    const fetchServices = async () => {
      try {
        const res = await serviceService.getAllPublic()
        setServices(res.data)
      } catch (err) {
        console.error('Erreur chargement services', err)
      }
    }
    fetchServices()
  }, [user, navigate])

  const flattenServices = (list) => {
    const out = []
    const walk = (items, depth = 0) => {
      (items || []).forEach((it) => {
        out.push({ ...it, depth })
        if (it.children && it.children.length) walk(it.children, depth + 1)
      })
    }
    walk(list)
    return out
  }

  const [serviceId, setServiceId] = useState('')

  // Calculer la force du mot de passe
  const calculatePasswordStrength = (pwd) => {
    let score = 0
    let feedback = []

    if (pwd.length >= 8) score += 1
    else feedback.push('Au moins 8 caractères')
    
    if (/[a-z]/.test(pwd)) score += 1
    else feedback.push('Une minuscule')
    
    if (/[A-Z]/.test(pwd)) score += 1
    else feedback.push('Une majuscule')
    
    if (/[0-9]/.test(pwd)) score += 1
    else feedback.push('Un chiffre')
    
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1
    else feedback.push('Un caractère spécial')

    let label = ''
    let color = ''
    
    if (score === 0) {
      label = 'Très faible'
      color = 'red'
    } else if (score <= 2) {
      label = 'Faible'
      color = 'orange'
    } else if (score <= 3) {
      label = 'Moyen'
      color = 'yellow'
    } else if (score <= 4) {
      label = 'Fort'
      color = 'green'
    } else {
      label = 'Très fort'
      color = 'emerald'
    }

    return { score, label, color, feedback }
  }

  // Validation en temps réel
  const validateUsername = (username) => {
    if (!username) {
      setErrors(prev => ({ ...prev, username: '' }))
      return false
    }
    if (username.length < 3) {
      setErrors(prev => ({ ...prev, username: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' }))
      return false
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrors(prev => ({ ...prev, username: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores' }))
      return false
    }
    setErrors(prev => ({ ...prev, username: '' }))
    return true
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setErrors(prev => ({ ...prev, email: '' }))
      return false
    }
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Format d\'email invalide' }))
      return false
    }
    setErrors(prev => ({ ...prev, email: '' }))
    return true
  }

  const validatePassword = (pwd) => {
    if (!pwd) {
      setErrors(prev => ({ ...prev, password: '' }))
      setPasswordStrength({ score: 0, label: '', color: '' })
      return false
    }
    if (pwd.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Le mot de passe doit contenir au moins 6 caractères' }))
      return false
    }
    const strength = calculatePasswordStrength(pwd)
    setPasswordStrength(strength)
    setErrors(prev => ({ ...prev, password: '' }))
    return true
  }

  const validateConfirmPassword = (confirmPwd) => {
    if (!confirmPwd) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }))
      return false
    }
    if (confirmPwd !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }))
      return false
    }
    setErrors(prev => ({ ...prev, confirmPassword: '' }))
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation complète
    const isUsernameValid = validateUsername(username)
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword)

    if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    if (!serviceId) {
      toast.error('Veuillez sélectionner un service')
      setLoading(false)
      return
    }

    const result = await register(username, email, password, serviceId)
    
    if (result.success) {
      toast.success('Inscription réussie ! Bienvenue 🎉')
      navigate('/dashboard')
    } else {
      toast.error(result.message || 'Erreur lors de l\'inscription')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 relative overflow-y-auto">
      {/* Background animé avec particules */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Section gauche - Image et branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-y-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-gradient">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Formes décoratives animées */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/20 rounded-full -ml-48 -mb-48 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 animate-slide-in-left">
          <div className="mb-8 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
              <svg className="w-32 h-32 text-white/90 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Rejoignez-nous
          </h1>
          <p className="text-xl md:text-2xl text-indigo-100 text-center max-w-md animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Créez votre compte et commencez à gérer vos ressources humaines en toute simplicité
          </p>
          
          <div className="mt-12 space-y-4 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            {[
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Gestion simplifiée', desc: 'Interface intuitive et moderne' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: 'Sécurité garantie', desc: 'Vos données sont protégées' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Rapide et efficace', desc: 'Gain de temps considérable' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-300 hover-lift group">
                <div className="flex-shrink-0">
                  <div className="bg-white/20 rounded-lg p-3 group-hover:bg-white/30 transition-all">
                    <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold group-hover:text-white transition-colors">{item.title}</p>
                  <p className="text-sm text-indigo-100">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section droite - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 py-8 relative z-10">
        <div className="w-full max-w-md animate-slide-in-right my-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-5 sm:p-6 border border-white/20 card-shine">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-5 animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl mb-3 shadow-lg hover-lift">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gestion RH Douk</h1>
            </div>

            <div className="mb-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Créer un compte</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Remplissez les informations ci-dessous pour commencer</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nom d'utilisateur
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.username ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      validateUsername(e.target.value)
                    }}
                    onFocus={() => setFocused({ ...focused, username: true })}
                    onBlur={() => {
                      setFocused({ ...focused, username: false })
                      validateUsername(username)
                    }}
                    required
                    className={`w-full pl-9 pr-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.username ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="votre_nom"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.username}
                  </p>
                )}
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.email ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      validateEmail(e.target.value)
                    }}
                    onFocus={() => setFocused({ ...focused, email: true })}
                    onBlur={() => {
                      setFocused({ ...focused, email: false })
                      validateEmail(email)
                    }}
                    required
                    className={`w-full pl-9 pr-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="votre@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.password ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      validatePassword(e.target.value)
                      if (confirmPassword) validateConfirmPassword(confirmPassword)
                    }}
                    onFocus={() => setFocused({ ...focused, password: true })}
                    onBlur={() => {
                      setFocused({ ...focused, password: false })
                      validatePassword(password)
                    }}
                    required
                    minLength={6}
                    className={`w-full pl-9 pr-10 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
                {password && passwordStrength.label && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Force du mot de passe:</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength.color === 'red' ? 'text-red-600' :
                        passwordStrength.color === 'orange' ? 'text-orange-600' :
                        passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                        passwordStrength.color === 'green' ? 'text-green-600' :
                        'text-emerald-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          passwordStrength.color === 'red' ? 'bg-red-500' :
                          passwordStrength.color === 'orange' ? 'bg-orange-500' :
                          passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                          passwordStrength.color === 'green' ? 'bg-green-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    {passwordStrength.feedback && passwordStrength.feedback.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Ajoutez: {passwordStrength.feedback.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.confirmPassword ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      validateConfirmPassword(e.target.value)
                    }}
                    onFocus={() => setFocused({ ...focused, confirmPassword: true })}
                    onBlur={() => {
                      setFocused({ ...focused, confirmPassword: false })
                      validateConfirmPassword(confirmPassword)
                    }}
                    required
                    minLength={6}
                    className={`w-full pl-9 pr-10 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.confirmPassword ? 'border-red-300 focus:border-red-500' : confirmPassword && confirmPassword === password ? 'border-green-300 focus:border-green-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword && confirmPassword === password && !errors.confirmPassword && (
                  <p className="mt-1 text-xs text-green-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Les mots de passe correspondent
                  </p>
                )}
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  required
                  className="w-full pl-3 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none input-focus bg-white/50"
                >
                  <option value="">-- Sélectionnez votre service --</option>
                  {flattenServices(services).map(s => (
                    <option key={s._id} value={s._id}>{'—'.repeat(s.depth)} {s.nom}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-start animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                <input 
                  type="checkbox" 
                  id="terms"
                  required
                  className="mt-0.5 w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" 
                />
                <label htmlFor="terms" className="ml-1.5 text-xs text-gray-600 cursor-pointer">
                  J'accepte les <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">conditions</a> et la <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">politique</a>
                </label>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-2 px-3 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: '0.8s' }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Inscription...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
              </button>
            </form>
            
            <div className="mt-4 pt-3 border-t border-gray-200 animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
              <p className="text-center text-xs text-gray-600">
                Vous avez déjà un compte ?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
