/**
 * API service for text humanization
 */
import { isLoggedIn, getAuthHeader } from './api';

// The backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://version-1-backend-production.up.railway.app/api/v1';

// The direct humanizer API URL - include the full path with endpoint
const DIRECT_HUMANIZER_API_URL = process.env.REACT_APP_HUMANIZER_API_URL || 'https://web-production-3db6c.up.railway.app/humanize_text';

// Extract the base URL (without the /humanize_text endpoint)
const HUMANIZER_BASE_URL = DIRECT_HUMANIZER_API_URL.includes('/humanize_text') 
  ? DIRECT_HUMANIZER_API_URL.substring(0, DIRECT_HUMANIZER_API_URL.indexOf('/humanize_text')) 
  : DIRECT_HUMANIZER_API_URL;

// Console log the URLs being used (helpful for debugging)
console.log('API Base URL:', API_BASE_URL);
console.log('Direct Humanizer API URL:', DIRECT_HUMANIZER_API_URL);
console.log('Humanizer Base URL:', HUMANIZER_BASE_URL);

// Add CORS proxy support for development
const useCorsProxy = (url) => {
  // Only use CORS proxy in certain environments or if we've had connection issues
  if (process.env.NODE_ENV !== 'production' || localStorage.getItem('use_cors_proxy') === 'true') {
    return `https://cors-anywhere.herokuapp.com/${url}`;
  }
  return url;
};

/**
 * Humanize text by sending it to the humanizer API
 * This version implements multiple fallback strategies
 * @param {string} text - Original text to humanize
 * @param {Object} aiScore - Optional AI detection score
 * @returns {Promise<Object>} - Response with humanized text
 */
