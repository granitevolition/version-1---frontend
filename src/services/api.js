import axios from 'axios';

// Get API base URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 
               // Try to guess URL based on Railway naming convention
               (window.location.hostname.includes('frontend') ? 
                 window.location.hostname.replace('frontend', 'backend') :
                 'http://localhost:3000') + '/api';

console.log('API URL:', API_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS
  withCredentials: false
});

/**
 * Register a new user
 * @param {Object} userData - User registration data (username, password)
 * @returns {Promise<Object>} - Registered user data
 */
export const registerUser = async (userData) => {
  try {
    console.log('Sending registration request to:', `${API_URL}/users/register`);
    const response = await api.post('/users/register', userData);
    console.log('Registration successful:', response.data);
    return response.data;
  } catch (error) {
    // Log more detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Registration error status:', error.response.status);
      console.error('Registration error data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request error:', error.message);
    }
    throw error;
  }
};

/**
 * Check the API health
 * @returns {Promise<Object>} - Health status
 */
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API health check error:', error);
    throw error;
  }
};

export default api;
