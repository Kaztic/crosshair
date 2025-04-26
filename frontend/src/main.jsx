import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { loadMonaco } from './utils/monaco-loader.js'

// Load Monaco editor first
console.log('Loading Monaco editor...');
loadMonaco()
  .then(() => {
    console.log('Monaco editor loaded, starting React app...');
    
    // Then render the React app
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    
    console.log('React app mounted');
  })
  .catch(error => {
    console.error('Failed to load Monaco editor, rendering app anyway:', error);
    
    // Render the app even if Monaco fails
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }); 