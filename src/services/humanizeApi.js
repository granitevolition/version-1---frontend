// This file is intentionally empty - humanize functionality has been removed

// Placeholder API service that returns empty results
const humanizeApi = {
  humanizeText: async () => ({ 
    success: false, 
    message: 'Humanize functionality has been removed', 
    humanizedText: '' 
  }),
  
  detectAiText: async () => ({ 
    success: false, 
    message: 'AI detection functionality has been removed', 
    score: 0,
    isAi: false 
  }),
  
  getStats: async () => ({ 
    success: false, 
    message: 'Humanize stats functionality has been removed',
    stats: {} 
  })
};

export default humanizeApi;
