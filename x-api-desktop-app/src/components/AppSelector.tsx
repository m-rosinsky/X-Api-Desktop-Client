import React, { useState, useMemo, useEffect } from 'react';
import { Project, AppInfo, AppSelectorProps } from '../types';

const AppSelector: React.FC<AppSelectorProps> = ({ projects, selectedAppId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Find selected app
  const selectedApp = useMemo(() => {
    if (selectedAppId === null) return null;
    for (const project of projects) {
      const foundApp = project.apps.find(app => app.id === selectedAppId);
      if (foundApp) return foundApp; 
    }
    return null; 
  }, [projects, selectedAppId]);

  const handleSelect = (appId: number | null) => {
    onChange(appId);
    setIsOpen(false); // Close dropdown after selection
  };

  // Basic click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.custom-app-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="app-selector-container">
      <span className="app-selector-label">Active App:</span> 
      <div className="custom-app-selector">
        <button 
          type="button"
          className={`selector-button ${selectedApp ? 'has-selection' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="selector-button-content">
            <div className="selector-button-left">
            {selectedApp ? (
              <>
                <span className="selector-app-icon">{selectedApp.icon || '📱'}</span>
                <span>{selectedApp.name}</span>
              </>
            ) : (
                 <span>No app selected</span>
            )}
            </div>
            <div className="selector-button-right">
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </div>
          </div>
        </button>

        {isOpen && (
          <ul className="dropdown-options">
            <li onClick={() => handleSelect(null)}>
              <span>No app selected</span>
            </li>
            {projects.map(project => (
              <React.Fragment key={`project-group-${project.id}`}>
                {project.apps.length > 0 && (
                  <li className="dropdown-project-header" key={`project-header-${project.id}`}>
                    <div className="dropdown-project-header-content">
                      <span>{project.name}</span>
                      <span className={`project-package package-${project.package.toLowerCase()}`}>{project.package}</span>
                    </div>
                  </li>
                )}
                {project.apps.map(app => (
                  <li 
                    key={app.id} 
                    onClick={() => handleSelect(app.id)}
                    className={app.id === selectedAppId ? 'selected' : ''}
                  >
                    <span className="selector-app-icon">{app.icon || '📱'}</span>
                    <span>{app.name}</span>
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

export default AppSelector; 