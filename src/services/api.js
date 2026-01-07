import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug: Log the environment details
console.log('🌍 Environment Mode:', import.meta.env.MODE);
console.log('🔗 API Base URL:', import.meta.env.VITE_API_BASE_URL || '/api');
console.log('🏗️ Is Development:', import.meta.env.DEV);
console.log('🚀 Is Production:', import.meta.env.PROD);

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/core-login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Core team authentication
  getCoreProfiles: () => api.get('/core-profiles'),
  setupCorePassword: (data) => api.post('/core-setup-password', data),
  coreLogin: (data) => api.post('/core-profile-login', data),
  
  // In-house team authentication
  firebaseSignup: (data) => api.post('/firebase-signup', data),
  firebaseLogin: (data) => api.post('/firebase-login', data),
  
  // General auth
  getCurrentUser: () => api.get('/user'),
  logout: () => api.post('/logout'),
};

// Responsibility API calls - NOW USING BACKEND API
export const responsibilityAPI = {
  createResponsibility: (data) => api.post('/responsibilities', data),
  getUserResponsibilities: () => api.get('/responsibilities'),
  getAllResponsibilities: () => api.get('/responsibilities/all'),
  getResponsibilityDates: (userId = null) => api.get('/responsibilities/dates', { 
    params: userId ? { userId } : {} 
  }),
  getResponsibilityStats: () => api.get('/responsibilities/stats'),
  updateResponsibility: (id, data) => api.put(`/responsibilities/${id}`, data),
  deleteResponsibility: (id) => api.delete(`/responsibilities/${id}`),
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export default api;