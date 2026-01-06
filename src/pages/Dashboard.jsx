import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { responsibilityAPI } from '../services/api';

const Dashboard = () => {
  const [responsibilities, setResponsibilities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [datesList, setDatesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    title: '',
    description: ''
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard - 3AM Core';
  }, []);

  useEffect(() => {
    if (user) {
      loadResponsibilities();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadResponsibilities = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await responsibilityAPI.getUserResponsibilities();
      const userResponsibilities = response.data.tasks || [];
      setResponsibilities(userResponsibilities);
      generateDatesList(userResponsibilities);
    } catch (error) {
      console.error('Error loading responsibilities:', error);
      setMessage('Error loading responsibilities. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const generateDatesList = (allResponsibilities) => {
    if (allResponsibilities.length === 0) {
      setDatesList([]);
      return;
    }

    // Group responsibilities by date
    const responsibilitiesByDate = {};
    allResponsibilities.forEach(responsibility => {
      const dateKey = responsibility.date;
      if (!responsibilitiesByDate[dateKey]) {
        responsibilitiesByDate[dateKey] = [];
      }
      responsibilitiesByDate[dateKey].push(responsibility);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(responsibilitiesByDate).sort((a, b) => new Date(b) - new Date(a));
    
    const datesWithCounts = sortedDates.map(date => ({
      date,
      count: responsibilitiesByDate[date].length,
      displayDate: formatDisplayDate(date)
    }));

    setDatesList(datesWithCounts);

    // Auto-select the first (most recent) date
    if (sortedDates.length > 0 && !selectedDate) {
      setSelectedDate(sortedDates[0]);
    }
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getResponsibilitiesForDate = (date) => {
    return responsibilities.filter(responsibility => responsibility.date === date);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await responsibilityAPI.createResponsibility(formData);
      setMessage('Responsibility added successfully!');
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '',
        title: '',
        description: ''
      });

      // Reload responsibilities
      await loadResponsibilities();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding responsibility:', error);
      setMessage('Error adding responsibility. Please try again.');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const toggleResponsibilityCompletion = async (responsibilityId, completed) => {
    try {
      await responsibilityAPI.updateResponsibility(responsibilityId, { completed });
      await loadResponsibilities();
    } catch (error) {
      console.error('Error updating responsibility:', error);
    }
  };

  const deleteResponsibility = async (responsibilityId) => {
    if (window.confirm('Are you sure you want to delete this responsibility?')) {
      try {
        await responsibilityAPI.deleteResponsibility(responsibilityId);
        await loadResponsibilities();
      } catch (error) {
        console.error('Error deleting responsibility:', error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/core-login');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getTimeDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end - start;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    } else {
      return `${diffSecs}s`;
    }
  };

  const selectedDateResponsibilities = selectedDate ? getResponsibilitiesForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => window.location.reload()} 
            className="btn"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1><span id="username">{user?.username || 'Member'}</span></h1>
        <div className="nav-links">
          <Link to="/community">Community</Link>
          <a href="#" onClick={handleLogout}>Exit</a>
        </div>
      </div>
      
      <main>
        <div className="dashboard-content">
          {/* Left Side - Add New Responsibility */}
          <div className="task-form-section">
            <h2 className="section-title">
              <i className="fas fa-plus"></i>
              Add Responsibility
            </h2>
            
            {message && (
              <div className={message.includes('success') ? 'success' : 'error'}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="time">Time</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Responsibility title"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional details"
                />
              </div>
              
              <button type="submit" className="btn-full">Add Responsibility</button>
            </form>
          </div>
          
          {/* Right Side - Your Responsibilities */}
          <div className="tasks-section">
            <h2 className="section-title">
              <i className="fas fa-list"></i>
              Responsibilities
            </h2>
            
            <div className="tasks-layout">
              {/* Date List */}
              <div className="date-list">
                <h3 className="date-list-title">Dates</h3>
                <div className="dates-container">
                  {datesList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
                      <i className="fas fa-calendar"></i>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        No responsibilities yet
                      </p>
                    </div>
                  ) : (
                    datesList.map(({ date, count, displayDate }) => (
                      <div
                        key={date}
                        className={`date-item ${selectedDate === date ? 'active' : ''}`}
                        onClick={() => handleDateSelect(date)}
                      >
                        <span className="date-text">{displayDate}</span>
                        <span className="task-count-badge">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Responsibilities for Selected Date */}
              <div className="tasks-content">
                <div className="selected-date-header">
                  <h3>
                    {selectedDate ? formatFullDate(selectedDate) : 'Select a date'}
                  </h3>
                  <span className="task-count">
                    {selectedDate ? `(${selectedDateResponsibilities.length})` : ''}
                  </span>
                </div>
                <div className="tasks-container">
                  {!selectedDate ? (
                    <div className="empty-state">
                      <i className="fas fa-calendar"></i>
                      <p>Select a date to view responsibilities</p>
                    </div>
                  ) : selectedDateResponsibilities.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-clipboard-list"></i>
                      <p>No responsibilities for this date</p>
                    </div>
                  ) : (
                    selectedDateResponsibilities.map(responsibility => {
                      const createdTime = formatDateTime(responsibility.createdAt);
                      const completedTime = responsibility.completedAt ? formatDateTime(responsibility.completedAt) : null;
                      const duration = responsibility.completed && responsibility.completedAt ? 
                        getTimeDifference(responsibility.createdAt, responsibility.completedAt) : 
                        getTimeDifference(responsibility.createdAt);

                      return (
                        <div key={responsibility._id} className={`task-item ${responsibility.completed ? 'completed' : ''}`}>
                          <div className="task-title">{responsibility.title}</div>
                          <div className="task-meta">
                            {new Date(responsibility.date).toLocaleDateString()} at {responsibility.time}
                          </div>
                          {responsibility.description && (
                            <div className="task-description">{responsibility.description}</div>
                          )}
                          <div className="task-timing">
                            Started: {createdTime}
                            {completedTime && <><br />Completed: {completedTime}</>}
                            <br />Duration: {duration}
                          </div>
                          <div className="task-actions">
                            {!responsibility.completed && (
                              <button 
                                className="task-btn complete" 
                                onClick={() => toggleResponsibilityCompletion(responsibility._id, true)}
                              >
                                <i className="fas fa-check"></i> Done
                              </button>
                            )}
                            <button 
                              className="task-btn delete" 
                              onClick={() => deleteResponsibility(responsibility._id)}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;