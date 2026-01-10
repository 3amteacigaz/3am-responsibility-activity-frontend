import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InHouseLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { firebaseLogin, isAuthenticated } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = 'In-House Login - 3AM Core';
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/activities');
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

    try {
      const result = await firebaseLogin(formData.email, formData.password);
      
      if (result.success) {
        setMessage('In-house access granted! Redirecting...');
        setTimeout(() => {
          navigate('/activities');
        }, 1000);
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
        <p>In-house Team Access</p>
      </header>
      
      <main>
        <div className="form-container">
          <h2 className="text-center">
            <i className="fas fa-home"></i>
            In-house Access
          </h2>
          
          {message && (
            <div className={message.includes('success') ? 'success' : 'error'}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
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
                  placeholder="Enter your password"
                  disabled={loading}
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
              {loading ? 'Signing in...' : 'In-house Access'}
            </button>
          </form>
          
          <div className="text-center mt-20">
            <p>Need access? <Link to="/in-house-signup">Join In-house Team</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InHouseLogin;