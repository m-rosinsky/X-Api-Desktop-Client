import React, { useState, useEffect, useRef } from 'react';
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
  // Refs for measurement
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const overviewTabRef = useRef<HTMLButtonElement>(null);
  const keysTabRef = useRef<HTMLButtonElement>(null); // Ref for keys tab
  // State for indicator style
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Reset tab if initialTab changes (e.g., navigating from dashboard)
  useEffect(() => {
      setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  // Effect to update indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsContainerRef.current) return;
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      let targetTabRect: DOMRect | null = null;

      if (activeTab === 'overview' && overviewTabRef.current) {
        targetTabRect = overviewTabRef.current.getBoundingClientRect();
      } else if (activeTab === 'keys' && keysTabRef.current) { // Check keys tab
        targetTabRect = keysTabRef.current.getBoundingClientRect();
      }

      if (targetTabRect) {
        const left = targetTabRect.left - containerRect.left + tabsContainerRef.current.scrollLeft; // Adjust for container scroll
        const width = targetTabRect.width;
        setIndicatorStyle({ left, width });
      } else {
         // Default or hide if no tab is active/found (adjust as needed)
         setIndicatorStyle({ left: 0, width: 0 });
      }
    };

    // Update immediately and on resize
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    // Optional: If tabs can change dynamically, might need ResizeObserver on container

    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]); // Re-run when activeTab changes

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
      
      {/* Tabs for Overview/Keys - Add ref to container */}
      <div className="app-details-tabs" ref={tabsContainerRef}>
        <button 
          ref={overviewTabRef} // Add ref
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          ref={keysTabRef} // Add ref
          className={`tab-button ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          Keys & Tokens
        </button>
        {/* Add the indicator element */}
        <div className="active-tab-indicator" style={indicatorStyle}></div>
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