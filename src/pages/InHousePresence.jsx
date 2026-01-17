import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inHousePresenceAPI, activityAPI, notificationAPI } from '../services/api';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';
import Activities from './Activities';

const InHousePresence = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [presenceOverview, setPresenceOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('presence');
  
  // Activities tab states - removed since using Activities component
  
  // Manage Activities tab states
  const [myActivities, setMyActivities] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageFilter, setManageFilter] = useState('all'); // 'all' or 'yours'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    activityType: 'group', // 'group', 'individual'
    assignedUsers: [] // For individual activities
  });
  const [createMessage, setCreateMessage] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [inHouseUsers, setInHouseUsers] = useState([]); // List of in-house users for dropdown
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    } else if (activeTab === 'manage-activities') {
      loadMyActivities();
      loadInHouseUsersForDropdown(); // Load users for the dropdown
    }
    // Activities tab now handled by Activities component
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

  // Manage Activities tab functions
  const loadMyActivities = async () => {
    try {
      setManageLoading(true);
      // Get all activities in a single request
      const response = await activityAPI.getAllActivities();
      const allActivities = response.data.activities || [];
      setMyActivities(allActivities);
      console.log('✅ Loaded all activities for management:', allActivities);
      console.log('📊 Total activities:', allActivities.length);
      console.log('📊 Your activities:', allActivities.filter(a => a.createdBy === user?.userId).length);
    } catch (error) {
      console.error('❌ Error loading activities:', error);
    } finally {
      setManageLoading(false);
    }
  };

  const loadInHouseUsersForDropdown = async () => {
    try {
      const response = await inHousePresenceAPI.getInHouseUsers();
      setInHouseUsers(response.data.users || []);
      console.log('✅ Loaded in-house users for dropdown:', response.data.users);
    } catch (error) {
      console.error('❌ Error loading in-house users for dropdown:', error);
    }
  };

  const handleDeleteClick = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;
    
    try {
      setDeleteLoading(true);
      await activityAPI.deleteActivity(activityToDelete.id);
      console.log('Activity deleted:', activityToDelete.id);
      
      // Reload activities
      await loadMyActivities();
      
      // Close modal
      setShowDeleteConfirm(false);
      setActivityToDelete(null);
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert(error.response?.data?.error || 'Error deleting activity. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setActivityToDelete(null);
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    setCreateMessage('');
    setCreateLoading(true);

    // Validate time logic only if both times are provided
    if (createFormData.date && createFormData.startTime && createFormData.endTime) {
      const start = new Date(`${createFormData.date}T${createFormData.startTime}`);
      const end = new Date(`${createFormData.date}T${createFormData.endTime}`);
      
      if (end <= start) {
        setCreateMessage('End time must be after start time');
        setCreateLoading(false);
        return;
      }
    }

    // Validate individual activity has assigned users
    if (createFormData.activityType === 'individual' && (!createFormData.assignedUsers || createFormData.assignedUsers.length === 0)) {
      setCreateMessage('Please select at least one user for individual activity');
      setCreateLoading(false);
      return;
    }

    console.log('Creating activity with data:', createFormData);

    try {
      const response = await activityAPI.createActivity(createFormData);
      console.log('Activity created:', response.data);
      
      setCreateMessage('Activity created successfully!');
      
      try {
        await notificationAPI.sendActivityCreatedNotification({
          activityId: response.data.activityId,
          activityTitle: createFormData.title,
          activityDate: createFormData.date || 'TBD',
          activityTime: createFormData.startTime && createFormData.endTime 
            ? `${createFormData.startTime} - ${createFormData.endTime}`
            : createFormData.startTime || 'TBD'
        });
        console.log('📢 Activity creation notification sent to all users');
      } catch (notificationError) {
        console.error('Error sending activity creation notification:', notificationError);
      }
      
      await loadMyActivities();

      // Reset form
      setCreateFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        activityType: 'group',
        assignedUsers: []
      });

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
    if (!date || !startTime) {
      return 'Date and time to be determined';
    }
    
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
    if (!date || !startTime) {
      return true; // If no date/time, consider it upcoming
    }
    const activityDate = new Date(date + 'T' + startTime);
    return activityDate > new Date();
  };

  const handleParticipate = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, true);
      console.log('Joined activity:', activityId);
      
      // Send participation notification
      try {
        const activity = myActivities.find(a => a.id === activityId);
        if (activity) {
          await notificationAPI.sendParticipationNotification({
            activityId,
            activityTitle: activity.title,
            participating: true
          });
          console.log('📢 Participation notification sent to all users');
        }
      } catch (notificationError) {
        console.error('Error sending participation notification:', notificationError);
        // Don't fail the participation if notification fails
      }
      
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(error.response?.data?.error || 'Error joining activity. Please try again.');
    }
  };

  const handleNotParticipate = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, false);
      console.log('Left activity:', activityId);
      
      // Send non-participation notification (only to core team)
      try {
        const activity = myActivities.find(a => a.id === activityId);
        if (activity) {
          await notificationAPI.sendParticipationNotification({
            activityId,
            activityTitle: activity.title,
            participating: false
          });
          console.log('📢 Non-participation notification sent to core team');
        }
      } catch (notificationError) {
        console.error('Error sending non-participation notification:', notificationError);
        // Don't fail the non-participation if notification fails
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(error.response?.data?.error || 'Error leaving activity. Please try again.');
    }
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
              
              {loading ? (
                <div style={{
                  textAlign: 'center', 
                  padding: '60px 20px',
                  border: '1px solid var(--border)',
                  background: 'var(--secondary)',
                  borderRadius: '0'
                }}>
                  <i className="fas fa-spinner fa-spin" style={{ 
                    fontSize: '48px', 
                    color: 'var(--primary)', 
                    marginBottom: '20px' 
                  }}></i>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Loading Team Data
                  </h3>
                  <p style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}>
                    Please wait while we fetch the presence data...
                  </p>
                </div>
              ) : presenceOverview && presenceOverview.users && presenceOverview.users.length > 0 ? (
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
            <Activities isTabMode={true} />
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
                    Manage Activities
                  </h2>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn create-activity-btn"
                  >
                    <i className="fas fa-plus"></i>
                    Create Activity
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs" style={{ marginBottom: '20px' }}>
                  <button 
                    className={`filter-tab ${manageFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setManageFilter('all')}
                  >
                    All Activities ({myActivities.length})
                  </button>
                  <button 
                    className={`filter-tab ${manageFilter === 'yours' ? 'active' : ''}`}
                    onClick={() => setManageFilter('yours')}
                  >
                    Your Activities ({myActivities.filter(a => a.createdBy === user?.userId).length})
                  </button>
                </div>

                {(() => {
                  // Filter activities based on selected tab
                  const filteredActivities = manageFilter === 'all' 
                    ? myActivities // Show ALL activities
                    : myActivities.filter(a => a.createdBy === user?.userId); // Show only activities created by current user

                  if (manageLoading) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '16px' }}></i>
                        <p>Loading activities...</p>
                      </div>
                    );
                  }

                  return filteredActivities.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-calendar-plus"></i>
                      <h3>{manageFilter === 'all' ? 'No Activities Available' : 'No Activities Created Yet'}</h3>
                      <p>{manageFilter === 'all' ? 'No activities have been created yet.' : 'Create your first activity to get started!'}</p>
                      {manageFilter === 'yours' && (
                        <button 
                          onClick={() => setShowCreateModal(true)}
                          className="btn"
                        >
                          <i className="fas fa-plus"></i>
                          Create Activity
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="activities-grid">
                      {filteredActivities.map(activity => {
                        // Get assigned user names for individual activities
                        const assignedUserNames = activity.activityType === 'individual'
                          ? (activity.assignedUserNames && activity.assignedUserNames.length > 0
                              ? activity.assignedUserNames.join(', ')
                              : (activity.assignedUsers
                                  ? activity.assignedUsers.map(userId => {
                                      const user = inHouseUsers.find(u => u.userId === userId);
                                      return user ? (user.name || user.username) : 'Unknown';
                                    }).join(', ')
                                  : null))
                          : null;
                        
                        // Fallback: if activityType is missing, assume it's a group activity
                        const activityType = activity.activityType || 'group';
                        const isYourActivity = activity.createdBy === user?.userId;

                        return (
                          <div key={activity.id} className="activity-card">
                            {/* Black Banner with Title and Actions */}
                            <div style={{
                              background: 'var(--primary)',
                              color: 'var(--secondary)',
                              padding: '16px 20px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '16px'
                            }}>
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: 0,
                                color: 'var(--secondary)',
                                flex: 1
                              }}>{activity.title}</h3>
                              {/* Show edit/delete buttons for core users (all activities) or activity creators */}
                              {(user?.userType === 'core' || isYourActivity) && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => {
                                      // TODO: Implement edit functionality
                                      alert('Edit functionality coming soon!');
                                    }}
                                    className="btn-edit"
                                    title="Edit Activity"
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid var(--secondary)',
                                      color: 'var(--secondary)',
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      transition: 'var(--transition)'
                                    }}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClick(activity)}
                                    className="btn-delete"
                                    title="Delete Activity"
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid var(--secondary)',
                                      color: 'var(--secondary)',
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      transition: 'var(--transition)'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Date, Time and Badge - NO BLACK BACKGROUND */}
                            <div style={{ 
                              padding: '0 20px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                                <i className="fas fa-calendar"></i>
                                <span>{formatDateTime(activity.date, activity.startTime || activity.time, activity.endTime)}</span>
                              </div>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '0',
                                background: activityType === 'group' ? '#3b82f6' : '#8b5cf6',
                                color: 'white'
                              }}>
                                {activityType === 'group' 
                                  ? 'GROUP' 
                                  : (assignedUserNames || 'INDIVIDUAL')
                                }
                              </span>
                            </div>
                            
                            <div className="activity-meta" style={{ padding: '0 20px' }}>
                              <div className="activity-creator">
                                <i className="fas fa-star"></i>
                                Leader: {getCreatorDisplayName(activity)}
                              </div>
                              <div className="activity-created-at">
                                <i className="fas fa-clock" style={{ marginRight: '6px' }}></i>
                                Created on {new Date(activity.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            
                            <div className="activity-description" style={{ padding: '0 20px' }}>
                              {activity.description}
                            </div>
                            
                            <div className="activity-stats" style={{ padding: '0 20px' }}>
                              <div className="participants-count">
                                <i className="fas fa-users"></i>
                                <span>{activity.participantCount || 0} participants</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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

                  {/* Activity Type Selection */}
                  <div className="form-group">
                    <label htmlFor="modal-activity-type">Activity Type *</label>
                    <select
                      id="modal-activity-type"
                      name="activityType"
                      value={createFormData.activityType}
                      onChange={(e) => setCreateFormData({...createFormData, activityType: e.target.value, assignedUsers: []})}
                      required
                      disabled={createLoading}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="group">Group Activity (All in-house members)</option>
                      <option value="individual">Individual Activity (Select specific members)</option>
                    </select>
                    <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {createFormData.activityType === 'group' && 'This activity is for all in-house members'}
                      {createFormData.activityType === 'individual' && 'Select specific members below'}
                    </small>
                  </div>

                  {/* User Selection for Individual Activities */}
                  {createFormData.activityType === 'individual' && (
                    <div className="form-group">
                      <label htmlFor="modal-assigned-users">Assign To *</label>
                      <div style={{
                        border: '1px solid var(--border)',
                        background: 'var(--secondary)',
                        padding: '12px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {inHouseUsers.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                            Loading users...
                          </p>
                        ) : (
                          inHouseUsers.map(user => (
                            <label
                              key={user.userId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={createFormData.assignedUsers.includes(user.userId)}
                                onChange={(e) => {
                                  const newAssignedUsers = e.target.checked
                                    ? [...createFormData.assignedUsers, user.userId]
                                    : createFormData.assignedUsers.filter(id => id !== user.userId);
                                  setCreateFormData({...createFormData, assignedUsers: newAssignedUsers});
                                }}
                                disabled={createLoading}
                                style={{ marginRight: '10px' }}
                              />
                              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                {user.name || user.username}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                ({user.email})
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Selected: {createFormData.assignedUsers.length} member(s)
                      </small>
                    </div>
                  )}

                  <div className="form-row three-columns">
                    <div className="form-group">
                      <label htmlFor="modal-date">Date (Optional)</label>
                      <input
                        type="date"
                        id="modal-date"
                        name="date"
                        value={createFormData.date}
                        onChange={(e) => setCreateFormData({...createFormData, date: e.target.value})}
                        disabled={createLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="modal-start-time">Start Time (Optional)</label>
                      <input
                        type="time"
                        id="modal-start-time"
                        name="startTime"
                        value={createFormData.startTime}
                        onChange={(e) => setCreateFormData({...createFormData, startTime: e.target.value})}
                        disabled={createLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-end-time">End Time (Optional)</label>
                      <input
                        type="time"
                        id="modal-end-time"
                        name="endTime"
                        value={createFormData.endTime}
                        onChange={(e) => setCreateFormData({...createFormData, endTime: e.target.value})}
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
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && activityToDelete && (
          <div className="modal-overlay" onClick={handleDeleteCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#ef4444' }}></i>
                  Confirm Delete
                </h2>
                <button
                  onClick={handleDeleteCancel}
                  className="modal-close"
                  title="Close"
                  disabled={deleteLoading}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Are you sure you want to delete this activity?
                </p>
                <div style={{
                  padding: '12px',
                  background: 'var(--secondary)',
                  border: '1px solid var(--border)',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    {activityToDelete.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    {formatDateTime(activityToDelete.date, activityToDelete.startTime, activityToDelete.endTime)}
                  </p>
                </div>
                <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '20px' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                  This action cannot be undone.
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    className="btn-cancel"
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="btn-delete"
                    disabled={deleteLoading}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      cursor: deleteLoading ? 'not-allowed' : 'pointer',
                      opacity: deleteLoading ? 0.6 : 1
                    }}
                  >
                    {deleteLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-trash" style={{ marginRight: '8px' }}></i>
                        Delete Activity
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InHousePresence;