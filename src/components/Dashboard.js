import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isLoggedIn, logoutUser, verifySession, isApiAvailable } from '../services/api';
import { isHumanizerAvailable } from '../services/humanizeApi';
import HumanizeStats from './HumanizeStats';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [services, setServices] = useState({
    api: { status: 'checking', message: 'Checking API availability...' },
    humanizer: { status: 'checking', message: 'Checking humanizer service...' }
  });
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
        console.log('User data loaded from local storage:', userData);
        
        // Check API availability
        try {
          const apiAvailable = await isApiAvailable();
          setServices(prev => ({
            ...prev,
            api: {
              status: apiAvailable ? 'available' : 'unavailable',
              message: apiAvailable ? 'API is available' : 'API is unavailable'
            }
          }));
        } catch (apiErr) {
          console.error('API availability check failed:', apiErr);
          setServices(prev => ({
            ...prev,
            api: { status: 'error', message: 'Error checking API: ' + apiErr.message }
          }));
        }
        
        // Check humanizer availability
        try {
          const humanizerAvailable = await isHumanizerAvailable();
          setServices(prev => ({
            ...prev,
            humanizer: {
              status: humanizerAvailable ? 'available' : 'unavailable',
              message: humanizerAvailable ? 'Humanizer is available' : 'Humanizer is unavailable'
            }
          }));
        } catch (humanizerErr) {
          console.error('Humanizer availability check failed:', humanizerErr);
          setServices(prev => ({
            ...prev,
            humanizer: { status: 'error', message: 'Error checking humanizer: ' + humanizerErr.message }
          }));
        }

        // Verify session with the server asynchronously
        try {
          console.log('Verifying session with server...');
          const sessionData = await verifySession();
          console.log('Session verified successfully:', sessionData);
          // Update user data with the latest from server
          setUser(sessionData.user);
        } catch (sessionErr) {
          console.error('Session verification failed:', sessionErr);
          // Don't force logout here, as the session might be valid locally
          // but temporarily unavailable due to backend issues
        }

        setLoading(false);
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to verify authentication. Please try logging in again.');
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

  const navigateTo = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading your dashboard...</div>
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
      
      {/* Service Status */}
      <div className="service-status">
        <div className={`service-indicator ${services.api.status}`}>
          API: {services.api.status === 'available' ? 'Online' : 'Offline'}
        </div>
        <div className={`service-indicator ${services.humanizer.status}`}>
          Humanizer: {services.humanizer.status === 'available' ? 'Online' : 'Offline'}
        </div>
      </div>

      {user && (
        <div className="dashboard-content">
          <div className="user-card">
            <div className="user-info">
              <h2>User Profile</h2>
              <div className="profile-detail">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{user.username}</span>
              </div>
              {user.email && (
                <div className="profile-detail">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
              )}
              <div className="profile-detail">
                <span className="detail-label">User ID:</span>
                <span className="detail-value">{user.id}</span>
              </div>
            </div>
          </div>

          <div className="feature-cards">
            <div 
              className={`feature-card ${services.humanizer.status !== 'available' ? 'disabled' : ''}`}
              onClick={() => services.humanizer.status === 'available' && navigateTo('/humanize')}
            >
              <div className="feature-icon humanize-icon">Humanize</div>
              <h3>Humanize AI Text</h3>
              <p>Transform AI-generated content into natural, human-like text that bypasses AI detection.</p>
              {services.humanizer.status === 'available' ? (
                <button className="feature-button">Go to Humanizer</button>
              ) : (
                <div className="feature-unavailable">Service Unavailable</div>
              )}
            </div>

            <div 
              className={`feature-card ${services.api.status !== 'available' ? 'disabled' : ''}`}
              onClick={() => services.api.status === 'available' && navigateTo('/ai-detector')}
            >
              <div className="feature-icon detector-icon">Detect</div>
              <h3>AI Content Detector</h3>
              <p>Check if your text will be flagged as AI-generated by detection tools.</p>
              {services.api.status === 'available' ? (
                <button className="feature-button">Go to Detector</button>
              ) : (
                <div className="feature-unavailable">Service Unavailable</div>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          {services.api.status === 'available' ? (
            <HumanizeStats />
          ) : (
            <div className="stats-unavailable">
              <h2>Text Humanization Stats</h2>
              <p>Statistics are unavailable while the API is offline.</p>
            </div>
          )}

          <div className="dashboard-panels">
            <div className="panel">
              <h3>Quick Tips</h3>
              <div className="panel-content">
                <p>Get the most out of our text humanization tools:</p>
                <ul className="tips-list">
                  <li>Use the AI detector first to see if your text needs humanizing</li>
                  <li>Text with an AI score above 70% is likely to be flagged as AI-generated</li>
                  <li>Always review humanized content before using it</li>
                  <li>For best results, start with well-written AI content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
