import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HumanizeText.css';

/**
 * Sanitizes potential HTML content to plain text
 * @param {string} text - Text that might contain HTML
 * @returns {string} - Plain text without HTML tags
 */
const sanitizeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Check if this looks like HTML
  if (text.includes('<html') || text.includes('<!doctype') || 
      (text.includes('<') && text.includes('>') && 
       (text.includes('<div') || text.includes('<p') || text.includes('<body')))) {
    
    console.log('Frontend detected HTML content, sanitizing...');
    
    // Simple HTML tag removal (basic sanitization)
    return text
      .replace(/<[^>]*>/g, ' ')  // Replace tags with spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .trim();                   // Trim extra spaces
  }
  
  return text;
};

/**
 * Detects if the text looks like an error message or page
 * @param {string} text - Text to check
 * @returns {boolean} - True if it looks like an error
 */
const isErrorPage = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const errorIndicators = [
    'You need to enable JavaScript',
    '<!doctype html>',
    '<html',
    '<body>',
    'Error',
    '404',
    '500',
    'Not Found',
    'Internal Server Error',
    'JavaScript is required',
    'enable JavaScript',
    'User Registration'
  ];
  
  return errorIndicators.some(indicator => 
    text.toLowerCase().includes(indicator.toLowerCase())
  );
};

const HumanizeText = () => {
  const [inputText, setInputText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [wordLimit, setWordLimit] = useState(500);
  const [debugInfo, setDebugInfo] = useState(null);

  // Word limits by tier
  const WORD_LIMITS = {
    'free': 500,
    'standard': 2500,
    'premium': 12500
  };

  // Configure axios with auth header
  const apiClient = axios.create({
    baseURL: '',  // Empty string for relative paths
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain'
    },
    timeout: 15000 // 15 second timeout
  });

  // Add authorization token to requests
  apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Try to get user info from local storage first
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          // Set tier if available, otherwise use default
          setUserTier(user.tier || 'free');
          setWordLimit(WORD_LIMITS[user.tier] || WORD_LIMITS.free);
        }
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
    setOriginalText('');
    setDebugInfo(null);
    
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
    setOriginalText(inputText); // Set original text first so it's always available
    
    try {
      console.log('Sending request to humanize with content:', inputText.substring(0, 50) + '...');
      
      // Try multiple endpoints in case the app is deployed with different base paths
      let response;
      const possibleEndpoints = [
        '/api/v1/humanize/humanize',  // Standard API path
        '/humanize/humanize',         // Without api/v1 prefix
        '/api/humanize',              // Alternative API path
      ];
      
      let lastError = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.post(endpoint, { 
            content: inputText 
          });
          console.log(`Successfully called ${endpoint}`);
          break; // Stop trying endpoints if one works
        } catch (err) {
          console.warn(`Failed to call ${endpoint}:`, err.message);
          lastError = err;
          // Continue to the next endpoint
        }
      }
      
      // If we still don't have a response after trying all endpoints
      if (!response) {
        throw lastError || new Error('Failed to call any humanize endpoint');
      }
      
      console.log('API Response:', response.data);
      
      // Save debug info regardless of success
      setDebugInfo(response.data);
      
      // Process the response data
      if (response.data && response.data.success) {
        // Backend should return humanizedContent directly 
        if (response.data.humanizedContent) {
          const processedText = sanitizeHtml(response.data.humanizedContent);
          
          // Check for HTML content or error pages
          if (isErrorPage(processedText)) {
            throw new Error('Received error page from server');
          }
          
          setHumanizedText(processedText);
          setOriginalText(response.data.originalContent || inputText);
        } else {
          throw new Error('Response missing humanized content');
        }
      } else {
        // Unexpected response format
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Humanize error:', error);
      
      setHumanizedText(''); // Clear any partial results
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        setDebugInfo(error.response.data);
        
        if (error.response.status === 401) {
          setError('Authentication required. Please log in again.');
        } else if (error.response.status === 403) {
          setError('You do not have permission to use this feature.');
        } else if (error.response.status === 503) {
          setError('Humanization service is temporarily unavailable. Please try again later.');
        } else if (error.response.data && error.response.data.error) {
          setError(error.response.data.error);
        } else {
          setError(`Server error (${error.response.status}). Please try again later.`);
        }
      } else if (error.request) {
        setError('No response received from server. Please check your internet connection.');
      } else {
        setError(`Error: ${error.message || 'Unknown error occurred'}`);
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

      {/* Add a comparison view */}
      {originalText && humanizedText && (
        <div className="comparison-container">
          <h3>Compare Results:</h3>
          <div className="comparison-grid">
            <div className="comparison-column">
              <h4>Original Text:</h4>
              <div className="original-text">
                {originalText}
              </div>
            </div>
            <div className="comparison-column">
              <h4>Humanized Text:</h4>
              <div className="humanized-text">
                {humanizedText}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug section - only show in development */}
      {debugInfo && process.env.NODE_ENV === 'development' && (
        <div className="debug-section">
          <h4>Debug Information:</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default HumanizeText;