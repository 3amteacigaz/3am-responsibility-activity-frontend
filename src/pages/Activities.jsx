import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI, presenceAPI, notificationAPI } from '../services/api';
import pushNotificationService from '../services/pushNotifications';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const Activities = ({ isTabMode = false }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participatingActivities, setParticipatingActivities] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, group, individual
  const [activityParticipants, setActivityParticipants] = useState({}); // Store participants for each activity
  const [inHouseUsers, setInHouseUsers] = useState([]); // For displaying assigned user names
  
  // Popup states
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showNotParticipatingWarning, setShowNotParticipatingWarning] = useState(false);
  const [pendingActivityId, setPendingActivityId] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to get proper display name
  const getDisplayName = (userObj) => {
    if (!userObj) return 'User';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'User';
  };

  // Helper function to get creator display name
  const getCreatorDisplayName = (activity) => {
    // If the activity creator is the current user, use current user's name
    if (activity.createdBy === user?.userId) {
      return getDisplayName(user);
    }
    // Otherwise use the stored createdByName, but prefer name over username format
    return activity.createdByName || 'Unknown';
  };

  useEffect(() => {
    if (!isTabMode) {
      document.title = 'Activities - 3AM Core';
    }
    
    // Only load data once when component mounts
    if (activities.length === 0) {
      loadActivities();
      loadUserParticipation();
      loadInHouseUsers(); // Load users for displaying names
    }
  }, [user]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getAllActivities();
      const allActivities = response.data.activities || [];
      setActivities(allActivities);
      
      // Load participants for each activity with delay to avoid rate limiting
      const participantsData = {};
      for (let i = 0; i < allActivities.length; i++) {
        const activity = allActivities[i];
        try {
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          }
          
          const participantsResponse = await activityAPI.getActivityParticipants(activity.id);
          participantsData[activity.id] = participantsResponse.data.participants || [];
        } catch (error) {
          console.error(`Error loading participants for activity ${activity.id}:`, error);
          participantsData[activity.id] = [];
        }
      }
      setActivityParticipants(participantsData);
      
      console.log('✅ Activities loaded successfully:', allActivities);
    } catch (error) {
      console.error('❌ Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInHouseUsers = async () => {
    try {
      const { inHousePresenceAPI } = await import('../services/api');
      const response = await inHousePresenceAPI.getInHouseUsers();
      setInHouseUsers(response.data.users || []);
    } catch (error) {
      console.error('❌ Error loading in-house users:', error);
    }
  };

  const loadUserParticipation = async () => {
    try {
      const response = await activityAPI.getMyParticipation();
      const participatingIds = response.data.participatingActivityIds || [];
      setParticipatingActivities(new Set(participatingIds));
    } catch (error) {
      console.error('Error loading user participation:', error);
    }
  };

  const handleParticipate = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, true);
      
      // Update local state
      setParticipatingActivities(prev => new Set([...prev, activityId]));
      
      // Update participant count in activities list
      setActivities(activities.map(activity => 
        activity.id === activityId 
          ? { ...activity, participantCount: (activity.participantCount || 0) + 1 }
          : activity
      ));

      // Add current user to participants list
      const currentUserParticipant = {
        userId: user.userId,
        name: user.name || user.username,
        userType: user.userType,
        joinedAt: new Date().toISOString()
      };
      
      setActivityParticipants(prev => ({
        ...prev,
        [activityId]: [...(prev[activityId] || []), currentUserParticipant]
      }));
      
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(error.response?.data?.error || 'Error joining activity. Please try again.');
    }
  };

  const handleNotParticipate = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, false);
      
      // Update local state
      setParticipatingActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
      
      // Update participant count only if user was previously participating
      if (participatingActivities.has(activityId)) {
        setActivities(activities.map(activity => 
          activityId === activityId 
            ? { ...activity, participantCount: Math.max(0, (activity.participantCount || 0) - 1) }
            : activity
        ));

        // Remove current user from participants list
        setActivityParticipants(prev => ({
          ...prev,
          [activityId]: (prev[activityId] || []).filter(p => p.userId !== user.userId)
        }));
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(error.response?.data?.error || 'Error leaving activity. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    if (user?.userType === 'core') {
      navigate('/core-login');
    } else {
      navigate('/in-house-login');
    }
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

  const filteredActivities = activities.filter(activity => {
    // Normalize activity type: undefined or null = 'group', otherwise use the actual type
    const normalizedActivityType = activity.activityType || 'group';
    
    // Apply filter tabs - all filtering happens in code, no API calls
    if (filter === 'group') {
      // Show activities without activityType (old activities) + activities with activityType='group'
      return normalizedActivityType === 'group';
    }
    
    if (filter === 'individual') {
      // Only show activities with activityType='individual'
      const isIndividual = normalizedActivityType === 'individual';
      
      // For in-house users, also check if they're assigned
      if (isIndividual && user?.userType === 'in-house') {
        return activity.assignedUsers && activity.assignedUsers.includes(user.userId);
      }
      
      // For core users, show all individual activities
      return isIndividual;
    }
    
    // filter === 'all': Show ALL activities (group + individual) regardless of assignment
    return true;
  });

  if (loading) {
    return (
      <div className={isTabMode ? "" : "container"}>
        {/* Mobile Navigation - Only show in standalone mode */}
        {!isTabMode && <MobileNav user={user} onLogout={handleLogout} />}
        
        {/* Desktop Header - Only show in standalone mode */}
        {!isTabMode && (
          user?.userType === 'core' ? (
            <CoreHeader user={user} onLogout={handleLogout} activeTab="activities" />
          ) : (
            <div className="dashboard-header desktop-only">
              <div className="user-info">{getDisplayName(user)}</div>
              <div className="nav-links">
                <Link to="/in-house/activities" className="nav-link active">Activities</Link>
                <Link to="/in-house/presence" className="nav-link">Presence</Link>
                <a href="#" onClick={handleLogout} className="nav-link">Exit</a>
              </div>
            </div>
          )
        )}

        <main className={isTabMode ? "" : ""}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p>Loading activities...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={isTabMode ? "" : "container"}>
      {/* Mobile Navigation - Only show in standalone mode */}
      {!isTabMode && <MobileNav user={user} onLogout={handleLogout} />}
      
      {/* Desktop Header - Only show in standalone mode */}
      {!isTabMode && (
        user?.userType === 'core' ? (
          <CoreHeader user={user} onLogout={handleLogout} activeTab="activities" />
        ) : (
          <div className="dashboard-header desktop-only">
            <div className="user-info">{getDisplayName(user)}</div>
            <div className="nav-links">
              <Link to="/in-house/activities" className="nav-link active">Activities</Link>
              <Link to="/in-house/presence" className="nav-link">Presence</Link>
              <a href="#" onClick={handleLogout} className="nav-link">Exit</a>
            </div>
          </div>
        )
      )}

      <main className={isTabMode ? "" : ""}>
        <div className="activities-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-calendar-alt"></i>
              Available Activities
            </h2>
            
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({activities.length})
              </button>
              <button 
                className={`filter-tab ${filter === 'group' ? 'active' : ''}`}
                onClick={() => setFilter('group')}
              >
                Group ({activities.filter(a => (a.activityType || 'group') === 'group').length})
              </button>
              <button 
                className={`filter-tab ${filter === 'individual' ? 'active' : ''}`}
                onClick={() => setFilter('individual')}
              >
                Individual ({(() => {
                  const individualActivities = activities.filter(a => a.activityType === 'individual');
                  if (user?.userType === 'in-house') {
                    // For in-house users, only count assigned individual activities
                    return individualActivities.filter(a => a.assignedUsers && a.assignedUsers.includes(user.userId)).length;
                  }
                  // For core users, count all individual activities
                  return individualActivities.length;
                })()})
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-calendar-times"></i>
              <h3>No Activities Found</h3>
              <p>No activities available at the moment.</p>
            </div>
          ) : (
            <div className="activities-grid">
              {filteredActivities.map(activity => {
                const isParticipating = participatingActivities.has(activity.id);
                const isActivityUpcoming = isUpcoming(activity.date, activity.startTime || activity.time);
                const participants = activityParticipants[activity.id] || [];
                
                // Get assigned user names for individual activities
                const assignedUserNames = activity.activityType === 'individual'
                  ? (activity.assignedUserNames && activity.assignedUserNames.length > 0
                      ? activity.assignedUserNames.join(', ')
                      : (activity.assignedUsers
                          ? activity.assignedUsers.map(userId => {
                              const foundUser = inHouseUsers.find(u => u.userId === userId);
                              return foundUser ? (foundUser.name || foundUser.username) : 'Unknown';
                            }).join(', ')
                          : null))
                  : null;
                
                // Fallback: if activityType is missing, assume it's a group activity
                const activityType = activity.activityType || 'group';
                
                return (
                  <div key={activity.id} className={`activity-card ${isParticipating ? 'participating' : ''}`}>
                    {/* Black Banner with Title */}
                    <div style={{
                      background: 'var(--primary)',
                      color: 'var(--secondary)',
                      padding: '16px 20px',
                      marginBottom: '16px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: 0,
                        color: 'var(--secondary)'
                      }}>{activity.title}</h3>
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
                      
                      <div className="activity-status">
                        {isActivityUpcoming ? (
                          <span className="status-upcoming">
                            <i className="fas fa-clock"></i>
                            Yet to complete
                          </span>
                        ) : (
                          <span className="status-past">
                            <i className="fas fa-check"></i>
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Participation Buttons - Only show for users who can actually participate */}
                    {activity.createdBy !== user.userId && (() => {
                      const normalizedActivityType = activity.activityType || 'group';
                      
                      // Core users cannot participate in activities - they only create/manage them
                      if (user?.userType === 'core') {
                        return null;
                      }
                      
                      // For individual activities, only show buttons if user is assigned
                      if (normalizedActivityType === 'individual') {
                        if (!activity.assignedUsers || !activity.assignedUsers.includes(user.userId)) {
                          return null; // Don't show buttons if not assigned
                        }
                      }
                      
                      // For group activities, show buttons for in-house users only
                      if (normalizedActivityType === 'group' && user?.userType !== 'in-house') {
                        return null;
                      }
                      
                      return (
                        <div className="activity-participation-buttons" style={{ marginTop: '16px' }}>
                          <button 
                            onClick={() => handleParticipate(activity.id)}
                            className={`btn-participating ${isParticipating ? 'active' : ''}`}
                            disabled={!isActivityUpcoming}
                          >
                            <i className="fas fa-check-circle"></i>
                            Accept
                          </button>
                          <button 
                            onClick={() => handleNotParticipate(activity.id)}
                            className={`btn-not-participating ${!isParticipating ? 'active' : ''}`}
                            disabled={!isActivityUpcoming}
                          >
                            <i className="fas fa-times-circle"></i>
                            Decline
                          </button>
                        </div>
                      );
                    })()}

                    {/* Leader Badge - Show if user is the creator */}
                    {activity.createdBy === user.userId && (
                      <div className="activity-leader-badge" style={{ margin: '12px 20px 0' }}>
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
      </main>
    </div>
  );
};

export default Activities;