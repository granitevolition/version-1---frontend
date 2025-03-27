import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, isLoggedIn, checkApiHealth } from '../services/api';
import '../styles/LoginForm.css';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Check API health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth();
        setApiStatus({
          status: 'connected',
          details: health
        });
      } catch (err) {
        console.error('API health check failed:', err);
        setApiStatus({
          status: 'disconnected',
          error: err.message
        });
      }
    };
    
    checkHealth();
    
    // Auto-clear messages after 5 seconds
    const messageTimer = setTimeout(() => {
      if (message) setMessage('');
    }, 5000);
    
    return () => clearTimeout(messageTimer);
  }, [message]);

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      console.log('Submitting login for:', formData.username);
      
      // Call the API service to login the user
      const response = await loginUser(formData);
      console.log('Login response:', response);
      
      setMessage('Login successful! Redirecting to dashboard...');
      
      // Redirect to dashboard after successful login
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      console.error('Login error caught in component:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.message.includes('Invalid username or password')) {
        errorMessage = 'Invalid username or password. Please try again.';
      } else if (err.message.includes('404')) {
        errorMessage = 'Server endpoint not found. Please contact support.';
      } else if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 401) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (status === 503) {
          errorMessage = 'Database connection error. Please try again later.';
        } else if (data && data.message) {
          errorMessage = data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="form-card">
        <h2>Login to Your Account</h2>
        
        {apiStatus && apiStatus.status === 'disconnected' && (
          <div className="error-message">
            API connection issue: {apiStatus.error}
          </div>
        )}
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="form-footer">
          <p>Don't have an account? <a href="/register">Register</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
