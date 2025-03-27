import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { humanizeText, detectAiContent, isHumanizerAvailable } from '../services/humanizeApi';
import { isLoggedIn, isApiAvailable } from '../services/api';
import '../styles/HumanizeText.css';

const HumanizeText = () => {
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({
    humanizer: { status: 'checking', message: 'Checking service...' },
    api: { status: 'checking', message: 'Checking API...' }
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [aiScore, setAiScore] = useState(null);
  const [showAiScore, setShowAiScore] = useState(false);
  const navigate = useNavigate();

  // Check service availability and authentication
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user is logged in
        if (!isLoggedIn()) {
          navigate('/login', { state: { from: '/humanize' } });
          return;
        }
      
        // Check API availability
        try {
          const apiAvailable = await isApiAvailable();
          setServiceStatus(prev => ({
            ...prev,
            api: {
              status: apiAvailable ? 'available' : 'unavailable',
              message: apiAvailable ? 'API connected' : 'API unavailable'
            }
          }));
        } catch (apiErr) {
          console.error('API availability check failed:', apiErr);
          setServiceStatus(prev => ({
            ...prev,
            api: { 
              status: 'error', 
              message: 'Cannot connect to API' 
            }
          }));
        }
        
        // Check the humanizer service availability
        try {
          const available = await isHumanizerAvailable();
          setServiceStatus(prev => ({
            ...prev,
            humanizer: {
              status: available ? 'available' : 'unavailable',
              message: available ? 'Humanizer service connected' : 'Humanizer service unavailable'
            }
          }));
          
          if (!available) {
            setMessage('Humanization service is currently in fallback mode. Basic features will still work, but results may be less effective.');
          }
        } catch (err) {
          console.error('Service availability check failed:', err);
          setServiceStatus(prev => ({
            ...prev,
            humanizer: { 
              status: 'error', 
              message: 'Cannot connect to humanizer' 
            }
          }));
          setMessage('Connection to humanization service could not be established. Using fallback mode.');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    initialize();
  }, [navigate]);

  // Handle text input change
  const handleInputChange = (e) => {
    setOriginalText(e.target.value);
    
    // Reset results when input changes
    if (humanizedText) {
      setHumanizedText('');
    }
    if (message && !message.includes('fallback mode')) {
      setMessage('');
    }
    if (error) {
      setError('');
    }
    if (showAiScore) {
      setShowAiScore(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!originalText || originalText.trim() === '') {
      setError('Please enter some text to humanize');
      return;
    }
    
    setLoading(true);
    setError('');
    if (!message.includes('fallback mode')) {
      setMessage('');
    }

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
        if (!message.includes('fallback mode')) {
          setMessage(result.message);
        }
      } catch (humanizeErr) {
        console.error('Humanization error:', humanizeErr);
        
        if (humanizeErr.message.includes('Network error') || humanizeErr.message.includes('Failed to fetch')) {
          // For network errors, use local humanization as fallback
          console.log('Using fallback humanization...');
          setHumanizedText(fallbackHumanize(originalText));
          setMessage('Text humanized using fallback method (server unavailable). For best results, try again later.');
        } else {
          throw humanizeErr;
        }
      }
    } catch (err) {
      console.error('Error during humanization process:', err);
      setError(err.message || 'An error occurred while processing the text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy humanized text to clipboard
  const copyToClipboard = () => {
    if (!humanizedText) return;
    
    navigator.clipboard.writeText(humanizedText)
      .then(() => {
        setMessage('Copied to clipboard!');
        setTimeout(() => {
          if (message === 'Copied to clipboard!') {
            setMessage('');
          }
        }, 3000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
  };

  // Download as text file
  const downloadText = () => {
    if (!humanizedText) return;
    
    const element = document.createElement('a');
    const file = new Blob([humanizedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'andikar-humanized-text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="humanize-container">
      <div className="humanize-card">
        <h1>Andikar AI Text Humanizer</h1>
        <p className="humanize-description">
          Transform AI-generated content into natural, human-like text that bypasses AI detection.
        </p>

        <div className="service-status-bar">
          <div className={`service-indicator ${serviceStatus.api.status}`}>
            API: {serviceStatus.api.status === 'available' ? 'Online' : 'Offline'}
          </div>
          <div className={`service-indicator ${serviceStatus.humanizer.status}`}>
            Humanizer: {serviceStatus.humanizer.status === 'available' ? 'Online' : 'Fallback Mode'}
          </div>
        </div>

        {serviceStatus.humanizer.status !== 'available' && (
          <div className="warning-message">
            <strong>Using Fallback Mode:</strong> The humanization service is currently operating with reduced capabilities. Results may be less effective.
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="original-text">Original AI Text</label>
            <textarea
              id="original-text"
              value={originalText}
              onChange={handleInputChange}
              placeholder="Paste your AI-generated text here..."
              rows={10}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="humanize-button"
            disabled={loading || !originalText}
          >
            {loading ? 'Processing...' : 'Humanize Text'}
          </button>
        </form>

        {showAiScore && aiScore && (
          <div className="ai-detection-result">
            <h3>AI Detection Analysis</h3>
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
            <div className="detection-recommendation">
              {aiScore.ai_score > 70 ? (
                <div className="high-risk">
                  <strong>High AI Detection Risk</strong>
                  <p>This text is likely to be flagged as AI-generated. Humanizing is recommended.</p>
                </div>
              ) : aiScore.ai_score > 40 ? (
                <div className="medium-risk">
                  <strong>Medium AI Detection Risk</strong>
                  <p>This text has some AI indicators. Humanizing can make it more natural.</p>
                </div>
              ) : (
                <div className="low-risk">
                  <strong>Low AI Detection Risk</strong>
                  <p>This text already appears natural and is unlikely to be flagged as AI-generated.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {humanizedText && (
          <div className="result-section">
            <h2>Humanized Result</h2>
            <div className="humanized-text">
              <p>{humanizedText}</p>
            </div>
            <div className="result-actions">
              <button onClick={copyToClipboard} className="action-button">
                Copy to Clipboard
              </button>
              <button onClick={downloadText} className="action-button">
                Download as Text
              </button>
            </div>
          </div>
        )}
      </div>
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

export default HumanizeText;
