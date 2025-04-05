import React, { useState } from 'react';
import { PathParam } from '../types';
import '../styles/path-param-builder.css'; // Create this CSS file next

interface PathParamBuilderProps {
  params: PathParam[];
  values: Record<string, string>; // Current values from parent state
  onChange: (paramName: string, value: string) => void; // Callback on input change
}

const PathParamBuilder: React.FC<PathParamBuilderProps> = ({ params, values, onChange }) => {
  // State to track visibility of description popups
  const [visibleDescriptions, setVisibleDescriptions] = useState<Record<string, boolean>>({});

  if (!params || params.length === 0) {
    return null; // Don't render anything if no path params
  }

  // Toggle description visibility
  const toggleDescription = (paramName: string) => {
    setVisibleDescriptions(prev => ({
      ...prev,
      [paramName]: !prev[paramName]
    }));
  };

  return (
    <div className="path-param-builder">
      <h4 className="path-param-label">Path Parameters</h4>
      
      <div className="path-param-grouped-section">
        {params.map((param) => {
          const inputId = `path-param-${param.name}`;
          const isDescriptionVisible = visibleDescriptions[param.name] || false;

          return (
            <div key={param.name} className="path-param-item">
              <label htmlFor={inputId}>
                <span className="required-badge">Required</span>
                {param.name}:
                {param.description && (
                  <span 
                    className="info-icon-container"
                  >
                    <span 
                      className="info-icon"
                      onClick={() => toggleDescription(param.name)}
                    >
                      {' ⓘ'}
                    </span>
                    {isDescriptionVisible && (
                      <div className="description-popup">
                        {param.description}
                      </div>
                    )}
                  </span>
                )}
              </label>
              <div className="path-param-input-area">
                <input 
                  id={inputId}
                  type="text"
                  placeholder={param.example ? param.example : `Enter value for ${param.name}...`}
                  value={values[param.name] || ''}
                  onChange={(e) => onChange(param.name, e.target.value)}
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PathParamBuilder; 