import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExpansionOption } from '../types';
import { ChevronDown } from 'lucide-react';
import '../styles/expansions-selector.css'; // We'll create this CSS file next

interface ExpansionsSelectorProps {
  options: ExpansionOption[];
  onChange: (selectedExpansions: string) => void;
}

const ExpansionsSelector: React.FC<ExpansionsSelectorProps> = ({ options, onChange }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredOptionName, setHoveredOptionName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset state if options prop changes
  useEffect(() => {
    setSelectedOptions({});
    setIsDropdownOpen(false);
  }, [options]);

  // Handler for checkbox change
  const handleCheckboxChange = (optionName: string, isChecked: boolean) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: isChecked,
    }));
  };

  // Handler for the master "Select/Deselect All" checkbox
  const handleSelectAllToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    const newSelectedOptions: Record<string, boolean> = {};
    options.forEach(option => {
      newSelectedOptions[option.name] = isChecked;
    });
    setSelectedOptions(newSelectedOptions);
  }, [options]);

  // Notify parent component of changes
  useEffect(() => {
    const currentSelected = Object.entries(selectedOptions)
      .filter(([_, isSelected]) => isSelected)
      .map(([name]) => name)
      .join(',');
    onChange(currentSelected);
  }, [selectedOptions, onChange]);

  // Click outside handler
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

  if (!options || options.length === 0) {
    return null; // Don't render if no expansion options are available
  }

  const sortedOptions = [...options].sort((a, b) => a.name.localeCompare(b.name));
  const selectedCount = Object.values(selectedOptions).filter(Boolean).length;
  const allSelected = options.length > 0 && selectedCount === options.length;
  const hoveredOption = hoveredOptionName ? options.find(opt => opt.name === hoveredOptionName) : null;

  return (
    <div className="expansions-selector">
      <h4 className="expansions-label">Expansions</h4>
      <div className="expansions-grouped-section">
        <div className="expansions-dropdown-section" ref={dropdownRef}>
          <button
            type="button"
            className="expansions-dropdown-button"
            onClick={() => setIsDropdownOpen(prev => !prev)}
          >
            <span>{selectedCount} Selected</span>
            <ChevronDown size={16} className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-layout-container">
              <div className="expansions-dropdown-list">
                <ul>
                  {options.length > 0 && (
                    <li className="select-all-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAllToggle}
                          onMouseEnter={() => setHoveredOptionName(null)}
                        />
                        <span>
                          {allSelected ? "Deselect All" : `Select all ${options.length} fields`}
                        </span>
                      </label>
                    </li>
                  )}
                  {sortedOptions.map((option) => (
                    <li
                      key={option.name}
                      className="dropdown-option-item"
                      onMouseEnter={() => setHoveredOptionName(option.name)}
                      onMouseLeave={() => setHoveredOptionName(null)}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedOptions[option.name] || false}
                          onChange={(e) => handleCheckboxChange(option.name, e.target.checked)}
                        />
                        <span>{option.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dropdown-description-panel">
                {hoveredOption ? (
                  <>
                    <h4>{hoveredOption.name}</h4>
                    <p>{hoveredOption.description || 'No description available.'}</p>
                  </>
                ) : (
                  <div className="description-placeholder">Hover over an option to see details.</div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* No input area needed for expansions, selection is via checkbox only */}
      </div>
    </div>
  );
};

export default ExpansionsSelector; 