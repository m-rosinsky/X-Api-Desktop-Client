import { useState, useMemo, useEffect } from "react";
import React from 'react';
import "./App.css";
import reactLogo from "./assets/react.svg";

// Define structure for App data
interface AppInfo {
  id: number;
  name: string;
  icon?: string; // Add optional icon field
  environment: 'production' | 'staging' | 'development'; // Add environment field
}

// Define structure for Project data
interface Project {
  id: number;
  name: string;
  usage: number;
  cap: number;
  package: string; // Add package field
  apps: AppInfo[]; // Add apps array
}

// Mock project data with apps (adding default icon and package)
const mockProjects: Project[] = [
  {
    id: 1,
    name: "Project Alpha",
    usage: 750,
    cap: 1000,
    package: "basic", // Example package
    apps: [
      { id: 101, name: "Alpha Web App", icon: "📱", environment: "production" },
      { id: 102, name: "Alpha Mobile App", icon: "📱", environment: "production" },
      { id: 103, name: "Alpha Web Staging", icon: "🧪", environment: "staging" }, // Added staging app
    ],
  },
  {
    id: 2,
    name: "Project Beta",
    usage: 300,
    cap: 1500,
    package: "free", // Example package
    apps: [
      { id: 201, name: "Beta Main Service", icon: "📱", environment: "production" },
      { id: 202, name: "Beta Dev Instance", icon: "🛠️", environment: "development" }, // Added dev app
    ],
  },
  {
    id: 3,
    name: "Project Gamma",
    usage: 1200,
    cap: 1200,
    package: "enterprise", // Example package
    apps: [
      { id: 301, name: "Gamma Analytics", icon: "📱", environment: "production" },
      { id: 302, name: "Gamma Data Pipeline", icon: "📱", environment: "production" },
      { id: 303, name: "Gamma Reporting UI", icon: "📱", environment: "production" },
    ],
  },
  {
    id: 4,
    name: "Project Delta",
    usage: 150,
    cap: 500,
    package: "basic", // Example package
    apps: [], // Project with no apps yet
  },
];

// Define the structure for navigation items
interface NavItem {
  label: string;
  type: 'link' | 'category' | 'header'; // Add type property
  viewId?: string; // ID to identify the view to render
  href?: string; // Keep href for potential future use or external links
  subItems?: NavItem[]; // Optional sub-items for categories
}

// Updated navigation structure with headers and new sections
const navigation: NavItem[] = [
  { label: "Home", type: 'header' }, 
  { label: "Dashboard", type: 'link', viewId: "dashboard" },
  
  { label: "API", type: 'header' }, // New API header
  { label: "Tweets", type: 'link', viewId: "tweets" }, // New Tweets link
  { label: "Users", type: 'link', viewId: "users" }, // New Users link

  { label: "Support", type: 'header' }, // New Support header
  { 
    label: "Payments", type: 'category', // Moved Payments category
    subItems: [
      { label: "Subscription", type: 'link', viewId: "subscription" }, 
      { label: "Invoices", type: 'link', viewId: "invoices" },
    ],
  },
];

// --- Dashboard Component Types ---
interface DashboardProps {
  projects: Project[];
}

// --- Reusable Custom App Selector Component ---
interface AppSelectorProps {
  projects: Project[];
  selectedAppId: number | null;
  onChange: (selectedId: number | null) => void;
}

