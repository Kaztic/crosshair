/**
 * Editor helper utilities for common operations
 */

/**
 * Replace selected text in a Monaco editor instance
 * @param {Object} editor - Monaco editor instance
 * @param {string} newText - New text to replace selection with
 * @param {Object} range - Optional range to replace, uses current selection if not provided
 * @returns {boolean} - Success status
 */
export function replaceSelectedText(editor, newText, range = null) {
  if (!editor) {
    console.error('Editor not available');
    return false;
  }

  try {
    // Use provided range or get current selection
    const selectionRange = range || editor.getSelection();
    
    if (!selectionRange || selectionRange.isEmpty()) {
      console.warn('No text selected');
      return false;
    }
    
    // Execute the edit
    editor.executeEdits('replaceSelection', [{
      range: selectionRange,
      text: newText
    }]);
    
    return true;
  } catch (error) {
    console.error('Error replacing text:', error);
    return false;
  }
}

/**
 * Get text from a specific range or current selection
 * @param {Object} editor - Monaco editor instance
 * @param {Object} range - Optional range to get text from
 * @returns {string|null} - Selected text or null if no selection
 */
export function getSelectedText(editor, range = null) {
  if (!editor) return null;
  
  try {
    const model = editor.getModel();
    if (!model) return null;
    
    // Use provided range or get current selection
    const selectionRange = range || editor.getSelection();
    
    if (!selectionRange || selectionRange.isEmpty()) {
      return null;
    }
    
    return model.getValueInRange(selectionRange);
  } catch (error) {
    console.error('Error getting selected text:', error);
    return null;
  }
}

/**
 * Create a basic Monaco editor configuration
 * @param {Object} options - Options to override defaults
 * @returns {Object} - Configuration object for Monaco editor
 */
export function createEditorConfig(options = {}) {
  return {
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
    },
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    // Disable features that might interfere with input fields
    // when other elements are focused
    accessibilitySupport: 'on',
    quickSuggestions: { other: true, comments: false, strings: false },
    acceptSuggestionOnCommitCharacter: false,
    wordBasedSuggestions: false,
    parameterHints: { enabled: true, cycle: true },
    // Override with user options
    ...options
  };
} 