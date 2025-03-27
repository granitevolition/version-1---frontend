import axios from 'axios';

// Get the correct backend URL with proper protocol
const getBackendUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For Railway, construct URL using the proper hostname with https protocol
  if (window.location.hostname.includes('frontend')) {
    const backendHostname = window.location.hostname.replace('frontend', 'backend');
    return `https://${backendHostname}/api`;
  }
  
  // Default for local development
  return 'http://localhost:3000/api';
};

// Use the corrected URL
const API_URL = getBackendUrl();

console.log('BACKEND API URL:', API_URL);

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
    const response = await fetch(`${API_URL}/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Status: ${response.status}, ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API test successful:', data);
    return data;
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
    const response = await fetch(`${API_URL}/test/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Status: ${response.status}, ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('API echo successful:', responseData);
    return responseData;
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
    
    // Use fetch API for registration
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      // Try to parse error response
      const errorData = await response.json().catch(() => ({}));
      
      // Handle conflict (username already exists)
      if (response.status === 409) {
        throw new Error(errorData.message || 'Username already exists. Please choose another username.');
      }
      
      throw new Error(errorData.message || `Status: ${response.status}, ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Registration successful:', data);
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Check the API health
 * @returns {Promise<Object>} - Health status
 */
export const checkApiHealth = async () => {
  try {
    // First try the backend root endpoint
    try {
      const rootResponse = await fetch(`${API_URL.replace('/api', '')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (rootResponse.ok) {
        const data = await rootResponse.json();
        console.log('Root endpoint check successful:', data);
        return data;
      }
    } catch (rootError) {
      console.log('Root endpoint check failed, trying health endpoint');
    }
    
    // Try the health endpoint
    const response = await fetch(`${API_URL}/status/database`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // As a last resort, try the regular health endpoint
      const healthResponse = await fetch(`${API_URL.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Status: ${response.status}, ${response.statusText}`);
      }
      
      const healthData = await healthResponse.json();
      return healthData;
    }
    
    const data = await response.json();
    console.log('Health check successful:', data);
    return data;
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};

export default api;
