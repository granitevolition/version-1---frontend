import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HumanizeText.css';

const HumanizeText = () => {
  const [inputText, setInputText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [wordLimit, setWordLimit] = useState(500);

  // Word limits by tier
  const WORD_LIMITS = {
    'free': 500,
    'standard': 2500,
    'premium': 12500
  };

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('/api/user/profile');
        const tier = response.data.tier || 'free';
        setUserTier(tier);
        setWordLimit(WORD_LIMITS[tier] || WORD_LIMITS.free);
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  // Update word count as user types
  useEffect(() => {
    const count = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
    setWordCount(count);
  }, [inputText]);

  const handleHumanize = async () => {
    setError('');
    setHumanizedText('');
    
    if (!inputText.trim()) {
      setError('Please enter some text to humanize');
      return;
    }
    
    // Client-side word count check for better UX
    if (wordCount > wordLimit) {
      setError(`Word limit exceeded. Your ${userTier} account allows up to ${wordLimit} words.`);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('/api/humanize', { text: inputText });
      setHumanizedText(response.data.humanizedText);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to humanize text. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="humanize-container">
      <h2>Humanize AI-Generated Text</h2>
      
      <div className="tier-info">
        <p>Your account: <strong>{userTier}</strong> (Limit: {wordLimit} words)</p>
      </div>
      
      <div className="text-input-container">
        <label htmlFor="input-text">Enter text to humanize:</label>
        <textarea
          id="input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your AI-generated text here..."
          rows={8}
        />
        <div className="word-count">
          <span className={wordCount > wordLimit ? 'error' : ''}>
            {wordCount} / {wordLimit} words
          </span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        onClick={handleHumanize} 
        disabled={loading || wordCount === 0 || wordCount > wordLimit}
        className="humanize-button"
      >
        {loading ? 'Humanizing...' : 'Humanize Text'}
      </button>
      
      {humanizedText && (
        <div className="result-container">
          <h3>Humanized Text:</h3>
          <div className="humanized-text">
            {humanizedText}
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(humanizedText)}
            className="copy-button"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default HumanizeText;