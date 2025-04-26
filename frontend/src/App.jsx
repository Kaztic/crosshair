import React, { useState, useRef, useEffect } from 'react';
import Editor from './components/Editor';
import PromptInput from './components/PromptInput';
import { improveCode } from './services/api';
import { getAppropriateTheme } from './utils/monaco-setup';
import { getMonaco } from './utils/monaco-loader';
import './App.css';

function App() {
  const [code, setCode] = useState('// Start coding here...');
  const [selection, setSelection] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [editorTheme, setEditorTheme] = useState(null); // Use system preference by default
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const editorRef = useRef(null);
  // Add prompt history state
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [explanationHtml, setExplanationHtml] = useState('');
  
  // Add conversation context state
  const [conversationContext, setConversationContext] = useState([]);
  const [showContext, setShowContext] = useState(false);
  const [useContext, setUseContext] = useState(true);

  // Initialize editor with JavaScript language by default
  // This avoids TypeScript worker errors
  const [language, setLanguage] = useState('javascript');

  // Track whether we're in code generation or improvement mode
  const [mode, setMode] = useState('generate'); // 'generate' or 'improve'

  // Clear errors when selection changes
  useEffect(() => {
    setError(null);
    setSuggestion(null);
    
    // If we have a selection, switch to improve mode, otherwise generate mode
    setMode(selection && selection.text ? 'improve' : 'generate');
  }, [selection]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e) => {
      setIsDarkMode(e.matches);
      // Editor theme is handled automatically through the Editor component
    };
    
    // Modern approach (newer browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    } 
    // Legacy approach (older browsers)
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleThemeChange);
      return () => mediaQuery.removeListener(handleThemeChange);
    }
    
    return () => {};
  }, []);

  // Ensure inputs don't lose focus
  useEffect(() => {
    const preventEditorFocus = (e) => {
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA'
      )) {
        e.stopPropagation();
      }
    };

    document.addEventListener('mousedown', preventEditorFocus, true);
    return () => {
      document.removeEventListener('mousedown', preventEditorFocus, true);
    };
  }, []);

  const handleSelectionChange = (selectedData) => {
    setSelection(selectedData);
    setSuggestion(null);
  };

  // Save prompt to history
  const savePromptToHistory = (promptText, isImprove) => {
    const newHistoryItem = {
      text: promptText,
      timestamp: new Date().toISOString(),
      mode: isImprove ? 'improve' : 'generate',
      codeContext: isImprove && selection ? selection.text.substring(0, 100) + '...' : null
    };
    
    setPromptHistory(prevHistory => [newHistoryItem, ...prevHistory.slice(0, 19)]); // Keep last 20 items
  };

  // Add message to conversation context
  const addToConversationContext = (role, content) => {
    const newMessage = { role, content };
    setConversationContext(prevContext => {
      // Keep the last 10 messages (5 exchanges) for context
      const updatedContext = [...prevContext, newMessage];
      if (updatedContext.length > 10) {
        return updatedContext.slice(updatedContext.length - 10);
      }
      return updatedContext;
    });
  };

  // Clear conversation context
  const clearConversationContext = () => {
    setConversationContext([]);
  };

  // Toggle context usage
  const toggleContextUsage = () => {
    setUseContext(!useContext);
  };

  // Reuse prompt from history
  const usePromptFromHistory = (historyItem) => {
    setPrompt(historyItem.text);
    setShowHistory(false);
  };

  const handleSubmitPrompt = async (promptValue) => {
    if (!promptValue.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    setLoading(true);
    
    // Save to history
    const isImproveMode = mode === 'improve' && selection && selection.text;
    savePromptToHistory(promptValue, isImproveMode);
    
    // Add prompt to conversation context
    addToConversationContext('user', promptValue);
    
    try {
      let result;
      
      // Determine if we should use conversation context
      const contextToUse = useContext ? conversationContext : null;
      
      if (isImproveMode) {
        // If we have selected text, improve it
        result = await improveCode(selection.text, promptValue, contextToUse);
        const improvedCode = result.improved_code;
        const explanation = result.explanation;
        
        if (!improvedCode) {
          setError('No improved code was returned');
          setLoading(false);
          return;
        }
        
        // Add response to conversation context
        addToConversationContext('assistant', `Improved code:\n${improvedCode}`);
        
        setSuggestion(improvedCode);
        setExplanationHtml(explanation);
      } else {
        // If no selection, generate code from scratch
        result = await improveCode('', promptValue, contextToUse);
        const generatedCode = result.improved_code;
        const explanation = result.explanation;
        
        if (!generatedCode) {
          setError('No code was generated');
          setLoading(false);
          return;
        }
        
        // Add response to conversation context
        addToConversationContext('assistant', `Generated code:\n${generatedCode}`);
        
        setSuggestion(generatedCode);
        setExplanationHtml(explanation);
      }
      
      setPrompt(''); // Clear prompt after successful submission
      setLoading(false);
    } catch (err) {
      console.error('Error handling prompt:', err);
      
      // Handle different HTTP status codes
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail;
        
        if (status === 429) {
          setError('Rate limit exceeded. Please try again later.');
        } else if (status === 503) {
          setError('AI service is currently unavailable. Please try again later.');
        } else if (detail) {
          setError(detail);
        } else {
          setError(`Error (${status}): ${err.message || 'Failed to generate code'}`);
        }
      } else {
        setError(err.message || 'Failed to generate code');
      }
      
      setLoading(false);
    }
  };

  const applySuggestion = async () => {
    if (!suggestion) {
      setError('No generated code available');
      return;
    }
    
    try {
      if (editorRef.current) {
        if (mode === 'improve' && selection) {
          // If improving existing code, replace the selection
          const success = editorRef.current.replaceSelectedText(suggestion);
          if (success) {
            setSuggestion(null);
          } else {
            setError('Could not apply changes. Please try selecting the text again.');
          }
        } else {
          // If generating new code, insert at cursor position or replace editor content
          const editor = editorRef.current.getEditor();
          if (editor) {
            const currentPosition = editor.getPosition();
            if (currentPosition) {
              // Insert at cursor position
              editor.executeEdits('insertGenerated', [{
                range: {
                  startLineNumber: currentPosition.lineNumber,
                  startColumn: currentPosition.column,
                  endLineNumber: currentPosition.lineNumber,
                  endColumn: currentPosition.column
                },
                text: suggestion
              }]);
            } else {
              // Replace entire content if no cursor position
              editor.setValue(suggestion);
            }
            setSuggestion(null);
          } else {
            setError('Editor not available');
          }
        }
      } else {
        setError('Editor not available. Please try again.');
      }
    } catch (err) {
      console.error('Error applying generated code:', err);
      setError('Failed to apply generated code: ' + (err.message || 'Unknown error'));
    }
  };

  const handleShufflePrompt = () => {
    // Generate different prompts based on mode
    const generatePrompts = [
      "Generate a React component that displays a user profile",
      "Create a function to sort an array of objects by multiple properties",
      "Write a utility function for deep object comparison",
      "Create a custom hook for handling form state",
      "Generate a responsive navigation bar component",
      "Write a recursive function to traverse a directory structure"
    ];
    
    const improvePrompts = [
      "Improve the performance of this code",
      "Add better error handling",
      "Refactor this to be more readable",
      "Convert to async/await",
      "Add documentation to this code",
      "Make this code more maintainable"
    ];
    
    const prompts = mode === 'improve' ? improvePrompts : generatePrompts;
    const randomIndex = Math.floor(Math.random() * prompts.length);
    setPrompt(prompts[randomIndex]);
  };

  // Get action button text based on current mode
  const getActionButtonText = () => {
    return mode === 'improve' ? 'Apply Improvement' : 'Insert Generated Code';
  };

  // Get prompt placeholder based on current mode
  const getPromptPlaceholder = () => {
    return mode === 'improve' 
      ? "Describe how to improve the selected code..." 
      : "Describe what code to generate...";
  };

  // Toggle history panel
  const toggleHistory = () => {
    setShowHistory(prev => !prev);
    // Close context panel if opening history panel
    if (!showHistory) {
      setShowContext(false);
    }
  };

  // Toggle context panel
  const toggleContext = () => {
    setShowContext(prev => !prev);
    // Close history panel if opening context panel
    if (!showContext) {
      setShowHistory(false);
    }
  };

  console.log('Rendering App component');

  return (
    <div className={`app ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="app-header">
        <h1>Crosshair</h1>
      </header>
      
      <main className="app-main">
        <div className="editor-section">
          <Editor
            ref={editorRef}
            value={code}
            onChange={setCode}
            onSelectionChange={handleSelectionChange}
            theme={editorTheme}
            language={language}
            height="500px"
          />
        </div>
        
        <div className="sidebar">
          <div className="prompt-section">
            <div className="mode-indicator">
              <span className="mode-badge">
                Mode: {mode === 'improve' ? 'Improve Selected Code' : 'Generate New Code'}
              </span>
              {mode === 'generate' && 
                <span className="mode-tip">
                  Just type your prompt to generate code
                </span>
              }
              <span className={`context-toggle ${useContext ? 'context-active' : ''}`}
                    onClick={toggleContextUsage}
                    title={useContext ? "Context is active" : "Context is disabled"}>
                🧠
              </span>
            </div>
            
            <div className="prompt-container">
              <PromptInput 
                value={prompt}
                onSubmit={handleSubmitPrompt}
                onShuffle={handleShufflePrompt}
                selection={selection}
                placeholder={getPromptPlaceholder()}
              />
              
              <div className="tool-buttons">
                <button 
                  className="history-toggle-button" 
                  onClick={toggleHistory}
                  title="View prompt history"
                >
                  <span role="img" aria-label="History">📜</span>
                </button>
                <button 
                  className="context-toggle-button" 
                  onClick={toggleContext}
                  title="View conversation context"
                >
                  <span role="img" aria-label="Context">💬</span>
                </button>
              </div>
            </div>
            
            {showHistory && promptHistory.length > 0 && (
              <div className="history-panel">
                <h3>Prompt History</h3>
                <ul className="history-list">
                  {promptHistory.map((item, index) => (
                    <li 
                      key={index} 
                      className={`history-item ${item.mode === 'improve' ? 'improve-mode' : 'generate-mode'}`}
                      onClick={() => usePromptFromHistory(item)}
                    >
                      <span className="history-prompt">{item.text}</span>
                      <span className="history-timestamp">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      {item.codeContext && (
                        <span className="history-context">{item.codeContext}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {showContext && (
              <div className="context-panel">
                <div className="context-header">
                  <h3>Conversation Context {useContext ? '(Active)' : '(Disabled)'}</h3>
                  <button 
                    className="clear-context-button"
                    onClick={clearConversationContext}
                    title="Clear context"
                  >
                    <span role="img" aria-label="Clear">🗑️</span>
                  </button>
                </div>
                
                {conversationContext.length > 0 ? (
                  <ul className="context-list">
                    {conversationContext.map((item, index) => (
                      <li 
                        key={index} 
                        className={`context-item ${item.role === 'user' ? 'user-message' : 'assistant-message'}`}
                      >
                        <span className="context-role">
                          {item.role === 'user' ? '👤 You:' : '🤖 AI:'}
                        </span>
                        <span className="context-content">
                          {item.content.length > 100 
                            ? item.content.substring(0, 100) + '...' 
                            : item.content}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-context">No conversation context yet.</p>
                )}
                
                <div className="context-controls">
                  <button 
                    className={`toggle-context-button ${useContext ? 'context-active' : ''}`}
                    onClick={toggleContextUsage}
                  >
                    {useContext ? 'Context: On' : 'Context: Off'}
                  </button>
                  <span className="context-tip">
                    {useContext 
                      ? 'AI will remember your previous interactions' 
                      : 'AI will treat each prompt independently'}
                  </span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {loading && (
              <div className="loading-indicator">
                {mode === 'improve' ? 'Generating improvement...' : 'Generating code...'}
              </div>
            )}
            
            {suggestion && (
              <div className="suggestion-container">
                <h3>{mode === 'improve' ? 'Improved Code:' : 'Generated Code:'}</h3>
                <pre className="suggestion-content">{suggestion}</pre>
                <button 
                  className="apply-button"
                  onClick={applySuggestion}
                >
                  {getActionButtonText()}
                </button>
                
                {explanationHtml && (
                  <div className="explanation-container">
                    <h3>Explanation:</h3>
                    <div 
                      className="explanation-content"
                      dangerouslySetInnerHTML={{ __html: explanationHtml }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 