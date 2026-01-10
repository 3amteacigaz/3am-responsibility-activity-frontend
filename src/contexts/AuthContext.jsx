import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, getStoredUser, setStoredUser } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = getStoredUser();
        const token = localStorage.getItem('token');

        if (storedUser && token) {
          setAuthToken(token);
          // Verify token is still valid
          const response = await authAPI.getCurrentUser();
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth data
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (userData, token) => {
    try {
      setAuthToken(token);
      setUser(userData);
      setStoredUser(userData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthToken(null);
      setStoredUser(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const coreLogin = async (profileId, password) => {
    try {
      const response = await authAPI.coreLogin({ profileId, password });
      const { user: userData, token } = response.data;
      
      await login(userData, token);
      return { success: true };
    } catch (error) {
      console.error('Core login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const setupCorePassword = async (profileId, password) => {
    try {
      const response = await authAPI.setupCorePassword({ profileId, password });
      
      // After setting up password, automatically log in
      const loginResult = await coreLogin(profileId, password);
      if (loginResult.success) {
        return { success: true, message: 'Password set and logged in successfully!' };
      } else {
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Setup password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Setup failed' 
      };
    }
  };

  const firebaseSignup = async (userData) => {
    try {
      console.log('Firebase signup called with:', userData);
      
      // Send signup data to backend - Firebase user creation happens on backend
      const response = await authAPI.firebaseSignup({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        userType: userData.userType || 'in-house'
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Firebase signup error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Signup failed' 
      };
    }
  };

  const firebaseLogin = async (email, password) => {
    try {
      console.log('Firebase login called with:', { email });
      
      // Send login data to backend - Firebase authentication happens on backend
      const response = await authAPI.firebaseLogin({ 
        email, 
        password,
        userType: 'in-house'
      });
      
      const { user: userData, token } = response.data;
      
      await login(userData, token);
      return { success: true };
    } catch (error) {
      console.error('Firebase login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data;
      setUser(userData);
      setStoredUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    coreLogin,
    setupCorePassword,
    firebaseSignup,
    firebaseLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};