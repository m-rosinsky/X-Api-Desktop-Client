import { useState, useMemo, useEffect } from "react";
import React from 'react';
import "./App.css";
import reactLogo from "./assets/react.svg";
import { 
  NavItem, ApiViewProps, AppInfo, Project // Add AppInfo and Project here
} from './types'; // Import types
// Removed AppInfo, Project, DashboardProps, AppSelectorProps, Endpoint, EndpointSelectorProps

import AppSelector from "./components/AppSelector"; // Import AppSelector
import EndpointSelector from "./components/EndpointSelector"; // Import EndpointSelector
import { mockProjects, navigation } from "./data/mockData"; // Import mock data
import SplashScreen from "./components/SplashScreen"; // Import SplashScreen

// Import View Components
import Dashboard from "./views/Dashboard";
import TweetsView from "./views/TweetsView";
import UsersView from "./views/UsersView";
import ProjectView from "./views/ProjectView"; // Import the new view
import AppView from "./views/AppView"; // Import the new AppView

// --- Main App Component ---
function App() {
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  // State to track the currently active view
  const [activeView, setActiveView] = useState<string>("dashboard"); // Default to dashboard
  const [activeAppId, setActiveAppId] = useState<number | null>(null); // State for selected app
  const [sidebarWidth, setSidebarWidth] = useState(280); // Lifted state for sidebar width

  // Create the populated navigation structure using useMemo
  const populatedNavigation = useMemo(() => {
    // Deep clone the original navigation to avoid modifying the imported constant
    const navCopy = JSON.parse(JSON.stringify(navigation)) as NavItem[];

    // Find the Projects category item by its ID
    const projectsCategory = navCopy.find(item => item.id === 'nav-projects');

    if (projectsCategory && projectsCategory.type === 'category') {
      // Create NavItem categories for each project
      projectsCategory.subItems = mockProjects.map(project => ({
        label: project.name, 
        type: 'category', // Project is now a category
        viewId: `project-${project.id}`, // Still navigate to ProjectView for the category header
        subItems: project.apps.map(app => ({ // Apps are links within the project category
          label: app.name,
          type: 'link',
          viewId: `app-${app.id}` // Navigate to AppView
        }))
      }));
    }

    return navCopy; // Return the modified copy
  }, []); // Empty dependency array means this runs once on mount

  // Simulate loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Adjust delay as needed (e.g., 2000ms = 2 seconds)

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

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
            {/* Click handler for navigation AND toggle */}
            <div 
              className="nav-category-header" 
              onClick={() => { 
                handleNavClick(item.viewId); // Navigate
                toggleCategory(item.label);  // Toggle expansion
              }}
            >
              <span>{item.label}</span>
              {/* Separate click handler JUST for toggling, stops propagation */}
              <span 
                className="expand-icon" 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent parent onClick from firing
                  toggleCategory(item.label); // Only toggle
                }}
              >
                {isExpanded ? '−' : '+'} {/* Use minus sign for expanded */}
              </span>
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

  // Updated renderCurrentView to handle layout differences and pass props
  const renderCurrentView = () => {
    const apiViewProps: Omit<ApiViewProps, 'projects'> = { activeAppId, setActiveAppId }; 
    
    // Props specifically for ApiViewLayout used in Tweets/Users views
    const apiLayoutProps = {
      initialWidth: sidebarWidth,
      onResize: setSidebarWidth // Pass the state setter directly
    };

    switch (activeView) {
      case 'tweets': 
        // Pass layout props to TweetsView (it will pass them to ApiViewLayout)
        return <TweetsView projects={mockProjects} {...apiViewProps} {...apiLayoutProps} />;
      case 'users': 
        // Pass layout props to UsersView (it will pass them to ApiViewLayout)
        return <UsersView projects={mockProjects} {...apiViewProps} {...apiLayoutProps} />;
      
      // For other views, wrap them in the standard main-content padding
      case 'dashboard':
        return (
          <main className="main-content">
            <Dashboard projects={mockProjects} onNavigate={handleNavClick} />
          </main>
        );
      case 'subscription':
        return (
          <main className="main-content">
             <div><h2>Subscription</h2><p>Subscription details go here.</p></div>
          </main>
         );
      case 'invoices':
        return (
          <main className="main-content">
            <div><h2>Invoices</h2><p>Invoice list goes here.</p></div>
          </main>
        );
      default:
        // Handle Project Views
        if (activeView.startsWith('project-')) {
          // Parse the activeView string
          const parts = activeView.split('/');
          const projectIdPart = parts[0]; // e.g., "project-1"
          const appIdPart = parts[1];     // e.g., "app-101" (optional)
          const tabPart = parts[2];       // e.g., "keys" (optional)
          
          const projectId = parseInt(projectIdPart.split('-')[1], 10);
          const project = mockProjects.find(p => p.id === projectId);
          
          if (project) {
            return (
              <main className="main-content">
                <ProjectView 
                  project={project} 
                  onNavigate={handleNavClick}
                />
              </main>
            );
          }
        }
        // Handle App Views
        else if (activeView.startsWith('app-')) {
          // Parse the activeView string (e.g., "app-101" or "app-101/keys")
          const parts = activeView.split('/');
          const appIdPart = parts[0]; // e.g., "app-101"
          const tabPart = parts[1];   // e.g., "keys" (optional)

          const appId = parseInt(appIdPart.split('-')[1], 10);
          let app: AppInfo | undefined;
          let project: Project | undefined;
          
          // Find the app and its project
          for (const p of mockProjects) {
            const foundApp = p.apps.find(a => a.id === appId);
            if (foundApp) {
              app = foundApp;
              project = p;
              break;
            }
          }

          if (app && project) {
            return (
              <main className="main-content">
                <AppView 
                  app={app} 
                  project={project} 
                  initialTab={tabPart as ('overview' | 'keys') | undefined} 
                  onNavigate={handleNavClick}
                />
              </main>
            );
          }
        }
        // Fallback for unknown views or missing project/app
        return (
          <main className="main-content">
             <div><h2>Select a section</h2></div>
          </main>
        );
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

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
            {renderNavItems(populatedNavigation)}
          </ul>
        </nav>
        {/* Render the view directly - it will handle its own layout/padding */}
        {renderCurrentView()}
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
