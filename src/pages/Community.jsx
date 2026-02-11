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
  const [selectedUser, setSelectedUser] = useState('all'); // Filter by user
  const [usersList, setUsersList] = useState([]); // List of unique users

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

  // Regenerate dates list when user filter changes
  useEffect(() => {
    if (allResponsibilities.length > 0) {
      generateDatesList(allResponsibilities);
    }
  }, [selectedUser]);

  const loadAllResponsibilities = async () => {
    try {
      setLoading(true);
      const response = await responsibilityAPI.getAllResponsibilities();
      const responsibilities = response.data.tasks || [];
      setAllResponsibilities(responsibilities);
      generateDatesList(responsibilities);
      generateUsersList(responsibilities);
    } catch (error) {
      console.error('Error loading responsibilities from backend:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUsersList = (responsibilities) => {
    // Get unique users
    const usersMap = new Map();
    responsibilities.forEach(responsibility => {
      const userName = responsibility.name || responsibility.username || 'Unknown';
      const userId = responsibility.userId;
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          userId,
          name: userName,
          count: 0
        });
      }
      usersMap.get(userId).count++;
    });

    const users = Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setUsersList(users);
  };

  const generateDatesList = (responsibilities) => {
    if (responsibilities.length === 0) {
      setDatesList([]);
      return;
    }

    // Filter responsibilities by selected user first
    let filteredResponsibilities = responsibilities;
    if (selectedUser !== 'all') {
      filteredResponsibilities = responsibilities.filter(r => r.userId === selectedUser);
    }

    // Group responsibilities by date
    const responsibilitiesByDate = {};
    filteredResponsibilities.forEach(responsibility => {
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
    if (sortedDates.length > 0) {
      setSelectedDate(sortedDates[0]);
    } else {
      setSelectedDate(null);
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
    let filtered = allResponsibilities.filter(responsibility => responsibility.date === date);
    
    // Apply user filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(responsibility => responsibility.userId === selectedUser);
    }
    
    return filtered;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleUserSelect = (userId) => {
    setSelectedUser(userId);
    // The useEffect will automatically regenerate dates list
  };

  const handleLogout = async () => {
    await logout();
    navigate('/core-login');
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
              
              {/* User Filter - Moved to top */}
              {usersList.length > 0 && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px',
                  background: 'var(--secondary)',
                  border: '1px solid var(--border)'
                }}>
                  <label htmlFor="user-filter" style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginRight: '12px',
                    color: 'var(--text-primary)'
                  }}>
                    <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
                    Filter by Person:
                  </label>
                  <select
                    id="user-filter"
                    value={selectedUser}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      background: 'var(--secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '200px'
                    }}
                  >
                    <option value="all">All People ({allResponsibilities.length} total)</option>
                    {usersList.map(user => (
                      <option key={user.userId} value={user.userId}>
                        {user.name} ({user.count} responsibilities)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
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
                        <p>No responsibilities found {selectedUser !== 'all' ? 'for this person' : 'for this date'}</p>
                      </div>
                    ) : (
                      selectedDateResponsibilities.map(responsibility => {
                        // Calculate duration from start and end time
                        const calculateDuration = (startTime, endTime) => {
                          if (!startTime || !endTime) return 'N/A';
                          
                          const [startHour, startMin] = startTime.split(':').map(Number);
                          const [endHour, endMin] = endTime.split(':').map(Number);
                          
                          const startMinutes = startHour * 60 + startMin;
                          const endMinutes = endHour * 60 + endMin;
                          
                          let diffMinutes = endMinutes - startMinutes;
                          if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight
                          
                          const hours = Math.floor(diffMinutes / 60);
                          const minutes = diffMinutes % 60;
                          
                          if (hours > 0 && minutes > 0) {
                            return `${hours}h ${minutes}m`;
                          } else if (hours > 0) {
                            return `${hours}h`;
                          } else {
                            return `${minutes}m`;
                          }
                        };

                        const duration = calculateDuration(responsibility.startTime || responsibility.time, responsibility.endTime);

                        return (
                          <div key={responsibility._id} className="task-item">
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'flex-start', 
                              marginBottom: '8px' 
                            }}>
                              <div className="task-title">{responsibility.title}</div>
                              <div className="user-badge" style={{
                                background: 'var(--primary)',
                                color: 'var(--secondary)',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '0'
                              }}>
                                {responsibility.name || responsibility.username}
                              </div>
                            </div>
                            <div className="task-meta">
                              {new Date(responsibility.date).toLocaleDateString()} • {responsibility.startTime || responsibility.time} - {responsibility.endTime || 'N/A'}
                            </div>
                            {responsibility.description && (
                              <div className="task-description">{responsibility.description}</div>
                            )}
                            <div className="task-timing">
                              Duration: {duration}
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