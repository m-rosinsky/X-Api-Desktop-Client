import React, { useState, useMemo } from 'react';
import { Endpoint } from '../types';
import { generateCurlCommand, generatePythonRequestsCode, generateJavascriptFetchCode } from '../utils/codeGenUtils';
import '../styles/code-snippet-display.css'; // Create this next

// Define available languages
type Language = 'curl' | 'python' | 'javascript';

interface CodeSnippetDisplayProps {
  endpoint: Endpoint | undefined | null;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  expansions?: string; // Add optional expansions prop
}

const CodeSnippetDisplay: React.FC<CodeSnippetDisplayProps> = ({ endpoint, pathParams, queryParams, expansions }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl');

  // Generate code snippets only when needed
  const codeSnippets = useMemo(() => ({
    curl: generateCurlCommand(endpoint, pathParams, queryParams, expansions),
    python: generatePythonRequestsCode(endpoint, pathParams, queryParams, expansions),
    javascript: generateJavascriptFetchCode(endpoint, pathParams, queryParams, expansions),
  }), [endpoint, pathParams, queryParams, expansions]); // Include expansions in dependency array

  // TODO: Add copy to clipboard functionality
  const handleCopy = () => {
    const codeToCopy = codeSnippets[selectedLanguage];
    navigator.clipboard.writeText(codeToCopy).then(() => {
      console.log('Code copied to clipboard!');
      // Optional: Show a temporary success message
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  return (
    <div className="code-snippet-area">
      <div className="language-selector">
        {(['curl', 'python', 'javascript'] as Language[]).map(lang => (
          <button 
            key={lang} 
            className={`lang-button ${selectedLanguage === lang ? 'active' : ''}`}
            onClick={() => setSelectedLanguage(lang)}
          >
            {lang === 'javascript' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)} 
          </button>
        ))}
        <button className="copy-button" onClick={handleCopy} title="Copy to Clipboard">
           📋 {/* Simple clipboard icon */}
        </button>
      </div>
      <pre><code>{codeSnippets[selectedLanguage]}</code></pre>
    </div>
  );
};

export default CodeSnippetDisplay; 