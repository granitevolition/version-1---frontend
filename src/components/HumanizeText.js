import React, { useState, useEffect, useRef } from 'react';
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
  
  // Queue-specific states
  const [requestId, setRequestId] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [userRequests, setUserRequests] = useState([]);
  const [showRequestsList, setShowRequestsList] = useState(false);
  
  // Processing mode - 'direct' or 'queue' 
  const [processingMode, setProcessingMode] = useState('direct');
  
  // Polling reference
  const pollingRef = useRef(null);

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
        
        // Fetch user's recent requests
        fetchUserRequests();
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
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
        const successfulApproach = Object.entries(response.data.results)
          .find(([key, value]) => value.success && !value.containsHtml);
        
        if (successfulApproach) {
          setTestResult(prev => ({
            ...prev,
            successfulApproach: successfulApproach[0],
            message: `API connection successful using "${successfulApproach[0]}" approach`
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
  
  // Fetch user's recent requests
  const fetchUserRequests = async () => {
    try {
      const possibleEndpoints = [
        '/api/v1/humanize/requests',  // Standard API path
        '/humanize/requests',         // Without api/v1 prefix
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.get(`${endpoint}?limit=5`);
          console.log(`Successfully fetched user requests from ${endpoint}`);
          break;
        } catch (err) {
          console.warn(`Failed to fetch user requests from ${endpoint}:`, err.message);
          lastError = err;
        }
      }
      
      if (!response) {
        console.error('Failed to fetch user requests:', lastError);
        return;
      }
      
      if (response.data && response.data.success && response.data.requests) {
        setUserRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching user requests:', error);
    }
  };
  
  // Check the status of a request
  const checkRequestStatus = async (requestId) => {
    try {
      const possibleEndpoints = [
        `/api/v1/humanize/status/${requestId}`,  // Standard API path
        `/humanize/status/${requestId}`,         // Without api/v1 prefix
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.get(endpoint);
          console.log(`Successfully checked request status from ${endpoint}`);
          break;
        } catch (err) {
          console.warn(`Failed to check request status from ${endpoint}:`, err.message);
          lastError = err;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to check request status');
      }
      
      if (response.data && response.data.success !== false) {
        setRequestStatus(response.data.status);
        setDebugInfo(response.data);
        
        // If request is completed, show the result
        if (response.data.status === 'completed' && response.data.humanizedText) {
          setHumanizedText(response.data.humanizedText);
          setOriginalText(response.data.originalText || originalText);
          
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          // Save last used timestamp
          localStorage.setItem('lastHumanized', Date.now().toString());
          setLastUsed(new Date());
          
          // Update loading state
          setLoading(false);
        }
        // If request failed, show error
        else if (response.data.status === 'failed') {
          setError(`Humanization failed: ${response.data.errorMessage || 'Unknown error'}`);
          
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          // Update loading state
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error checking request status:', error);
      
      // Stop polling on error
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      
      setLoading(false);
      setError(`Error checking status: ${error.message}`);
    }
  };
  
  // Start polling for request status
  const startPolling = (requestId) => {
    // Clean up any existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Set initial polling interval (2 seconds)
    let pollInterval = 2000;
    
    // Start polling
    pollingRef.current = setInterval(() => {
      checkRequestStatus(requestId);
      
      // Increase polling interval over time (up to 10 seconds)
      if (pollInterval < 10000) {
        pollInterval += 1000;
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => {
          checkRequestStatus(requestId);
        }, pollInterval);
      }
    }, pollInterval);
  };
  
  // Handle retry for failed requests
  const handleRetry = async (requestId) => {
    try {
      setLoading(true);
      setError('');
      
      const possibleEndpoints = [
        `/api/v1/humanize/retry/${requestId}`,  // Standard API path
        `/humanize/retry/${requestId}`,         // Without api/v1 prefix
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          response = await apiClient.post(endpoint);
          console.log(`Successfully queued retry from ${endpoint}`);
          break;
        } catch (err) {
          console.warn(`Failed to queue retry from ${endpoint}:`, err.message);
          lastError = err;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to queue retry');
      }
      
      if (response.data && response.data.success) {
        setRequestId(response.data.requestId);
        setRequestStatus(response.data.status);
        
        // Start polling for status updates
        startPolling(response.data.requestId);
        
        // Update requests list
        fetchUserRequests();
      } else {
        throw new Error(response.data.error || 'Failed to queue retry');
      }
    } catch (error) {
      console.error('Error retrying request:', error);
      setError(`Error retrying: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Handle using a previous request
  const handleUseRequest = (request) => {
    setRequestId(request.id);
    setRequestStatus(request.status);
    setOriginalText(request.original_text);
    
    if (request.status === 'completed' && request.humanized_text) {
      setHumanizedText(request.humanized_text);
      setLoading(false);
    } else if (request.status === 'pending' || request.status === 'processing') {
      setLoading(true);
      startPolling(request.id);
    } else if (request.status === 'failed') {
      setError(`This request failed: ${request.error_message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleHumanize = async () => {
    setError('');
    setHumanizedText('');
    setOriginalText('');
    setDebugInfo(null);
    setRequestId(null);
    setRequestStatus(null);
    
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
      console.log(`Sending request to ${processingMode === 'direct' ? 'directly process' : 'queue'} with content:`, inputText.substring(0, 50) + '...');
      
      // NEW: Use the API proxy endpoint for humanization
      const proxyEndpoint = '/api/proxy/humanize_text';
      
      console.log(`Using API proxy endpoint: ${proxyEndpoint}`);
      
      // Make the request via the API proxy
      const response = await apiClient.post(proxyEndpoint, { 
        content: inputText 
      });
      
      console.log('API Response:', response);
      console.log('API Response data:', response.data);
      
      // Save debug info for development
      setDebugInfo(response.data);
      
      // Check if the response was successful
      if (response.data) {
        // Extract humanized content from response
        const content = response.data.humanizedContent || response.data.humanized_text || response.data;
        
        // Save last used timestamp
        localStorage.setItem('lastHumanized', Date.now().toString());
        setLastUsed(new Date());
        
        setHumanizedText(content);
        setLoading(false);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Humanize error:', error);
      
      setHumanizedText(''); // Clear any partial results
      setLoading(false);
      
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
          <button
            onClick={() => {
              setShowRequestsList(!showRequestsList);
              if (!showRequestsList) {
                fetchUserRequests();
              }
            }}
            className="history-button"
          >
            {showRequestsList ? 'Hide History' : 'Show History'}
          </button>
        </div>
      </div>
      
      <div className="mode-selector">
        <label className="mode-toggle">
          <input
            type="checkbox"
            checked={processingMode === 'queue'}
            onChange={() => setProcessingMode(processingMode === 'direct' ? 'queue' : 'direct')}
          />
          <span className="mode-text">
            {processingMode === 'direct' ? 'Direct Processing (Faster)' : 'Queue Processing (More Reliable)'}
          </span>
        </label>
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
      
      {/* Request History */}
      {showRequestsList && userRequests.length > 0 && (
        <div className="requests-list">
          <h3>Recent Requests</h3>
          <table className="requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Words</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userRequests.map(request => (
                <tr 
                  key={request.id}
                  className={request.id === requestId ? 'active-request' : ''}
                >
                  <td>{request.id}</td>
                  <td>
                    <span className={`status status-${request.status}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>{request.word_count}</td>
                  <td>{new Date(request.created_at).toLocaleString()}</td>
                  <td>
                    <button 
                      onClick={() => handleUseRequest(request)}
                      className="use-button"
                      disabled={loading}
                    >
                      Use
                    </button>
                    {request.status === 'failed' && (
                      <button 
                        onClick={() => handleRetry(request.id)}
                        className="retry-button"
                        disabled={loading}
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      
      {/* Request Status Section */}
      {requestId && requestStatus && (
        <div className={`request-status status-${requestStatus}`}>
          <p>
            <strong>Request ID:</strong> {requestId} | 
            <strong>Status:</strong> {requestStatus}
          </p>
          {(requestStatus === 'pending' || requestStatus === 'processing') && (
            <div className="status-message">
              <p>Your request is being processed. This may take a few moments...</p>
              <div className="loading-spinner"></div>
            </div>
          )}
          {requestStatus === 'failed' && (
            <div className="status-message">
              <p>Your request failed to process. You can try again.</p>
              <button 
                onClick={() => handleRetry(requestId)}
                className="retry-button"
                disabled={loading}
              >
                Retry Request
              </button>
            </div>
          )}
        </div>
      )}
      
      <button 
        onClick={handleHumanize} 
        disabled={loading || wordCount === 0 || wordCount > wordLimit}
        className="humanize-button"
      >
        {loading ? 'Processing...' : 'Humanize Text'}
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