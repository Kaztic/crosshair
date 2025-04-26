/**
 * Theme utilities for consistent theme handling across the application
 */

/**
 * Detects if the user prefers dark mode using system preferences
 * @returns {boolean} - True if the system preference is for dark mode
 */
export const prefersDarkMode = () => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Gets the appropriate Monaco editor theme based on dark mode preference
 * @param {string} forcedTheme - Optional theme to use regardless of system preference
 * @returns {string} - The Monaco editor theme name ('vs-dark' or 'vs')
 */
export const getMonacoTheme = (forcedTheme = null) => {
  if (forcedTheme) return forcedTheme;
  return prefersDarkMode() ? 'vs-dark' : 'vs';
};

/**
 * Creates a theme toggle handler that updates application theme
 * @param {Function} setIsDark - State setter function for dark mode
 * @param {Function} updateEditorTheme - Function to update editor theme
 * @returns {Function} - Toggle handler
 */
export const createThemeToggleHandler = (setIsDark, updateEditorTheme) => {
  return () => {
    setIsDark(prev => {
      const newIsDark = !prev;
      updateEditorTheme(newIsDark ? 'vs-dark' : 'vs');
      return newIsDark;
    });
  };
};

/**
 * Adds a listener for system theme changes
 * @param {Function} setIsDark - State setter function for dark mode
 * @param {Function} updateEditorTheme - Function to update editor theme
 * @returns {Function} - Cleanup function to remove listener
 */
export const listenForThemeChanges = (setIsDark, updateEditorTheme) => {
  const handleThemeChange = (e) => {
    const isDark = e.matches;
    setIsDark(isDark);
    updateEditorTheme(isDark ? 'vs-dark' : 'vs');
  };
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
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
  
  return () => {}; // Dummy cleanup for browsers without support
}; 