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
          <div className="features-list">
            <div className="feature-item">
              <h3>AI Detector</h3>
              <p>Analyze text to determine if it was written by AI or a human.</p>
              <button 
                onClick={() => navigate('/ai-detector')} 
                className="primary-button"
                disabled={!serverStatus.api}
              >
                Use AI Detector
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Tips Card */}
        <div className="card">
          <h2>Tips for Better Results</h2>
          <ul className="tips-list">
            <li>Use the AI Detector for analyzing suspicious content</li>
            <li>For best results, use text between 100-1000 words</li>
            <li>The AI detection is not 100% accurate and should be used as a guide</li>
            <li>Keep your account secure by logging out when not in use</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;