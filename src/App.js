import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import './styles/App.css';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import TestConnectivity from './components/TestConnectivity';
import HumanizeText from './components/HumanizeText';
import AiDetector from './components/AiDetector';
import { isLoggedIn } from './services/api';

// Protected route component
const ProtectedRoute = ({ children }) => {
  // Force re-render on route change to ensure auth check
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());
  
  useEffect(() => {
    setIsAuthenticated(isLoggedIn());
  }, []);
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  // Force re-render when auth state changes
  const [authState, setAuthState] = useState(isLoggedIn());
  
  useEffect(() => {
    // Check auth state on initial load
    setAuthState(isLoggedIn());
    
    // Set up listener for storage events (for cross-tab logout)
    const handleStorageChange = () => {
      setAuthState(isLoggedIn());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Function to handle navigation to humanize from session storage
  useEffect(() => {
    // Check if there's text to humanize in session storage
    const textToHumanize = sessionStorage.getItem('textToHumanize');
    if (textToHumanize && window.location.pathname === '/humanize') {
      // Clear from session storage after navigation
      sessionStorage.removeItem('textToHumanize');
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>User Registration & AI Text Utility</h1>
          <nav className="nav-links">
            {authState ? (
              <>
                <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
                <NavLink to="/humanize" className="nav-link">Humanize Text</NavLink>
                <NavLink to="/detect" className="nav-link">AI Detector</NavLink>
                <NavLink to="/test" className="nav-link">API Test</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link">Login</NavLink>
                <NavLink to="/register" className="nav-link">Register</NavLink>
                <NavLink to="/test" className="nav-link">API Test</NavLink>
              </>
            )}
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={
              authState ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
            } />
            
            <Route path="/login" element={
              authState ? 
                <Navigate to="/dashboard" replace /> : 
                <LoginForm />
            } />
            
            <Route path="/register" element={
              authState ? 
                <Navigate to="/dashboard" replace /> : 
                <RegistrationForm />
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/humanize" element={
              <ProtectedRoute>
                <HumanizeText />
              </ProtectedRoute>
            } />
            
            <Route path="/detect" element={
              <ProtectedRoute>
                <AiDetector />
              </ProtectedRoute>
            } />
            
            <Route path="/test" element={<TestConnectivity />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer>
          <p>© {new Date().getFullYear()} User Registration & AI Text Utility</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
