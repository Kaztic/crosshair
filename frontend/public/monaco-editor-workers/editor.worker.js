/**
 * Monaco Editor Base Worker
 */
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    return './editor.worker.js';
  }
};

self.onmessage = () => {
  // This is just a stub to prevent errors
  // The actual Monaco worker code will be loaded by the editor
  console.log('Monaco worker received message');
}; 