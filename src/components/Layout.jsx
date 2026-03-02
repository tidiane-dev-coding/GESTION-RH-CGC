import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// URL de l'API/backend pour charger le logo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Détecter le scroll pour changer le style de la navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const mainNavigation = [
    { name: 'Accueil', href: '/welcome', icon: '🏠', color: 'from-blue-500 to-cyan-500' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊', color: 'from-blue-500 to-cyan-500' },
    { name: 'Services', href: '/services', icon: '🏢', color: 'from-purple-500 to-pink-500' },
    { name: 'Employés', href: '/employees', icon: '👥', color: 'from-green-500 to-emerald-500' },
    { name: 'Paie', href: '/payroll', icon: '💰', color: 'from-amber-500 to-orange-500' },
    { name: 'Paramètres', href: '/settings', icon: '⚙️', color: 'from-blue-500 to-blue-700' }
  ]

  // Fermer automatiquement le menu mobile quand on change de page
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const isActive = (path) => {
    if (path === '/welcome' && location.pathname === '/') return true
    return location.pathname === path
  }

  return (
    <div className="min-h-screen relative">
      {/* Background avec images et effets */}
      <div className="fixed inset-0 z-0">
        {/* Image de fond avec overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)',
            filter: 'brightness(0.4)'
          }}
        ></div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-purple-900/50 to-indigo-900/60"></div>

        {/* Particules animées */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse-glow -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navbar horizontale moderne avec glassmorphism - TOUJOURS très visible */}
      <nav className={`fixed top-0 left-0 right-0 z-20 backdrop-blur-xl transition-all duration-300 ${scrolled
        ? 'bg-slate-900 border-b-4 border-white shadow-[0_10px_50px_rgba(0,0,0,0.8)]'
        : 'bg-gradient-to-r from-blue-700 to-blue-900 border-b-2 border-blue-300 shadow-[0_10px_40px_rgba(0,0,0,0.6)]'
        }`}>
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 min-h-[64px]">
            {/* Logo et titre - Version compacte */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white">
                <img
                  src={`${API_URL}/assets/${encodeURIComponent('cropped-logo (1).png')}`}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div className="absolute w-10 h-10 flex items-center justify-center pointer-events-none">
                  <span className="text-xl">👥</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-base sm:text-lg font-extrabold transition-all duration-300 leading-tight ${scrolled
                  ? 'text-white drop-shadow-[0_3px_10px_rgba(0,0,0,1)]'
                  : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                  }`}>Gestion RH CGC</h1>
                <p className={`text-[10px] hidden lg:block transition-all duration-300 font-semibold leading-tight ${scrolled
                  ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                  : 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                  }`}>Plateforme Moderne</p>
              </div>
            </div>

            {/* Navigation horizontale principale - Version compacte */}
            <div className="hidden md:flex items-center space-x-1 flex-1 justify-center mx-2 overflow-x-auto min-w-0">
              {mainNavigation.map((item, index) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group relative flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 hover-lift whitespace-nowrap flex-shrink-0 ${isActive(item.href)
                    ? 'bg-gradient-to-r ' + item.color + ' shadow-2xl scale-105 border-2 border-white'
                    : scrolled
                      ? 'bg-white hover:bg-gray-100 border-2 border-white shadow-[0_4px_12px_rgba(255,255,255,0.5)]'
                      : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/50'
                    }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <span className={`text-lg relative z-10 ${isActive(item.href)
                    ? 'drop-shadow-[0_3px_8px_rgba(0,0,0,1)]'
                    : scrolled
                      ? 'drop-shadow-[0_3px_8px_rgba(0,0,0,1)]'
                      : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                    }`}>
                    {item.icon}
                  </span>
                  <span className={`text-xs sm:text-sm font-extrabold relative z-10 ${isActive(item.href)
                    ? 'text-white drop-shadow-[0_3px_8px_rgba(0,0,0,1)]'
                    : scrolled
                      ? 'text-gray-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]'
                      : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:text-white'
                    }`}>
                    {item.name}
                  </span>

                  {/* Indicateur actif en bas */}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full shadow-lg"></div>
                  )}
                </Link>
              ))}

            </div>

            {/* Menu mobile (hamburger) - Version compacte */}
            <div className="md:hidden relative flex-shrink-0 z-50">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-all duration-300 ${scrolled
                  ? 'bg-white hover:bg-gray-100 border-2 border-slate-900 shadow-sm text-slate-900'
                  : 'bg-white/20 hover:bg-white/30 border-2 border-white text-white shadow-lg backdrop-blur-sm'
                  }`}
              >
                <span className="text-xl font-bold">☰</span>
              </button>
            </div>

            {/* FULL SCREEN MOBILE OVERLAY */}
            {/* Utilisateur et déconnexion - Version compacte */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all duration-300 cursor-pointer group ${scrolled
                  ? 'bg-white hover:bg-gray-100 border-2 border-white shadow-[0_4px_12px_rgba(255,255,255,0.5)]'
                  : 'bg-white/25 hover:bg-white/35 border-2 border-white/60 shadow-lg'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-all duration-300 flex-shrink-0 ${user?.role === 'admin'
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-400 group-hover:from-yellow-300 group-hover:to-orange-300'
                    : 'bg-gradient-to-br from-blue-400 to-purple-400 group-hover:from-blue-300 group-hover:to-purple-300'
                  }`}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className={`text-xs font-extrabold truncate max-w-[100px] ${scrolled
                      ? 'text-gray-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]'
                      : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                    }`}>{user?.username || 'Utilisateur'}</p>
                  <div className="flex items-center space-x-1">
                    <p className={`text-[10px] capitalize font-bold ${scrolled
                        ? 'text-gray-800 drop-shadow-[0_1px_3px_rgba(255,255,255,0.6)]'
                        : 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                      }`}>{user?.role || 'user'}</p>
                    {user?.role === 'admin' && (
                      <span className="text-[10px] bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-1 py-0.5 rounded-full font-bold">👑</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-[0_4px_12px_rgba(220,38,38,0.6)] hover:shadow-[0_6px_16px_rgba(220,38,38,0.8)] border-2 border-white/30 transform hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
              >
                <span className="hidden sm:inline drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Déconnexion</span>
                <span className="sm:hidden text-base">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* FULL SCREEN MOBILE OVERLAY - Moved outside Nav to avoid backdrop-filter constraints */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex flex-col bg-slate-900 animate-fade-in">
          {/* Header du menu mobile */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">👥</span>
              </div>
              <span className="text-white font-bold text-lg">Menu</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Liens de navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Navigation principale */}
            {mainNavigation.map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 border ${isActive(item.href)
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg transform scale-[1.02]'
                  : 'bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{item.name}</span>
                  <span className="text-xs opacity-70">Aller à {item.name}</span>
                </div>
                {isActive(item.href) && (
                  <span className="ml-auto text-white">●</span>
                )}
              </Link>
            ))}

            {/* Raccourcis Paramètres (Visible uniquement sur mobile) */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Accès rapide</p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/attendance" onClick={() => setMobileMenuOpen(false)} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 text-center">
                  <span className="block text-xl mb-1">⏰</span>
                  <span className="text-xs text-gray-300">Présences</span>
                </Link>
                <Link to="/stats" onClick={() => setMobileMenuOpen(false)} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 text-center">
                  <span className="block text-xl mb-1">📈</span>
                  <span className="text-xs text-gray-300">Stats</span>
                </Link>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 text-center">
                  <span className="block text-xl mb-1">🙍</span>
                  <span className="text-xs text-gray-300">Profil</span>
                </Link>
                <Link to="/qr-scanner" onClick={() => setMobileMenuOpen(false)} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 text-center">
                  <span className="block text-xl mb-1">📱</span>
                  <span className="text-xs text-gray-300">Scanner</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer du menu mobile */}
          <div className="p-4 border-t border-white/10 bg-slate-800/50 backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-lg bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">{user?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>🚪</span>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}

      {/* Main content avec glassmorphism */}
      <div className="pt-16 pb-16 relative z-10">
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="glass backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Footer global réduit */}
      <footer className="fixed left-0 right-0 bottom-0 z-30 bg-gradient-to-r from-slate-900/80 to-slate-800/70 border-t border-white/10 backdrop-blur-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 py-2">
            <p className="text-xs font-semibold">Gestion RH CGC</p>
              <div className="flex items-center space-x-3 text-xs text-white/80">
                <Link to="/settings" className="hover:text-white">Paramètres</Link>
                <Link to="/employees" className="hover:text-white">Employés</Link>
                <Link to="/payroll" className="hover:text-white">Paie</Link>
                <span>© {new Date().getFullYear()}</span>
              </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout

