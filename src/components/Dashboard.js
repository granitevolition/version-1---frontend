import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isLoggedIn, logoutUser, verifySession, isApiAvailable } from '../services/api';
import { isHumanizerAvailable, humanizeText, detectAiContent } from '../services/humanizeApi';
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
  
  // Humanizer functionality
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [processingText, setProcessingText] = useState(false);
  const [aiScore, setAiScore] = useState(null);
  const [showAiScore, setShowAiScore] = useState(false);
  const [humanizeMessage, setHumanizeMessage] = useState('');
  
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

  const handleInputChange = (e) => {
    setOriginalText(e.target.value);
    
    // Reset results when input changes
    if (humanizedText) {
      setHumanizedText('');
    }
    if (humanizeMessage) {
      setHumanizeMessage('');
    }
    if (showAiScore) {
      setShowAiScore(false);
    }
  };

  const handleHumanizeSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!originalText || originalText.trim() === '') {
      setError('Please enter some text to humanize');
      return;
    }
    
    setProcessingText(true);
    setError('');
    setHumanizeMessage('');

    try {
      // First, detect if the text appears to be AI-generated
      try {
        console.log('Detecting AI content...');
        const detection = await detectAiContent(originalText);
        console.log('AI detection result:', detection);
        setAiScore(detection);
        setShowAiScore(true);
      } catch (detectionErr) {
        console.error('AI detection error:', detectionErr);
        // Continue with humanization even if detection fails
      }
      
      // Then humanize the text
      try {
        console.log('Sending text to humanizer...');
        const result = await humanizeText(originalText, aiScore);
        console.log('Humanization successful');
        
        setHumanizedText(result.humanizedText);
        setHumanizeMessage(result.message || 'Text successfully humanized!');
      } catch (humanizeErr) {
        console.error('Humanization error:', humanizeErr);
        
        if (humanizeErr.message.includes('Network error') || humanizeErr.message.includes('Failed to fetch')) {
          // For network errors, use local humanization as fallback
          console.log('Using fallback humanization...');
          setHumanizedText(fallbackHumanize(originalText));
          setHumanizeMessage('Text humanized using fallback method (server unavailable). For best results, try again later.');
        } else {
          throw humanizeErr;
        }
      }
    } catch (err) {
      console.error('Error during humanization process:', err);
      setError(err.message || 'An error occurred while processing the text. Please try again.');
    } finally {
      setProcessingText(false);
    }
  };
  
  // Copy humanized text to clipboard
  const copyToClipboard = () => {
    if (!humanizedText) return;
    
    navigator.clipboard.writeText(humanizedText)
      .then(() => {
        setHumanizeMessage('Copied to clipboard!');
        setTimeout(() => {
          if (humanizeMessage === 'Copied to clipboard!') {
            setHumanizeMessage('');
          }
        }, 3000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
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
        <h1>Welcome to Andikar AI Dashboard</h1>
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
          {/* User Profile Card */}
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

          {/* Direct Humanize Card */}
          <div className="humanize-card">
            <h2>Text Humanizer</h2>
            <p>Transform AI-generated content into natural, human-like text that bypasses AI detection.</p>
            
            {services.humanizer.status !== 'available' && (
              <div className="warning-message">
                <strong>Using Fallback Mode:</strong> The humanization service is currently operating with reduced capabilities. Results may be less effective.
              </div>
            )}
            
            {humanizeMessage && <div className="success-message">{humanizeMessage}</div>}
            
            <form onSubmit={handleHumanizeSubmit}>
              <div className="form-group">
                <label htmlFor="original-text">Paste your AI-generated text here:</label>
                <textarea
                  id="original-text"
                  value={originalText}
                  onChange={handleInputChange}
                  placeholder="Enter the text you want to humanize..."
                  rows={6}
                  disabled={processingText}
                />
              </div>

              <button 
                type="submit" 
                className="humanize-button"
                disabled={processingText || !originalText}
              >
                {processingText ? 'Processing...' : 'Humanize Text'}
              </button>
            </form>

            {showAiScore && aiScore && (
              <div className="ai-detection-result">
                <h3>AI Detection Results</h3>
                <div className="detection-meters">
                  <div className="meter-container">
                    <div className="meter-label">AI Probability</div>
                    <div className="meter">
                      <div 
                        className="meter-bar" 
                        style={{ 
                          width: `${aiScore.ai_score}%`, 
                          backgroundColor: `rgba(255, 0, 0, ${aiScore.ai_score / 100})` 
                        }}
                      />
                    </div>
                    <div className="meter-value">{aiScore.ai_score}%</div>
                  </div>
                  <div className="meter-container">
                    <div className="meter-label">Human Probability</div>
                    <div className="meter">
                      <div 
                        className="meter-bar" 
                        style={{ 
                          width: `${aiScore.human_score}%`, 
                          backgroundColor: `rgba(0, 255, 0, ${aiScore.human_score / 100})` 
                        }}
                      />
                    </div>
                    <div className="meter-value">{aiScore.human_score}%</div>
                  </div>
                </div>
              </div>
            )}

            {humanizedText && (
              <div className="result-section">
                <h3>Humanized Result</h3>
                <div className="humanized-text">
                  <p>{humanizedText}</p>
                </div>
                <div className="result-actions">
                  <button onClick={copyToClipboard} className="action-button">
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          {services.api.status === 'available' && (
            <HumanizeStats />
          )}

          {/* Tips Panel */}
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

/**
 * Fallback humanization function for when the API is unavailable
 * This is only for development/testing or when the backend is down
 */
function fallbackHumanize(text) {
  // This is a very simplified version that adds some human-like elements
  
  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  // Process each sentence
  const processedSentences = sentences.map(sentence => {
    // Occasionally add filler words
    if (Math.random() < 0.2) {
      const fillers = ["I mean, ", "Like, ", "You know, ", "Basically, ", "Actually, "];
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      sentence = filler + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }
    
    // Occasionally replace formal words
    const formalToInformal = {
      "Additionally": "Also",
      "Furthermore": "Plus",
      "Subsequently": "Then",
      "Therefore": "So",
      "However": "But",
      "Nevertheless": "Still",
      "Consequently": "So",
      "Approximately": "About",
      "Sufficient": "Enough",
      "Numerous": "Many",
      "Utilize": "Use",
      "Obtain": "Get",
      "Purchase": "Buy",
      "Residence": "Home"
    };
    
    Object.entries(formalToInformal).forEach(([formal, informal]) => {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      if (Math.random() < 0.7) { // 70% chance to replace
        sentence = sentence.replace(regex, informal);
      }
    });
    
    return sentence;
  });
  
  // Join sentences, occasionally inserting contractions
  let humanizedText = processedSentences.join(' ');
  
  // Convert some phrases to contractions
  const fullToContraction = {
    "it is": "it's",
    "I am": "I'm",
    "you are": "you're",
    "they are": "they're",
    "we are": "we're",
    "he is": "he's",
    "she is": "she's",
    "that is": "that's",
    "there is": "there's",
    "who is": "who's",
    "what is": "what's",
    "cannot": "can't",
    "will not": "won't",
    "should not": "shouldn't",
    "could not": "couldn't",
    "would not": "wouldn't",
    "do not": "don't",
    "does not": "doesn't",
    "did not": "didn't",
    "have not": "haven't",
    "has not": "hasn't",
    "had not": "hadn't",
    "I will": "I'll",
    "you will": "you'll",
    "he will": "he'll",
    "she will": "she'll",
    "we will": "we'll",
    "they will": "they'll"
  };
  
  Object.entries(fullToContraction).forEach(([full, contraction]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    if (Math.random() < 0.8) { // 80% chance to use contractions
      humanizedText = humanizedText.replace(regex, contraction);
    }
  });
  
  return humanizedText;
}

export default Dashboard;
