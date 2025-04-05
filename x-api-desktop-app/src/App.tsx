import { useState, useMemo, useEffect } from "react";
import React from 'react';
import "./App.css";
import reactLogo from "./assets/react.svg";
import { 
  NavItem, ApiViewProps // Only needed types left
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

// --- Main App Component ---
function App() {
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  // State to track the currently active view
  const [activeView, setActiveView] = useState<string>("dashboard"); // Default to dashboard
  const [activeAppId, setActiveAppId] = useState<number | null>(null); // State for selected app

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

  // Updated renderCurrentView to handle layout differences
  const renderCurrentView = () => {
    const apiViewProps: Omit<ApiViewProps, 'projects'> = { activeAppId, setActiveAppId }; 

    switch (activeView) {
      case 'tweets': 
        return <TweetsView projects={mockProjects} {...apiViewProps} />;
      case 'users': 
        return <UsersView projects={mockProjects} {...apiViewProps} />;
      
      // For other views, wrap them in the standard main-content padding
      case 'dashboard':
        return (
          <main className="main-content">
            <Dashboard projects={mockProjects} />
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
            {renderNavItems(navigation)}
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
