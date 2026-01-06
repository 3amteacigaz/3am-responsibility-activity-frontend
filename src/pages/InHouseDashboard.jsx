import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InHouseDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'In-House Dashboard - 3AM Core';
  }, []);

  useEffect(() => {
    // Check if user is in-house type
    if (user && user.userType !== 'in-house') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/in-house-login');
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1><span id="username">{user?.username || 'In-house Member'}</span></h1>
        <div className="nav-links">
          <a href="#" onClick={handleLogout}>Exit</a>
        </div>
      </div>
      
      <main>
        <div className="form-container" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2>
            <i className="fas fa-home"></i>
            In-house Dashboard
          </h2>
          <p style={{ margin: '20px 0', color: 'var(--text-secondary)' }}>
            Welcome to the In-house team dashboard. Features coming soon.
          </p>
          <div style={{ 
            padding: '40px', 
            border: '1px solid var(--border)', 
            margin: '20px 0' 
          }}>
            <i className="fas fa-tools" style={{ 
              fontSize: '48px', 
              color: 'var(--text-secondary)', 
              marginBottom: '16px' 
            }}></i>
            <p style={{ color: 'var(--text-secondary)' }}>
              Dashboard under development
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InHouseDashboard;