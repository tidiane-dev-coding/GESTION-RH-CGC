import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si erreur 401, nettoyer le token
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  }
)

// Services
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
}

export const serviceService = {
  getAll: () => api.get('/services'),
  getAllPublic: () => api.get('/services/public'), // Route publique pour l'inscription
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
}

export const employeeService = {
  getAll: () => api.get('/employees'),
  getMy: () => api.get('/employees/me'),
  getById: (id) => api.get(`/employees/${id}`),
  getByMatricule: (matricule) => api.get(`/employees/matricule/${matricule}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getQRCode: (id) => api.get(`/employees/${id}/qrcode`)
}

export const attendanceService = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  // Accept either a matricule string or a payload { matricule, photo, photoTimestamp }
  checkIn: (payload) => {
    if (typeof payload === 'string') {
      return api.post('/attendance/checkin', { matricule: payload })
    }
    return api.post('/attendance/checkin', payload)
  },
  checkOut: (matricule) => api.post('/attendance/checkout', { matricule }),
  markAbsence: (data) => api.post('/attendance/absence', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`)
}

export const leaveService = {
  getAll: (params) => api.get('/leaves', { params }),
  getById: (id) => api.get(`/leaves/${id}`),
  create: (data) => api.post('/leaves', data),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  delete: (id) => api.delete(`/leaves/${id}`),
  approve: (id, commentaireAdmin) => api.post(`/leaves/${id}/approve`, { commentaireAdmin }),
  reject: (id, commentaireAdmin) => api.post(`/leaves/${id}/reject`, { commentaireAdmin })
}

export const statsService = {
  getDashboard: () => api.get('/stats/dashboard')
}

export const exportService = {
  employeesPDF: () => api.get('/exports/employees/pdf', { responseType: 'blob' }),
  employeesExcel: () => api.get('/exports/employees/excel', { responseType: 'blob' }),
  attendancePDF: (params) => api.get('/exports/attendance/pdf', { params, responseType: 'blob' }),
  attendanceExcel: (params) => api.get('/exports/attendance/excel', { params, responseType: 'blob' }),
  serviceEmployeesPDF: (serviceId) => api.get(`/exports/services/${serviceId}/employees/pdf`, { responseType: 'blob' }),
  employeePDF: (employeeId) => api.get(`/exports/employees/${employeeId}/pdf`, { responseType: 'blob' })
}

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export default api

