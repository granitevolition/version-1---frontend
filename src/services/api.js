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

// Use the corrected URL - compute this once
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
    data: request.data ? { ...request.data, password: request.data.password ? '[REDACTED]' : undefined } : undefined,
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
 * @param {Object} userData - User registration data (username, password, email, phone)
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
 * Login a user
 * @param {Object} credentials - Login credentials (username, password)
 * @returns {Promise<Object>} - Login response with user data and session token
 */
export const loginUser = async (credentials) => {
  try {
    console.log('Sending login request to:', `${API_URL}/auth/login`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      // Try to parse error response
      let errorMessage = 'Login failed. Please try again.';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response can't be parsed, use status text
        errorMessage = `Login failed: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Login successful:', { 
      ...data, 
      session: data.session ? { ...data.session, token: '[REDACTED]' } : undefined 
    });
    
    // Store session token in localStorage
    if (data.session && data.session.token) {
      localStorage.setItem('sessionToken', data.session.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logout the current user
 * @returns {Promise<Object>} - Logout response
 */
export const logoutUser = async () => {
  const sessionToken = localStorage.getItem('sessionToken');
  
  // Always clear local storage regardless of API response
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('user');
  
  // If no session, just return success
  if (!sessionToken) {
    return { message: 'Logged out' };
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken }),
    });
    
    // Parse response if successful
    if (response.ok) {
      const data = await response.json();
      console.log('Logout successful:', data);
      return data;
    }
    
    // Just return success even on errors
    return { message: 'Logged out' };
  } catch (error) {
    console.warn('Logout API call failed, but local session was cleared:', error);
    return { message: 'Logged out' };
  }
};

/**
 * Verify the current session
 * @returns {Promise<Object>} - Session verification response
 */
export const verifySession = async () => {
  const sessionToken = localStorage.getItem('sessionToken');
  
  if (!sessionToken) {
    throw new Error('No session token found');
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken }),
    });
    
    if (!response.ok) {
      // Session invalid or expired, clear local storage
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      throw new Error('Invalid or expired session');
    }
    
    const data = await response.json();
    console.log('Session valid:', data);
    
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Session verification error:', error);
    throw error;
  }
};

/**
 * Check if a user is currently logged in without making API calls
 * @returns {Boolean} - True if user is logged in
 */
export const isLoggedIn = () => {
  return !!localStorage.getItem('sessionToken');
};

/**
 * Get the current user data from localStorage
 * @returns {Object|null} - User data or null if not logged in
 */
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (e) {
    console.error('Error parsing user data from localStorage', e);
    return null;
  }
};

// Memoized/cached health check result
let cachedHealthCheck = null;
let healthCheckPromise = null;

/**
 * Check the API health
 * @param {Boolean} force - Force a fresh check instead of using cache
 * @returns {Promise<Object>} - Health status
 */
export const checkApiHealth = async (force = false) => {
  // Return cached result if available and not forcing refresh
  if (cachedHealthCheck && !force) {
    return cachedHealthCheck;
  }
  
  // If a check is already in progress, return that promise
  if (healthCheckPromise) {
    return healthCheckPromise;
  }
  
  // Create a new health check promise
  healthCheckPromise = (async () => {
    try {
      // Try each endpoint in sequence until one works
      const endpoints = [
        `${API_URL.replace('/api', '')}/health`,
        `${API_URL}/status/database`,
        `${API_URL}/health`
      ];
      
      let result = null;
      let error = null;
      
      // Try each endpoint until one succeeds
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            result = await response.json();
            console.log(`Health check successful on ${endpoint}:`, result);
            break;
          }
        } catch (err) {
          error = err;
          console.log(`Health check failed on ${endpoint}:`, err);
          // Continue to the next endpoint
        }
      }
      
      if (result) {
        // Cache successful result
        cachedHealthCheck = result;
        return result;
      }
      
      // If all endpoints failed, throw the last error
      throw error || new Error('All health check endpoints failed');
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    } finally {
      // Clear the promise reference
      healthCheckPromise = null;
    }
  })();
  
  return healthCheckPromise;
};

export default api;
