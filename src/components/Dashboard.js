import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isLoggedIn, logoutUser, verifySession } from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user is logged in
        if (!isLoggedIn()) {
          navigate('/login');
          return;
        }

        // Load user data from local storage
        const userData = getCurrentUser();
        setUser(userData);

        // Verify session with the server
        try {
          const sessionData = await verifySession();
          // Update user data with the latest from server
          setUser(sessionData.user);
        } catch (sessionErr) {
          // Session verification failed, redirect to login
          console.error('Session verification failed:', sessionErr);
          await logoutUser(); // Clear session
          navigate('/login');
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to verify authentication. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {user && (
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
      )}
    </div>
  );
};

export default Dashboard;
