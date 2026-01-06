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

function App() {
  return (
    <AuthProvider>
      <Router>
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

            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/in-house-dashboard" 
              element={
                <ProtectedRoute>
                  <InHouseDashboard />
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

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/core-login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
