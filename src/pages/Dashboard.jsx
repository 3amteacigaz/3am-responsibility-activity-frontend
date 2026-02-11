import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { responsibilityAPI } from '../services/api';
import pushNotificationService from '../services/pushNotifications';
import MobileNav from '../components/MobileNav';
import CoreHeader from '../components/CoreHeader';

const Dashboard = () => {
  const [responsibilities, setResponsibilities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [datesList, setDatesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    title: '',
    description: ''
  });

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
    if (!userObj) return 'Member';
    return userObj.name || userObj.username || userObj.email?.split('@')[0] || 'Member';
  };

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard - 3AM Core';
    
    // Automatically request notification permission when user visits
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (user) {
      loadResponsibilities();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadResponsibilities = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await responsibilityAPI.getUserResponsibilities();
      const userResponsibilities = response.data.tasks || [];
      setResponsibilities(userResponsibilities);
      generateDatesList(userResponsibilities);
    } catch (error) {
      console.error('Error loading responsibilities:', error);
      setMessage('Error loading responsibilities. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const generateDatesList = (allResponsibilities) => {
    if (allResponsibilities.length === 0) {
      setDatesList([]);
      return;
    }

    // Group responsibilities by date
    const responsibilitiesByDate = {};
    allResponsibilities.forEach(responsibility => {
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
    if (sortedDates.length > 0 && !selectedDate) {
      setSelectedDate(sortedDates[0]);
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
    return responsibilities.filter(responsibility => responsibility.date === date);
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

    try {
      await responsibilityAPI.createResponsibility(formData);
      setMessage('Responsibility added successfully!');
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        title: '',
        description: ''
      });

      // Reload responsibilities
      await loadResponsibilities();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding responsibility:', error);
      setMessage('Error adding responsibility. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadMessage('');
      setUploadResults(null);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setUploadMessage('Please select a file to upload');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadMessage('');
      setUploadResults(null);

      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await responsibilityAPI.bulkUpload(formData);
      
      setUploadMessage('Upload completed successfully!');
      setUploadResults(response.data.results);
      setUploadFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('bulk-upload-file');
      if (fileInput) fileInput.value = '';

      // Reload responsibilities
      await loadResponsibilities();

      // Only clear success message after 5 seconds, keep errors visible
      if (response.data.results.failed === 0) {
        setTimeout(() => {
          setUploadMessage('');
          setUploadResults(null);
        }, 5000);
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage(error.response?.data?.error || 'Error uploading file. Please check the format and try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadTemplate = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';
    window.open(`${apiUrl}/responsibilities/template`, '_blank');
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const deleteResponsibility = async (responsibilityId) => {
    if (window.confirm('Are you sure you want to delete this responsibility?')) {
      try {
        await responsibilityAPI.deleteResponsibility(responsibilityId);
        await loadResponsibilities();
      } catch (error) {
        console.error('Error deleting responsibility:', error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/core-login');
  };

  const selectedDateResponsibilities = selectedDate ? getResponsibilitiesForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => window.location.reload()} 
            className="btn"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={handleLogout} />
      
      {/* Desktop Header */}
      <CoreHeader user={user} onLogout={handleLogout} activeTab="dashboard" />
      
      <main>
        <div className="dashboard-content">
          {/* Left Side - Add New Responsibility */}
          <div className="task-form-section">
            <h2 className="section-title">
              <i className="fas fa-plus"></i>
              Add Responsibility
            </h2>
            
            {message && (
              <div className={message.includes('success') ? 'success' : 'error'}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
                <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  You can select any date, including previous dates
                </small>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Responsibility title"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional details"
                />
              </div>
              
              <button type="submit" className="btn-full">Add Responsibility</button>
            </form>

            {/* Bulk Upload Section */}
            <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px', color: 'var(--text-primary)' }}>
                <i className="fas fa-file-upload" style={{ marginRight: '8px' }}></i>
                Bulk Upload from Excel/CSV
              </h3>

              {/* Instructions Box */}
              <div style={{
                padding: '16px',
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                  Upload Instructions:
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Accepted File Types:</strong>
                  <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                    • Excel files (.xlsx, .xls)<br/>
                    • CSV files (.csv)
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Date Format (Required):</strong>
                  <div style={{ marginLeft: '16px', marginTop: '4px', color: '#3b82f6' }}>
                    • MM/DD/YYYY (e.g., 02/11/2026, 12/25/2026)<br/>
                    • M/D/YYYY (e.g., 2/11/2026, 3/5/2026)<br/>
                    • MM-DD-YYYY (e.g., 02-11-2026, 12-25-2026)<br/>
                    • M-D-YYYY (e.g., 2-11-2026, 3-5-2026)
                  </div>
                  <div style={{ marginLeft: '16px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Note: Excel date cells are automatically converted
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Time Format:</strong>
                  <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                    • 24-hour: 09:30, 9:30, 14:45<br/>
                    • With seconds: 09:30:00, 9:30:45<br/>
                    • 12-hour with AM/PM: 9:30 AM, 2:30 PM, 9:20:00 AM
                  </div>
                  <div style={{ marginLeft: '16px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Note: Excel time cells are automatically converted. All formats accepted.
                  </div>
                </div>
                <div>
                  <strong>Required Columns:</strong>
                  <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                    • Title, Date, Start Time, End Time<br/>
                    • Description (optional)
                  </div>
                </div>
              </div>
              
              {uploadMessage && (
                <div className={uploadMessage.includes('success') ? 'success' : 'error'} style={{ 
                  marginBottom: '16px',
                  position: 'relative',
                  paddingRight: '40px'
                }}>
                  {uploadMessage}
                  <button
                    onClick={() => setUploadMessage('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px 8px'
                    }}
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              )}

              {uploadResults && (
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--secondary)', 
                  border: '1px solid var(--border)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setUploadResults(null)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      background: 'var(--primary)',
                      color: 'var(--secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px 12px',
                      fontWeight: 'bold'
                    }}
                    title="Close"
                  >
                    ×
                  </button>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ fontSize: '14px' }}>Upload Results:</strong>
                  </div>
                  <div style={{ marginBottom: '4px' }}>✅ Success: {uploadResults.success} / {uploadResults.total}</div>
                  <div style={{ marginBottom: '8px' }}>❌ Failed: {uploadResults.failed} / {uploadResults.total}</div>
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <div style={{ 
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '8px', color: '#ef4444' }}>
                        Errors ({uploadResults.errors.length}):
                      </strong>
                      {uploadResults.errors.map((err, idx) => (
                        <div key={idx} style={{ 
                          fontSize: '12px', 
                          color: '#ef4444', 
                          marginBottom: '6px',
                          padding: '6px 8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          <strong>Row {err.row}:</strong> {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: '12px'
                  }}
                >
                  <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
                  Download Sample Template (CSV)
                </button>
                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Download the sample template with MM/DD/YYYY date format, fill it with your data, and upload below
                </small>
              </div>

              <form onSubmit={handleBulkUpload}>
                <div className="form-group">
                  <label htmlFor="bulk-upload-file">Select Excel/CSV File</label>
                  <input
                    type="file"
                    id="bulk-upload-file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={uploadLoading}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--secondary)',
                      cursor: 'pointer'
                    }}
                  />
                  {uploadFile && (
                    <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-primary)', fontSize: '12px' }}>
                      Selected: {uploadFile.name}
                    </small>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-full"
                  disabled={uploadLoading || !uploadFile}
                  style={{
                    opacity: (uploadLoading || !uploadFile) ? 0.6 : 1,
                    cursor: (uploadLoading || !uploadFile) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
                      Upload Responsibilities
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          
          {/* Right Side - Your Responsibilities */}
          <div className="tasks-section">
            <h2 className="section-title">
              <i className="fas fa-list"></i>
              Responsibilities
            </h2>
            
            <div className="tasks-layout">
              {/* Date List */}
              <div className="date-list">
                <h3 className="date-list-title">Dates</h3>
                <div className="dates-container">
                  {datesList.length === 0 ? (
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
                      <p>No responsibilities for this date</p>
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
                          <div className="task-title">{responsibility.title}</div>
                          <div className="task-meta">
                            {new Date(responsibility.date).toLocaleDateString()} • {responsibility.startTime || responsibility.time} - {responsibility.endTime || 'N/A'}
                          </div>
                          {responsibility.description && (
                            <div className="task-description">{responsibility.description}</div>
                          )}
                          <div className="task-timing">
                            Duration: {duration}
                          </div>
                          <div className="task-actions">
                            <button 
                              className="task-btn delete" 
                              onClick={() => deleteResponsibility(responsibility._id)}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
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
      </main>
    </div>
  );
};

export default Dashboard;