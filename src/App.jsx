import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import Layout from './components/Layout'

function AppContent() {
  // Hook anti-sommeil
  useKeepAlive()

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Welcome />} />
            <Route path="welcome" element={<Welcome />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="services" element={<Services />} />
            <Route path="employees" element={<Employees />} />
            <Route path="profile" element={<Profile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="qr-scanner" element={<QRScanner />} />
            <Route path="stats" element={<Stats />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* Route catch-all pour rediriger vers login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
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

