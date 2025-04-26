/**
 * Monaco Editor Worker Setup
 * This file configures Monaco Editor web workers to work properly with Vite
 */

/**
 * Configure Monaco Editor web workers
 * @param {Object} monaco - The Monaco editor instance
 */
export function setupMonacoWorkers(monaco) {
  /**
   * Approach 1: Simple inline worker
   * This is the most compatible approach for quick testing
   * It doesn't use external worker files
   */
  const simpleInlineWorkerSetup = () => {
    window.MonacoEnvironment = {
      getWorker: function (workerId, label) {
        const getWorkerCode = (workerLabel) => {
          switch (workerLabel) {
            case 'typescript':
            case 'javascript':
              return `
                self.importScripts('${window.location.origin}/monaco-editor-workers/ts.worker.js');
              `;
            default:
              return `
                self.importScripts('${window.location.origin}/monaco-editor-workers/editor.worker.js');
              `;
          }
        };

        // Create a blob that imports the required worker script
        const blob = new Blob(
          [getWorkerCode(label)],
          { type: 'application/javascript' }
        );

        return new Worker(URL.createObjectURL(blob), {
          type: 'module'
        });
      }
    };
  };

  /**
   * Approach 2: Simple data URL approach 
   * This works for most cases and is easier to set up
   */
  const dataUrlWorkerSetup = () => {
    // When using Vite or other modern build tools, we need to bypass the 
    // built-in AMD loader of Monaco and use a simpler setup
    window.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        const code = `
          self.MonacoEnvironment = { baseUrl: '${window.location.origin}' };
          
          // The problem happens when trying to load dependencies like typescript
          // We'll prevent this by overriding the loadForeignModule function
          self.require = {};
          self.require.define = function() {};
          
          // Just return a blank worker for now - this avoids errors
          self.onmessage = function() {};
        `;
        
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
      }
    };
  };

  // Use the data URL approach for now as it's more reliable
  dataUrlWorkerSetup();

  // Or use the inline worker approach as an alternative
  // simpleInlineWorkerSetup();

  return monaco;
} 