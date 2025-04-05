import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueryParam } from '../types';
import { ChevronDown } from 'lucide-react'; // Import an icon for the dropdown
import '../styles/query-param-builder.css';

interface QueryParamBuilderProps {
  params: QueryParam[];
  onChange: (activeParams: Record<string, string>) => void;
}

interface ActiveParamsState {
  [paramName: string]: {
    isActive: boolean;
    value: string;
  };
}

const QueryParamBuilder: React.FC<QueryParamBuilderProps> = ({ params, onChange }) => {
  const initialState = useCallback(() => params.reduce<ActiveParamsState>((acc, param) => {
    acc[param.name] = { isActive: param.required ?? false, value: '' };
    return acc;
  }, {}), [params]);

  const [activeParams, setActiveParams] = useState<ActiveParamsState>(initialState());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredParamName, setHoveredParamName] = useState<string | null>(null); // State for hovered param
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handler for checkbox change
  const handleCheckboxChange = (paramName: string, isChecked: boolean) => {
    // Required params cannot be unchecked
    const paramDefinition = params.find(p => p.name === paramName);
    if (paramDefinition?.required && !isChecked) {
      return; 
    }

    setActiveParams(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], isActive: isChecked, value: isChecked ? prev[paramName].value : '' }, // Clear value on uncheck
    }));
  };

  // Handler for input change
  const handleInputChange = (paramName: string, value: string) => {
    setActiveParams(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], value: value },
    }));
  };

  // Notify parent component of changes
  useEffect(() => {
    const currentParamValues: Record<string, string> = {};
    for (const name in activeParams) {
      if (activeParams[name]?.isActive) {
        currentParamValues[name] = activeParams[name].value;
      }
    }
    onChange(currentParamValues);
  }, [activeParams, onChange]);

  // Reset state if params prop changes
  useEffect(() => {
    setActiveParams(initialState());
    setIsDropdownOpen(false); // Close dropdown when params change
  }, [params, initialState]);

  // Click outside handler for the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (!params || params.length === 0) {
    return <div className="query-param-builder-empty">No query parameters available for this endpoint.</div>;
  }

  // Sort params: required first, then alphabetically
  const sortedParams = [...params].sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1; // Required params first
    }
    return a.name.localeCompare(b.name); // Then alphabetical
  });

  const activeParamCount = Object.values(activeParams).filter(p => p.isActive).length;

  // Find description for the currently hovered parameter
  const hoveredParam = hoveredParamName ? params.find(p => p.name === hoveredParamName) : null;

  return (
    <div className="query-param-builder">
      {/* Moved label outside */}
      <h3 className="query-param-label">Query Parameters</h3>

      {/* Wrapper for visual grouping */}
      <div className="query-param-grouped-section">
        {/* Dropdown Section */}
        <div className="query-param-dropdown-section" ref={dropdownRef}>
          <button 
            type="button"
            className="query-param-dropdown-button"
            onClick={() => setIsDropdownOpen(prev => !prev)}
          >
            <span>{activeParamCount} Selected</span>
            <ChevronDown size={16} className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-layout-container"> {/* New wrapper for list + description */}
              <div className="query-param-dropdown-list">
                <ul>
                  {sortedParams.map((param) => (
                    <li 
                      key={param.name} 
                      className="dropdown-param-item"
                      onMouseEnter={() => setHoveredParamName(param.name)} // Set hovered param on enter
                      onMouseLeave={() => setHoveredParamName(null)}      // Clear on leave
                    >
                      <label> {/* Removed title attribute */}
                        <input
                          type="checkbox"
                          checked={activeParams[param.name]?.isActive || false}
                          onChange={(e) => handleCheckboxChange(param.name, e.target.checked)}
                          disabled={param.required}
                        />
                        <span>{param.name}</span>
                        {/* Description indicator removed from here */}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Description Panel */}
              <div className="dropdown-description-panel">
                {hoveredParam ? (
                  <>
                    <h4>{hoveredParam.name}</h4>
                    <p>{hoveredParam.description || 'No description available.'}</p>
                  </>
                ) : (
                  null /* Render nothing if nothing is hovered */
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {(activeParamCount > 0) && (
            <div className="param-inputs-container">
              {sortedParams.map((param) => { // Iterate sorted params to maintain order
                const paramState = activeParams[param.name];
                
                return (
                  paramState?.isActive && (
                    <div key={`input-${param.name}`} className="param-input-item">
                      <label htmlFor={`input-val-${param.name}`}>
                        {/* Badge for required - Can be styled differently or removed if indicator in dropdown is enough */}
                        {param.required && <span className="required-badge">Required</span>} 
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
                          {/* No remove button needed as unchecking the box handles removal */}
                      </div>
                    </div>
                  )
                );
              })}
            </div>
        )}
      </div> {/* End of query-param-grouped-section */}
    </div>
  );
};

export default QueryParamBuilder; 