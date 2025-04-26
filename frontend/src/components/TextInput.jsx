import React, { useState, useEffect, useRef } from 'react';

const TextInput = ({ 
  initialValue = '', 
  onSubmit, 
  placeholder = '', 
  disabled = false,
  buttonText = 'Generate Suggestion'
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  // Reset value when disabled changes
  useEffect(() => {
    if (disabled) {
      setValue('');
    } else if (inputRef.current) {
      // Focus when enabled
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [disabled]);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit(value);
      setValue('');
    }
  };

  const handleSubmitClick = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <div className="text-input-container">
      <div className="text-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="text-input"
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        className="text-input-submit"
        onClick={handleSubmitClick}
        disabled={disabled || !value.trim()}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default TextInput; 