import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, isApiAvailable } from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState({ api: false });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Load user data from local storage
    const userData = getCurrentUser();
    if (userData) {
      setUser(userData);
    } else {
      navigate('/login');
    }
    setLoading(false);
    
    // Check server status
    const checkServerStatus = async () => {
      try {
        const apiAvailable = await isApiAvailable();
        
        console.log("Server status:", { api: apiAvailable });
        
        setServerStatus({
          api: apiAvailable
        });
      } catch (err) {
        console.error('Error checking server status:', err);
        setServerStatus({
          api: false
        });
      }
    };
    
    checkServerStatus();
    
    // Check server status periodically
    const statusInterval = setInterval(checkServerStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(statusInterval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      <div className="content-area">
        {/* User Info Card */}
        <div className="card">
          <h2>Your Profile</h2>
          {user && (
            <div>
              <p><strong>Username:</strong> {user.username}</p>
              {user.email && <p><strong>Email:</strong> {user.email}</p>}
            </div>
          )}
        </div>
        
        {/* Features Card */}
        <div className="card">
          <h2>Available Features</h2>
          <ul className="features-list">
            <li>User profile management</li>
            <li>Secure authentication</li>
            <li>Session management</li>
            <li>System status monitoring</li>
          </ul>
        </div>
        
        {/* Server Status Card */}
        <div className="card">
          <h2>System Status</h2>
          <div className="server-status">
            <div className="status-item">
              <span>API Server:</span>
              <span className={serverStatus.api ? 'status-online' : 'status-offline'}>
                {serverStatus.api ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="status-timestamp">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;