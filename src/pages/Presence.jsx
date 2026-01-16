import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { presenceAPI } from '../services/api';
import pushNotificationService from '../services/pushNotifications';
import MobileNav from '../components/MobileNav';

const Presence = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [presenceData, setPresenceData] = useState({});
  const [monthStats, setMonthStats] = useState({
    presentDays: 0,
    totalDays: 0,
    presentSaturdays: 0,
    totalSaturdays: 0,
    meetsAllSaturdays: false,
    meets8Days2Sats: false,
    meets10Weekdays: false
  });
  const [loading, setLoading] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Automatically request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (pushNotificationService.isNotificationSupported()) {
        const currentPermission = pushNotificationService.getPermissionStatus();
        
        if (currentPermission === 'default') {
          console.log('🔔 Automatically requesting notification permission...');
          await pushNotificationService.initialize();
          const permission = await pushNotificationService.requestPermission();
          
          if (permission === 'granted') {
            const subscription = await pushNotificationService.subscribe();
            if (subscription) {
              console.log('✅ Push notifications enabled automatically');
            }
          }
        } else if (currentPermission === 'granted') {
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

  useEffect(() => {
    document.title = 'Presence - 3AM Core';
    
    console.log('🚀 Presence component mounted/updated');
    console.log('👤 Current user:', user);
    console.log('🔑 Token in localStorage:', localStorage.getItem('token'));
    console.log('📅 Current month:', currentMonth);
    console.log('📅 Month details:', {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth(),
      monthName: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
    
    // Automatically request notification permission when user visits
    requestNotificationPermission();
    
    if (user && user.userId) {
      console.log('✅ User found, loading presence data...');
      loadPresenceData();
    } else {
      console.log('❌ No user found or no userId, cannot load presence data');
    }
  }, [currentMonth, user]);

  const loadPresenceData = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      console.log(`🔄 Loading presence data for ${year}-${month} (JS month, backend expects ${month})`);
      
      // Load both presence data and stats in parallel for better performance
      const [presenceResponse, statsResponse] = await Promise.all([
        presenceAPI.getMonthlyPresence(year, month),
        presenceAPI.getPresenceStats(year, month)
      ]);
      
      console.log('📦 Raw presence response:', presenceResponse.data);
      console.log('📊 Raw stats response:', statsResponse.data);
      
      const records = presenceResponse.data.presenceRecords || [];
      console.log('📋 Raw presence records from backend:', records);
      
      // Convert array to object with date keys for easier lookup
      // Backend uses YYYY-MM-DD format, convert to local key format for UI
      const presenceObj = {};
      records.forEach(record => {
        // Convert YYYY-MM-DD to local key format YYYY-M-D for easier lookup
        const [recordYear, recordMonth, recordDay] = record.date.split('-').map(Number);
        const localKey = `${recordYear}-${recordMonth - 1}-${recordDay}`; // Month is 0-indexed in JS
        presenceObj[localKey] = {
          date: record.date, // Keep original YYYY-MM-DD format
          type: record.type,
          timestamp: record.createdAt
        };
        console.log(`🔄 Converted ${record.date} to local key ${localKey}`);
      });
      
      setPresenceData(presenceObj);
      console.log('📊 Final presence data object:', presenceObj);
      
      // Set stats from API response
      if (statsResponse.data.stats) {
        console.log('📈 Stats from backend:', statsResponse.data.stats);
        setMonthStats(statsResponse.data.stats);
      }
      
      console.log(`✅ Loaded ${records.length} presence records for ${year}-${month}`);
    } catch (error) {
      console.error('❌ Error loading presence data:', error);
      console.error('❌ Error response:', error.response?.data);
      setPresenceData({});
    } finally {
      setLoading(false);
    }
  };

  const loadMonthStats = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      console.log(`Loading stats for ${year}-${month}`);
      const response = await presenceAPI.getPresenceStats(year, month);
      const stats = response.data.stats;
      
      console.log('Received stats from backend:', stats);
      
      setMonthStats({
        presentDays: stats.presentDays,
        totalDays: stats.totalDays,
        presentSaturdays: stats.presentSaturdays,
        totalSaturdays: stats.totalSaturdays,
        meetsAllSaturdays: stats.meetsAllSaturdays,
        meets8Days2Sats: stats.meets8Days2Sats,
        meets10Weekdays: stats.meets10Weekdays,
        isCompliant: stats.isCompliant
      });
    } catch (error) {
      console.error('Error loading month stats:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/in-house-login');
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    
    // Limit to 3 months (current, next, and previous)
    const today = new Date();
    const minMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    if (newMonth >= minMonth && newMonth <= maxMonth) {
      setCurrentMonth(newMonth);
    }
  };

  const togglePresence = async (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateKey = `${year}-${month}-${day}`; // Local key format
    
    console.log(`🎯 Toggling presence for day ${day}`);
    console.log(`📅 Date string: ${dateStr}, Date key: ${dateKey}`);
    console.log(`👤 Current user:`, user);
    console.log(`🔑 Token in localStorage:`, !!localStorage.getItem('token'));
    console.log(`📊 Current presence data:`, presenceData);
    console.log(`✅ Is currently present:`, !!presenceData[dateKey]);
    
    try {
      if (presenceData[dateKey]) {
        // Remove presence
        console.log(`❌ Removing presence for ${dateStr}`);
        const response = await presenceAPI.removePresence(dateStr);
        console.log(`✅ Remove response:`, response.data);
        
        const newPresenceData = { ...presenceData };
        delete newPresenceData[dateKey];
        setPresenceData(newPresenceData);
        console.log(`✅ Presence removed for ${dateStr}`);
      } else {
        // Mark presence
        console.log(`✅ Marking presence for ${dateStr}`);
        try {
          const response = await presenceAPI.markPresence(dateStr, 'manual');
          console.log(`✅ Mark response:`, response.data);
          
          const newPresenceData = { 
            ...presenceData,
            [dateKey]: {
              date: dateStr, // Store backend format
              type: 'manual',
              timestamp: new Date().toISOString()
            }
          };
          setPresenceData(newPresenceData);
          console.log(`✅ Presence marked for ${dateStr}`);
        } catch (markError) {
          if (markError.response?.data?.error?.includes('already marked')) {
            console.log(`ℹ️ Presence already marked for ${dateStr}, updating local state`);
            // Update local state to reflect that presence is already marked
            const newPresenceData = { 
              ...presenceData,
              [dateKey]: {
                date: dateStr,
                type: 'manual', // Assume manual for now
                timestamp: new Date().toISOString()
              }
            };
            setPresenceData(newPresenceData);
            console.log(`✅ Local state updated for ${dateStr}`);
          } else {
            throw markError; // Re-throw if it's a different error
          }
        }
      }
      
      // Reload stats after presence change - just stats, not full data
      console.log(`🔄 Reloading month stats...`);
      await loadMonthStats();
    } catch (error) {
      console.error('❌ Error toggling presence:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to update presence: ${errorMessage}`);
    }
  };

  const isPresent = (day) => {
    const dateKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`;
    return !!presenceData[dateKey];
  };

  const isSaturday = (day) => {
    // Create date in UTC to avoid timezone issues
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(Date.UTC(year, month, day));
    const isSat = date.getUTCDay() === 6;
    
    if (day <= 5) { // Only log first few days to avoid spam
      console.log(`Day ${day} (UTC) is Saturday: ${isSat}, getUTCDay(): ${date.getUTCDay()}`);
    }
    return isSat;
  };

  const isToday = (day) => {
    const today = new Date();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (day) => {
    const today = new Date();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date < today.setHours(0, 0, 0, 0);
  };

  const getMonthStats = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      const response = await presenceAPI.getPresenceStats(year, month);
      const stats = response.data.stats;
      
      return {
        presentDays: stats.presentDays,
        totalDays: stats.totalDays,
        presentSaturdays: stats.presentSaturdays,
        totalSaturdays: stats.totalSaturdays,
        meetsAllSaturdays: stats.meetsAllSaturdays,
        meets8Days2Sats: stats.meets8Days2Sats,
        meets10Weekdays: stats.meets10Weekdays,
        isCompliant: stats.isCompliant
      };
    } catch (error) {
      console.error('Error getting month stats:', error);
      // Fallback to local calculation if API fails
      const daysInMonth = getDaysInMonth(currentMonth);
      const presentDays = Object.keys(presenceData).filter(key => {
        const [year, month] = key.split('-').map(Number);
        return year === currentMonth.getFullYear() && month === currentMonth.getMonth();
      }).length;
      
      const saturdays = [];
      for (let day = 1; day <= daysInMonth; day++) {
        if (isSaturday(day)) {
          saturdays.push(day);
        }
      }
      
      const presentSaturdays = saturdays.filter(day => isPresent(day)).length;
      
      return {
        presentDays,
        totalDays: daysInMonth,
        presentSaturdays,
        totalSaturdays: saturdays.length,
        meetsAllSaturdays: presentSaturdays === saturdays.length,
        meets8Days2Sats: presentDays >= 8 && presentSaturdays >= 2,
        meets10Weekdays: presentDays >= 10
      };
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const present = isPresent(day);
      const saturday = isSaturday(day);
      const today = isToday(day);
      const past = isPastDate(day);
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${present ? 'present' : ''} ${saturday ? 'saturday activity-day' : ''} ${today ? 'today' : ''} ${past ? 'past' : ''}`}
          onClick={() => !past && togglePresence(day)}
        >
          <span className="day-number">{day}</span>
          {present && <i className="fas fa-check presence-check"></i>}
          {saturday && <span className="activity-day-indicator">ACTIVITY</span>}
        </div>
      );
    }
    
    return days;
  };

  const stats = monthStats;

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading presence data...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={handleLogout} />
      
      {/* Desktop Header */}
      <div className="dashboard-header desktop-only">
        <div className="user-info">{getDisplayName(user)}</div>
        <div className="nav-links">
          <Link to="/in-house/activities" className="nav-link">Activities</Link>
          <Link to="/in-house/presence" className="nav-link active">Presence</Link>
          <a href="#" onClick={handleLogout} className="nav-link">Exit</a>
        </div>
      </div>

      <main>
        <div className="presence-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-calendar-check"></i>
              Presence Tracking
            </h2>
          </div>

          {/* Guidelines Summary */}
          <div className="guidelines-summary">
            <h3>Monthly Presence Requirements</h3>
            <div className="presence-status">
              <div className="status-item">
                <div className="status-header">
                  <i className="fas fa-calendar-week"></i>
                  <span>All Activity Days (Saturdays)</span>
                </div>
                <div className={`status ${stats.meetsAllSaturdays ? 'met' : 'not-met'}`}>
                  {stats.presentSaturdays}/{stats.totalSaturdays} Saturdays
                  {stats.meetsAllSaturdays && <i className="fas fa-check"></i>}
                </div>
              </div>
              
              <div className="status-item">
                <div className="status-header">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Alternative: 8 Days + 2 Saturdays</span>
                </div>
                <div className={`status ${stats.meets8Days2Sats ? 'met' : 'not-met'}`}>
                  {stats.presentDays}/8 days, {stats.presentSaturdays}/2 Saturdays
                  {stats.meets8Days2Sats && <i className="fas fa-check"></i>}
                </div>
              </div>

              <div className="status-item">
                <div className="status-header">
                  <i className="fas fa-calendar-day"></i>
                  <span>Alternative: 10 Weekdays</span>
                </div>
                <div className={`status ${stats.meets10Weekdays ? 'met' : 'not-met'}`}>
                  {stats.presentDays}/10 days
                  {stats.meets10Weekdays && <i className="fas fa-check"></i>}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Navigation - Horizontal Layout */}
          <div className="calendar-navigation">
            <button 
              onClick={() => navigateMonth(-1)}
              className="nav-btn nav-btn-prev"
              disabled={currentMonth <= new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)}
              aria-label="Previous month"
            >
              <i className="fas fa-chevron-left"></i>
              <span className="nav-btn-text">Previous</span>
            </button>
            
            <h3 className="current-month">{formatMonthYear(currentMonth)}</h3>
            
            <button 
              onClick={() => navigateMonth(1)}
              className="nav-btn nav-btn-next"
              disabled={currentMonth >= new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
              aria-label="Next month"
            >
              <span className="nav-btn-text">Next</span>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* Calendar */}
          <div className="calendar-container">
            <div className="calendar-header">
              <div className="day-header">Sun</div>
              <div className="day-header">Mon</div>
              <div className="day-header">Tue</div>
              <div className="day-header">Wed</div>
              <div className="day-header">Thu</div>
              <div className="day-header">Fri</div>
              <div className="day-header">Sat</div>
            </div>
            
            <div className="calendar-grid">
              {renderCalendar()}
            </div>
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color present"></div>
              <span>Present</span>
            </div>
            <div className="legend-item">
              <div className="legend-color activity-day"></div>
              <span>Activity Day (Saturday)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color today"></div>
              <span>Today</span>
            </div>
          </div>

          {/* Presence Guidelines - Centered */}
          <div className="presence-guidelines-container">
            <div className="presence-guidelines">
              <h4>Presence Guidelines</h4>
              <div className="guidelines-content">
                <p><strong>Primary Requirement:</strong></p>
                <p>Attend <strong>all Activity Days (Saturdays)</strong> - Every Saturday we conduct activities and your presence is expected.</p>
                
                <p><strong>If you cannot attend all Saturdays:</strong></p>
                <ul>
                  <li>Come at least <strong>8 days + 2 Saturdays compulsory</strong></li>
                  <li>OR if you cannot attend 2 Saturdays, complete <strong>10 days in weekdays</strong></li>
                </ul>
                
                <p><strong>Consequences:</strong></p>
                <p>If you are not meeting presence requirements → you will be moved to <strong>3AM Team</strong>.</p>
                
                <p className="guidelines-note">
                  <i className="fas fa-info-circle"></i>
                  Click on calendar days to mark your presence. Activity participation will be automatically tracked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Presence;