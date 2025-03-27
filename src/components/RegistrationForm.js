import React, { useState, useEffect } from 'react';
import { registerUser, checkApiHealth } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/RegistrationForm.css';

const RegistrationForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [apiStatus, setApiStatus] = useState({
    status: 'checking',
    message: 'Checking connection to server...'
  });
  
  const navigate = useNavigate();

  // Check API health on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const health = await checkApiHealth();
        console.log('Health check response:', health);
        
        // Check database status
        const dbStatus = health.services?.database?.status || 'unknown';
        
        if (health.status === 'healthy') {
          setApiStatus({
            status: 'connected',
            message: 'Connected to server'
          });
        } else if (health.status === 'degraded' && dbStatus === 'disconnected') {
          setApiStatus({
            status: 'warning',
            message: 'Database service is unavailable. Registration might not work correctly.'
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
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate inputs
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userData = {
        username,
        password,
        email: email || undefined, // Only include if not empty
        phone: phone || undefined  // Only include if not empty
      };
      
      // API call for debugging - log only non-sensitive data
      console.log('Submitting registration with username:', username, 
        'email:', email || '[empty]',
        'phone:', phone || '[empty]');
      
      // Log host info for debugging
      console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1');
      
      const response = await registerUser(userData);
      
      console.log('Registration successful:', response);
      setSuccessMessage('Registration successful! Redirecting to login...');
      
      // Delay before redirecting to login
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            registered: true, 
            username: username 
          } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Set specific error message based on response
      if (error.message.includes('username already exists')) {
        setError('This username is already taken. Please choose another one.');
      } else if (error.message.includes('email already exists')) {
        setError('This email is already in use. Please use another email or try logging in.');
      } else if (error.message.includes('Network error')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Database connection is not available')) {
        setError('Registration service is currently unavailable. Please try again later.');
        // Update API status to reflect database issue
        setApiStatus({
          status: 'warning',
          message: 'Database service is unavailable. Registration might not work correctly.'
        });
      } else if (error.message.includes('Not Found')) {
        setError('Registration endpoint not found. The server may be misconfigured.');
        setApiStatus({
          status: 'error',
          message: 'Server is misconfigured or registration service is not available'
        });
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render a banner based on API status
  const renderApiStatusBanner = () => {
    if (apiStatus.status === 'connected') {
      return null;
    }
    
    return (
      <div className={`api-status ${apiStatus.status}`}>
        <strong>
          {apiStatus.status === 'warning' ? '⚠️' : '❌'} {apiStatus.message}
        </strong>
        {apiStatus.status === 'error' && (
          <p>The server may be down or experiencing issues. Registration might not work correctly.</p>
        )}
      </div>
    );
  };

  return (
    <div className="registration-container">
      <form className="registration-form" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        
        {/* API status banner */}
        {renderApiStatusBanner()}
        
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username *</label>
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
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <small>Optional</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
          <small>Optional</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <small>At least 6 characters</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="register-button"
          disabled={isLoading || apiStatus.status === 'checking'}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
        
        <div className="login-link">
          Already have an account? <a href="/login">Login here</a>
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

export default RegistrationForm;
