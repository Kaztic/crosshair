/**
 * Keyboard event utilities for consistent handling across the application
 */

/**
 * Checks if a keyboard event is a shortcut for submitting (Ctrl+Enter or Cmd+Enter)
 * @param {KeyboardEvent} event - The keyboard event to check
 * @returns {boolean} - True if the event is a submit shortcut
 */
export const isSubmitShortcut = (event) => {
  return (event.key === 'Enter' && (event.ctrlKey || event.metaKey));
};

/**
 * Handles submit shortcut events by preventing default behavior and calling the provided handler
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Function} handler - The submit handler function to call
 * @returns {boolean} - False if handled, true otherwise
 */
export const handleSubmitShortcut = (event, handler) => {
  if (isSubmitShortcut(event)) {
    event.preventDefault();
    event.stopPropagation();
    handler();
    return false;
  }
  return true;
};

/**
 * Prevents Monaco editor from capturing keyboard events when an input is focused
 * @param {Element} editorInstance - Monaco editor instance 
 * @param {boolean} isInputFocused - Whether an input is currently focused
 */
export const manageEditorKeyboardCapture = (editorInstance, isInputFocused) => {
  if (!editorInstance) return;
  
  // When an input is focused, temporarily disable editor keyboard shortcuts
  editorInstance.updateOptions({
    readOnly: isInputFocused,
    // Change cursor style to indicate state
    cursorStyle: isInputFocused ? 'block' : 'line'
  });
};

/**
 * Creates a keyboard event handler that only triggers when a modifier key is held
 * @param {string} key - The key to check for
 * @param {Function} handler - The handler function to call
 * @param {Object} options - Options for the handler
 * @param {boolean} options.requireCtrl - Whether Ctrl key is required
 * @param {boolean} options.requireMeta - Whether Meta/Cmd key is required
 * @param {boolean} options.requireShift - Whether Shift key is required
 * @param {boolean} options.requireAlt - Whether Alt key is required
 * @returns {Function} - Event handler function
 */
export const createModifierKeyHandler = (key, handler, options = {}) => {
  const { requireCtrl, requireMeta, requireShift, requireAlt } = options;
  
  return (event) => {
    if (event.key !== key) return true;
    
    const ctrlMatch = !requireCtrl || event.ctrlKey;
    const metaMatch = !requireMeta || event.metaKey;
    const shiftMatch = !requireShift || event.shiftKey;
    const altMatch = !requireAlt || event.altKey;
    
    if (ctrlMatch && metaMatch && shiftMatch && altMatch) {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
      return false;
    }
    
    return true;
  };
}; 