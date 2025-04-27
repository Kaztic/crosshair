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
 * Apply a precise edit to the code at specific line numbers
 * @param {Object} editor - Monaco editor instance
 * @param {number} startLine - Starting line number (1-indexed)
 * @param {number} endLine - Ending line number (1-indexed)
 * @param {string} newText - New text to replace the lines with
 * @returns {boolean} - Success status
 */
export function applyPreciseEdit(editor, startLine, endLine, newText) {
  if (!editor) {
    console.error('Editor not available');
    return false;
  }

  try {
    const model = editor.getModel();
    if (!model) {
      console.error('Editor model not available');
      return false;
    }
    
    // Convert to 0-indexed line numbers for internal use
    const zeroBasedStartLine = startLine - 1;
    const zeroBasedEndLine = endLine - 1;
    
    // Get the range for the specified lines
    const startLineContent = model.getLineContent(startLine);
    const endLineContent = model.getLineContent(endLine);
    
    const range = {
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: endLineContent.length + 1
    };
    
    // Execute the edit
    editor.executeEdits('preciseEdit', [{
      range: range,
      text: newText
    }]);
    
    return true;
  } catch (error) {
    console.error('Error applying precise edit:', error);
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

/**
 * Parse a code edit specification in the format "startLine:endLine:filepath"
 * @param {string} editSpec - The edit specification string
 * @returns {Object|null} - An object with startLine, endLine, and filepath properties, or null if invalid
 */
export function parseEditSpecification(editSpec) {
  if (!editSpec) return null;
  
  try {
    // Match the pattern startLine:endLine:filepath
    const match = editSpec.match(/^(\d+):(\d+):(.+)$/);
    if (!match) return null;
    
    return {
      startLine: parseInt(match[1], 10),
      endLine: parseInt(match[2], 10),
      filepath: match[3]
    };
  } catch (error) {
    console.error('Error parsing edit specification:', error);
    return null;
  }
} 