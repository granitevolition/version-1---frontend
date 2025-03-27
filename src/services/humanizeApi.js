/**
 * API service for text humanization
 */
import { getCurrentUser, isLoggedIn } from './api';

// The actual humanizer API endpoint
const HUMANIZER_API_URL = process.env.REACT_APP_HUMANIZER_API_URL || 'https://web-production-3db6c.up.railway.app';

/**
 * Humanize text by sending it to the humanizer API
 * @param {string} text - Original text to humanize
 * @returns {Promise<Object>} - Response with humanized text
 */
export const humanizeText = async (text) => {
  if (!text || text.trim() === '') {
    throw new Error('Please enter some text to humanize');
  }

  try {
    console.log(`Sending text to humanize API: ${HUMANIZER_API_URL}/humanize_text`);
    console.log(`Text length: ${text.length} characters`);
    
    // Add authentication context if available
    const metadata = {};
    if (isLoggedIn()) {
      const user = getCurrentUser();
      if (user) {
        metadata.userId = user.id;
        metadata.username = user.username;
      }
    }

    // Send the request to the humanizer API
    const response = await fetch(`${HUMANIZER_API_URL}/humanize_text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        input_text: text,
        metadata
      }),
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
    
    // Return the humanized text and any metadata
    return {
      originalText: text,
      humanizedText: data.result || data.humanized_text || data.text,
      message: 'Text successfully humanized!'
    };
  } catch (error) {
    console.error('Humanization error:', error);
    
    // If the actual API fails, we'll implement a fallback humanization
    // This is only for development/testing and should be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using fallback humanization due to API error');
      return {
        originalText: text,
        humanizedText: fallbackHumanize(text),
        message: 'Text humanized using fallback method (API unavailable)'
      };
    }
    
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
    throw error;
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

/**
 * Fallback humanization function for when the API is unavailable
 * This is only for development/testing
 */
function fallbackHumanize(text) {
  // This is a very simplified version that adds some human-like elements
  // In a real app, remove this and rely on the actual API
  
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
