import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CreateActivity = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to get proper display name
  const getDisplayName = (userObj) => {
    if (!userObj) return 'Member';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'Member';
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
    setLoading(true);

    try {
      // TODO: Add API call to create activity
      console.log('Creating activity:', formData);
      
      setMessage('Activity created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating activity:', error);
      setMessage('Error creating activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/core-login');
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <div className="user-info">{getDisplayName(user)}</div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/activities" className="nav-link">Activities</Link>
          <Link to="/create-activity" className="nav-link active">Create Activity</Link>
          <Link to="/manage-activities" className="nav-link">Manage Activities</Link>
          <Link to="/community" className="nav-link">Community</Link>
          <a href="#" onClick={handleLogout} className="nav-link">Exit</a>
        </div>
      </div>

      <main>
        <div className="form-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="section-title">
            <i className="fas fa-calendar-plus"></i>
            Create New Activity
          </h2>

          {message && (
            <div className={message.includes('success') ? 'success' : 'error'}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="activity-form">
            <div className="form-group">
              <label htmlFor="title">Activity Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter activity title"
                maxLength="100"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
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
                <label htmlFor="time">Time *</label>
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
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="Describe the activity, what participants should expect, requirements, etc."
                rows="6"
                maxLength="1000"
              />
              <small className="char-count">
                {formData.description.length}/1000 characters
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating Activity...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Create Activity
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateActivity;