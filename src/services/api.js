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

// Other API functions remain the same...

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

// Other functions remain unchanged from previous implementation
export { registerUser, loginUser, logoutUser, isLoggedIn, getCurrentUser, getAuthHeader, verifySession };
