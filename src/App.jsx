import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import components
import ProtectedRoute from './components/ProtectedRoute';
import CoreLogin from './pages/CoreLogin';
import InHouseLogin from './pages/InHouseLogin';
import InHouseSignup from './pages/InHouseSignup';
import Dashboard from './pages/Dashboard';
import InHouseDashboard from './pages/InHouseDashboard';
import Community from './pages/Community';
import Home from './pages/Home';
import ManageActivities from './pages/ManageActivities';
import Activities from './pages/Activities';
import InHousePresence from './pages/InHousePresence.jsx';
import Presence from './pages/Presence';

// Get the base path for GitHub Pages (not needed with HashRouter)
// const basename = import.meta.env.DEV ? '' : '/3am-responsibility-activity-frontend';

// Component to handle GitHub Pages hash routing
function GitHubPagesHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // With HashRouter, routing should work automatically
    // This component is kept for potential future enhancements
    console.log('GitHubPagesHandler - Current location:', location.pathname);
  }, [location]);

  return null;
}

function App() {
  console.log('App.jsx - Using HashRouter for GitHub Pages compatibility');
  console.log('App.jsx - Current location:', window.location.href);
  console.log('App.jsx - Environment:', import.meta.env.DEV ? 'development' : 'production');
  
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <GitHubPagesHandler />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/core-login" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/core-login" element={<CoreLogin />} />
            <Route path="/in-house-login" element={<InHouseLogin />} />
            <Route path="/in-house-signup" element={<InHouseSignup />} />
            <Route path="/login" element={<Navigate to="/core-login" replace />} />
            <Route path="/signup" element={<Navigate to="/core-login" replace />} />

            {/* Core team protected routes - all under /core/* */}
            <Route 
              path="/core/dashboard" 
              element={
                <ProtectedRoute userType="core">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/core/manage-activities" 
              element={
                <ProtectedRoute userType="core">
                  <ManageActivities />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/core/community" 
              element={
                <ProtectedRoute userType="core">
                  <Community />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/core/in-house-presence" 
              element={
                <ProtectedRoute userType="core">
                  <InHousePresence />
                </ProtectedRoute>
              } 
            />

            {/* In-house team protected routes - all under /in-house/* */}
            <Route 
              path="/in-house/dashboard" 
              element={
                <ProtectedRoute userType="in-house">
                  <InHouseDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/in-house/activities" 
              element={
                <ProtectedRoute userType="in-house">
                  <Activities />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/in-house/presence" 
              element={
                <ProtectedRoute userType="in-house">
                  <Presence />
                </ProtectedRoute>
              } 
            />

            {/* Legacy route redirects */}
            <Route path="/dashboard" element={<Navigate to="/core/dashboard" replace />} />
            <Route path="/manage-activities" element={<Navigate to="/core/manage-activities" replace />} />
            <Route path="/community" element={<Navigate to="/core/community" replace />} />
            <Route path="/in-house-presence" element={<Navigate to="/core/in-house-presence" replace />} />
            <Route path="/in-house-dashboard" element={<Navigate to="/in-house/dashboard" replace />} />
            <Route path="/activities" element={<Navigate to="/in-house/activities" replace />} />
            <Route path="/presence" element={<Navigate to="/in-house/presence" replace />} />
            <Route path="/create-activity" element={<Navigate to="/core/manage-activities" replace />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/core-login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
