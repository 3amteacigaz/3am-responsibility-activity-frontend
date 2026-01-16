import { Link } from 'react-router-dom';

const CoreHeader = ({ user, onLogout, activeTab = '' }) => {
  // Helper function to get proper display name
  const getDisplayName = (userObj) => {
    if (!userObj) return 'Member';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'Member';
  };

  const handleLogout = (e) => {
    e.preventDefault();
    onLogout();
  };

  return (
    <div className="dashboard-header desktop-only">
      <div className="user-info">{getDisplayName(user)}</div>
      <div className="nav-links">
        <Link 
          to="/dashboard" 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/community" 
          className={`nav-link ${activeTab === 'community' ? 'active' : ''}`}
        >
          Community
        </Link>
        <Link 
          to="/in-house-presence" 
          className={`nav-link ${activeTab === 'in-house' ? 'active' : ''}`}
        >
          In House
        </Link>
        <a href="#" onClick={handleLogout} className="nav-link">
          Exit
        </a>
      </div>
    </div>
  );
};

export default CoreHeader;