const AppSelector: React.FC<AppSelectorProps> = ({ projects, selectedAppId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Find selected app (Project info not needed here anymore)
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
                 <span>-- Select App --</span>
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
              <span>-- Select App --</span>
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
                {/* Map directly over apps, removing environment grouping */}
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

// --- Reusable Custom Endpoint Selector Component ---
interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
}

interface EndpointSelectorProps {
  endpoints: Endpoint[];
  selectedEndpointId: string | null;
  onChange: (selectedId: string | null) => void;
}

const EndpointSelector: React.FC<EndpointSelectorProps> = ({ endpoints, selectedEndpointId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedEndpoint = useMemo(() => endpoints.find(ep => ep.id === selectedEndpointId), [endpoints, selectedEndpointId]);

  const handleSelect = (endpointId: string | null) => {
    onChange(endpointId);
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
                <span>-- Select Endpoint --</span>
              )}
            </div>
            <div className="selector-button-right">
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </div>
          </div>
        </button>

        {isOpen && (
          <ul className="dropdown-options endpoint-dropdown-options">
            <li onClick={() => handleSelect(null)}>
              <span>-- Select Endpoint --</span>
            </li>
            {endpoints.map(ep => (
              <li 
                key={ep.id} 
                onClick={() => handleSelect(ep.id)}
                className={ep.id === selectedEndpointId ? 'selected' : ''}
              >
                <span className={`endpoint-method method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span className="endpoint-path">{ep.path}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- View Components ---
interface ApiViewProps {
  projects: Project[];
  activeAppId: number | null;
  setActiveAppId: (id: number | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <h2>Dashboard</h2>
        <div className="project-list">
          {projects.map((project: Project) => {
            const usagePercentage = Math.min((project.usage / project.cap) * 100, 100);
            return (
              <div key={project.id} className="project-item">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`project-package package-${project.package.toLowerCase()}`}>{project.package}</span>
                </div>
                <p>Usage: {project.usage.toLocaleString()} / {project.cap.toLocaleString()}</p>
                <div className="usage-bar-container">
                  <div
                    className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                    style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
                {project.apps.length > 0 && (
                  <div className="app-list">
                    <h4>Apps:</h4>
                    {/* Group apps by environment */} 
                    {(['production', 'staging', 'development'] as const).map(env => {
                      const appsInEnv = project.apps.filter(app => app.environment === env);
                      if (appsInEnv.length === 0) return null; // Don't render empty sections

                      return (
                        <div key={env} className="app-environment-group">
                          <h5>{env}</h5> {/* Environment sub-header */} 
                          <ul>
                            {appsInEnv.map((app: AppInfo) => (
                              <li key={app.id} className="app-item">
                                <div className="app-item-info">
                                  <span className="app-icon">{app.icon || '📱'}</span>
                                  <span>{app.name}</span>
                                </div>
                                <div className="app-item-actions">
                                  <span className="key-icon" title="View Keys">🔑</span>
                                  <span className="settings-icon" title="App Settings">⚙️</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="dashboard-sidebar">
        <h3>Platform News</h3>
        <ul className="info-list">
          <li>New API v2 Beta released!</li>
          <li>Maintenance scheduled for Sunday.</li>
          <li>Check out the new documentation theme.</li>
        </ul>

        <h3>Resources</h3>
        <ul className="info-list links">
          <li><a href="#" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Example Projects</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Community Forum</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">System Status</a></li>
        </ul>
      </aside>
    </div>
  );
};

// --- Tweets View ---
const tweetsEndpoints = [
  { id: 'get-tweets', method: 'GET', path: '/2/tweets', summary: 'Retrieve recent Tweets' },
  { id: 'get-tweet-by-id', method: 'GET', path: '/2/tweets/:id', summary: 'Retrieve a single Tweet' },
  { id: 'post-tweet', method: 'POST', path: '/2/tweets', summary: 'Create a new Tweet' },
  { id: 'delete-tweet', method: 'DELETE', path: '/2/tweets/:id', summary: 'Delete a Tweet' },
];

const TweetsView: React.FC<ApiViewProps> = ({ projects, activeAppId, setActiveAppId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // Find the project containing the active app
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  // Find the details for the selected endpoint
  const endpointDetails = useMemo(() => {
    return tweetsEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  return (
    <div className="api-view-layout">
      <div className="api-main-content">
        <div className="api-header-section">
          <div className="selector-and-package">
            <AppSelector projects={projects} selectedAppId={activeAppId} onChange={setActiveAppId} />
            {/* Conditionally render package label outside selector */} 
            {activeProject && (
              <span className={`project-package package-${activeProject.package.toLowerCase()}`}>
                {activeProject.package}
              </span>
            )}
          </div>
          {/* Always render usage preview container, toggle visibility with class */} 
          <div className={`api-usage-preview ${activeProject ? 'visible' : ''}`}>
            {/* Content inside is only relevant when visible, but rendering it doesn't hurt */} 
             <p>Project Usage ({activeProject?.name || 'N/A'}): {activeProject?.usage.toLocaleString() || 0} / {activeProject?.cap.toLocaleString() || 0}</p>
             <div className="usage-bar-container">
                <div
                  className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
          </div>
        </div>
        <div className="view-content">
          <EndpointSelector 
              endpoints={tweetsEndpoints} 
              selectedEndpointId={selectedEndpoint}
              onChange={setSelectedEndpoint}
           />
           <div className="api-tools-content">
             {selectedEndpoint ? (
                <p>Tools/Logs for <strong>{endpointDetails?.path}</strong> on app <strong>{activeAppId || 'N/A'}</strong></p>
             ) : (
                <p>Select an endpoint above to see details and tools.</p>
             )}
          </div>
        </div>
      </div>

      {/* Right Sidebar Docs Panel - Now conditional */}
      <aside className="api-docs-sidebar">
        {endpointDetails ? (
          <> 
            <h3><span className={`endpoint-method method-${endpointDetails.method.toLowerCase()}`}>{endpointDetails.method}</span> {endpointDetails.path}</h3>
            <p>{endpointDetails.summary}</p>
            <pre><code>{`// Sample Request for ${endpointDetails.path}
curl ...`}</code></pre>
            <pre><code>{`// Sample Response for ${endpointDetails.path}
{
  "data": [...]
}`}</code></pre>
            {/* Add more detailed docs here */} 
          </> 
        ) : (
          <> 
            <h3>API Documentation</h3>
            <p>Select an endpoint from the list on the left to view its documentation.</p>
             <h3>Guides</h3>
             <ul className="info-list links">
               <li><a href="#">Getting Started</a></li>
               <li><a href="#">Authentication</a></li>
               <li><a href="#">Rate Limits</a></li>
             </ul>
          </> 
        )}
      </aside>
    </div>
  );
};

// --- Users View ---
const usersEndpoints = [
  { id: 'get-users', method: 'GET', path: '/2/users', summary: 'Look up multiple users' },
  { id: 'get-user-by-id', method: 'GET', path: '/2/users/:id', summary: 'Look up a single user by ID' },
  { id: 'get-user-by-username', method: 'GET', path: '/2/users/by/username/:username', summary: 'Look up a single user by username' },
];

const UsersView: React.FC<ApiViewProps> = ({ projects, activeAppId, setActiveAppId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // Find the project containing the active app (duplicate logic, could be extracted)
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  // Find the details for the selected endpoint
  const endpointDetails = useMemo(() => {
    return usersEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  return (
    <div className="api-view-layout">
      <div className="api-main-content">
        <div className="api-header-section">
          <div className="selector-and-package">
            <AppSelector projects={projects} selectedAppId={activeAppId} onChange={setActiveAppId} />
            {/* Conditionally render package label outside selector */} 
            {activeProject && (
              <span className={`project-package package-${activeProject.package.toLowerCase()}`}>
                {activeProject.package}
              </span>
            )}
          </div>
           {/* Always render usage preview container, toggle visibility with class */} 
          <div className={`api-usage-preview ${activeProject ? 'visible' : ''}`}>
             {/* Content inside is only relevant when visible */}
             <p>Project Usage ({activeProject?.name || 'N/A'}): {activeProject?.usage.toLocaleString() || 0} / {activeProject?.cap.toLocaleString() || 0}</p>
             <div className="usage-bar-container">
                <div
                  className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
          </div>
        </div>
        <div className="view-content">
          <EndpointSelector 
              endpoints={usersEndpoints} 
              selectedEndpointId={selectedEndpoint}
              onChange={setSelectedEndpoint}
           />
           <div className="api-tools-content">
             {selectedEndpoint ? (
                <p>Tools/Logs for <strong>{endpointDetails?.path}</strong> on app <strong>{activeAppId || 'N/A'}</strong></p>
             ) : (
                <p>Select an endpoint above to see details and tools.</p>
             )}
          </div>
        </div>
      </div>

      {/* Right Sidebar Docs Panel - Now conditional */} 
      <aside className="api-docs-sidebar">
         {endpointDetails ? (
          <> 
            <h3><span className={`endpoint-method method-${endpointDetails.method.toLowerCase()}`}>{endpointDetails.method}</span> {endpointDetails.path}</h3>
            <p>{endpointDetails.summary}</p>
            <pre><code>{`// Sample Request for ${endpointDetails.path}
curl ...`}</code></pre>
            <pre><code>{`// Sample Response for ${endpointDetails.path}
{
  "data": [...]
}`}</code></pre>
            {/* Add more detailed docs here */} 
          </> 
        ) : (
          <> 
            <h3>API Documentation</h3>
            <p>Select an endpoint from the list on the left to view its documentation.</p>
             <h3>Guides</h3>
             <ul className="info-list links">
               <li><a href="#">Understanding User Objects</a></li>
               <li><a href="#">Privacy Considerations</a></li>
             </ul>
          </> 
        )}
      </aside>
    </div>
  );
};

// --- Main App Component ---
function App() {
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  // State to track the currently active view
  const [activeView, setActiveView] = useState<string>("dashboard"); // Default to dashboard
  const [activeAppId, setActiveAppId] = useState<number | null>(null); // State for selected app

  // Function to toggle category expansion
  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Function to handle navigation clicks
  const handleNavClick = (viewId: string | undefined) => {
    if (viewId) {
      setActiveView(viewId);
      // Maybe close sidebar on mobile view later?
    }
  };

  // Updated renderNavItems to handle clicks and types
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      if (item.type === 'header') {
        // Render a header item
        return (
          <li key={item.label} className="nav-item nav-header">
            <span>{item.label}</span>
          </li>
        );
      }

      const isExpanded = expandedCategories[item.label] || false;
      const isActive = item.type === 'link' && item.viewId === activeView;
      
      if (item.type === 'category' && item.subItems) { // Check type is category
        // Render a category with sub-items
        return (
          <li key={item.label} className={`nav-item nav-category ${isExpanded ? 'expanded' : ''}`}>
            <div className="nav-category-header" onClick={() => toggleCategory(item.label)}>
              <span>{item.label}</span>
              <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
            </div>
            {isExpanded && (
              <ul className="sub-nav-list">
                {renderNavItems(item.subItems)}
              </ul>
            )}
          </li>
        );
      } else if (item.type === 'link') { // Check type is link
        // Render a regular navigation link
        return (
          <li key={item.label} className={`nav-item ${isActive ? 'active' : ''}`}>
            <a onClick={() => handleNavClick(item.viewId)}>{item.label}</a>
          </li>
        );
      }
      return null; // Should not happen with defined types
    });
  };

  // Updated renderCurrentView to use components and pass props
  const renderCurrentView = () => {
    const apiViewProps = { projects: mockProjects, activeAppId, setActiveAppId };
    switch (activeView) {
      case 'dashboard':
        return <Dashboard projects={mockProjects} />;
      case 'tweets': 
        return <TweetsView {...apiViewProps} />;
      case 'users': 
        return <UsersView {...apiViewProps} />;
      case 'subscription':
        return <div><h2>Subscription</h2><p>Subscription details go here.</p></div>; 
      case 'invoices':
        return <div><h2>Invoices</h2><p>Invoice list goes here.</p></div>; 
      default:
        return <div><h2>Select a section</h2></div>; 
    }
  };

  return (
    <div className="root-layout">
      <nav className="top-nav">
        <div className="top-nav-content">
          <div className="top-nav-left">
            <div className="top-nav-logo">
              <img src="/tauri.svg" alt="App Logo" />
            </div>
          </div>
          <div className="top-nav-right">
            <span>User Actions</span>
          </div>
        </div>
      </nav>
      <div className="app-layout">
        <nav className="sidebar">
          <ul className="nav-list">
            {renderNavItems(navigation)}
          </ul>
        </nav>
        <main className="main-content">
          {renderCurrentView()}
    </main>
      </div>
      {/* Add Footer Bar */}
      <footer className="app-footer">
        <a href="#" target="_blank" rel="noopener noreferrer">Follow @XDevelopers</a>
        <a href="#" target="_blank" rel="noopener noreferrer">Docs</a>
        <a href="#" target="_blank" rel="noopener noreferrer">Support</a>
      </footer>
    </div>
  );
}

export default App;
