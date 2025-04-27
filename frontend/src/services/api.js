import axios from 'axios';

const API_URL = 'http://13.51.55.96:8000/api';

// Create an axios instance with timeouts and error handling
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Enhance error message based on status code
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      const status = error.response.status;
      if (status === 404) {
        error.message = 'API endpoint not found. Please check server configuration.';
      } else if (status === 500) {
        error.message = 'Server error: ' + (error.response.data?.detail || 'Unknown server error');
      } else if (status === 400) {
        error.message = 'Invalid request: ' + (error.response.data?.detail || 'Bad request');
      }
    } else if (error.request) {
      // The request was made but no response was received
      error.message = 'No response from server. Please check your connection.';
    }
    
    return Promise.reject(error);
  }
);

/**
 * Improve existing code using AI
 * @param {string} code - The code to improve
 * @param {string} prompt - The improvement prompt
 * @param {Array} conversationHistory - Optional conversation history for context
 * @param {boolean} wholeFile - Whether to treat the code as a complete file
 * @returns {Promise<Object>} - The improved code result
 */
export const improveCode = async (code, prompt, conversationHistory = null, wholeFile = false) => {
  try {
    // Log request
    console.log('Requesting code improvement or generation:', { 
      codeLength: code?.length || 0, 
      promptLength: prompt?.length || 0,
      mode: code ? 'improve' : 'generate',
      historyLength: conversationHistory?.length || 0,
      wholeFile
    });
    
    const requestData = {
      code,
      prompt,
      wholeFile  // Add flag to indicate whole file editing
    };
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      requestData.conversationHistory = conversationHistory;
    }
    
    const response = await apiClient.post('/improve-code', requestData);
    
    // If no code was provided, we're using it as a generation endpoint
    // In a production app, you might want to have separate endpoints
    if (!code) {
      console.log('Generated new code successfully');
    } else {
      console.log('Improved code successfully');
    }
    
    // Map response properties for consistency
    const result = {
      improved_code: response.data.improvedCode,
      explanation: response.data.explanation,
      precise_edits: response.data.preciseEdits || [],
      diff_info: response.data.diffInfo || null,  // Add diff info from the response
      original_code: code  // Keep the original code for diff view
    };
    
    return result;
  } catch (error) {
    console.error('Error processing code:', error);
    throw error;
  }
};

/**
 * Generate code from scratch using AI
 * @param {string} prompt - The generation prompt
 * @param {Array} conversationHistory - Optional conversation history for context
 * @returns {Promise<Object>} - The generated code result
 */
export const generateCode = async (prompt, conversationHistory = null) => {
  // This is just a wrapper around improveCode with empty code
  // In a production app, you might want to have a separate endpoint
  return improveCode('', prompt, conversationHistory);
}; 