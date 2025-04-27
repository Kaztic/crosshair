import React, { useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { getAppropriateTheme } from '../utils/monaco-setup';

const DiffView = ({ 
  originalCode, 
  modifiedCode, 
  language = 'javascript',
  height = '400px',
  theme = null // Will use system preference if null
}) => {
  const diffEditorRef = useRef(null);
  
  // Get a reference to the diff editor
  const handleEditorDidMount = (editor) => {
    diffEditorRef.current = editor;
  };
  
  // Set editor options that are good for diff view
  const options = {
    renderSideBySide: true,
    readOnly: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    diffWordWrap: 'on'
  };

  return (
    <div className="diff-view-container">
      <DiffEditor
        original={originalCode || ''}
        modified={modifiedCode || ''}
        language={language}
        theme={theme || getAppropriateTheme()}
        height={height}
        options={options}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default DiffView; 