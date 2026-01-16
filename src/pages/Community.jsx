import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { responsibilityAPI } from '../services/api';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const Community = () => {
  const [activeTab, setActiveTab] = useState('responsibilities');
  const [allResponsibilities, setAllResponsibilities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [datesList, setDatesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to get proper display name
  const getDisplayName = (userObj) => {
    if (!userObj) return 'Member';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'Member';
  };

  // Set page title
  useEffect(() => {
    document.title = 'Community - 3AM Core';
  }, []);

  useEffect(() => {
    if (activeTab === 'responsibilities') {
      loadAllResponsibilities();
    }
  }, [activeTab]);

  const loadAllResponsibilities = async () => {
    try {
      setLoading(true);
      const response = await responsibilityAPI.getAllResponsibilities();
      const responsibilities = response.data.tasks || [];
      setAllResponsibilities(responsibilities);
      generateDatesList(responsibilities);
    } catch (error) {
      console.error('Error loading responsibilities from backend:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDatesList = (responsibilities) => {
    if (responsibilities.length === 0) {
      setDatesList([]);
      return;
    }

    // Group responsibilities by date
    const responsibilitiesByDate = {};
    responsibilities.forEach(responsibility => {
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
    return allResponsibilities.filter(responsibility => responsibility.date === date);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
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

  return (
    <div className="container">
      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={handleLogout} />
      
      {/* Desktop Header */}
      <CoreHeader user={user} onLogout={handleLogout} activeTab="community" />
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'responsibilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('responsibilities')}
        >
          <i className="fas fa-list"></i>
          Responsibilities
        </button>
        <button 
          className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <i className="fas fa-chart-bar"></i>
          Statistics
        </button>
      </div>
      
      <main>
        {/* Responsibilities Tab */}
        {activeTab === 'responsibilities' && (
          <div className="tab-content active">
            <div className="tasks-section">
              <h2 className="section-title">
                <i className="fas fa-list"></i>
                Community Responsibilities
              </h2>
              
              <div className="tasks-layout">
                {/* Date List */}
                <div className="date-list">
                  <h3 className="date-list-title">Dates</h3>
                  <div className="dates-container">
                    {loading ? (
                      <div className="loading">Loading dates</div>
                    ) : datesList.length === 0 ? (
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
                        <p>No responsibilities found for this date</p>
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
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'flex-start', 
                              marginBottom: '8px' 
                            }}>
                              <div className="task-title">{responsibility.title}</div>
                              <div className="user-info">{responsibility.name || responsibility.username}</div>
                            </div>
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
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="tab-content active">
            <div className="form-container" style={{ 
              maxWidth: '600px', 
              textAlign: 'center', 
              margin: '60px auto' 
            }}>
              <h2>
                <i className="fas fa-chart-bar"></i>
                Statistics
              </h2>
              <div style={{ 
                padding: '60px 40px', 
                border: '1px solid var(--border)', 
                margin: '40px 0' 
              }}>
                <i className="fas fa-tools" style={{ 
                  fontSize: '48px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '20px' 
                }}></i>
                <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
                  In Development
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Community;