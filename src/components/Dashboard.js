import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, isApiAvailable } from '../services/api';
import { humanizeText, isHumanizerAvailable } from '../services/humanizeApi';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState({ api: true, humanizer: true });
  
  // Humanizer functionality
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [processingText, setProcessingText] = useState(false);
  const [humanizeError, setHumanizeError] = useState('');
  
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
        // Start by assuming services are available
        setServerStatus(prev => ({
          ...prev,
          checking: true
        }));

        // Check API availability
        const apiAvailable = await isApiAvailable();
        
        // Check humanizer availability - use a try/catch to prevent false negatives
        let humanizerAvailable = true;
        try {
          humanizerAvailable = await isHumanizerAvailable();
        } catch (err) {
          console.error('Error checking humanizer status:', err);
          // Default to true if there's an error checking (prevents false negatives)
          humanizerAvailable = true;
        }
        
        console.log("Server status:", { api: apiAvailable, humanizer: humanizerAvailable });
        
        setServerStatus({
          api: apiAvailable,
          humanizer: humanizerAvailable,
          checking: false,
          lastChecked: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error checking server status:', err);
        // Don't automatically set services to offline on error
        setServerStatus(prev => ({
          ...prev,
          checking: false,
          lastChecked: new Date().toISOString()
        }));
      }
    };
    
    // Run the initial check
    checkServerStatus();
    
    // Check server status periodically (every 30 seconds)
    const statusInterval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(statusInterval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    setOriginalText(e.target.value);
    setHumanizedText('');
    setHumanizeError('');
  };

  const handleHumanizeSubmit = async (e) => {
    e.preventDefault();
    
    if (!originalText || originalText.trim() === '') {
      setHumanizeError('Please enter some text to humanize');
      return;
    }
    
    setProcessingText(true);
    setHumanizeError('');

    try {
      // Try to humanize the text
      const result = await humanizeText(originalText);
      setHumanizedText(result.humanizedText);
      
      // If we succeed, update the server status to available
      setServerStatus(prev => ({
        ...prev,
        humanizer: true
      }));
    } catch (err) {
      console.error('Humanization error:', err);
      setHumanizeError(err.message || 'Server Error: Unable to humanize text. The server may be offline.');
      
      // Only mark the service as unavailable if we get a specific connection error
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('Unable to connect') ||
          err.message.includes('offline')) {
        
        // Double-check availability
        try {
          const available = await isHumanizerAvailable();
          setServerStatus(prev => ({
            ...prev,
            humanizer: available
          }));
        } catch (checkErr) {
          // On error checking, don't automatically mark as unavailable
          console.error('Error checking humanizer service after error:', checkErr);
        }
      }
    } finally {
      setProcessingText(false);
    }
  };
  
  const copyToClipboard = () => {
    if (!humanizedText) return;
    
    navigator.clipboard.writeText(humanizedText)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  };

  // Function to manually check service status
  const checkServiceStatus = async () => {
    try {
      setServerStatus(prev => ({ ...prev, checking: true }));
      const humanizerAvailable = await isHumanizerAvailable();
      setServerStatus(prev => ({ 
        ...prev, 
        humanizer: humanizerAvailable,
        checking: false,
        lastChecked: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Manual status check failed:', err);
      setServerStatus(prev => ({ 
        ...prev, 
        checking: false,
        lastChecked: new Date().toISOString()
      }));
    }
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
      
      {!serverStatus.humanizer && (
        <div className="server-status-alert">
          <strong>⚠️ Humanizer service is currently offline.</strong>
          <p>The text humanizing feature is not available. This could be due to scheduled maintenance or a temporary service disruption.</p>
          <p>Please try again later or contact support if the problem persists.</p>
          <button onClick={checkServiceStatus} className="check-status-button">
            {serverStatus.checking ? 'Checking...' : 'Check service status again'}
          </button>
        </div>
      )}
      
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
          <p className={serverStatus.humanizer ? 'status-online' : 'status-offline'}>
            {serverStatus.humanizer ? '● Online' : '● Offline'}
          </p>
        </div>
        
        {/* Humanizer Card - MAIN FEATURE */}
        <div className={`card humanizer-card ${!serverStatus.humanizer ? 'disabled-card' : ''}`}>
          <div className="card-status">
            <span className={serverStatus.humanizer ? 'status-online' : 'status-offline'}>
              {serverStatus.humanizer ? '● Online' : '● Offline'}
            </span>
          </div>
          
          <h2>Text Humanizer</h2>
          <p>Transform AI-generated content into human-like text.</p>
          
          <form onSubmit={handleHumanizeSubmit}>
            <div className="form-group">
              <label htmlFor="original-text">Paste your AI-generated text here:</label>
              <textarea
                id="original-text"
                value={originalText}
                onChange={handleInputChange}
                placeholder="Enter text to humanize..."
                rows={8}
                disabled={processingText || !serverStatus.humanizer}
                className="humanize-textarea"
              />
            </div>

            {humanizeError && <div className="error-message">{humanizeError}</div>}

            <button 
              type="submit" 
              className="primary-button humanize-button"
              disabled={processingText || !originalText || !serverStatus.humanizer}
            >
              {processingText ? 'Processing...' : 'Humanize Text'}
            </button>
            
            {!serverStatus.humanizer && (
              <p className="offline-message">
                This feature is currently unavailable because the humanizer service is offline.
              </p>
            )}
          </form>

          {humanizedText && (
            <div className="result-box">
              <h3>Humanized Result:</h3>
              <div className="result-text">
                <p>{humanizedText}</p>
              </div>
              <button onClick={copyToClipboard} className="secondary-button">
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
        
        {/* Quick Tips Card */}
        <div className="card">
          <h2>Tips for Better Results</h2>
          <ul className="tips-list">
            <li>Paste AI-generated content in the text area above</li>
            <li>Click "Humanize Text" to transform it</li>
            <li>For best results, use text between 100-1000 words</li>
            <li>The humanized text will appear below the button</li>
            <li>Use "Copy to Clipboard" to save the results</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;