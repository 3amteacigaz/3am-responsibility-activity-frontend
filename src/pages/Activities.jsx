import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI, presenceAPI, notificationAPI } from '../services/api';
import pushNotificationService from '../services/pushNotifications';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participatingActivities, setParticipatingActivities] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, upcoming, participating
  const [activityParticipants, setActivityParticipants] = useState({}); // Store participants for each activity
  
  // Popup states
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showNotParticipatingWarning, setShowNotParticipatingWarning] = useState(false);
  const [pendingActivityId, setPendingActivityId] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Automatically request notification permission
  const requestNotificationPermission = async () => {
    try {
      // Only request if supported and not already decided
      if (pushNotificationService.isNotificationSupported()) {
        const currentPermission = pushNotificationService.getPermissionStatus();
        
        if (currentPermission === 'default') {
          console.log('🔔 Automatically requesting notification permission...');
          
          // Initialize service worker first
          await pushNotificationService.initialize();
          
          // Request permission
          const permission = await pushNotificationService.requestPermission();
          console.log('🔔 Permission result:', permission);
          
          if (permission === 'granted') {
            // Subscribe to push notifications
            const subscription = await pushNotificationService.subscribe();
            if (subscription) {
              console.log('✅ Push notifications enabled automatically');
            }
          }
        } else if (currentPermission === 'granted') {
          // Already granted, just ensure subscription exists
          await pushNotificationService.initialize();
          const status = await pushNotificationService.getSubscriptionStatus();
          if (!status.subscribed) {
            await pushNotificationService.subscribe();
          }
        }
      }
    } catch (error) {
      console.log('🔔 Notification permission request failed (this is normal if user declines):', error.message);
    }
  };

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
    document.title = 'Activities - 3AM Core';
    loadActivities();
    loadUserParticipation();
    
    // Automatically request notification permission when user visits
    requestNotificationPermission();
    
    // Check if in-house user is visiting for the first time
    if (user?.userType === 'in-house') {
      const hasVisitedActivities = localStorage.getItem(`activities_visited_${user.userId}`);
      if (!hasVisitedActivities) {
        setShowWelcomePopup(true);
        localStorage.setItem(`activities_visited_${user.userId}`, 'true');
      }
    }
  }, [user]);

  // Handle Escape key for popups
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showWelcomePopup) {
          setShowWelcomePopup(false);
        }
        if (showNotParticipatingWarning) {
          handleWarningCancel();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showWelcomePopup, showNotParticipatingWarning]);

  const loadActivities = async () => {
    try {
      setLoading(true);
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
      
      console.log('Loaded activities:', allActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserParticipation = async () => {
    try {
      const response = await activityAPI.getMyParticipation();
      const participatingIds = response.data.participatingActivityIds || [];
      setParticipatingActivities(new Set(participatingIds));
      console.log('User participating in:', participatingIds);
    } catch (error) {
      console.error('Error loading user participation:', error);
    }
  };

  const handleParticipate = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, true);
      console.log('Joined activity:', activityId);
      
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

      // Automatically mark presence for the activity date (for in-house users)
      if (user?.userType === 'in-house') {
        try {
          const activity = activities.find(a => a.id === activityId);
          if (activity && activity.date) {
            console.log(`Attempting to mark presence for activity date: ${activity.date}`);
            // Use the activity date directly (should be in YYYY-MM-DD format)
            const presenceResponse = await presenceAPI.markActivityPresence(activity.date);
            console.log(`Presence automatically marked for activity date: ${activity.date}`, presenceResponse.data);
            
            // Show success message to user
            alert(`Great! Your presence has been automatically marked for ${activity.date}. Check the Presence page to see your updated status.`);
          }
        } catch (presenceError) {
          // Don't fail the participation if presence marking fails
          console.error('Error marking presence for activity:', presenceError.response?.data || presenceError.message);
          
          // Only show error if it's not a "already marked" error
          if (presenceError.response?.data?.error && !presenceError.response.data.error.includes('already marked')) {
            console.warn('Could not automatically mark presence:', presenceError.response.data.error);
          }
        }
      }

      // Send participation notification
      try {
        const activity = activities.find(a => a.id === activityId);
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
    // Show warning popup for in-house users
    if (user?.userType === 'in-house') {
      setPendingActivityId(activityId);
      setShowNotParticipatingWarning(true);
      return;
    }
    
    // For core users, proceed directly
    await processNotParticipating(activityId);
  };

  const processNotParticipating = async (activityId) => {
    try {
      await activityAPI.participateInActivity(activityId, false);
      console.log('Left activity:', activityId);
      
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

      // Send non-participation notification (only to core team)
      try {
        const activity = activities.find(a => a.id === activityId);
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

  const handleWarningConfirm = async () => {
    setShowNotParticipatingWarning(false);
    if (pendingActivityId) {
      await processNotParticipating(pendingActivityId);
      setPendingActivityId(null);
    }
  };

  const handleWarningCancel = () => {
    setShowNotParticipatingWarning(false);
    setPendingActivityId(null);
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

  const filteredActivities = activities.filter(activity => {
    if (filter === 'upcoming') {
      return isUpcoming(activity.date, activity.startTime || activity.time);
    }
    if (filter === 'participating') {
      return participatingActivities.has(activity.id);
    }
    return true; // 'all'
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={handleLogout} />
      
      {/* Desktop Header */}
      {user?.userType === 'core' ? (
        <CoreHeader user={user} onLogout={handleLogout} activeTab="activities" />
      ) : (
        <div className="dashboard-header desktop-only">
          <div className="user-info">{getDisplayName(user)}</div>
          <div className="nav-links">
            <Link to="/activities" className="nav-link active">Activities</Link>
            <Link to="/presence" className="nav-link">Presence</Link>
            <a href="#" onClick={handleLogout} className="nav-link">Exit</a>
          </div>
        </div>
      )}

      <main>
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
                className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming ({activities.filter(a => isUpcoming(a.date, a.startTime || a.time)).length})
              </button>
              <button 
                className={`filter-tab ${filter === 'participating' ? 'active' : ''}`}
                onClick={() => setFilter('participating')}
              >
                My Activities ({participatingActivities.size})
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-calendar-times"></i>
              <h3>No Activities Found</h3>
              <p>
                {filter === 'participating' 
                  ? "You haven't joined any activities yet."
                  : filter === 'upcoming'
                  ? "No upcoming activities scheduled."
                  : "No activities available at the moment."
                }
              </p>
            </div>
          ) : (
            <div className="activities-grid">
              {filteredActivities.map(activity => {
                const isParticipating = participatingActivities.has(activity.id);
                const isActivityUpcoming = isUpcoming(activity.date, activity.startTime || activity.time);
                const participants = activityParticipants[activity.id] || [];
                
                return (
                  <div key={activity.id} className={`activity-card ${isParticipating ? 'participating' : ''}`}>
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

                    {/* Participants and Non-Participants Lists - Dropdown Style */}
                    {(participants.length > 0 || user?.userType === 'core') && (
                      <div className="activity-participants">
                        {/* Participants Dropdown */}
                        {participants.length > 0 && (
                          <div className="participants-dropdown">
                            <button 
                              className="participants-dropdown-header participating"
                              onClick={(e) => {
                                const content = e.currentTarget.nextElementSibling;
                                const isOpen = content.style.display === 'block';
                                content.style.display = isOpen ? 'none' : 'block';
                                e.currentTarget.querySelector('.dropdown-arrow').style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                              }}
                            >
                              <div className="participants-header-content">
                                <i className="fas fa-check-circle"></i>
                                <span>Participating ({participants.length})</span>
                              </div>
                              <i className="fas fa-chevron-down dropdown-arrow"></i>
                            </button>
                            <div className="participants-dropdown-content" style={{ display: 'none' }}>
                              <div className="participants-list">
                                {participants.map((participant, index) => (
                                  <span key={participant.userId} className="participant-name participating">
                                    {participant.name}
                                    {index < participants.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Non-Participants Dropdown (Core team only) */}
                        {user?.userType === 'core' && (
                          <div className="participants-dropdown">
                            <button 
                              className="participants-dropdown-header not-participating"
                              onClick={(e) => {
                                const content = e.currentTarget.nextElementSibling;
                                const isOpen = content.style.display === 'block';
                                content.style.display = isOpen ? 'none' : 'block';
                                e.currentTarget.querySelector('.dropdown-arrow').style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                              }}
                            >
                              <div className="participants-header-content">
                                <i className="fas fa-times-circle"></i>
                                <span>Not Participating</span>
                              </div>
                              <i className="fas fa-chevron-down dropdown-arrow"></i>
                            </button>
                            <div className="participants-dropdown-content" style={{ display: 'none' }}>
                              <div className="participants-list">
                                {(() => {
                                  // Get all in-house users who haven't participated
                                  const allInHouseUsers = [
                                    // This would ideally come from an API call to get all users
                                    // For now, we'll show a placeholder
                                  ];
                                  
                                  const participantIds = participants.map(p => p.userId);
                                  const nonParticipants = allInHouseUsers.filter(user => 
                                    !participantIds.includes(user.userId) && user.userType === 'in-house'
                                  );
                                  
                                  if (nonParticipants.length === 0) {
                                    return (
                                      <span className="participant-name not-participating">
                                        All in-house members have responded
                                      </span>
                                    );
                                  }
                                  
                                  return nonParticipants.map((nonParticipant, index) => (
                                    <span key={nonParticipant.userId} className="participant-name not-participating">
                                      {nonParticipant.name}
                                      {index < nonParticipants.length - 1 && ', '}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Participation Buttons - Only show if user is not the creator */}
                    {activity.createdBy !== user.userId && (
                      <div className="activity-participation-buttons">
                        <button 
                          onClick={() => handleParticipate(activity.id)}
                          className={`btn-participating ${isParticipating ? 'active' : ''}`}
                          disabled={!isActivityUpcoming}
                        >
                          <i className="fas fa-check-circle"></i>
                          I'm participating
                        </button>
                        <button 
                          onClick={() => handleNotParticipate(activity.id)}
                          className={`btn-not-participating ${!isParticipating ? 'active' : ''}`}
                          disabled={!isActivityUpcoming}
                        >
                          <i className="fas fa-times-circle"></i>
                          Not participating
                        </button>
                      </div>
                    )}

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
      </main>

      {/* Welcome Popup for First-Time In-House Users */}
      {showWelcomePopup && (
        <div className="modal-overlay" onClick={() => setShowWelcomePopup(false)}>
          <div className="modal-content welcome-popup" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-star"></i>
                Welcome to 3AM Core Activities!
              </h2>
              <button 
                onClick={() => setShowWelcomePopup(false)}
                className="modal-close"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="welcome-content">
                <p>Hello <strong>{getDisplayName(user)}</strong>!</p>
                <p>Welcome to the Activities page. Here you can:</p>
                <ul className="welcome-features">
                  <li><i className="fas fa-eye"></i> View all upcoming activities</li>
                  <li><i className="fas fa-check-circle"></i> Join activities you're interested in</li>
                  <li><i className="fas fa-users"></i> See who else is participating</li>
                  <li><i className="fas fa-calendar-check"></i> Track your presence in the Presence page</li>
                </ul>
                <p className="welcome-note">
                  <i className="fas fa-info-circle"></i>
                  <strong>Note:</strong> Regular participation helps you meet monthly requirements. Check the <strong>Presence</strong> page to track your progress.
                </p>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowWelcomePopup(false)}
                  className="btn-primary"
                >
                  <i className="fas fa-rocket"></i>
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Participating Warning Popup for In-House Users */}
      {showNotParticipatingWarning && (
        <div className="modal-overlay" onClick={handleWarningCancel}>
          <div className="modal-content warning-popup" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-exclamation-triangle"></i>
                Presence Guidelines
              </h2>
              <button 
                onClick={handleWarningCancel}
                className="modal-close"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="warning-content">
                <p><strong>Presence Guidelines:</strong></p>
                <div className="guidelines-list">
                  <div className="guideline-item">
                    <i className="fas fa-calendar-week"></i>
                    <span><strong>Primary:</strong> Attend all Activity Days (Saturdays) - Every Saturday we conduct activities</span>
                  </div>
                  <div className="guideline-item">
                    <i className="fas fa-calendar-alt"></i>
                    <span><strong>Alternative:</strong> At least 8 days + 2 Saturdays compulsory</span>
                  </div>
                  <div className="guideline-item">
                    <i className="fas fa-calendar-day"></i>
                    <span><strong>Alternative:</strong> If you can't attend 2 Saturdays, complete 10 weekdays</span>
                  </div>
                  <div className="guideline-item warning-consequence">
                    <i className="fas fa-arrow-right"></i>
                    <span><strong>Consequences:</strong> If you are not meeting presence requirements → you will be moved to <strong>3AM Team</strong></span>
                  </div>
                </div>
                <p className="warning-question">Are you aware of these guidelines?</p>
                <div className="warning-note">
                  <i className="fas fa-lightbulb"></i>
                  <span>Track your presence in the <strong>Presence</strong> page to stay compliant with guidelines.</span>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={handleWarningCancel}
                  className="btn-cancel"
                >
                  <i className="fas fa-arrow-left"></i>
                  Go Back
                </button>
                <button 
                  onClick={handleWarningConfirm}
                  className="btn-primary warning-confirm"
                >
                  <i className="fas fa-check"></i>
                  Yes, I Understand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;