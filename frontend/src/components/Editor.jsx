import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { getMonaco } from '../utils/monaco-loader';
import { createEditorConfig, replaceSelectedText, getSelectedText } from '../utils/editor-helpers';
import { configureEditorForInputInteraction, getAppropriateTheme } from '../utils/monaco-setup';

const Editor = forwardRef(({
  value,
  language = 'javascript',
  onChange,
  height = '500px',
  editorOptions = {},
  theme = null, // Will use system preference if null
  onSelectionChange,
}, ref) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const prevValueRef = useRef(value);
  const [isLoading, setIsLoading] = useState(true);

  // Expose editor methods to parent component
  useImperativeHandle(ref, () => ({
    // Add a method to get the editor instance
    getEditor: () => editorRef.current,
    // Helper method to replace selected text
    replaceSelectedText: (newText) => {
      if (editorRef.current) {
        return replaceSelectedText(editorRef.current, newText);
      }
      return false;
    },
    // Helper method to get selected text
    getSelectedText: () => {
      if (editorRef.current) {
        return getSelectedText(editorRef.current);
      }
      return null;
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    setIsLoading(true);
    
    // Load Monaco first
    getMonaco().then(monaco => {
      if (!mounted || !containerRef.current) return;

      // Set up Monaco editor with appropriate theme
      const editorTheme = theme || getAppropriateTheme();
      
      // Create editor with config from helper
      const options = createEditorConfig({
        value: value || '',
        language: language || 'javascript', // Default to JavaScript
        theme: editorTheme,
        readOnly: false, // Explicitly set to not be read-only
        // Add any custom options
        ...editorOptions
      });

      console.log('Creating editor with options:', options);

      // Create the editor - first make sure the container is empty
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }

      // Create the editor
      editorRef.current = monaco.editor.create(containerRef.current, options);
      
      // Ensure editor is not read-only
      editorRef.current.updateOptions({ readOnly: false });
      
      setIsLoading(false);

      // Setup global DOM event listeners to handle focus properly without making editor read-only
      const handleFocusIn = (e) => {
        const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
        if (editorRef.current) {
          // Only adjust features but keep editor editable
          configureEditorForInputInteraction(editorRef.current, isInputFocused);
        }
      };

      // Add event listeners
      document.addEventListener('focusin', handleFocusIn, true);

      // Set up value change listener
      const changeDisposable = editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current.getValue();
        onChange && onChange(newValue);
      });

      // Set up selection change listener
      const selectionDisposable = editorRef.current.onDidChangeCursorSelection((e) => {
        if (onSelectionChange && !e.selection.isEmpty()) {
          const selectionText = editorRef.current.getModel().getValueInRange(e.selection);
          onSelectionChange({
            text: selectionText,
            range: e.selection,
          });
        } else if (onSelectionChange && e.selection.isEmpty()) {
          onSelectionChange(null);
        }
      });

      // Cleanup
      return () => {
        changeDisposable.dispose();
        selectionDisposable.dispose();
        document.removeEventListener('focusin', handleFocusIn, true);
        if (editorRef.current) {
          editorRef.current.dispose();
          editorRef.current = null;
        }
      };
    }).catch(error => {
      console.error('Failed to load Monaco editor:', error);
      setIsLoading(false);
    });
    
    return () => {
      mounted = false;
    };
  }, [language, theme]); // Don't include value as a dependency

  // Update editor value when prop changes and is different from current value
  useEffect(() => {
    if (editorRef.current && value !== prevValueRef.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value || '');
      }
      prevValueRef.current = value;
    }
  }, [value]);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          Loading editor...
        </div>
      )}
    </div>
  );
});

export default Editor; 