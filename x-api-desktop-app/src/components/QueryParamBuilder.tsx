import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueryParam } from '../types';
import '../styles/query-param-builder.css'; // Create this CSS file next

interface QueryParamBuilderProps {
  params: QueryParam[];
  onChange: (activeParams: Record<string, string>) => void; // Callback with current param values
}

interface ActiveParamsState {
  [paramName: string]: {
    isActive: boolean;
    value: string;
  };
}

const QueryParamBuilder: React.FC<QueryParamBuilderProps> = ({ params, onChange }) => {
  // Initialize state based on params, defaulting required params to active
  const initialState = params.reduce<ActiveParamsState>((acc, param) => {
    acc[param.name] = { isActive: param.required ?? false, value: '' };
    return acc;
  }, {});

  const [activeParams, setActiveParams] = useState<ActiveParamsState>(initialState);
  const [isOpen, setIsOpen] = useState(false); // Dropdown open state
  const builderRef = useRef<HTMLDivElement>(null); // Ref for click outside

  // Handle checkbox change
  const handleCheckboxChange = (paramName: string, isChecked: boolean) => {
    setActiveParams(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], isActive: isChecked },
    }));
    // Keep dropdown open when checking/unchecking? Optional.
    // setIsOpen(false); // Uncomment to close dropdown on selection
  };

  // Handle input change
  const handleInputChange = (paramName: string, value: string) => {
    setActiveParams(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], value: value },
    }));
  };

  // Notify parent component of changes whenever activeParams state updates
  useEffect(() => {
    const currentParamValues: Record<string, string> = {};
    for (const name in activeParams) {
      if (activeParams[name].isActive) {
        currentParamValues[name] = activeParams[name].value;
      }
    }
    onChange(currentParamValues);
  }, [activeParams, onChange]);

  // Reset state if the params prop changes (e.g., different endpoint selected)
  useEffect(() => {
    const newState = params.reduce<ActiveParamsState>((acc, param) => {
        acc[param.name] = { isActive: param.required ?? false, value: '' };
        return acc;
      }, {});
      setActiveParams(newState);
      setIsOpen(false); // Close dropdown when params change
  }, [params])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (builderRef.current && !builderRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!params || params.length === 0) {
    return <div className="query-param-builder-empty">No query parameters available for this endpoint.</div>;
  }

  const activeCount = Object.values(activeParams).filter(p => p.isActive).length;

  return (
    <div className="query-param-builder" ref={builderRef}> {/* Add ref */}
      {/* Dropdown Button */}
      <div className="query-param-selector">
        <button 
          type="button"
          className={`selector-button query-param-button ${activeCount > 0 ? 'has-selection' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
           <div className="selector-button-content">
             <div className="selector-button-left">
                <span>Query Parameters {activeCount > 0 ? `(${activeCount} active)` : ''}</span>
            </div>
            <div className="selector-button-right">
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </div>
          </div>
        </button>

        {/* Dropdown List */}
        {isOpen && (
          <ul className="dropdown-options query-param-dropdown">
            {params.map((param) => {
              const paramState = activeParams[param.name];
              const inputId = `param-check-${param.name}`; // Unique ID for checkbox
              return (
                <li key={param.name} className="param-item-dropdown">
                  <div className="param-header">
                    <input 
                      type="checkbox" 
                      id={inputId} 
                      checked={paramState.isActive}
                      onChange={(e) => handleCheckboxChange(param.name, e.target.checked)}
                      disabled={param.required}
                      title={param.required ? "This parameter is required and cannot be unchecked." : undefined}
                    />
                    <label htmlFor={inputId} className={param.required ? 'required' : ''}>
                      {param.name}
                      {param.required && <span className="required-badge">Required</span>}
                    </label>
                  </div>
                  {param.description && <p className="param-description">{param.description}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Input Area - Rendered below dropdown based on state */}
      <div className="param-inputs-container">
        {params.map((param) => {
          const paramState = activeParams[param.name];
          const paramDefinition = params.find(p => p.name === param.name);

          return (
            paramState.isActive && (
              <div key={`input-${param.name}`} className="param-input-item">
                 <label htmlFor={`input-val-${param.name}`}>
                   {/* Move badge before name if required */}
                   {paramDefinition?.required && <span className="required-badge">Required</span>} 
                   {param.name}:
                 </label>
                 <div className="param-input-area">
                    <input 
                      id={`input-val-${param.name}`}
                      type="text" 
                      placeholder={param.example ? param.example : `Enter value for ${param.name}...`}
                      value={paramState.value}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      spellCheck="false"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                 </div>
              </div>
            )
          );
        })}
      </div>
    </div>
  );
};

export default QueryParamBuilder; 