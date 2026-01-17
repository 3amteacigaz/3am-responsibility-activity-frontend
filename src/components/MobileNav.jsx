import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileNav = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getDisplayName = (userObj) => {
    if (!userObj) return 'User';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'User';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-user-info">
            <span className="mobile-user-name">{getDisplayName(user)}</span>
            <span className="mobile-user-type">{user?.userType || 'User'}</span>
          </div>
          
          <button 
            className={`mobile-menu-toggle ${isOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-menu-user">
                <div className="mobile-menu-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="mobile-menu-user-info">
                  <div className="mobile-menu-user-name">{getDisplayName(user)}</div>
                  <div className="mobile-menu-user-type">{user?.userType === 'core' ? 'Core Team' : 'In-House Team'}</div>
                </div>
              </div>
              <button className="mobile-menu-close" onClick={closeMenu}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <nav className="mobile-menu-nav">
              {user?.userType === 'core' ? (
                <>
                  <Link 
                    to="/core/dashboard" 
                    className={`mobile-menu-item ${isActive('/core/dashboard') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                  </Link>
                  <Link 
                    to="/core/activities" 
                    className={`mobile-menu-item ${isActive('/core/activities') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-calendar-alt"></i>
                    <span>Activities</span>
                  </Link>
                  <Link 
                    to="/core/presence" 
                    className={`mobile-menu-item ${isActive('/core/presence') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-calendar-check"></i>
                    <span>Presence</span>
                  </Link>
                  <Link 
                    to="/core/community" 
                    className={`mobile-menu-item ${isActive('/core/community') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-users"></i>
                    <span>Community</span>
                  </Link>
                  <Link 
                    to="/core/in-house-presence" 
                    className={`mobile-menu-item ${isActive('/core/in-house-presence') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-user-check"></i>
                    <span>In House</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/in-house/activities" 
                    className={`mobile-menu-item ${isActive('/in-house/activities') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-calendar-alt"></i>
                    <span>Activities</span>
                  </Link>
                  <Link 
                    to="/in-house/presence" 
                    className={`mobile-menu-item ${isActive('/in-house/presence') ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    <i className="fas fa-calendar-check"></i>
                    <span>Presence</span>
                  </Link>
                </>
              )}
            </nav>

            <div className="mobile-menu-footer">
              <button 
                className="mobile-menu-logout"
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;