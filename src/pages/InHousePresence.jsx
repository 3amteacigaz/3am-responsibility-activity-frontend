import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inHousePresenceAPI, activityAPI, presenceAPI, notificationAPI } from '../services/api';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const InHousePresence = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [presenceOverview, setPresenceOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('presence');
  
  // Activities tab states
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [participatingActivities, setParticipatingActivities] = useState(new Set());
  const [activityParticipants, setActivityParticipants] = useState({});
  
  // Manage Activities tab states
  const [myActivities, setMyActivities] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
  });
  const [createMessage, setCreateMessage] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is core team member
  useEffect(() => {
    if (user && user.userType !== 'core') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'presence') {
      loadInHouseUsers();
    } else if (activeTab === 'activities') {
      loadActivitiesData();
    } else if (activeTab === 'manage-activities') {
      loadMyActivities();
    }
  }, [activeTab]);

  // Load presence overview when month changes
  useEffect(() => {
    if (users.length > 0 && activeTab === 'presence') {
      loadPresenceOverview();
    }
  }, [currentMonth, users]);

  // Helper functions
  const getDisplayName = (userObj) => {
    if (!userObj) return 'User';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'User';
  };

  const getCreatorDisplayName = (activity) => {
    if (activity.createdBy === user?.userId) {
      return getDisplayName(user);
    }
    return activity.createdByName || 'Unknown';
  };

  // Presence tab functions
  const loadInHouseUsers = async () => {
    try {
      setLoading(true);
      const response = await inHousePresenceAPI.getInHouseUsers();
      setUsers(response.data.users || []);
      console.log('✅ Loaded in-house users:', response.data.users);
    } catch (error) {
      console.error('❌ Error loading in-house users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPresenceOverview = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const response = await inHousePresenceAPI.getPresenceOverview(year, month);
      setPresenceOverview(response.data);
      console.log('✅ Loaded presence overview for', year, month);
    } catch (error) {
      console.error('❌ Error loading presence overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction) => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Activities tab functions
  const loadActivitiesData = async () => {
    try {
      setActivitiesLoading(true);
      const response = await activityAPI.getAllActivities();
      const allActivities = response.data.activities || [];
      setActivities(allActivities);
      
      // Load participants for each activity
      const participantsData = {};
      for (const activity of allActivities) {
        try {
          const participantsResponse = await activityAPI.getActivityParticipants(activity.id);
          participantsData[activity.id] = participantsResponse.data.participants || [];
        } catch (error) {
          console.error(`Error loading participants for activity ${activity.id}:`, error);
          participantsData[activity.id] = [];
        }
      }
      setActivityParticipants(participantsData);
      
      // Load user participation
      const participationResponse = await activityAPI.getMyParticipation();
      const participatingIds = participationResponse.data.participatingActivityIds || [];
      setParticipatingActivities(new Set(participatingIds));
      
      console.log('Loaded activities:', allActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Manage Activities tab functions
  const loadMyActivities = async () => {
    try {
      setManageLoading(true);
      const response = await activityAPI.getMyActivities();
      const userActivities = response.data.activities || [];
      setMyActivities(userActivities);
      console.log('Loaded my activities:', userActivities);
    } catch (error) {
      console.error('Error loading my activities:', error);
    } finally {
      setManageLoading(false);
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    setCreateMessage('');
    setCreateLoading(true);

    if (createFormData.startTime && createFormData.endTime) {
      const start = new Date(`${createFormData.date}T${createFormData.startTime}`);
      const end = new Date(`${createFormData.date}T${createFormData.endTime}`);
      
      if (end <= start) {
        setCreateMessage('End time must be after start time');
        setCreateLoading(false);
        return;
      }
    }

    try {
      const response = await activityAPI.createActivity(createFormData);
      console.log('Activity created:', response.data);
      
      setCreateMessage('Activity created successfully!');
      
      try {
        await notificationAPI.sendActivityCreatedNotification({
          activityId: response.data.activityId,
          activityTitle: createFormData.title,
          activityDate: createFormData.date,
          activityTime: createFormData.startTime && createFormData.endTime 
            ? `${createFormData.startTime} - ${createFormData.endTime}`
            : createFormData.startTime
        });
        console.log('📢 Activity creation notification sent to all users');
      } catch (notificationError) {
        console.error('Error sending activity creation notification:', notificationError);
      }
      
      await loadMyActivities();

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMessage('');
      }, 1500);
    } catch (error) {
      console.error('Error creating activity:', error);
      setCreateMessage(error.response?.data?.error || 'Error creating activity. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const renderUserPresenceDots = (presentDates) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dots = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPresent = presentDates.includes(dateStr);
      
      const dayOfWeek = new Date(year, month, day).getDay();
      const isSaturday = dayOfWeek === 6;
      
      if (isPresent) {
        dots.push(
          <div
            key={day}
            className="presence-dot"
            style={{
              background: isSaturday ? '#3b82f6' : '#22c55e',
              color: 'white',
              width: '24px',
              height: '24px',
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '500',
              border: '1px solid var(--border)'
            }}
            title={`Present on ${dateStr}`}
          >
            {day}
          </div>
        );
      }
    }
    
    return (
      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap', 
        gap: '4px',
        marginTop: '12px'
      }}>
        {dots.length > 0 ? dots : (
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}>
            No presence recorded
          </span>
        )}
      </div>
    );
  };

  const formatDateTime = (date, startTime, endTime) => {
    const activityDate = new Date(date + 'T' + startTime);
    const endDateTime = endTime ? new Date(date + 'T' + endTime) : null;
    
    const dateStr = activityDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    const startTimeStr = activityDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (endDateTime) {
      const endTimeStr = endDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${dateStr} from ${startTimeStr} to ${endTimeStr}`;
    }
    
    return `${dateStr} at ${startTimeStr}`;
  };

  const isUpcoming = (date, startTime) => {
    const activityDate = new Date(date + 'T' + startTime);
    return activityDate > new Date();
  };

  if (!user || user.userType !== 'core') {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ marginBottom: '20px' }}>Access Denied</h2>
          <p>Only core team members can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <MobileNav />
      <CoreHeader user={user} onLogout={() => navigate('/core-login')} activeTab="in-house" />
      
      <main className="main-content">
        {/* Page Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '500',
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            <i className="fas fa-users" style={{ marginRight: '12px' }}></i>
            In House
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            margin: '0'
          }}>
            Monitor team Presence and activities
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', 
          gap: '0',
          marginBottom: '30px',
          borderBottom: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setActiveTab('presence')}
            style={{
              background: activeTab === 'presence' ? 'var(--primary)' : 'var(--secondary)',
              color: activeTab === 'presence' ? 'var(--secondary)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'var(--transition)',
              borderRadius: '0'
            }}
          >
            <i className="fas fa-calendar-check" style={{ marginRight: '8px' }}></i>
            Presence
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            style={{
              background: activeTab === 'activities' ? 'var(--primary)' : 'var(--secondary)',
              color: activeTab === 'activities' ? 'var(--secondary)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              borderLeft: 'none',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'var(--transition)',
              borderRadius: '0'
            }}
          >
            <i className="fas fa-calendar-alt" style={{ marginRight: '8px' }}></i>
            Activities
          </button>
          <button
            onClick={() => setActiveTab('manage-activities')}
            style={{
              background: activeTab === 'manage-activities' ? 'var(--primary)' : 'var(--secondary)',
              color: activeTab === 'manage-activities' ? 'var(--secondary)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              borderLeft: 'none',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'var(--transition)',
              borderRadius: '0'
            }}
          >
            <i className="fas fa-calendar-plus" style={{ marginRight: '8px' }}></i>
            Manage Activities
          </button>
        </div>
        {/* Presence Tab Content */}
        {activeTab === 'presence' && (
          <>
            {/* Month Navigation */}
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '30px',
              padding: '16px',
              border: '1px solid var(--border)',
              background: 'var(--secondary)'
            }}>
              <h2 style={{ 
                fontSize: '18px',
                fontWeight: '500', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {formatMonth(currentMonth)}
              </h2>
              <div style={{ display: 'flex', gap: '0' }}>
                <button
                  onClick={() => handleMonthChange('prev')}
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                    borderRight: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    transition: 'var(--transition)',
                    borderRadius: '0'
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  onClick={() => handleMonthChange('next')}
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    transition: 'var(--transition)',
                    borderRadius: '0'
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>

            {/* Team Members Grid */}
            <div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                marginBottom: '20px',
                color: 'var(--text-primary)'
              }}>
                Team Members
              </h3>
              
              {presenceOverview && presenceOverview.users && presenceOverview.users.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {presenceOverview.users.map((userData) => (
                    <div
                      key={userData.userId}
                      style={{
                        background: 'var(--secondary)',
                        border: '1px solid var(--border)',
                        padding: '0',
                        borderRadius: '0',
                        overflow: 'hidden'
                      }}
                    >
                      {/* User Name Header - White background */}
                      <div style={{ 
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--secondary)'
                      }}>
                        <h4 style={{ 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: 'var(--text-primary)',
                          margin: '0 0 4px 0',
                          wordBreak: 'break-word'
                        }}>
                          {userData.displayName}
                        </h4>
                        <p style={{ 
                          fontSize: '13px', 
                          color: 'var(--text-secondary)',
                          margin: '0'
                        }}>
                          @{userData.username}
                        </p>
                      </div>

                      {/* Requirements Section - Clean list style */}
                      <div style={{ 
                        padding: '20px',
                        background: 'var(--secondary)'
                      }}>
                        {/* All Saturdays Requirement */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <div style={{ 
                            fontWeight: '500', 
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                          }}>
                            All Saturdays
                          </div>
                          <div style={{ 
                            color: userData.stats && userData.stats.meetsAllSaturdays ? 'var(--text-primary)' : '#ef4444',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {userData.stats && userData.stats.meetsAllSaturdays ? 'Met' : 'Not Met'}
                          </div>
                        </div>

                        {/* 8+ Days & 2+ Saturdays Requirement */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <div style={{ 
                            fontWeight: '500', 
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                          }}>
                            8+ Days & 2+ Sats
                          </div>
                          <div style={{ 
                            color: userData.stats && userData.stats.meetsEightDaysAndTwoSaturdays ? 'var(--text-primary)' : '#ef4444',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {userData.stats && userData.stats.meetsEightDaysAndTwoSaturdays ? 'Met' : 'Not Met'}
                          </div>
                        </div>

                        {/* 10 Weekdays Requirement */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <div style={{ 
                            fontWeight: '500', 
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                          }}>
                            10 Weekdays
                          </div>
                          <div style={{ 
                            color: userData.stats && userData.stats.meetsTenWeekdays ? 'var(--text-primary)' : '#ef4444',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {userData.stats && userData.stats.meetsTenWeekdays ? 'Met' : 'Not Met'}
                          </div>
                        </div>

                        {/* Presence Days Section */}
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ 
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            marginBottom: '12px',
                            fontWeight: '600'
                          }}>
                            Present Days:
                          </div>
                          {renderUserPresenceDots(userData.presentDates || [])}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', 
                  padding: '60px 20px',
                  border: '1px solid var(--border)',
                  background: 'var(--secondary)',
                  borderRadius: '0'
                }}>
                  <i className="fas fa-users" style={{ 
                    fontSize: '48px', 
                    color: 'var(--text-muted)', 
                    marginBottom: '20px' 
                  }}></i>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    No In-House Users Found
                  </h3>
                  <p style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}>
                    There are no in-house team members to display.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Activities Tab Content */}
        {activeTab === 'activities' && (
          <div>
            {activitiesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading activities...
              </div>
            ) : (
              <div className="activities-section">
                <h2 className="section-title">
                  <i className="fas fa-calendar-alt"></i>
                  Available Activities
                </h2>

                {activities.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-calendar-times"></i>
                    <h3>No Activities Found</h3>
                    <p>No activities available at the moment.</p>
                  </div>
                ) : (
                  <div className="activities-grid">
                    {activities.map(activity => {
                      const isParticipating = participatingActivities.has(activity.id);
                      const isActivityUpcoming = isUpcoming(activity.date, activity.startTime || activity.time);
                      const participants = activityParticipants[activity.id] || [];
                      
                      return (
                        <div key={activity.id} className="activity-card">
                          <div className="activity-header">
                            <h3 className="activity-title">{activity.title}</h3>
                          </div>
                          
                          <div className="activity-datetime">
                            <i className="fas fa-calendar"></i>
                            {formatDateTime(activity.date, activity.startTime || activity.time, activity.endTime)}
                          </div>
                          
                          <div className="activity-meta">
                            <div className="activity-creator">
                              <i className="fas fa-star"></i>
                              Leader: {getCreatorDisplayName(activity)}
                            </div>
                          </div>
                          
                          <div className="activity-description">
                            {activity.description}
                          </div>
                          
                          <div className="activity-stats">
                            <div className="participants-count">
                              <i className="fas fa-users"></i>
                              <span>{activity.participantCount || 0} participants</span>
                            </div>
                            <div className="activity-status">
                              {isActivityUpcoming ? (
                                <span className="status-upcoming">
                                  <i className="fas fa-clock"></i>
                                  Upcoming
                                </span>
                              ) : (
                                <span className="status-past">
                                  <i className="fas fa-history"></i>
                                  Past Event
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Leader Badge - Show if user is the creator */}
                          {activity.createdBy === user.userId && (
                            <div className="activity-leader-badge">
                              <i className="fas fa-star"></i>
                              You are the leader of this activity
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Activities Tab Content */}
        {activeTab === 'manage-activities' && (
          <div>
            {manageLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading activities...
              </div>
            ) : (
              <div className="activities-section">
                <div className="section-header">
                  <h2 className="section-title">
                    <i className="fas fa-calendar-check"></i>
                    Your Activities ({myActivities.length})
                  </h2>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn create-activity-btn"
                  >
                    <i className="fas fa-plus"></i>
                    Create Activity
                  </button>
                </div>

                {myActivities.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-calendar-plus"></i>
                    <h3>No Activities Yet</h3>
                    <p>Create your first activity to get started!</p>
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="btn"
                    >
                      <i className="fas fa-plus"></i>
                      Create Activity
                    </button>
                  </div>
                ) : (
                  <div className="activities-grid">
                    {myActivities.map(activity => (
                      <div key={activity.id} className="activity-card">
                        <div className="activity-header">
                          <h3 className="activity-title">{activity.title}</h3>
                          <div className="activity-actions">
                            <button 
                              onClick={() => {/* handleEdit(activity) */}}
                              className="btn-edit"
                              title="Edit Activity"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => {/* handleDelete(activity.id) */}}
                              className="btn-delete"
                              title="Delete Activity"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        
                        <div className="activity-datetime">
                          <i className="fas fa-calendar"></i>
                          {formatDateTime(activity.date, activity.startTime || activity.time, activity.endTime)}
                        </div>
                        
                        <div className="activity-meta">
                          <div className="activity-creator">
                            <i className="fas fa-star"></i>
                            Leader: {getCreatorDisplayName(activity)}
                          </div>
                          <div className="activity-created-at">
                            Created on {new Date(activity.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                        
                        <div className="activity-description">
                          {activity.description}
                        </div>
                        
                        <div className="activity-stats">
                          <div className="participants-count">
                            <i className="fas fa-users"></i>
                            <span>{activity.participantCount || 0} participants</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Activity Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <i className="fas fa-calendar-plus" style={{ marginRight: '8px' }}></i>
                  Create New Activity
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="modal-close"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                {createMessage && (
                  <div className={createMessage.includes('success') ? 'success' : 'error'}>
                    {createMessage}
                  </div>
                )}

                <form onSubmit={handleCreateActivity} className="activity-form">
                  <div className="form-group">
                    <label htmlFor="modal-title">Activity Title *</label>
                    <input
                      type="text"
                      id="modal-title"
                      name="title"
                      value={createFormData.title}
                      onChange={(e) => setCreateFormData({...createFormData, title: e.target.value})}
                      required
                      placeholder="Enter activity title"
                      maxLength="100"
                      disabled={createLoading}
                    />
                  </div>

                  <div className="form-row three-columns">
                    <div className="form-group">
                      <label htmlFor="modal-date">Date *</label>
                      <input
                        type="date"
                        id="modal-date"
                        name="date"
                        value={createFormData.date}
                        onChange={(e) => setCreateFormData({...createFormData, date: e.target.value})}
                        required
                        disabled={createLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="modal-start-time">Start Time *</label>
                      <input
                        type="time"
                        id="modal-start-time"
                        name="startTime"
                        value={createFormData.startTime}
                        onChange={(e) => setCreateFormData({...createFormData, startTime: e.target.value})}
                        required
                        disabled={createLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-end-time">End Time *</label>
                      <input
                        type="time"
                        id="modal-end-time"
                        name="endTime"
                        value={createFormData.endTime}
                        onChange={(e) => setCreateFormData({...createFormData, endTime: e.target.value})}
                        required
                        disabled={createLoading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-description">Description *</label>
                    <textarea
                      id="modal-description"
                      name="description"
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                      required
                      placeholder="Describe the activity..."
                      rows="4"
                      maxLength="1000"
                      disabled={createLoading}
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="btn-cancel"
                      disabled={createLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createLoading}
                    >
                      {createLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus"></i>
                          Create Activity
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InHousePresence;