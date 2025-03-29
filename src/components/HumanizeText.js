import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HumanizeText.css';

/**
 * Checks if content appears to be HTML
 * @param {string} text - Text to check
 * @returns {boolean} - True if it looks like HTML
 */
const isHtmlContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // Check for common HTML indicators
  const htmlIndicators = [
    '<html', '</html>',
    '<!doctype', '<!DOCTYPE',
    '<body', '</body>',
    '<div', '<p>',
    'User Registration',
    'enable JavaScript',
    '<script', '</script>'
  ];
  
  return htmlIndicators.some(indicator => text.includes(indicator));
};

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
        '/api/v1/diagnostic/direct-api-test',  // Standard API path
        '/diagnostic/direct-api-test',         // Without api/v1 prefix
        '/diag/direct-api-test',               // Short alias
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.get(endpoint);
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
        message: "API connection test completed",
        data: response.data
      });

      // If any of the API test approaches succeeded, show a message
      if (response.data && response.data.results) {
        const successfulApproach = response.data.results.find(r => r.success && !r.isHtml);
        if (successfulApproach) {
          setTestResult(prev => ({
            ...prev,
            successfulApproach: successfulApproach.attempt,
            message: `API connection successful using "${successfulApproach.attempt}" approach`
          }));
        }
      }
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
      
      // Save debug info for development
      setDebugInfo(response.data);
      
      // Process the response data
      if (response.data) {
        // Handle standard success case
        if (response.data.success && response.data.humanizedContent) {
          const content = response.data.humanizedContent;
          
          // Check if the returned content is HTML
          if (isHtmlContent(content)) {
            console.error('Server returned HTML instead of humanized text');
            throw new Error('Server returned an HTML page. The humanization service may be temporarily unavailable.');
          }
          
          // Save last used timestamp
          localStorage.setItem('lastHumanized', Date.now().toString());
          setLastUsed(new Date());
          
          setHumanizedText(content);
          setOriginalText(response.data.originalContent || inputText);
        }
        // Handle error response
        else if (response.data.error) {
          throw new Error(response.data.error || 'Error from server');
        }
        // Handle direct string response
        else if (typeof response.data === 'string') {
          const content = response.data;
          
          // Check if the returned content is HTML
          if (isHtmlContent(content)) {
            console.error('Server returned HTML instead of humanized text');
            throw new Error('Server returned an HTML page. The humanization service may be temporarily unavailable.');
          }
          
          // Save last used timestamp
          localStorage.setItem('lastHumanized', Date.now().toString());
          setLastUsed(new Date());
          
          setHumanizedText(content);
        }
        // Handle other formats
        else {
          // Try to extract humanized text from different response formats
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
          } else if (response.data.details) {
            throw new Error(response.data.details || 'Unknown server error');
          }
          
          if (extractedText) {
            // Check if the extracted text is HTML
            if (isHtmlContent(extractedText)) {
              console.error('Server returned HTML instead of humanized text');
              throw new Error('Server returned an HTML page. The humanization service may be temporarily unavailable.');
            }
            
            // Save last used timestamp
            localStorage.setItem('lastHumanized', Date.now().toString());
            setLastUsed(new Date());
            
            setHumanizedText(extractedText);
          } else {
            // Unexpected response format
            console.error('Invalid response format:', response.data);
            throw new Error('Server returned an unexpected response format');
          }
        }
      } else {
        // Empty response
        throw new Error('Empty response from server');
      }
    } catch (error) {
      console.error('Humanize error:', error);
      
      setHumanizedText(''); // Clear any partial results
      
      // If there's a specific HTML detection
      if (error.message && error.message.includes('HTML page')) {
        setError(
          'The external humanization service is currently unavailable. ' +
          'This is likely a temporary issue with the service. ' +
          'Please try again later or contact support if the problem persists.'
        );
      } else if (error.response) {
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
        } else if (error.response.data && error.response.data.details) {
          setError(error.response.data.details);
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
        </div>
      </div>
      
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          <p>{testResult.message}</p>
          {testResult.success && (
            <>
              <p>The API connection test has completed. {testResult.successfulApproach && 
                `A successful connection was made using the "${testResult.successfulApproach}" approach.`}</p>
              {!testResult.successfulApproach && 
                <p className="warning">However, no approach was able to get a proper response from the humanization API.</p>}
            </>
          )}
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
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          {error.includes('HTML page') && (
            <p className="error-detail">
              This could indicate that the external API is down or not accessible from our server. 
              The administrators have been notified about this issue.
            </p>
          )}
        </div>
      )}
      
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
      
      {/* Debug section */}
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