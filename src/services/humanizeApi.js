/**
 * API service for text humanization
 */
import { isLoggedIn, getAuthHeader } from './api';

// The backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://version-1-backend-production.up.railway.app/api/v1';

// The humanizer API URL (specific endpoint for humanizing text)
const HUMANIZER_API_URL = process.env.REACT_APP_HUMANIZER_API_URL || 'https://web-production-3db6c.up.railway.app/humanize_text';

// Console log the URLs being used (helpful for debugging)
console.log('API Base URL:', API_BASE_URL);
console.log('Humanizer API URL:', HUMANIZER_API_URL);

/**
 * Humanize text by sending it to our backend proxy
 * @param {string} text - Original text to humanize
 * @param {Object} aiScore - Optional AI detection score
 * @returns {Promise<Object>} - Response with humanized text
 */
export const humanizeText = async (text, aiScore = null) => {
  if (!text || text.trim() === '') {
    throw new Error('Please enter some text to humanize');
  }

  try {
    // For debugging - log the endpoint we're using
    console.log(`Sending text to humanize endpoint: ${HUMANIZER_API_URL}`);
    
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
    
    // Send the request directly to the humanizer API
    const response = await fetch(HUMANIZER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        input_text: text // This is the required field name in the API
      }),
      // Add timeout to avoid hanging requests
      signal: AbortSignal.timeout(15000)
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
    
    // Return the humanized text - look for the 'result' field which is what the FastAPI returns
    return {
      originalText: text,
      humanizedText: data.result || data.humanized_text || data.humanized || text,
      message: 'Text successfully humanized!'
    };
  } catch (error) {
    console.error('Humanization error:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try a shorter text or try again later.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Server Error: Unable to connect to the humanization service. The server may be offline.');
    }
    
    // Look for specific error codes to give better messages
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Server Error: Unable to connect to the humanization service. The server may be offline.');
    }
    
    // Use original error if we don't have a more specific message
    throw error;
  }
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
 * @returns {Promise<boolean>} - True if available, false otherwise
 */
export const isHumanizerAvailable = async () => {
  try {
    // Try the service root (removing the /humanize_text endpoint part)
    const baseUrl = HUMANIZER_API_URL.includes('/humanize_text') 
      ? HUMANIZER_API_URL.substring(0, HUMANIZER_API_URL.indexOf('/humanize_text')) 
      : HUMANIZER_API_URL;
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Humanizer health check failed:', error);
    return false;
  }
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