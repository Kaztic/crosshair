import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { getMonaco } from '../utils/monaco-loader';
import { createEditorConfig, replaceSelectedText, getSelectedText, applyPreciseEdit } from '../utils/editor-helpers';
import { configureEditorForInputInteraction, getAppropriateTheme } from '../utils/monaco-setup';

const Editor = forwardRef(({
  value,
  language = 'javascript',
  onChange,
  height = '500px',
  editorOptions = {},
  theme = null, // Will use system preference if null
  onSelectionChange,
  useWholeFile = true, // Add prop for whole file mode
}, ref) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const prevValueRef = useRef(value);
  const [isLoading, setIsLoading] = useState(true);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const useWholeFileRef = useRef(useWholeFile);

  // Update refs when props change to avoid dependency issues
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    useWholeFileRef.current = useWholeFile;
  }, [onSelectionChange, useWholeFile]);

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
    },
    // Helper method to apply precise edit at specific lines
    applyPreciseEdit: (startLine, endLine, newText) => {
      if (editorRef.current) {
        return applyPreciseEdit(editorRef.current, startLine, endLine, newText);
      }
      return false;
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
        
        // If useWholeFile is true, always notify about the whole file as selection
        if (useWholeFileRef.current && onSelectionChangeRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineLength(lineCount);
            
            // Create a range that covers the entire file
            const selection = {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: lineCount,
              endColumn: lastLineLength + 1
            };
            
            onSelectionChangeRef.current({
              text: newValue,
              range: selection,
              isWholeFile: true
            });
          }
        }
      });

      // Set up selection change listener
      const selectionDisposable = editorRef.current.onDidChangeCursorSelection((e) => {
        // If useWholeFile is true, send the entire file as selection
        if (useWholeFileRef.current && onSelectionChangeRef.current) {
          const model = editorRef.current.getModel();
          const wholeFileText = model.getValue();
          
          onSelectionChangeRef.current({
            text: wholeFileText,
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineLength(model.getLineCount()) + 1
            },
            isWholeFile: true
          });
        } 
        // Otherwise handle normal selection behavior
        else if (onSelectionChangeRef.current) {
          if (!e.selection.isEmpty()) {
            const selectionText = editorRef.current.getModel().getValueInRange(e.selection);
            onSelectionChangeRef.current({
              text: selectionText,
              range: e.selection,
              isWholeFile: false
            });
          } else {
            onSelectionChangeRef.current(null);
          }
        }
      });

      // Trigger initial whole file selection if needed
      if (useWholeFileRef.current && onSelectionChangeRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const wholeFileText = model.getValue();
          onSelectionChangeRef.current({
            text: wholeFileText,
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineLength(model.getLineCount()) + 1
            },
            isWholeFile: true
          });
        }
      }

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
  }, [language, theme, value]); // Remove useWholeFile and onSelectionChange from dependencies

  // Update editor value when prop changes and is different from current value
  useEffect(() => {
    if (editorRef.current && value !== prevValueRef.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value || '');
        
        // If useWholeFile is true, notify about the whole file after setting value
        if (useWholeFileRef.current && onSelectionChangeRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            onSelectionChangeRef.current({
              text: value || '',
              range: {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: model.getLineCount(),
                endColumn: model.getLineLength(model.getLineCount()) + 1
              },
              isWholeFile: true
            });
          }
        }
      }
      prevValueRef.current = value;
    }
  }, [value]); // Remove useWholeFile and onSelectionChange from dependencies

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