import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import Presence from './pages/Presence';

// Get the base path for GitHub Pages
const basename = import.meta.env.DEV ? '' : '/3am-responsibility-activity-frontend';

// Component to handle GitHub Pages hash routing
function GitHubPagesHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run this in production (GitHub Pages)
    if (!import.meta.env.DEV) {
      // Check if we have a hash that represents a route
      const hash = window.location.hash;
      if (hash && hash.startsWith('#/')) {
        const route = hash.substring(1); // Remove the #
        console.log('GitHub Pages - Detected hash route:', route);
        console.log('GitHub Pages - Current location:', location.pathname);
        
        // Only navigate if we're not already on the correct route
        if (location.pathname !== route) {
          console.log('GitHub Pages - Navigating to:', route);
          navigate(route, { replace: true });
        }
        
        // Clean up the hash from the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [navigate, location]);

  return null;
}

function App() {
  console.log('App.jsx - Using basename:', basename);
  console.log('App.jsx - Current location:', window.location.href);
  console.log('App.jsx - Environment:', import.meta.env.DEV ? 'development' : 'production');
  
  return (
    <AuthProvider>
      <Router basename={basename}>
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

            {/* Core team protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-activities" 
              element={
                <ProtectedRoute>
                  <ManageActivities />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/community" 
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              } 
            />

            {/* In-house team protected routes */}
            <Route 
              path="/in-house-dashboard" 
              element={
                <ProtectedRoute>
                  <InHouseDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/activities" 
              element={
                <ProtectedRoute>
                  <Activities />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/presence" 
              element={
                <ProtectedRoute>
                  <Presence />
                </ProtectedRoute>
              } 
            />

            {/* Redirect old create-activity route to manage-activities */}
            <Route path="/create-activity" element={<Navigate to="/manage-activities" replace />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/core-login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
