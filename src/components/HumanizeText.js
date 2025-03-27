import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { humanizeText, detectAiContent } from '../services/humanizeApi';
import { isLoggedIn } from '../services/api';
import '../styles/HumanizeText.css';

const HumanizeText = () => {
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [aiScore, setAiScore] = useState(null);
  const [showAiScore, setShowAiScore] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { state: { from: '/humanize' } });
    }
  }, [navigate]);

  // Handle text input change
  const handleInputChange = (e) => {
    setOriginalText(e.target.value);
    
    // Reset results when input changes
    if (humanizedText) {
      setHumanizedText('');
    }
    if (message) {
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
    setMessage('');

    try {
      // First, detect if the text appears to be AI-generated
      const detection = await detectAiContent(originalText);
      setAiScore(detection);
      setShowAiScore(true);
      
      // Then humanize the text
      const result = await humanizeText(originalText);
      
      setHumanizedText(result.humanizedText);
      setMessage(result.message);
    } catch (err) {
      console.error('Error during humanization:', err);
      setError(err.message || 'An error occurred while humanizing the text');
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
    element.download = 'humanized-text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="humanize-container">
      <div className="humanize-card">
        <h1>Humanize AI-generated Text</h1>
        <p className="humanize-description">
          Transform AI-generated content into natural, human-like text that bypasses AI detection.
        </p>

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

export default HumanizeText;
