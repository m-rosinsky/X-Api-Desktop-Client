import { useState, useMemo, useEffect, useRef } from "react";
import "./App.css";
import { 
  NavItem, ApiViewProps, AppInfo, Project, User // Add User import
} from './types'; // Import types
// Removed AppInfo, Project, DashboardProps, AppSelectorProps, Endpoint, EndpointSelectorProps

import { mockProjects, navigation } from "./data/mockData"; // Import mock data
import SplashScreen from "./components/SplashScreen"; // Import SplashScreen

// Import View Components
import Dashboard from "./views/Dashboard";
import TweetsView from "./views/TweetsView";
import UsersView from "./views/UsersView";
import ProjectView from "./views/ProjectView"; // Import the new view
import AppView from "./views/AppView"; // Import the new AppView
import AccountActivityView from "./views/AccountActivityView"; // Import the new view

// Define a dummy user for simulation
const dummyUser: User = {
  id: '1234567890',
  name: 'demouser1234',
  email: 'demo@example.com',
  initials: 'DU'
};

// --- Main App Component ---
function App() {
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  // State to track the currently active view
  const [activeView, setActiveView] = useState<string>("dashboard"); // Default to dashboard
  const [activeAppId, setActiveAppId] = useState<number | null>(null); // State for selected app
  const [sidebarWidth, setSidebarWidth] = useState(280); // Lifted state for sidebar width
  // State for current user (null = logged out)
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  // State for user dropdown visibility
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null); // Ref for click outside

  // Create the populated navigation structure using useMemo
  const populatedNavigation = useMemo(() => {
    // Deep clone the original navigation to avoid modifying the imported constant
    const navCopy = JSON.parse(JSON.stringify(navigation)) as NavItem[];

    // Find the Projects category item by its ID
    const projectsCategory = navCopy.find(item => item.id === 'nav-projects');

    if (projectsCategory && projectsCategory.type === 'category') {
      // *** Conditionally populate based on currentUser ***
      if (currentUser) {
        // User is logged in, populate with mock projects (replace with actual user projects later)
        projectsCategory.subItems = mockProjects.map(project => ({
          label: project.name, 
          type: 'category', 
          viewId: `project-${project.id}`,
          subItems: project.apps.map(app => ({ 
            label: app.name,
            type: 'link',
            viewId: `app-${app.id}`
          }))
        }));
      } else {
        // User is logged out, clear sub-items for Projects category
        projectsCategory.subItems = []; 
      }
    }

    return navCopy; // Return the modified copy
  // *** Add currentUser to dependency array ***
  }, [currentUser]); // Re-run when currentUser changes

  // Simulate loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Adjust delay as needed (e.g., 2000ms = 2 seconds)

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Login handler
  const handleLogin = () => {
    setCurrentUser(dummyUser);
    setIsUserMenuOpen(false); // Close menu after action
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView("dashboard"); // Go back to dashboard on logout
    setActiveAppId(null); // Reset active app
    setIsUserMenuOpen(false); // Close menu after action
    // Collapse the Projects category
    setExpandedCategories(prev => ({ ...prev, ["Projects"]: false })); 
  };

  // Toggle user menu dropdown
  const toggleUserMenu = () => {
    setIsUserMenuOpen(prev => !prev);
  };

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
    const apiViewProps: Omit<ApiViewProps, 'projects'> & { currentUser: User | null } = {
      activeAppId,
      setActiveAppId,
      currentUser
    }; 
    
    const apiLayoutProps = {
      initialWidth: sidebarWidth,
      onResize: setSidebarWidth 
    };

    // Project/App View Logic
    if (activeView.startsWith('project-')) {
      // Parse the activeView string
      const parts = activeView.split('/');
      const projectIdPart = parts[0]; // e.g., "project-1"
      
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
    if (activeView.startsWith('app-')) {
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

    // Standard View Logic
    switch (activeView) {
      case "dashboard":
        return <Dashboard projects={mockProjects} currentUser={currentUser} onNavigate={handleNavClick} onLogin={handleLogin} />;
      case "tweets":
        return <TweetsView {...apiViewProps} {...apiLayoutProps} projects={mockProjects} />;
      case "users":
        return <UsersView {...apiViewProps} {...apiLayoutProps} projects={mockProjects} />;
      case "account-activity":
        return <AccountActivityView {...apiViewProps} {...apiLayoutProps} projects={mockProjects} />;
      case "subscription":
        return (
          <main className="main-content">
             <div><h2>Subscription</h2><p>Subscription details go here.</p></div>
          </main>
         );
      case "invoices":
        return (
          <main className="main-content">
            <div><h2>Invoices</h2><p>Invoice list goes here.</p></div>
          </main>
        );
      default:
        return <div>View not found: {activeView}</div>;
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
              <span className="top-nav-logo-text">𝕏</span>
            </div>
            {/* Maybe add global search or other controls here */}
          </div>
          <div className="top-nav-right">
            {/* User Menu Section */}
            <div className="user-menu-container" ref={userMenuRef}>
              {currentUser ? (
                // Logged In State
                <>
                  <button className="user-menu-button" onClick={toggleUserMenu}>
                    <span className="user-info">
                      <span className="user-initials">{currentUser.initials || currentUser.name.charAt(0)}</span>
                      {/* Optionally display full name: <span className="user-name">{currentUser.name}</span> */}
                    </span>
                    <span className={`dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  {isUserMenuOpen && (
                    <ul className="user-dropdown">
                      {/* Add other items like 'Profile' or 'Settings' if needed */}
                      <li onClick={handleLogout}>Sign Out</li>
                    </ul>
                  )}
                </>
              ) : (
                // Logged Out State
                <button 
                  className="sign-in-button" 
                  onClick={() => handleNavClick('dashboard')}
                >
                  Sign In
                </button>
              )}
            </div>
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
