/**
 * API Service for backend communication
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', ''); // Extract the base URL without the /api/v1 path

// Cache for health check to avoid excessive API calls
let healthCheckCache = {
  status: null,
  timestamp: 0,
  expiresIn: 60000 // 1 minute cache
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Response from API
 */
export const registerUser = async (userData) => {
  try {
    // Check if API is available before making request
    const isAvailable = await isApiAvailable();
    if (!isAvailable) {
      throw new Error('Registration service is currently unavailable. Please try again later.');
    }

    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      let errorMessage = `Registration failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the default error message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Registration request timed out. Please try again later.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Login a user
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} - Response with user data and session token
 */
export const loginUser = async (credentials) => {
  try {
    // Check if API is available before making request
    const isAvailable = await isApiAvailable();
    if (!isAvailable) {
      throw new Error('Login service is currently unavailable. Please try again later.');
    }

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      let errorMessage = `Login failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the default error message
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      phone: data.user.phone
    }));
    localStorage.setItem('sessionToken', data.session.token);
    localStorage.setItem('sessionExpires', new Date(data.session.expires_at).toISOString());
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Login request timed out. Please try again later.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Logout the current user
 * @returns {Promise<Object>} - Response from API
 */
export const logoutUser = async () => {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (sessionToken) {
      try {
        // Check if API is available before making request
        const isAvailable = await isApiAvailable();
        
        if (isAvailable) {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ sessionToken }),
            // Add timeout to avoid hanging requests
            signal: AbortSignal.timeout(5000)
          });
        }
      } catch (apiError) {
        console.warn('Error calling logout API:', apiError);
        // Continue with local logout even if API call fails
      }
    }
    
    // Clear local storage regardless of API response
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpires');
    
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear local storage on error
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpires');
    
    throw error;
  }
};

/**
 * Check if the user is currently logged in
 * @returns {boolean} - True if the user is logged in
 */
export const isLoggedIn = () => {
  const sessionToken = localStorage.getItem('sessionToken');
  const sessionExpires = localStorage.getItem('sessionExpires');
  
  if (!sessionToken || !sessionExpires) {
    return false;
  }
  
  // Check if session has expired
  const expiresDate = new Date(sessionExpires);
  const now = new Date();
  
  return expiresDate > now;
};

/**
 * Get the current user from localStorage
 * @returns {Object|null} - User object or null if not logged in
 */
export const getCurrentUser = () => {
  if (!isLoggedIn()) {
    return null;
  }
  
  const userString = localStorage.getItem('user');
  
  if (!userString) {
    return null;
  }
  
  try {
    return JSON.parse(userString);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Get authentication header for API requests
 * @returns {Object} - Authorization header or empty object
 */
export const getAuthHeader = () => {
  const sessionToken = localStorage.getItem('sessionToken');
  
  if (!sessionToken) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${sessionToken}`
  };
};

/**
 * Verify the current session with the server
 * @returns {Promise<Object>} - Response with user data
 */
export const verifySession = async () => {
  try {
    if (!isLoggedIn()) {
      throw new Error('No active session');
    }
    
    // Check if API is available before making request
    const isAvailable = await isApiAvailable();
    if (!isAvailable) {
      // If API is unavailable, return the cached user data
      return {
        message: 'Session verified (offline mode)',
        user: getCurrentUser()
      };
    }
    
    const sessionToken = localStorage.getItem('sessionToken');
    
    const response = await fetch(`${API_URL}/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ sessionToken }),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      // Session is invalid, clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('sessionExpires');
      
      throw new Error('Session verification failed');
    }

    const data = await response.json();
    
    // Update user and session data
    localStorage.setItem('user', JSON.stringify(data.user));
    
    if (data.session && data.session.expires_at) {
      localStorage.setItem('sessionExpires', new Date(data.session.expires_at).toISOString());
    }
    
    return data;
  } catch (error) {
    console.error('Session verification error:', error);
    
    if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
      // If there's a network error but we have local session data, just use that
      if (isLoggedIn() && getCurrentUser()) {
        return {
          message: 'Session verified (offline mode)',
          user: getCurrentUser()
        };
      }
    }
    
    throw error;
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
    // Use the base URL's /health endpoint, not the API_URL with /api/v1
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

/**
 * Check the health of the API
 * @returns {Promise<Object>} - Health status
 */
export const checkApiHealth = async () => {
  try {
    // Use the base URL's /health endpoint, not the API_URL with /api/v1
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
