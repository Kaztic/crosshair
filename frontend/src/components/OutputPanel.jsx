import React from 'react';

const OutputPanel = ({ result, loading, onIntegrate }) => {
  if (loading) {
    return (
      <div className="output-panel">
        <p>Generating suggestion...</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const { improvedCode, explanation } = result;

  return (
    <div className="output-panel">
      <div className="code-section">
        <h3>Improved Code</h3>
        <pre>
          <code>{improvedCode}</code>
        </pre>
      </div>
      
      <div className="explanation-section">
        <h3>Explanation</h3>
        <div dangerouslySetInnerHTML={{ __html: explanation }} />
      </div>
      
      <button 
        className="integrate-btn" 
        onClick={onIntegrate}
      >
        Integrate Code
      </button>
    </div>
  );
};

export default OutputPanel; 