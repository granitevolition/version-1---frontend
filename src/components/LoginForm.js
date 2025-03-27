import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, isLoggedIn, checkApiHealth } from '../services/api';
import '../styles/LoginForm.css';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState({
    status: 'checking',
    message: 'Checking connection to server...'
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user is already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
    
    // Check the API health
    const checkApiStatus = async () => {
      try {
        const health = await checkApiHealth();
        if (health.status === 'healthy' || health.status === 'degraded') {
          setApiStatus({
            status: 'connected',
            message: 'Connected to server'
          });
        } else {
          setApiStatus({
            status: 'error',
            message: 'Server is unavailable or experiencing issues'
          });
        }
      } catch (error) {
        console.error('API health check failed:', error);
        setApiStatus({
          status: 'error',
          message: 'Could not connect to server'
        });
      }
    };
    
    checkApiStatus();
    
    // Check if redirected from registration
    const { state } = location;
    if (state && state.registered) {
      setUsername(state.username || '');
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Log API URL for debugging
      console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1');
      
      const credentials = {
        username,
        password
      };
      
      console.log('Attempting login for user:', username);
      
      const response = await loginUser(credentials);
      
      console.log('Login successful, redirecting to dashboard');
      
      // Redirect to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Set specific error messages based on the error
      if (error.message.includes('Invalid username or password')) {
        setError('Invalid username or password. Please try again.');
      } else if (error.message.includes('Network error')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('timed out')) {
        setError('Server request timed out. Please try again later.');
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Login</h1>
        
        {apiStatus.status === 'error' && (
          <div className="api-status error">
            <strong>⚠️ {apiStatus.message}</strong>
            <p>The server may be down or experiencing issues. Login might not work correctly.</p>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="login-button"
          disabled={isLoading || apiStatus.status === 'checking'}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="register-link">
          Don't have an account? <a href="/register">Register here</a>
        </div>
      </form>
      
      {/* Debugging info - hidden in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <h3>Debug Information</h3>
          <pre>
            API URL: {process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'} <br />
            API Status: {apiStatus.status} <br />
            Environment: {process.env.NODE_ENV}
          </pre>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
