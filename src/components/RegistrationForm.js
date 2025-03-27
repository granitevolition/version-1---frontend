import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, checkApiHealth, isLoggedIn } from '../services/api';
import '../styles/RegistrationForm.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: ''
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
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

  // Password strength validation
  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  // Username validation
  const validateUsername = (username) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  // Email validation
  const validateEmail = (email) => {
    if (!email) return null; // Email is optional
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setDebugInfo(null);

    // Form validation
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setError(usernameError);
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting registration for:', formData.username);
      
      // Call the API service to register the user
      const response = await registerUser(formData);
      console.log('Registration response:', response);
      
      // Save debug info
      setDebugInfo({
        response: response,
        responseType: typeof response,
        hasUsername: response && 'username' in response,
        username: response ? response.username : 'undefined',
        userId: response ? response.id : 'undefined'
      });
      
      // Check if response has a valid username
      if (response && response.username) {
        setMessage(`User ${response.username} registered successfully! Please login.`);
        // Clear form after successful registration
        setFormData({ username: '', password: '', email: '', phone: '' });
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage(`Registration successful! Please login.`);
        setFormData({ username: '', password: '', email: '', phone: '' });
        console.warn('Response missing username:', response);
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Registration error caught in component:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.message.includes('already exists')) {
        errorMessage = 'Username already exists. Please choose another username.';
      } else if (err.message.includes('Email already in use')) {
        errorMessage = 'Email already in use. Please use another email address.';
      } else if (err.message.includes('404')) {
        errorMessage = 'Server endpoint not found. Please contact support.';
      } else if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 503) {
          errorMessage = 'Database connection error. Please try again later.';
        } else if (status === 409) {
          if (err.response.data && err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = 'Username or email already exists. Please choose another.';
          }
        } else if (data && data.message) {
          errorMessage = data.message;
        }
        
        console.error('Server error details:', {
          status,
          data
        });
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Could not connect to the server. Please check your internet connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="form-card">
        <h2>Create an Account</h2>
        
        {apiStatus && apiStatus.status === 'disconnected' && (
          <div className="error-message">
            API connection issue: {apiStatus.error}
          </div>
        )}
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username*</label>
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
            <small className="help-text">Username should be at least 3 characters and only contain letters, numbers, and underscores.</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone (optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password*</label>
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
            <small className="help-text">Password should be at least 6 characters long.</small>
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="form-footer">
          <p>Already have an account? <a href="/login">Login</a></p>
        </div>
        
        {/* Debug info for troubleshooting */}
        {debugInfo && (
          <div className="debug-info" style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h3>Debug Information</h3>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationForm;
