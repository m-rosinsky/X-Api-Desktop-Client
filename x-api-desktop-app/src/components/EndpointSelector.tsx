import React, { useState, useMemo, useEffect } from 'react';
import { Endpoint, EndpointSelectorProps } from '../types';

const EndpointSelector: React.FC<EndpointSelectorProps> = ({ endpoints, selectedEndpointId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedEndpoint = useMemo(() => endpoints.find(ep => ep.id === selectedEndpointId), [endpoints, selectedEndpointId]);

  // Group endpoints by category
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, Endpoint[]> = {};
    endpoints.forEach(ep => {
      const category = ep.category || 'Uncategorized'; // Default category
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ep);
    });
    // Optional: Sort categories if needed
    return Object.entries(groups).sort(([catA], [catB]) => catA.localeCompare(catB));
  }, [endpoints]);

  const handleSelect = (endpointId: string | null) => {
    if (endpointId !== null) {
      onChange(endpointId);
    }
    setIsOpen(false);
  };

  // Basic click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.custom-endpoint-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="endpoint-selector-container">
      <span className="endpoint-selector-label">Selected Endpoint:</span>
      <div className="custom-endpoint-selector">
        <button 
          type="button"
          className={`selector-button endpoint-selector-button ${selectedEndpoint ? 'has-selection' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="selector-button-content">
            <div className="selector-button-left">
              {selectedEndpoint ? (
                <>
                  <span className={`endpoint-method method-${selectedEndpoint.method.toLowerCase()}`}>{selectedEndpoint.method}</span>
                  <span className="endpoint-path">{selectedEndpoint.path}</span>
                </>
              ) : (
                <span>-- Select an Endpoint --</span>
              )}
            </div>
            <div className="selector-button-right">
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </div>
          </div>
        </button>

        {isOpen && (
          <ul className="dropdown-options endpoint-dropdown-options">
            {groupedEndpoints.map(([category, groupEndpoints]) => (
              <React.Fragment key={category}> 
                <li className="dropdown-category-header">{category}</li>
                {groupEndpoints.map(ep => (
                  <li 
                    key={ep.id} 
                    onClick={() => handleSelect(ep.id)}
                    className={ep.id === selectedEndpointId ? 'selected' : ''}
                  >
                    <span className={`endpoint-method method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <span className="endpoint-path">{ep.path}</span>
                  </li>
                ))}
              </React.Fragment>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EndpointSelector; 