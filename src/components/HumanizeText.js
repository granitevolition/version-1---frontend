import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HumanizeText.css';

/**
 * Locally humanizes text (frontend fallback)
 * @param {string} text - Text to humanize
 * @returns {string} - Humanized text
 */
function localHumanize(text) {
  if (!text || typeof text !== 'string') {
    return "I've improved this text to sound more natural and human-like.";
  }

  // Break text into sentences - preserving the punctuation
  const sentencePattern = /([^.!?]+[.!?]+)/g;
  const sentences = text.match(sentencePattern) || [text];
  
  if (sentences.length === 0) return text;

  // Copy sentences for modification
  let resultSentences = [...sentences];
  
  // First-pass transformations: Add conversational elements
  if (sentences.length > 0) {
    // Transform the first sentence
    const firstSentence = sentences[0].trim();
    const firstSentenceStarters = [
      "Picture this: ",
      "Imagine a world where ",
      "Let me tell you about ",
      "Here's something fascinating: ",
    ];
    const starter = firstSentenceStarters[Math.floor(Math.random() * firstSentenceStarters.length)];
    resultSentences[0] = starter + firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1);
    
    // Transform the last sentence if there are multiple sentences
    if (sentences.length > 1) {
      const lastIndex = sentences.length - 1;
      const lastSentence = sentences[lastIndex].trim();
      const lastSentenceEnders = [
        lastSentence + " Quite a captivating tale, isn't it?",
        lastSentence + " I find that really intriguing.",
        lastSentence + " That's the kind of story that captures your imagination."
      ];
      resultSentences[lastIndex] = lastSentenceEnders[Math.floor(Math.random() * lastSentenceEnders.length)];
    }
    
    // Transform a middle sentence if there are at least 3 sentences
    if (sentences.length >= 3) {
      const midIndex = Math.floor(sentences.length / 2);
      const midSentence = sentences[midIndex].trim();
      const midSentenceTransformers = [
        "I particularly enjoy how " + midSentence.charAt(0).toLowerCase() + midSentence.slice(1),
        "What's fascinating is that " + midSentence.charAt(0).toLowerCase() + midSentence.slice(1),
        "You know what's interesting? " + midSentence
      ];
      resultSentences[midIndex] = midSentenceTransformers[Math.floor(Math.random() * midSentenceTransformers.length)];
    }
  }

  // Join sentences and apply contractions
  let result = resultSentences.join(' ')
    .replace(/it is/g, "it's")
    .replace(/that is/g, "that's")
    .replace(/there is/g, "there's")
    .replace(/he is/g, "he's")
    .replace(/she is/g, "she's")
    .replace(/very important/g, "crucial")
    .replace(/in order to/g, "to")
    .replace(/a lot of/g, "many")
    .replace(/utilize/g, "use")
    .replace(/nevertheless/g, "even so")
    .replace(/subsequently/g, "later");
  
  return result;
}

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

/**
 * Checks if humanized text is too similar to original
 * @param {string} original - Original text
 * @param {string} humanized - Humanized text
 * @returns {boolean} - True if texts are too similar
 */
const isTooSimilar = (original, humanized) => {
  if (!original || !humanized) return false;
  
  // If it starts with the marker phrase from our fallback, it's already processed
  if (humanized.includes("I've made this text") || 
      humanized.includes("Picture this") ||
      humanized.includes("Imagine a world")) {
    return false;
  }
  
  // Remove all whitespace for comparison
  const cleanOriginal = original.replace(/\s+/g, '');
  const cleanHumanized = humanized.replace(/\s+/g, '');
  
  // If they're exactly the same, they're too similar
  if (cleanOriginal === cleanHumanized) return true;
  
  // If they're more than 90% similar, they're too similar
  const maxLength = Math.max(cleanOriginal.length, cleanHumanized.length);
  let sameChars = 0;
  
  for (let i = 0; i < Math.min(cleanOriginal.length, cleanHumanized.length); i++) {
    if (cleanOriginal[i] === cleanHumanized[i]) sameChars++;
  }
  
  return (sameChars / maxLength) > 0.9;
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
      let processedText = '';
      
      if (response.data) {
        // Backend should return humanizedContent directly 
        if (response.data.humanizedContent) {
          processedText = response.data.humanizedContent;
        } 
        // Handle direct response string
        else if (typeof response.data === 'string') {
          processedText = response.data;
        }
        // Unknown format - attempt to extract something useful
        else {
          console.warn('Unexpected response format:', response.data);
          // Try to extract text from any property that might contain it
          const possibleTextProps = ['text', 'result', 'content', 'output', 'humanized'];
          for (const prop of possibleTextProps) {
            if (response.data[prop] && typeof response.data[prop] === 'string') {
              processedText = response.data[prop];
              break;
            }
          }
        }
        
        // Sanitize the text if it's HTML or contains HTML
        processedText = sanitizeHtml(processedText);
        
        // Final check for error page content
        if (isErrorPage(processedText)) {
          console.warn('Detected error page in response, using fallback humanization');
          processedText = localHumanize(inputText);
        }
        
        // Check if the response is too similar to the original text
        if (isTooSimilar(inputText, processedText)) {
          console.warn('Response too similar to original text, using fallback humanization');
          processedText = localHumanize(inputText);
        }
        
        // If we still don't have useful text, use the local humanizer
        if (!processedText || processedText.length < 20) {
          console.warn('Response too short or empty, using fallback humanization');
          processedText = localHumanize(inputText);
        }
      } else {
        // Empty response
        processedText = localHumanize(inputText);
      }
      
      // Set the humanized text
      setHumanizedText(processedText);
      
    } catch (error) {
      console.error('Humanize error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        setDebugInfo(error.response.data);
        
        if (error.response.status === 401) {
          setError('Authentication required. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/login';
        } else if (error.response.status === 403) {
          setError('You do not have permission to use this feature.');
        } else if (error.response.data && error.response.data.error) {
          setError(error.response.data.error);
        } else {
          setError(`Server error (${error.response.status}). Please try again later.`);
        }
      } else if (error.request) {
        setError('No response received from server. Please check your internet connection.');
      } else {
        setError(`Error: ${error.message}`);
      }
      
      // In case of error, still provide humanized text using local fallback
      setHumanizedText(localHumanize(inputText));
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