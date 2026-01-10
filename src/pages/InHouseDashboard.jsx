import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InHouseDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'In-House Dashboard - 3AM Core';
    
    // Redirect in-house users directly to activities page
    if (user && user.userType === 'in-house') {
      navigate('/activities', { replace: true });
    } else if (user && user.userType !== 'in-house') {
      // If not in-house user, redirect to core dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // This component will redirect, so we can show a loading state
  return (
    <div className="container">
      <div className="loading">Redirecting to activities...</div>
    </div>
  );
};

export default InHouseDashboard;