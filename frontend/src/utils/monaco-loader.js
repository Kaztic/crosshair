/**
 * Monaco Editor Loader
 * This file handles the asynchronous loading of Monaco Editor
 */
import { setupMonacoWorkers } from './monaco-worker-setup';

// We'll use a global flag to track if monaco has been loaded
let isMonacoLoaded = false;
let loadingPromise = null;

/**
 * Load Monaco editor asynchronously
 * @returns {Promise} Promise that resolves when Monaco is loaded
 */
export function loadMonaco() {
  if (isMonacoLoaded) {
    return Promise.resolve(window.monaco);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    console.log('Starting Monaco editor loading process...');

    // Use dynamic import to load Monaco
    import('monaco-editor')
      .then(monaco => {
        console.log('Monaco editor loaded successfully');
        
        // Setup workers
        setupMonacoWorkers(monaco);
        
        // Make monaco globally available
        window.monaco = monaco;
        
        // Set up global themes
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

        isMonacoLoaded = true;
        resolve(monaco);
      })
      .catch(error => {
        console.error('Error loading Monaco editor:', error);
        reject(error);
      });
  });

  return loadingPromise;
}

/**
 * Get Monaco instance, loading it if necessary
 * @returns {Promise} Promise that resolves with Monaco instance
 */
export function getMonaco() {
  if (window.monaco) {
    return Promise.resolve(window.monaco);
  }
  
  return loadMonaco();
} 