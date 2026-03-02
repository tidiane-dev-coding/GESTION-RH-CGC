import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { useKeepAlive } from './hooks/useKeepAlive'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import QRScanner from './pages/QRScanner'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Payroll from './pages/Payroll'
import Layout from './components/Layout'

function AppContent() {
  // Hook anti-sommeil
  useKeepAlive()

  const routes = [
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
    {
      path: '/',
      element: (
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      ),
      children: [
        { index: true, element: <Welcome /> },
        { path: 'welcome', element: <Welcome /> },
        { path: 'dashboard', element: <Dashboard /> },
        { path: 'services', element: <Services /> },
        { path: 'employees', element: <Employees /> },
        { path: 'payroll', element: <Payroll /> },
        { path: 'profile', element: <Profile /> },
        { path: 'attendance', element: <Attendance /> },
        { path: 'qr-scanner', element: <QRScanner /> },
        { path: 'stats', element: <Stats /> },
        { path: 'settings', element: <Settings /> }
      ]
    },
    { path: '*', element: <Navigate to="/login" replace /> }
  ]

  const router = createBrowserRouter(routes, {
    future: { v7_startTransition: true, v7_relativeSplatPath: true }
  })

  return (
    <RouterProvider router={router} />
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

