import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, isApiAvailable } from '../services/api';
import { humanizeText, isHumanizerAvailable } from '../services/humanizeApi';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Default to true for better user experience - we'll verify on load
  const [serverStatus, setServerStatus] = useState({ api: true, humanizer: true, checking: false });
  
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
        // Indicate we're checking
        setServerStatus(prev => ({
          ...prev,
          checking: true
        }));

        // Check API availability
        let apiAvailable = true;
        try {
          apiAvailable = await isApiAvailable();
        } catch (err) {
          console.error('Error checking API status:', err);
          // Don't automatically set to false on error
        }
        
        // Check humanizer availability
        let humanizerAvailable = true;
        try {
          humanizerAvailable = await isHumanizerAvailable();
        } catch (err) {
          console.error('Error checking humanizer status:', err);
          // Don't automatically set to false on error
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
        // Don't automatically set to false on error
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
      // Actually try using the service regardless of what the status check says
      // This gives us a chance to actually test the service with real data
      const result = await humanizeText(originalText);
      setHumanizedText(result.humanizedText);
      
      // If we successfully connected, update the service status
      setServerStatus(prev => ({
        ...prev,
        humanizer: true
      }));
    } catch (err) {
      console.error('Humanization error:', err);
      setHumanizeError(err.message || 'Server Error: Unable to humanize text. The server may be offline.');
      
      // Only mark the service as unavailable if we get a connection error
      if (err.message.includes('offline') || 
          err.message.includes('connect') || 
          err.message.includes('Failed to fetch')) {
        setServerStatus(prev => ({
          ...prev,
          humanizer: false
        }));
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
      
      // Force the check regardless of cache
      localStorage.removeItem('working_check_strategy');
      const humanizerAvailable = await isHumanizerAvailable();
      
      setServerStatus(prev => ({ 
        ...prev, 
        humanizer: humanizerAvailable,
        checking: false,
        lastChecked: new Date().toISOString()
      }));
      
      if (humanizerAvailable) {
        // Clear any previous errors if the service is now available
        setHumanizeError('');
      }
    } catch (err) {
      console.error('Manual status check failed:', err);
      setServerStatus(prev => ({ 
        ...prev, 
        checking: false,
        lastChecked: new Date().toISOString()
      }));
    }
  };
  
  // Function to enable mock mode for development/testing
  const enableMockMode = () => {
    localStorage.setItem('use_mock_humanizer', 'true');
    alert('Mock mode enabled - Humanizer service will be treated as available');
    checkServiceStatus();
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
          <div className="status-actions">
            <button onClick={checkServiceStatus} className="check-status-button" disabled={serverStatus.checking}>
              {serverStatus.checking ? 'Checking...' : 'Check service status again'}
            </button>
            <button onClick={enableMockMode} className="mock-mode-button">
              Enable mock mode (for development)
            </button>
          </div>
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
                // Always allow typing even if service appears offline - we'll try anyway
                className="humanize-textarea"
              />
            </div>

            {humanizeError && (
              <div className="error-message">
                {humanizeError}
                {humanizeError.includes('offline') && (
                  <button onClick={checkServiceStatus} className="retry-button">
                    {serverStatus.checking ? 'Checking...' : 'Check connection again'}
                  </button>
                )}
              </div>
            )}

            <button 
              type="submit" 
              className="primary-button humanize-button"
              disabled={processingText || !originalText}
            >
              {processingText ? 'Processing...' : 'Humanize Text'}
            </button>
            
            {!serverStatus.humanizer && (
              <p className="offline-message">
                The service appears to be offline, but you can still try. It might work!
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