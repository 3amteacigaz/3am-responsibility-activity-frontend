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
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    console.log('🔑 Token found:', !!token);
    console.log('🌐 Full URL:', config.baseURL + config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.log('❌ No token available');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data, error.config?.url);
    if (error.response?.status === 401) {
      console.log('🔓 Unauthorized - clearing token and redirecting');
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

// Activity API calls - NEW BACKEND API
export const activityAPI = {
  // Core team - Create and manage activities
  createActivity: (data) => api.post('/activities', data),
  getMyActivities: () => api.get('/activities/my'),
  updateActivity: (id, data) => api.put(`/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/activities/${id}`),
  
  // All users - View and participate in activities
  getAllActivities: () => api.get('/activities'),
  participateInActivity: (id, participating) => api.post(`/activities/${id}/participate`, { participating }),
  getActivityParticipants: (id) => api.get(`/activities/${id}/participants`),
  getMyParticipation: () => api.get('/activities/participation/my'),
};

// Presence API calls - NEW BACKEND API
export const presenceAPI = {
  // Mark/unmark presence for specific dates
  markPresence: (date, type = 'manual') => {
    console.log('🔄 Making markPresence API call:', { date, type });
    console.log('🔑 Token available:', !!localStorage.getItem('token'));
    return api.post('/presence', { date, type });
  },
  removePresence: (date) => {
    console.log('🔄 Making removePresence API call:', { date });
    console.log('🔑 Token available:', !!localStorage.getItem('token'));
    return api.delete(`/presence/${date}`);
  },
  
  // Get presence data for specific month
  getMonthlyPresence: (year, month) => {
    console.log('🔄 Making getMonthlyPresence API call:', { year, month });
    console.log('🔑 Token available:', !!localStorage.getItem('token'));
    return api.get(`/presence/month/${year}/${month}`);
  },
  
  // Get presence statistics for specific month
  getPresenceStats: (year, month) => {
    console.log('🔄 Making getPresenceStats API call:', { year, month });
    console.log('🔑 Token available:', !!localStorage.getItem('token'));
    return api.get(`/presence/stats/${year}/${month}`);
  },
  
  // Auto-mark presence through activity participation
  markActivityPresence: (activityDate) => {
    console.log('🔄 Making markActivityPresence API call:', { activityDate });
    console.log('🔑 Token available:', !!localStorage.getItem('token'));
    return api.post('/presence/activity-participation', { activityDate });
  },
};

// Notification API calls - NEW PUSH NOTIFICATION SYSTEM
export const notificationAPI = {
  // Send notifications when activity is created
  sendActivityCreatedNotification: (activityData) => {
    console.log('🔔 Sending activity created notification:', activityData);
    return api.post('/notifications/activity-created', activityData);
  },
  
  // Send notifications when someone participates/doesn't participate
  sendParticipationNotification: (participationData) => {
    console.log('🔔 Sending participation notification:', participationData);
    return api.post('/notifications/activity-participation', participationData);
  },
  
  // Get user's notifications
  getNotifications: (limit = 20, unreadOnly = false) => {
    console.log('🔔 Getting notifications:', { limit, unreadOnly });
    return api.get('/notifications', { params: { limit, unreadOnly } });
  },
  
  // Mark notification as read
  markNotificationRead: (notificationId) => {
    console.log('🔔 Marking notification as read:', notificationId);
    return api.put(`/notifications/${notificationId}/read`);
  },
  
  // Mark all notifications as read
  markAllNotificationsRead: () => {
    console.log('🔔 Marking all notifications as read');
    return api.put('/notifications/mark-all-read');
  },

  // Push subscription management
  savePushSubscription: (subscriptionData) => {
    console.log('🔔 Saving push subscription:', subscriptionData);
    return api.post('/notifications/push-subscription', subscriptionData);
  },

  removePushSubscription: () => {
    console.log('🔔 Removing push subscription');
    return api.delete('/notifications/push-subscription');
  },

  // Test push notification
  testPushNotification: () => {
    console.log('🔔 Testing push notification');
    return api.post('/notifications/test-push');
  },
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