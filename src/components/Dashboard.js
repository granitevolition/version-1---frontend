import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isLoggedIn, logoutUser, verifySession } from '../services/api';
import '../styles/Dashboard.css';

// How often to verify the session, in milliseconds
const SESSION_VERIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

const Dashboard = () => {
  const [user, setUser] = useState(getCurrentUser()); // Initialize from localStorage
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle logout with useCallback to avoid recreating this function on each render
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Function to check authentication, wrapped in useCallback
  const checkAuthentication = useCallback(async () => {
    // Skip if already loading
    if (loading) return;

    try {
      setLoading(true);
      
      // Check if user is logged in based on localStorage
      if (!isLoggedIn()) {
        navigate('/login');
        return;
      }

      // Only verify session with the server if we have a token
      if (isLoggedIn()) {
        try {
          const sessionData = await verifySession();
          // Update user data with the latest from server
          setUser(sessionData.user);
        } catch (sessionErr) {
          console.error('Session verification failed:', sessionErr);
          await logoutUser(); // Clear session
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Authentication check failed:', err);
      setError('Failed to verify authentication. Please try logging in again.');
    } finally {
      setLoading(false);
    }
  }, [loading, navigate]);

  // Run authentication check only once on mount
  useEffect(() => {
    // If not logged in, redirect immediately without API call
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    
    // Otherwise check authentication with API
    checkAuthentication();
    
    // Set up periodic session verification
    const intervalId = setInterval(() => {
      if (isLoggedIn()) {
        // Use a silent verification that doesn't show loading state
        verifySession().catch(err => {
          console.error('Periodic session verification failed:', err);
          handleLogout();
        });
      } else {
        clearInterval(intervalId);
      }
    }, SESSION_VERIFICATION_INTERVAL);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(intervalId);
  }, [checkAuthentication, handleLogout, navigate]);

  // Show loading indicator only during initial authentication
  if (loading && !user) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // If no user data yet, show minimal loading interface
  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <button 
          onClick={handleLogout} 
          className="logout-button"
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        <div className="user-card">
          <div className="user-info">
            <h2>User Profile</h2>
            <div className="profile-detail">
              <span className="detail-label">Username:</span>
              <span className="detail-value">{user.username}</span>
            </div>
            <div className="profile-detail">
              <span className="detail-label">User ID:</span>
              <span className="detail-value">{user.id}</span>
            </div>
            {user.email && (
              <div className="profile-detail">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="profile-detail">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panels">
          <div className="panel">
            <h3>Quick Access</h3>
            <div className="panel-content">
              <p>This is your personalized dashboard. More features coming soon!</p>
              <div className="action-buttons">
                <button className="action-button">Update Profile</button>
                <button className="action-button">Security Settings</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Recent Activity</h3>
            <div className="panel-content">
              <p>No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
