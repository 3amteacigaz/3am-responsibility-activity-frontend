import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, userType }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page based on required userType
    if (userType === 'in-house') {
      return <Navigate to="/in-house-login" replace />;
    }
    return <Navigate to="/core-login" replace />;
  }

  // Check if user has the correct userType
  if (userType && user?.userType !== userType) {
    // Redirect to their own dashboard if they try to access wrong area
    if (user?.userType === 'core') {
      return <Navigate to="/core/dashboard" replace />;
    } else if (user?.userType === 'in-house') {
      return <Navigate to="/in-house/dashboard" replace />;
    }
    return <Navigate to="/core-login" replace />;
  }

  return children;
};

export default ProtectedRoute;