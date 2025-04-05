import React, { useState, useEffect } from 'react';
import { AppInfo, Project } from '../types'; // Import relevant types
import '../styles/app-view.css'; // Import CSS file (will create later)

interface AppViewProps {
  app: AppInfo;
  project: Project; // Include project info for context if needed
  initialTab?: 'overview' | 'keys'; // Allow pre-selecting a tab
  onNavigate?: (viewId: string | undefined) => void; // Add optional nav handler
}

const AppView: React.FC<AppViewProps> = ({ app, project, initialTab, onNavigate }) => {
  // State to track the active tab (default to 'overview' or initialTab)
  const [activeTab, setActiveTab] = useState<'overview' | 'keys'>(initialTab || 'overview');

  // Reset tab if initialTab changes (e.g., navigating from dashboard)
  useEffect(() => {
      setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  return (
    <div className="app-view">
      {/* Update H1 to breadcrumb style */}
      <h1 className="breadcrumb-header">
        {/* Make "Projects" clickable -> dashboard */}
        <span className="breadcrumb-link" onClick={() => onNavigate?.('dashboard')}>
          Projects
        </span>
        <span className="breadcrumb-separator">/</span>
        {/* Make project name clickable -> project view */}
        <span className="breadcrumb-link" onClick={() => onNavigate?.(`project-${project.id}`)}>
          {project.name}
        </span>
        <span className="breadcrumb-separator">/</span>
        {/* Current app name (not clickable) */}
        <span>{app.name}</span> 
        {/* Keep environment small and to the side */}
        <span className="app-environment">({app.environment})</span> 
      </h1>
      
      {/* Tabs for Overview/Keys */}
      <div className="app-details-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          Keys & Tokens
        </button>
      </div>

      {/* Tab Content */} 
      <div className="app-details-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <p><strong>App ID:</strong> {app.id}</p>
            <p><strong>Full Name:</strong> {app.name}</p>
            <p><strong>Environment:</strong> {app.environment}</p>
            <p><strong>Icon:</strong> {app.icon || '(none)'}</p>
            {/* Add more overview details here */}
          </div>
        )}
        {activeTab === 'keys' && (
          <div className="keys-section">
            {/* Placeholder for Keys & Tokens content */}
            <p>API Key: <code>**********</code></p>
            <p>API Secret: <code>**********</code></p>
            <p>Bearer Token: <code>**********</code></p>
            <button className="action-button">Regenerate Keys</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppView; 