import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InHouseSignup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { firebaseSignup, isAuthenticated } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = 'In-House Signup - 3AM Core';
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/in-house-dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Basic validation
    if (formData.password.length < 6) {
      setMessage('Password should be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (!formData.username.trim()) {
      setMessage('Username is required.');
      setLoading(false);
      return;
    }

    try {
      const result = await firebaseSignup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        userType: 'in-house'
      });
      
      if (result.success) {
        setMessage('In-house team account created! Redirecting to login...');
        setTimeout(() => {
          navigate('/in-house-login');
        }, 2000);
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <i className="fas fa-clock"></i>
          <h1>3AM Core</h1>
        </div>
        <p>Join the In-house Team</p>
      </header>
      
      <main>
        <div className="form-container">
          <h2 className="text-center">
            <i className="fas fa-user-plus"></i>
            Join In-house Team
          </h2>
          
          {message && (
            <div className={message.includes('success') ? 'success' : 'error'}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Choose a username"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Create a password"
                  disabled={loading}
                  minLength="6"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Join In-house Team'}
            </button>
          </form>
          
          <div className="text-center mt-20">
            <p>Already have access? <Link to="/in-house-login">In-house Access</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InHouseSignup;