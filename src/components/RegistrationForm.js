import React, { useState, useEffect } from 'react';
import { registerUser, checkApiHealth } from '../services/api';
import '../styles/RegistrationForm.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);

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
  }, []);

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

    // Form validation
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting registration for:', formData.username);
      
      // Call the API service to register the user
      const response = await registerUser(formData);
      setMessage(`User ${response.username} registered successfully!`);
      setFormData({ username: '', password: '' });
    } catch (err) {
      console.error('Registration error caught in component:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 503) {
          errorMessage = 'Database connection error. Please try again later.';
        } else if (status === 409) {
          errorMessage = 'Username already exists. Please choose another username.';
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
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={loading}
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
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
