import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const CoreLogin = () => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [view, setView] = useState('selection'); // 'selection', 'setup', 'login'
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
    password: false
  });

  const navigate = useNavigate();
  const { coreLogin, setupCorePassword, isAuthenticated } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = 'Core Access - 3AM Core';
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/core/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Load profiles on component mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await authAPI.getCoreProfiles();
      setProfiles(response.data.profiles || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setMessage('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    setSelectedProfile(profile);
    setMessage('');
    
    if (!profile.passwordSet) {
      setView('setup');
    } else {
      setView('login');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await setupCorePassword(selectedProfile.id, formData.newPassword);
      
      if (result.success) {
        setMessage('Password set successfully! Redirecting...');
        setTimeout(() => {
          navigate('/core/dashboard');
        }, 1500);
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const result = await coreLogin(selectedProfile.id, formData.password);
      
      if (result.success) {
        setMessage('Access granted! Redirecting...');
        setTimeout(() => {
          navigate('/core/dashboard');
        }, 1000);
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  const showProfileSelection = () => {
    setView('selection');
    setSelectedProfile(null);
    setMessage('');
    setFormData({
      newPassword: '',
      confirmPassword: '',
      password: ''
    });
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <h1>3AM Core</h1>
        </div>
        <p>Core Team Access</p>
      </header>
      
      <main>
        {/* Profile Selection View */}
        {view === 'selection' && (
          <div className="form-container">
            <h2 className="text-center">
              <i className="fas fa-users"></i>
              Select Your Profile
            </h2>
            
            {message && (
              <div className={message.includes('success') ? 'success' : 'error'}>
                {message}
              </div>
            )}
            
            <div className="profiles-grid">
              {profiles.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No profiles found
                </p>
              ) : (
                profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`profile-card ${!profile.passwordSet ? 'setup-needed' : ''}`}
                    onClick={() => selectProfile(profile.id)}
                  >
                    <div className="profile-name">{profile.name}</div>
                    <div className="profile-email">{profile.email}</div>
                    <div className={`profile-status ${!profile.passwordSet ? 'setup-needed' : ''}`}>
                      {!profile.passwordSet ? 'Setup Required' : 'Ready'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Password Setup View */}
        {view === 'setup' && selectedProfile && (
          <div className="form-container">
            <h2 className="text-center">
              <i className="fas fa-key"></i>
              Set Up Password
            </h2>
            
            <div className="profile-info">
              <div className="name">{selectedProfile.name}</div>
              <div className="username">@{selectedProfile.username}</div>
            </div>
            
            {message && (
              <div className={message.includes('success') ? 'success' : 'error'}>
                {message}
              </div>
            )}
            
            <form onSubmit={handlePasswordSetup}>
              <div className="form-group">
                <label htmlFor="newPassword">Create Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.newPassword ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('newPassword')}
                  >
                    <i className={`fas ${showPassword.newPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.confirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                  >
                    <i className={`fas ${showPassword.confirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <button type="submit" className="btn-full">Set Password</button>
            </form>
            
            <div className="text-center mt-20">
              <a href="#" onClick={showProfileSelection}>← Back to Profiles</a>
            </div>
          </div>
        )}

        {/* Login View */}
        {view === 'login' && selectedProfile && (
          <div className="form-container">
            <h2 className="text-center">
              <i className="fas fa-sign-in-alt"></i>
              Core Access
            </h2>
            
            <div className="profile-info">
              <div className="name">{selectedProfile.name}</div>
              <div className="username">@{selectedProfile.username}</div>
            </div>
            
            {message && (
              <div className={message.includes('success') ? 'success' : 'error'}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.password ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('password')}
                  >
                    <i className={`fas ${showPassword.password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <button type="submit" className="btn-full">Access Core</button>
            </form>
            
            <div className="text-center mt-20">
              <a href="#" onClick={showProfileSelection}>← Back to Profiles</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoreLogin;