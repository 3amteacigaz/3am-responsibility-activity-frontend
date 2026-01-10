import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  console.log('App.jsx - Using basename:', basename);
  console.log('App.jsx - Current location:', window.location.href);
  
  return (
    <AuthProvider>
      <Router basename={basename}>
        <div className="App">
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
