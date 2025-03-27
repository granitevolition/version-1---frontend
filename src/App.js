import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './styles/App.css';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import TestConnectivity from './components/TestConnectivity';
import { isLoggedIn } from './services/api';

// Protected route component
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>User Registration System</h1>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            {isLoggedIn() ? (
              <>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/test" className="nav-link">API Test</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
                <Link to="/test" className="nav-link">API Test</Link>
              </>
            )}
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={
              isLoggedIn() ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
            } />
            
            <Route path="/login" element={
              isLoggedIn() ? 
                <Navigate to="/dashboard" replace /> : 
                <LoginForm />
            } />
            
            <Route path="/register" element={
              isLoggedIn() ? 
                <Navigate to="/dashboard" replace /> : 
                <RegistrationForm />
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/test" element={<TestConnectivity />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer>
          <p>© {new Date().getFullYear()} User Registration System</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
