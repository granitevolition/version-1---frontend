import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, isApiAvailable } from '../services/api';
import { humanizeText, isHumanizerAvailable } from '../services/humanizeApi';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState(null);
  
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
        const apiAvailable = await isApiAvailable();
        const humanizerAvailable = await isHumanizerAvailable();
        
        setServerStatus({
          api: apiAvailable,
          humanizer: humanizerAvailable
        });
      } catch (err) {
        console.error('Error checking server status:', err);
        setServerStatus({
          api: false,
          humanizer: false
        });
      }
    };
    
    checkServerStatus();
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
      const result = await humanizeText(originalText);
      setHumanizedText(result.humanizedText);
    } catch (err) {
      console.error('Humanization error:', err);
      setHumanizeError('Server Error: Unable to humanize text. The server may be offline.');
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
      
      {serverStatus && !serverStatus.humanizer && (
        <div className="server-status-alert">
          ⚠️ Humanizer service is unavailable. The text processing may not work correctly.
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
        </div>
        
        {/* Humanizer Card - MAIN FEATURE */}
        <div className="card humanizer-card">
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
                disabled={processingText}
                className="humanize-textarea"
              />
            </div>

            {humanizeError && <div className="error-message">{humanizeError}</div>}

            <button 
              type="submit" 
              className="primary-button humanize-button"
              disabled={processingText || !originalText}
            >
              {processingText ? 'Processing...' : 'Humanize Text'}
            </button>
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
