import React, { useState, useRef, useEffect } from 'react';
import Editor from './components/Editor';
import DiffView from './components/DiffView';
import PromptInput from './components/PromptInput';
import { improveCode } from './services/api';
import { getAppropriateTheme } from './utils/monaco-setup';
import { getMonaco } from './utils/monaco-loader';
import { parseEditSpecification } from './utils/editor-helpers';
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
  const [mode, setMode] = useState('improve'); // Default to 'improve' instead of 'generate'

  // Add state for precise edits
  const [preciseEdits, setPreciseEdits] = useState([]);
  
  // Add state for whole file editing
  const [useWholeFile, setUseWholeFile] = useState(true);
  const [originalCode, setOriginalCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');
  const [diffInfo, setDiffInfo] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  // Clear errors when selection changes
  useEffect(() => {
    setError(null);
    setSuggestion(null);
    
    // Always set to improve mode when using whole file
    if (useWholeFile) {
      setMode('improve');
    } else {
      // If we have a selection, switch to improve mode, otherwise generate mode
      setMode(selection && selection.text ? 'improve' : 'generate');
    }
  }, [selection, useWholeFile]);

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
    // If useWholeFile is true, we still want to track selection for possible future use
    // but we'll use the whole file for operations regardless
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

  // Toggle whole file editing mode
  const toggleWholeFileMode = () => {
    setUseWholeFile(!useWholeFile);
    // Clear any existing suggestions when toggling mode
    setSuggestion(null);
    setModifiedCode('');
    setShowDiff(false);
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
    const isImproveMode = mode === 'improve';
    savePromptToHistory(promptValue, isImproveMode);
    
    // Add prompt to conversation context
    addToConversationContext('user', promptValue);
    
    try {
      let result;
      
      // Determine if we should use conversation context
      const contextToUse = useContext ? conversationContext : null;
      
      if (isImproveMode) {
        // Get the current code from the editor
        let currentCode = '';
        if (useWholeFile || !selection) {
          // For whole file mode, get the entire file content
          currentCode = editorRef.current ? editorRef.current.getEditor().getValue() : '';
          setOriginalCode(currentCode);
        } else {
          // For selection-based mode, use the selected text
          currentCode = selection.text;
        }
        
        // If we have selected text or whole file, improve it
        result = await improveCode(currentCode, promptValue, contextToUse, useWholeFile || !selection);
        const improvedCode = result.improved_code;
        const explanation = result.explanation;
        const preciseEdits = result.precise_edits;
        const diffInformation = result.diff_info;
        
        if (!improvedCode) {
          setError('No improved code was returned');
          setLoading(false);
          return;
        }
        
        // Add response to conversation context
        addToConversationContext('assistant', `Improved code:\n${improvedCode}`);
        
        setSuggestion(improvedCode);
        setExplanationHtml(explanation);
        setPreciseEdits(preciseEdits);
        
        // If using whole file mode, set the modified code for diff view
        if (useWholeFile || !selection) {
          // Extract the code content from inside the code blocks
          const codeBlockRegex = /```(?:.*\n)?([\s\S]*?)```/;
          const match = improvedCode.match(codeBlockRegex);
          if (match && match[1]) {
            setModifiedCode(match[1]);
          } else {
            setModifiedCode(improvedCode);
          }
          setDiffInfo(diffInformation);
          setShowDiff(true);
        } else {
          setShowDiff(false);
        }
      } else {
        // If no selection, generate code from scratch
        result = await improveCode('', promptValue, contextToUse, false);
        const generatedCode = result.improved_code;
        const explanation = result.explanation;
        const preciseEdits = result.precise_edits;
        
        if (!generatedCode) {
          setError('No code was generated');
          setLoading(false);
          return;
        }
        
        // Add response to conversation context
        addToConversationContext('assistant', `Generated code:\n${generatedCode}`);
        
        setSuggestion(generatedCode);
        setExplanationHtml(explanation);
        setPreciseEdits(preciseEdits);
        setShowDiff(false);
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
        } else if (status === 400) {
          setError(`Bad request: ${detail || 'Invalid parameters'}`);
        } else if (status === 500) {
          setError(`Server error: ${detail || 'Unknown server error'}`);
        } else {
          setError(`Error (${status}): ${detail || 'Unknown error'}`);
        }
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Error: ${err.message || 'Unknown error'}`);
      }
      
      setLoading(false);
    }
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    
    try {
      if (showDiff) {
        // For whole file edit mode, replace the entire content
        if (editorRef.current) {
          const editor = editorRef.current.getEditor();
          const currentValue = editor.getValue();
          const model = editor.getModel();
          
          if (model) {
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineLength(lineCount);
            
            // Create a range that covers the entire file
            const range = {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: lineCount,
              endColumn: lastLineLength + 1
            };
            
            // Replace the entire content
            editor.executeEdits('applySuggestion', [{
              range: range,
              text: modifiedCode
            }]);
            
            // Reset UI state
            setSuggestion(null);
            setShowDiff(false);
            setModifiedCode('');
            setOriginalCode('');
          }
        }
      } else if (preciseEdits && preciseEdits.length > 0) {
        // Apply precise edits if available
        let allEditsApplied = true;
        
        for (const edit of preciseEdits) {
          const { startLine, endLine, code } = edit;
          if (startLine && endLine && code) {
            const success = editorRef.current.applyPreciseEdit(
              startLine, 
              endLine, 
              code
            );
            if (!success) {
              allEditsApplied = false;
            }
          }
        }
        
        if (!allEditsApplied) {
          setError('Some edits could not be applied');
        } else {
          // Reset state after successful edit
          setSuggestion(null);
          setPreciseEdits([]);
        }
      } else if (selection && !useWholeFile) {
        // For selection-based edits
        const success = editorRef.current.replaceSelectedText(suggestion);
        if (!success) {
          setError('Failed to apply suggestion. Please try again.');
        } else {
          setSuggestion(null);
        }
      } else {
        // If there's no selection, replace the entire content
        if (editorRef.current) {
          const editor = editorRef.current.getEditor();
          editor.setValue(suggestion);
          setSuggestion(null);
        }
      }
      
      // Ensure editor gets focus back
      if (editorRef.current) {
        editorRef.current.getEditor().focus();
      }
      
    } catch (err) {
      console.error('Error applying suggestion:', err);
      setError('Failed to apply changes: ' + err.message);
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
    if (useWholeFile && mode === 'improve') {
      return 'Apply Full File Changes';
    }
    return mode === 'improve' ? 'Apply Improvement' : 'Insert Generated Code';
  };

  // Get prompt placeholder based on current mode
  const getPromptPlaceholder = () => {
    if (useWholeFile && mode === 'improve') {
      return "Describe how to improve the entire file...";
    }
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

  // Render diff summary information
  const renderDiffSummary = () => {
    if (!diffInfo) return null;
    
    return (
      <div className="diff-summary">
        <p>
          {diffInfo.additions > 0 && <span className="additions">+{diffInfo.additions} </span>}
          {diffInfo.deletions > 0 && <span className="deletions">-{diffInfo.deletions} </span>}
          {diffInfo.changes > 0 && <span className="changes">~{diffInfo.changes} </span>}
          lines modified
        </p>
      </div>
    );
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
            height="600px"
            useWholeFile={useWholeFile}
          />
        </div>
        
        <div className="sidebar">
          <div className="prompt-section">
            <div className="mode-indicator">
              <span className="mode-badge">
                Mode: {mode === 'improve' ? 'Generate Code' : 'Generate Code'}
              </span>
              {mode === 'improve' && 
                <span 
                  className={`whole-file-toggle ${useWholeFile ? 'enabled' : 'disabled'}`}
                  onClick={toggleWholeFileMode}
                  title={useWholeFile ? "Using whole file mode" : "Using selection mode"}
                >
                  {useWholeFile ? "Whole File" : "Selection"}
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
                {mode === 'improve' ? 'Generating code...' : 'Generating code...'}
              </div>
            )}
            
            {suggestion && showDiff && (
              <div className="suggestion-container">
                <h3>{mode === 'improve' ? 'Generated Code:' : 'Generated Code:'}</h3>
                
                {renderDiffSummary()}
                
                <div className="diff-view-wrapper">
                  <DiffView 
                    originalCode={originalCode} 
                    modifiedCode={modifiedCode}
                    language={language}
                    height="300px"
                    theme={editorTheme}
                  />
                </div>
                
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
            
            {suggestion && !showDiff && (
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