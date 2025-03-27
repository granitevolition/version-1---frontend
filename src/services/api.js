import axios from 'axios';

// Get API base URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 
               // Try to guess URL based on Railway naming convention
               (window.location.hostname.includes('frontend') ? 
                 window.location.hostname.replace('frontend', 'backend') :
                 'http://localhost:3000') + '/api';

console.log('Frontend API URL:', API_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS
  withCredentials: false
});

// Add debugging interceptor
api.interceptors.request.use(request => {
  console.log('API Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  });
  return request;
}, error => {
  console.error('API Request Error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(response => {
  console.log('API Response:', {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    headers: response.headers
  });
  return response;
}, error => {
  console.error('API Response Error:', error);
  return Promise.reject(error);
});

/**
 * Test the API connection
 * @returns {Promise<Object>} - Test response
 */
export const testApiConnection = async () => {
  try {
    // Try the test endpoint
    const response = await api.get('/test');
    console.log('API test successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('API test failed:', error);
    throw error;
  }
};

/**
 * Echo test - send data to the API and get it back
 * @param {Object} data - Data to echo
 * @returns {Promise<Object>} - Echo response
 */
export const testApiEcho = async (data) => {
  try {
    const response = await api.post('/test/echo', data);
    console.log('API echo successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('API echo failed:', error);
    throw error;
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data (username, password)
 * @returns {Promise<Object>} - Registered user data
 */
export const registerUser = async (userData) => {
  try {
    console.log('Sending registration request to:', `${API_URL}/users/register`);
    
    // First, do a simple test to verify API connectivity
    try {
      await testApiConnection();
      console.log('API connection verified, proceeding with registration');
    } catch (testError) {
      console.error('API connection test failed before registration:', testError);
      // Continue with registration anyway
    }
    
    // Try direct fetch instead of axios
    try {
      console.log('Trying direct fetch for registration');
      const fetchResponse = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`Fetch error: ${fetchResponse.status} ${fetchResponse.statusText}`);
      }
      
      const data = await fetchResponse.json();
      console.log('Registration with fetch successful:', data);
      return data;
    } catch (fetchError) {
      console.error('Registration with fetch failed:', fetchError);
      // Fall back to axios
    }
    
    // Continue with axios
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
