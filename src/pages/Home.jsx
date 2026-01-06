import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  // Set page title
  useEffect(() => {
    document.title = '3AM Core - Elite Responsibility Management';
  }, []);

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <i className="fas fa-clock"></i>
          <h1>3AM Core</h1>
        </div>
        <p>Elite responsibility management for peak performers</p>
      </header>
      
      <main>
        <div className="hero">
          <h2>Welcome to 3AM Core</h2>
          <p>
            An exclusive productivity platform designed for elite performers who understand 
            that success happens when others are sleeping. Join the community of high-achievers 
            who work while the world sleeps.
          </p>
          
          <div className="cta-buttons">
            <Link to="/core-login" className="btn btn-primary">
              <i className="fas fa-users"></i>
              Core Team Access
            </Link>
            <Link to="/in-house-login" className="btn btn-secondary">
              <i className="fas fa-sign-in-alt"></i>
              In-House Login
            </Link>
          </div>
        </div>
        
        <div className="features">
          <div className="feature">
            <div className="feature-icon">
              <i className="fas fa-tasks"></i>
            </div>
            <h3>Elite Responsibility Management</h3>
            <p>Precision responsibility scheduling with detailed tracking and performance analytics for peak productivity.</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3>Core Community</h3>
            <p>Connect with high-performing individuals and monitor collective progress in an exclusive environment.</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Performance Analytics</h3>
            <p>Comprehensive statistics and insights to optimize your workflow and achieve peak performance.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;