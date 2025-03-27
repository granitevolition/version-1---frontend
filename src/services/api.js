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
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication failure
      if (response.status === 401) {
        throw new Error(errorData.message || 'Invalid username or password.');
      }
      
      throw new Error(errorData.message || `Status: ${response.status}, ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Login successful:', { ...data, session: { ...data.session, token: '[REDACTED]' } });
    
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
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (!sessionToken) {
      // Already logged out
      localStorage.removeItem('user');
      return { message: 'Already logged out' };
    }
    
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken }),
    });
    
    // Always clear local storage, even if the request fails
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    
    if (!response.ok) {
      // Just log the error, but don't throw since we already cleared local storage
      console.warn('Error during logout:', response.status, response.statusText);
      return { message: 'Logged out' };
    }
    
    const data = await response.json();
    console.log('Logout successful:', data);
    return data;
  } catch (error) {
    console.error('Logout error:', error);
    // Still remove the session info even if the request fails
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    return { message: 'Logged out' };
  }
};

/**
 * Verify the current session
 * @returns {Promise<Object>} - Session verification response
 */
export const verifySession = async () => {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (!sessionToken) {
      throw new Error('No session token found');
    }
    
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
 * Check if a user is currently logged in
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
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
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
