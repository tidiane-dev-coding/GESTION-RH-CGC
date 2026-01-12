import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState({ email: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [errors, setErrors] = useState({ email: '', password: '' })
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Rediriger si déjà connecté
    if (user) {
      navigate('/dashboard', { replace: true })
    }
    
    // Charger les données sauvegardées si "Se souvenir de moi" était coché
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [user, navigate])

  // Validation en temps réel
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

  const validatePassword = (password) => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: '' }))
      return false
    }
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Le mot de passe doit contenir au moins 6 caractères' }))
      return false
    }
    setErrors(prev => ({ ...prev, password: '' }))
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)
    
    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      // Sauvegarder l'email si "Se souvenir de moi" est coché
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      toast.success('Connexion réussie ! Bienvenue 👋')
      navigate('/dashboard')
    } else {
      toast.error(result.message || 'Erreur de connexion')
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotPasswordEmail) {
      toast.error('Veuillez entrer votre adresse email')
      return
    }
    if (!validateEmail(forgotPasswordEmail)) {
      return
    }
    
    // TODO: Implémenter l'API de réinitialisation de mot de passe
    toast.info('Fonctionnalité de réinitialisation à venir. Contactez votre administrateur.')
    setShowForgotPassword(false)
    setForgotPasswordEmail('')
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-y-auto">
      {/* Background animé avec particules */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Section gauche - Image et branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-y-auto bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 animate-gradient">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Formes décoratives animées */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full -ml-48 -mb-48 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 animate-slide-in-left">
          <div className="mb-8 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
              <svg className="w-32 h-32 text-white/90 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Gestion RH CGC
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 text-center max-w-md animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Gérez efficacement vos ressources humaines avec une solution moderne et intuitive
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            {[
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Suivi' },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Présence' },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Statistiques' }
            ].map((item, index) => (
              <div key={index} className="text-center hover-lift group">
                <div className="bg-white/20 rounded-lg p-4 mb-2 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8 mx-auto group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <p className="text-sm text-blue-100 group-hover:text-white transition-colors">{item.label}</p>
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
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mb-3 shadow-lg hover-lift">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gestion RH Douk</h1>
            </div>

            <div className="mb-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Bienvenue</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Connectez-vous à votre compte pour continuer</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.email ? 'text-blue-600' : 'text-gray-400'}`}>
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
                    className={`w-full pl-9 pr-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
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
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused.password ? 'text-blue-600' : 'text-gray-400'}`}>
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
                    }}
                    onFocus={() => setFocused({ ...focused, password: true })}
                    onBlur={() => {
                      setFocused({ ...focused, password: false })
                      validatePassword(password)
                    }}
                    required
                    className={`w-full pl-9 pr-10 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none input-focus bg-white/50 ${
                      errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
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
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" 
                  />
                  <span className="ml-1.5 text-xs text-gray-600 group-hover:text-gray-900 transition-colors">Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-2 px-3 rounded-lg hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: '0.6s' }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
              </button>
            </form>
            
            <div className="mt-4 pt-3 border-t border-gray-200 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <p className="text-center text-xs text-gray-600 mb-2">
                Vous n'avez pas de compte ?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:underline">
                  Créer un compte
                </Link>
              </p>
              <div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mot de passe oublié */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mot de passe oublié</h2>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse email</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => {
                    setForgotPasswordEmail(e.target.value)
                    validateEmail(e.target.value)
                  }}
                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none ${
                    errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="votre@email.com"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
