/**
 * API Service for backend communication
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Response from API
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
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
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
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
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({ sessionToken }),
        });
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
    
    const sessionToken = localStorage.getItem('sessionToken');
    
    const response = await fetch(`${API_URL}/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ sessionToken }),
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
    throw error;
  }
};
