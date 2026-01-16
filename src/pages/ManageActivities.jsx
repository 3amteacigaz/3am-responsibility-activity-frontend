import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI, notificationAPI } from '../services/api';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const ManageActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
  });
  
  // Create modal state
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

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to get proper display name
  const getDisplayName = (userObj) => {
    if (!userObj) return 'Member';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'Member';
  };

  // Helper function to get creator display name
  const getCreatorDisplayName = (activity) => {
    // Since this is ManageActivities, all activities are created by current user
    return getDisplayName(user);
  };

  useEffect(() => {
    document.title = 'Manage Activities - 3AM Core';
    loadActivities();
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showCreateModal) {
        handleCloseModal();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateModal]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getMyActivities();
      const userActivities = response.data.activities || [];
      setActivities(userActivities);
      console.log('Loaded activities:', userActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleOpenModal = () => {
    setShowCreateModal(true);
    setCreateMessage('');
    // Reset form when opening
    setCreateFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
    });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateMessage('');
    setCreateLoading(false);
  };

  // Create form handlers
  const handleCreateInputChange = (e) => {
    setCreateFormData({
      ...createFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateMessage('');
    setCreateLoading(true);

    // Validate that end time is after start time
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
      
      // Send activity creation notification to all users
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
        // Don't fail the activity creation if notification fails
      }
      
      // Reload activities
      await loadActivities();

      // Close modal after 1.5 seconds
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      console.error('Error creating activity:', error);
      setCreateMessage(error.response?.data?.error || 'Error creating activity. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit form handlers
  const handleEdit = (activity) => {
    setEditingActivity(activity.id);
    setEditFormData({
      title: activity.title,
      description: activity.description,
      date: activity.date,
      startTime: activity.startTime || activity.time || '',
      endTime: activity.endTime || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
    });
  };

  const handleSaveEdit = async (activityId) => {
    // Validate that end time is after start time
    if (editFormData.startTime && editFormData.endTime) {
      const start = new Date(`${editFormData.date}T${editFormData.startTime}`);
      const end = new Date(`${editFormData.date}T${editFormData.endTime}`);
      
      if (end <= start) {
        alert('End time must be after start time');
        return;
      }
    }

    try {
      await activityAPI.updateActivity(activityId, editFormData);
      console.log('Activity updated:', activityId);
      
      // Update local state
      setActivities(activities.map(activity => 
        activity.id === activityId 
          ? { ...activity, ...editFormData, updatedAt: new Date().toISOString() }
          : activity
      ));
      
      setEditingActivity(null);
      setEditFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      alert(error.response?.data?.error || 'Error updating activity. Please try again.');
    }
  };

  const handleDelete = async (activityId) => {
    if (window.confirm('Are you sure you want to delete this activity? This will also remove all participant records.')) {
      try {
        await activityAPI.deleteActivity(activityId);
        console.log('Activity deleted:', activityId);
        
        setActivities(activities.filter(activity => activity.id !== activityId));
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert(error.response?.data?.error || 'Error deleting activity. Please try again.');
      }
    }
  };

  const handleEditInputChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/core-login');
  };

  const formatDateTime = (date, startTime, endTime) => {
    const activityDate = new Date(date + 'T' + startTime);
    const endDateTime = endTime ? new Date(date + 'T' + endTime) : null;
    
    const dateStr = activityDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
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
      <CoreHeader user={user} onLogout={handleLogout} activeTab="manage-activities" />

      <main>
        {/* Manage Activities Section */}
        <div className="activities-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-calendar-check"></i>
              Your Activities ({activities.length})
            </h2>
            <button 
              onClick={handleOpenModal}
              className="btn create-activity-btn"
            >
              <i className="fas fa-plus"></i>
              Create Activity
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-calendar-plus"></i>
              <h3>No Activities Yet</h3>
              <p>Create your first activity to get started!</p>
              <button 
                onClick={handleOpenModal}
                className="btn"
              >
                <i className="fas fa-plus"></i>
                Create Activity
              </button>
            </div>
          ) : (
            <div className="activities-grid">
              {activities.map(activity => (
                <div key={activity.id} className="activity-card">
                  {editingActivity === activity.id ? (
                    // Edit Mode
                    <div className="edit-form">
                      <input
                        type="text"
                        name="title"
                        value={editFormData.title}
                        onChange={handleEditInputChange}
                        className="edit-title"
                        placeholder="Activity title"
                      />
                      
                      <div className="edit-datetime">
                        <input
                          type="date"
                          name="date"
                          value={editFormData.date}
                          onChange={handleEditInputChange}
                        />
                        <input
                          type="time"
                          name="startTime"
                          value={editFormData.startTime}
                          onChange={handleEditInputChange}
                          placeholder="Start time"
                        />
                        <input
                          type="time"
                          name="endTime"
                          value={editFormData.endTime}
                          onChange={handleEditInputChange}
                          placeholder="End time"
                        />
                      </div>
                      
                      <textarea
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditInputChange}
                        rows="4"
                        placeholder="Activity description"
                      />
                      
                      <div className="edit-actions">
                        <button 
                          onClick={() => handleSaveEdit(activity.id)}
                          className="btn-save"
                        >
                          <i className="fas fa-check"></i>
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="btn-cancel"
                        >
                          <i className="fas fa-times"></i>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="activity-header">
                        <h3 className="activity-title">{activity.title}</h3>
                        <div className="activity-actions">
                          <button 
                            onClick={() => handleEdit(activity)}
                            className="btn-edit"
                            title="Edit Activity"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => handleDelete(activity.id)}
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
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-calendar-plus"></i>
                Create New Activity
              </h2>
              <button 
                onClick={handleCloseModal}
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

              <form onSubmit={handleCreateSubmit} className="activity-form">
                <div className="form-group">
                  <label htmlFor="modal-title">Activity Title *</label>
                  <input
                    type="text"
                    id="modal-title"
                    name="title"
                    value={createFormData.title}
                    onChange={handleCreateInputChange}
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
                      onChange={handleCreateInputChange}
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
                      onChange={handleCreateInputChange}
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
                      onChange={handleCreateInputChange}
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
                    onChange={handleCreateInputChange}
                    required
                    placeholder="Describe the activity, what participants should expect, requirements, etc."
                    rows="4"
                    maxLength="1000"
                    disabled={createLoading}
                  />
                  <small className="char-count">
                    {createFormData.description.length}/1000 characters
                  </small>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
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
    </div>
  );
};

export default ManageActivities;