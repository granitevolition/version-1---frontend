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
  const [testResult, setTestResult] = useState(null);
  const [lastUsed, setLastUsed] = useState(null);
  const [useDirect, setUseDirect] = useState(false);

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
    timeout: 60000 // 60 second timeout - much longer to accommodate API delays
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
        
        // Get last used timestamp
        const lastUsedTime = localStorage.getItem('lastHumanized');
        if (lastUsedTime) {
          setLastUsed(new Date(parseInt(lastUsedTime)));
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
  
  // Test the API connection
  const testApiConnection = async () => {
    setTestResult(null);
    setLoading(true);
    
    try {
      const possibleEndpoints = [
        '/api/v1/humanize/test',  // Standard API path
        '/humanize/test',         // Without api/v1 prefix
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.post(endpoint, {
            text: "This is a test of the humanization API."
          });
          console.log(`Test API succeeded on ${endpoint}`);
          break;
        } catch (err) {
          console.warn(`Test endpoint ${endpoint} failed:`, err.message);
          lastError = err;
        }
      }
      
      if (!response) {
        throw lastError || new Error("All test endpoints failed");
      }
      
      setTestResult({
        success: true,
        message: "API connection test successful",
        data: response.data
      });
    } catch (error) {
      console.error("API test failed:", error);
      setTestResult({
        success: false,
        message: "API connection test failed",
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectHumanize = async () => {
    setError('');
    setHumanizedText('');
    setOriginalText('');
    setDebugInfo(null);
    
    if (!inputText.trim()) {
      setError('Please enter some text to humanize');
      return;
    }
    
    setLoading(true);
    setOriginalText(inputText); // Set original text first so it's always available
    
    try {
      // Use direct endpoint that doesn't require authentication
      const response = await apiClient.post('/api/v1/humanize/direct', { 
        content: inputText 
      });
      
      console.log('Direct API Response:', response.data);
      setDebugInfo(response.data);
      
      if (response.data && response.data.humanizedContent) {
        setHumanizedText(response.data.humanizedContent);
        setOriginalText(response.data.originalContent || inputText);
        localStorage.setItem('lastHumanized', Date.now().toString());
        setLastUsed(new Date());
      } else {
        throw new Error('Invalid response format from direct endpoint');
      }
    } catch (error) {
      console.error('Direct humanize error:', error);
      setHumanizedText('');
      setError(`Error: ${error.message || 'Unknown error occurred'}`);
      if (error.response && error.response.data) {
        setDebugInfo(error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHumanize = async () => {
    if (useDirect) {
      return handleDirectHumanize();
    }
    
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
          console.log(`Trying endpoint: ${endpoint}`);
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
      
      console.log('API Response:', response);
      console.log('API Response data:', response.data);
      
      // Save debug info regardless of success
      setDebugInfo(response.data);
      
      // Process the response data
      if (response.data) {
        if (response.data.success && response.data.humanizedContent) {
          // Success case - standard format
          const processedText = sanitizeHtml(response.data.humanizedContent);
          
          // Save last used timestamp
          localStorage.setItem('lastHumanized', Date.now().toString());
          setLastUsed(new Date());
          
          // If the text is empty after sanitization, it's probably an error
          if (!processedText) {
            throw new Error('Received empty response from server');
          }
          
          setHumanizedText(processedText);
          setOriginalText(response.data.originalContent || inputText);
        } else if (typeof response.data === 'string') {
          // Direct string response
          const processedText = sanitizeHtml(response.data);
          
          // Save last used timestamp
          localStorage.setItem('lastHumanized', Date.now().toString());
          setLastUsed(new Date());
          
          setHumanizedText(processedText);
        } else {
          // Try to extract humanized text from unknown format
          let extractedText = null;
          
          if (response.data.text) {
            extractedText = response.data.text;
          } else if (response.data.humanized_text) {
            extractedText = response.data.humanized_text;
          } else if (response.data.result) {
            extractedText = response.data.result;
          } else if (response.data.output) {
            extractedText = response.data.output;
          } else if (response.data.content) {
            extractedText = response.data.content;
          }
          
          if (extractedText) {
            const processedText = sanitizeHtml(extractedText);
            
            // Save last used timestamp
            localStorage.setItem('lastHumanized', Date.now().toString());
            setLastUsed(new Date());
            
            setHumanizedText(processedText);
          } else {
            // Unexpected response format
            console.error('Invalid response format:', response.data);
            throw new Error('Invalid response format from server');
          }
        }
      } else {
        // Empty response
        throw new Error('Empty response from server');
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
        <div>
          <p>Your account: <strong>{userTier}</strong> (Limit: {wordLimit} words)</p>
          {lastUsed && (
            <p className="last-used">Last humanized: {lastUsed.toLocaleString()}</p>
          )}
        </div>
        <div className="action-buttons">
          <button 
            onClick={testApiConnection} 
            disabled={loading}
            className="test-button"
          >
            {loading ? 'Testing...' : 'Test API Connection'}
          </button>
          
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={useDirect} 
              onChange={() => setUseDirect(!useDirect)} 
            />
            Use Direct Endpoint (Bypass Auth)
          </label>
        </div>
      </div>
      
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          <p>{testResult.message}</p>
          {testResult.success && <p>The API is responding correctly.</p>}
          {!testResult.success && <p>Error: {testResult.error}</p>}
        </div>
      )}
      
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
        disabled={loading || wordCount === 0 || (!useDirect && wordCount > wordLimit)}
        className="humanize-button"
      >
        {loading ? 'Humanizing...' : (useDirect ? 'Humanize Text (Direct)' : 'Humanize Text')}
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
      
      {/* Debug section - always visible for troubleshooting */}
      {debugInfo && (
        <div className="debug-section">
          <h4>Debug Information:</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default HumanizeText;