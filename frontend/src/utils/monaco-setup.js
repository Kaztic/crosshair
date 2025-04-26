/**
 * Monaco Editor setup utilities
 */

import { getMonaco } from './monaco-loader';

/**
 * Initialize Monaco editor with global settings
 */
export async function initializeMonaco() {
  try {
    const monaco = await getMonaco();
    
    // Define editor defaults
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorCursor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41'
      }
    });

    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editorCursor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editorLineNumber.foreground': '#999999',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1'
      }
    });

    // Register completion providers, language features, etc. here
    console.log('Monaco editor configured successfully');
    return monaco;
  } catch (error) {
    console.error('Failed to initialize Monaco:', error);
    throw error;
  }
}

/**
 * Configure Monaco editor instance with standard options
 * @param {Object} editorInstance - Monaco editor instance to configure
 * @param {boolean} isInputFocused - Whether an input is currently focused
 */
export function configureEditorForInputInteraction(editorInstance, isInputFocused) {
  if (!editorInstance) return;
  
  // Always keep editor editable (readOnly: false)
  editorInstance.updateOptions({
    readOnly: false, // Always keep the editor editable
    // Only temporarily disable features that might interfere with input fields
    // but don't make the editor read-only
    quickSuggestions: !isInputFocused,
    parameterHints: { enabled: !isInputFocused },
    suggestOnTriggerCharacters: !isInputFocused,
    acceptSuggestionOnEnter: !isInputFocused ? 'on' : 'off',
    tabCompletion: !isInputFocused ? 'on' : 'off'
  });
}

/**
 * Get appropriate theme based on system preference or explicit setting
 * @param {string} forcedTheme - Optional explicit theme override
 * @returns {string} - Theme name to use
 */
export function getAppropriateTheme(forcedTheme = null) {
  if (forcedTheme) return forcedTheme;
  
  const prefersDark = window.matchMedia && 
    window.matchMedia('(prefers-color-scheme: dark)').matches;
    
  return prefersDark ? 'custom-dark' : 'custom-light';
} 