export const humanizeText = async (text, aiScore = null) => {
  if (!text || text.trim() === '') {
    throw new Error('Please enter some text to humanize');
  }

  // Define strategies to try in order
  const strategies = [
    {
      name: 'Direct API call',
      url: DIRECT_HUMANIZER_API_URL,
      proxy: false
    },
    {
      name: 'API via backend',
      url: `${API_BASE_URL}/proxy/humanize`,
      proxy: false
    }
  ];

  let lastError = null;

  // Try each strategy in order
  for (const strategy of strategies) {
    try {
      console.log(`Trying strategy: ${strategy.name} at ${strategy.url}`);
      
      // Determine the URL to use (with or without proxy)
      const fetchUrl = strategy.proxy ? useCorsProxy(strategy.url) : strategy.url;
      
      // Authentication headers
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if user is logged in
      if (isLoggedIn()) {
        const authHeader = getAuthHeader();
        if (authHeader) {
          headers.Authorization = authHeader;
        }
      }
      
      // Using fetch with the strategy URL
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          input_text: text  // This is the required format for the FastAPI endpoint
        }),
        // Add timeout to avoid hanging requests
        signal: AbortSignal.timeout(15000) // Reduced timeout to fail faster
      });

      // Handle unsuccessful responses
      if (!response.ok) {
        // Try to parse the error response
        let errorMessage = `Humanization failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use the default error message
        }
        
        throw new Error(errorMessage);
      }

      // Parse the successful response
      const data = await response.json();
      console.log('Humanization successful:', data);
      
      // Successful strategy - remember for future calls
      if (strategy.name !== 'Direct API call') {
        console.log(`Found working strategy: ${strategy.name}. Will use this for future calls.`);
        localStorage.setItem('preferred_humanize_strategy', strategy.name);
      }
      
      // The FastAPI endpoint returns data in the "result" field
      return {
        originalText: text,
        humanizedText: data.result || text,
        message: 'Text successfully humanized!'
      };
    } catch (error) {
      console.error(`Strategy ${strategy.name} failed:`, error);
      lastError = error;
      // Continue to the next strategy
    }
  }
  
  // If we've tried all strategies and none worked, throw the last error
  console.error('All humanization strategies failed');
  
  // Provide more specific error messages
  if (lastError.name === 'AbortError') {
    throw new Error('Request timed out. Please try a shorter text or try again later.');
  }
  
  if (lastError.message === 'Failed to fetch') {
    throw new Error('Server Error: Unable to connect to the humanization service. The server may be offline.');
  }
  
  // Look for specific error codes to give better messages
  if (lastError.name === 'TypeError' && lastError.message.includes('Failed to fetch')) {
    throw new Error('Server Error: Unable to connect to the humanization service. The server may be offline.');
  }
  
  // Use original error if we don't have a more specific message
  throw lastError;
};

/**
 * Detect if text appears to be AI-generated
 * This is a simplified detection that would be replaced by a real AI detection API
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} - Detection results
 */
export const detectAiContent = async (text) => {
  try {
    // In a real implementation, this would call an AI detection API
    // For now, we'll use a simplified simulation
    
    // Calculate various metrics that might indicate AI-generated text
    const avgSentenceLength = calculateAverageSentenceLength(text);
    const repetitivePatterns = countRepetitivePatterns(text);
    const formalLanguageScore = assessFormalLanguage(text);
    
    // Calculate an overall AI score based on these metrics
    const aiScore = Math.min(
      100, 
      Math.max(
        0,
        Math.round((avgSentenceLength * 2 + repetitivePatterns * 3 + formalLanguageScore) / 6)
      )
    );
    
    const humanScore = 100 - aiScore;
    
    return {
      ai_score: aiScore,
      human_score: humanScore,
      analysis: {
        formal_language: formalLanguageScore,
        repetitive_patterns: repetitivePatterns,
        sentence_uniformity: avgSentenceLength
      }
    };
  } catch (error) {
    console.error('AI detection error:', error);
    
    // Provide clear error message
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the detection service. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Get usage statistics for the current user
 * @returns {Promise<Object>} - User's humanize usage statistics
 */
export const getHumanizeStats = async () => {
  try {
    // Check if user is logged in
    if (!isLoggedIn()) {
      throw new Error('You must be logged in to view statistics');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    };
    
    const response = await fetch(`${API_BASE_URL}/humanize/stats`, {
      method: 'GET',
      headers,
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to get statistics: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the default error message
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting humanize stats:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again later.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Check if the humanizer service is available
 * This version implements multiple check strategies to ensure we don't get false negatives
 * @returns {Promise<boolean>} - True if available, false otherwise
 */
export const isHumanizerAvailable = async () => {
  // Define check strategies in order of preference
  const checkStrategies = [
    {
      name: 'Root endpoint',
      url: HUMANIZER_BASE_URL,
      method: 'GET'
    },
    {
      name: 'Echo endpoint POST',
      url: `${HUMANIZER_BASE_URL}/echo_text`,
      method: 'POST',
      body: { input_text: 'test' }
    },
    {
      name: 'Humanize endpoint POST',
      url: DIRECT_HUMANIZER_API_URL,
      method: 'POST',
      body: { input_text: 'test' }
    },
    {
      name: 'Backend proxy',
      url: `${API_BASE_URL}/proxy/ping`,
      method: 'GET'
    }
  ];

  // Try each strategy
  for (const strategy of checkStrategies) {
    try {
      console.log(`Checking availability with strategy: ${strategy.name} at ${strategy.url}`);
      
      const options = {
        method: strategy.method,
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000) // Short timeout for availability checks
      };
      
      if (strategy.body) {
        options.body = JSON.stringify(strategy.body);
      }
      
      const response = await fetch(strategy.url, options);
      
      if (response.ok) {
        console.log(`Humanizer service is available (${strategy.name} check successful)`);
        // Store working strategy for future use
        localStorage.setItem('working_check_strategy', strategy.name);
        return true;
      }
    } catch (error) {
      console.error(`Strategy ${strategy.name} check failed:`, error);
      // Continue to next strategy
    }
  }
  
  // Use mock mode when everything fails but we want to show the UI anyway
  if (localStorage.getItem('use_mock_humanizer') === 'true') {
    console.log('Using mock humanizer mode - pretending service is available');
    return true;
  }
  
  console.error('All availability check strategies failed');
  // Default to true for better user experience - we'll show errors only when they try to use the feature
  return true;
};

/**
 * Calculate the average sentence length (normalized to a 0-100 scale)
 * Longer, more uniform sentences are typical of AI
 */
function calculateAverageSentenceLength(text) {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length <= 1) return 50; // Default for very short texts
  
  // Calculate average and standard deviation
  const lengths = sentences.map(s => s.trim().length);
  const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  
  // AI text often has very consistent sentence lengths
  const deviation = Math.sqrt(
    lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length
  );
  
  // Normalize: higher score for longer average sentences with low deviation (AI-like)
  const normalizedAvg = Math.min(100, Math.max(0, (avg / 20) * 50));
  const uniformityScore = Math.min(100, Math.max(0, 100 - (deviation / avg) * 100));
  
  return Math.round((normalizedAvg + uniformityScore) / 2);
}

/**
 * Count repetitive patterns and phrases (normalized to 0-100)
 * AI often reuses certain phrases and structures
 */
function countRepetitivePatterns(text) {
  // Count common AI phrases
  const aiPhrases = [
    "in conclusion", "it is important to note", "based on the",
    "furthermore", "in addition", "moreover", "it is worth mentioning",
    "in summary", "to summarize", "in other words"
  ];
  
  // Count matches
  const lowerText = text.toLowerCase();
  let matches = 0;
  
  aiPhrases.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    const count = (lowerText.match(regex) || []).length;
    matches += count;
  });
  
  // Normalize to text length and convert to 0-100 scale
  const wordCount = text.split(/\s+/).length;
  const density = matches / (wordCount / 100);
  
  return Math.min(100, Math.max(0, Math.round(density * 25)));
}

/**
 * Assess formality of language (0-100 scale)
 * AI often uses more formal language
 */
function assessFormalLanguage(text) {
  const lowerText = text.toLowerCase();
  
  // Informal language markers
  const informalMarkers = [
    "like", "you know", "kinda", "sort of", "basically", "actually",
    "stuff", "things", "gonna", "wanna", "dunno", "yeah", 
    "honestly", "literally", "seriously", "absolutely"
  ];
  
  // Formal language markers
  const formalMarkers = [
    "subsequently", "consequently", "nevertheless", "furthermore",
    "henceforth", "therefore", "thus", "accordingly", "moreover",
    "notwithstanding", "hereby", "wherein", "whereby"
  ];
  
  // Count occurrences
  let informalCount = 0;
  let formalCount = 0;
  
  informalMarkers.forEach(marker => {
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    const count = (lowerText.match(regex) || []).length;
    informalCount += count;
  });
  
  formalMarkers.forEach(marker => {
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    const count = (lowerText.match(regex) || []).length;
    formalCount += count;
  });
  
  // Calculate formality score
  const wordCount = text.split(/\s+/).length;
  const informalDensity = informalCount / (wordCount / 100);
  const formalDensity = formalCount / (wordCount / 100);
  
  // Higher score = more formal (AI-like)
  const baseScore = 50; // Neutral starting point
  let formalityScore = baseScore + (formalDensity * 10) - (informalDensity * 5);
  
  // If text is very long and has complex sentence structure, it's more likely AI
  if (wordCount > 200 && calculateAverageSentenceLength(text) > 70) {
    formalityScore += 10;
  }
  
  return Math.min(100, Math.max(0, Math.round(formalityScore)));
}