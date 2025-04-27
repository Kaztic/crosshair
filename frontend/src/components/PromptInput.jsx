import React, { useState, useEffect, useRef } from 'react';
import { handleSubmitShortcut } from '../utils/keyboardUtils';

function PromptInput({ value = '', onSubmit, onShuffle, selection, placeholder = 'Enter your prompt...' }) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);
  const userEditedRef = useRef(false);
  
  // Synchronize with parent value but only if the user hasn't made edits
  useEffect(() => {
    if (!userEditedRef.current || !inputValue) {
      setInputValue(value);
    }
    // Reset the edited flag when parent explicitly sets empty value
    if (!value) {
      userEditedRef.current = false;
    }
  }, [value, inputValue]);

  // Focus input when component mounts and after submission
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [value]); // Re-focus when value changes (typically after submission)

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    userEditedRef.current = true; // Mark that user has edited the input
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit && onSubmit(inputValue.trim());
      userEditedRef.current = false; // Reset the flag after submission
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    // If Shift+Enter, allow new line
    if (e.key === 'Enter' && e.shiftKey) {
      // Default behavior for textarea (adds a new line)
      return;
    }
    
    // Regular Enter submits the form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    
    // Also allow Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
  };

  const handleShuffleClick = () => {
    onShuffle && onShuffle();
    userEditedRef.current = false; // Reset flag as we're getting a new suggestion
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* {selection && selection.text && (
        <div className="selection-badge">
          Using selection: {selection.text.length > 30 ? `${selection.text.substring(0, 30)}...` : selection.text}
        </div>
      )} */}
      
      <div className="prompt-input-wrapper">
        <textarea
          ref={inputRef}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="prompt-input"
          data-autofocus
          rows={4}
        />
        
        <div className="prompt-buttons">
          <button
            type="button"
            className="shuffle-button"
            onClick={handleShuffleClick}
            title="Generate random prompt"
          >
            <span role="img" aria-label="Shuffle">🔄</span>
          </button>
          
          <button
            type="submit"
            className="submit-button"
            disabled={!inputValue.trim()}
          >
            <span role="img" aria-label="Submit">↪️</span>
          </button>
        </div>
      </div>
      
      <div className="input-tip">
        Tip: Enter to submit, Shift+Enter for new line
      </div>
    </form>
  );
}

export default PromptInput; 