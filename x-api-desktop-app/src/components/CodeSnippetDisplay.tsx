import React, { useState, useMemo } from 'react';
import { Endpoint } from '../types';
import { generateCurlCommand, generatePythonRequestsCode, generateJavascriptFetchCode } from '../utils/codeGenUtils';
import '../styles/code-snippet-display.css';
// Import syntax highlighter - Revert to named import
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import style using default export from specific path
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

// Define available languages
type Language = 'curl' | 'python' | 'javascript';

interface CodeSnippetDisplayProps {
  endpoint: Endpoint | undefined | null;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  expansions?: string; // Add optional expansions prop
}

// --- Try casting the component type to 'any' as a workaround ---
const Highlighter: any = SyntaxHighlighter; 

const CodeSnippetDisplay: React.FC<CodeSnippetDisplayProps> = ({ endpoint, pathParams, queryParams, expansions }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl');

  // Generate code snippets only when needed
  const codeSnippets = useMemo(() => ({
    curl: generateCurlCommand(endpoint, pathParams, queryParams, expansions),
    python: generatePythonRequestsCode(endpoint, pathParams, queryParams, expansions),
    javascript: generateJavascriptFetchCode(endpoint, pathParams, queryParams, expansions),
  }), [endpoint, pathParams, queryParams, expansions]);

  const handleCopy = () => {
    const codeToCopy = codeSnippets[selectedLanguage];
    navigator.clipboard.writeText(codeToCopy).then(() => {
      console.log('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  // Map display language to highlighter language (curl uses 'bash')
  const highlighterLanguage = useMemo(() => {
    if (selectedLanguage === 'curl') return 'bash';
    if (selectedLanguage === 'javascript') return 'javascript';
    if (selectedLanguage === 'python') return 'python';
    return 'text'; // Fallback
  }, [selectedLanguage]);

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
           📋 
        </button>
      </div>
      <Highlighter 
        language={highlighterLanguage} 
        style={vscDarkPlus}
        customStyle={{
          margin: 0, 
          borderRadius: '0 0 6px 6px', 
          padding: '1em' 
        }} 
      >
        {codeSnippets[selectedLanguage]}
      </Highlighter>
    </div>
  );
};

export default CodeSnippetDisplay; 