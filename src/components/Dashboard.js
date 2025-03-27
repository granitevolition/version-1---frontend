import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/api';
import { humanizeText } from '../services/humanizeApi';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
        <h1>Welcome to Andikar AI Dashboard</h1>
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
        
        {/* Humanizer Card */}
        <div className="card">
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
                rows={5}
                disabled={processingText}
              />
            </div>

            {humanizeError && <div className="error-message">{humanizeError}</div>}

            <button 
              type="submit" 
              className="primary-button"
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
      </div>
    </div>
  );
};

export default Dashboard;
