/**
 * API Service for backend communication
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
// Extract base URL (without the /api/v1 path) for health checks
const BASE_URL = API_URL.includes('/api/v1') 
  ? API_URL.substring(0, API_URL.indexOf('/api/v1')) 
  : API_URL;

// Cache for health check to avoid excessive API calls
let healthCheckCache = {
  status: null,
  timestamp: 0,
  expiresIn: 60000 // 1 minute cache
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration response
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Registration failed with status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle network errors with better messages
    if (error.name === 'AbortError') {
      throw new Error('Registration request timed out. Please try again later.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Log in a user
 * @param {Object} credentials - User login credentials
 * @returns {Promise<Object>} - Login response with user data and token
 */
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Login failed with status: ${response.status}`);
    }

    // Store user data and token in local storage
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    localStorage.setItem('lastLogin', Date.now().toString());

    return data;
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle network errors with better messages
    if (error.name === 'AbortError') {
      throw new Error('Login request timed out. Please try again later.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Log out the current user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    // Only call logout API if we have a token
    const token = localStorage.getItem('token');
    
    if (token) {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Add timeout to avoid hanging requests
        signal: AbortSignal.timeout(5000)
      });
    }
  } catch (error) {
    console.warn('Logout API call failed:', error);
    // Continue with local logout regardless of API success
  } finally {
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastLogin');
  }
};

/**
 * Check if a user is currently logged in
 * @returns {boolean} - True if user is logged in
 */
export const isLoggedIn = () => {
  const token = localStorage.getItem('token');
  const lastLogin = localStorage.getItem('lastLogin');
  
  if (!token || !lastLogin) {
    return false;
  }
  
  // Check if login session is still valid (24 hours)
  const loginTime = parseInt(lastLogin, 10);
  const currentTime = Date.now();
  const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  return currentTime - loginTime < sessionDuration;
};

/**
 * Get the current logged in user
 * @returns {Object|null} - User data or null if not logged in
 */
export const getCurrentUser = () => {
  if (!isLoggedIn()) {
    return null;
  }
  
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * Get authorization header for API requests
 * @returns {Object} - Headers object with Authorization
 */
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  
  return token 
    ? { 'Authorization': `Bearer ${token}` } 
    : {};
};

/**
 * Verify if the current session is valid
 * @returns {Promise<boolean>} - True if session is valid
 */
export const verifySession = async () => {
  try {
    // If not logged in locally, don't bother checking with server
    if (!isLoggedIn()) {
      return false;
    }
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      // Session is invalid, clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('lastLogin');
      return false;
    }
    
    // Update last login time
    localStorage.setItem('lastLogin', Date.now().toString());
    return true;
  } catch (error) {
    console.warn('Session verification failed:', error);
    
    // On network errors, we'll assume the session is still valid locally
    // to prevent forcing logouts when the server is temporarily unavailable
    if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
      console.log('Network error during session verification - assuming valid session');
      return true;
    }
    
    // For other errors, invalidate the session
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastLogin');
    return false;
  }
};

/**
 * Check the health of the API
 * @returns {Promise<Object>} - Health status
 */
export const checkApiHealth = async () => {
  try {
    // Use the base URL's /health endpoint instead of /api/v1/health
    console.log('Checking health at:', `${BASE_URL}/health`);
    
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        status: 'unhealthy',
        message: `API is unavailable: ${response.status} ${response.statusText}`,
        timestamp: new Date().toISOString()
      };
    }

    const data = await response.json();
    console.log('Health check response:', data);
    
    // Update cache
    healthCheckCache = {
      status: data.status === 'healthy' ? 'available' : 'unavailable',
      timestamp: Date.now(),
      expiresIn: 60000 // 1 minute cache
    };
    
    return data;
  } catch (error) {
    console.error('API health check error:', error);
    
    // Update cache
    healthCheckCache = {
      status: 'unavailable',
      timestamp: Date.now(),
      expiresIn: 10000 // Shorter cache for failures (10 seconds)
    };
    
    return {
      status: 'unhealthy',
      message: `API is unavailable: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check if the API is available
 * @returns {Promise<boolean>} - True if the API is available
 */
export const isApiAvailable = async () => {
  // Check cache first
  const now = Date.now();
  if (healthCheckCache.status !== null && now - healthCheckCache.timestamp < healthCheckCache.expiresIn) {
    return healthCheckCache.status === 'available';
  }
  
  try {
    // Use the base URL's /health endpoint
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      // Short timeout for health check
      signal: AbortSignal.timeout(2000)
    });
    
    const isAvailable = response.ok;
    console.log('Health check result:', isAvailable ? 'Available' : 'Unavailable');
    
    // Update cache
    healthCheckCache = {
      status: isAvailable ? 'available' : 'unavailable',
      timestamp: now,
      expiresIn: 60000 // 1 minute cache
    };
    
    return isAvailable;
  } catch (error) {
    console.warn('API health check failed:', error);
    
    // Update cache
    healthCheckCache = {
      status: 'unavailable',
      timestamp: now,
      expiresIn: 10000 // Shorter cache for failures (10 seconds)
    };
    
    return false;
  }
};
