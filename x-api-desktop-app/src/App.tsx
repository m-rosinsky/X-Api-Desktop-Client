import { useState, useMemo, useEffect, useRef } from "react";
import "./App.css";
import { 
  NavItem, ApiViewProps, AppInfo, Project, User // Add User import
} from './types'; // Import types
// Removed AppInfo, Project, DashboardProps, AppSelectorProps, Endpoint, EndpointSelectorProps

import { navigation as originalNavigation } from "./data/mockData"; // Import and rename original navigation
import SplashScreen from "./components/SplashScreen"; // Import SplashScreen

// Import View Components
import Dashboard from "./views/Dashboard";
import TweetsView from "./views/TweetsView";
import UsersView from "./views/UsersView";
import ProjectView from "./views/ProjectView"; // Import the new view
import AppView from "./views/AppView"; // Import the new AppView
import AccountActivityView from "./views/AccountActivityView"; // Import the new view
import WebhooksView from "./views/WebhooksView"; // Import the new view

// Define a dummy user for simulation
const dummyUser: User = {
  id: '1234567890',
  name: 'demouser1234',
  email: 'demo@example.com',
  initials: 'DU'
};

// --- localStorage Key ---
const USER_PROJECTS_STORAGE_KEY = 'userProjects';

// Modify navigation to include Webhooks
const navigation = JSON.parse(JSON.stringify(originalNavigation)) as NavItem[];

// Find the API header index
const apiHeaderIndex = navigation.findIndex(item => item.label === 'API' && item.type === 'header');

if (apiHeaderIndex !== -1) {
  // Find the Account Activity item index *after* the API header
  let aaIndex = -1;
  for (let i = apiHeaderIndex + 1; i < navigation.length; i++) {
    if (navigation[i].type === 'header') break; // Stop if we hit the next header
    if (navigation[i].viewId === 'account-activity') {
      aaIndex = i;
      break;
    }
  }

  if (aaIndex !== -1) {
    // Insert after Account Activity
    navigation.splice(aaIndex + 1, 0, {
        label: 'Webhooks', 
        type: 'link',
        viewId: 'webhooks' 
    });
  } else {
    // Fallback: Insert directly after API header if Account Activity wasn't found
    navigation.splice(apiHeaderIndex + 1, 0, {
        label: 'Webhooks',
        type: 'link',
        viewId: 'webhooks' 
    });
  }
} else {
  console.error("Could not find 'API' header in navigation data to insert Webhooks link.");
  // Fallback: Add to the end of the whole list if API header wasn't found
  navigation.push({
      label: 'Webhooks',
      type: 'link',
      viewId: 'webhooks' 
  });
}

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

  // --- State for User Projects ---
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  // --- Load projects from localStorage on mount/login ---
  useEffect(() => {
    if (currentUser) { // Only load when logged in
        try {
            const savedProjectsRaw = localStorage.getItem(USER_PROJECTS_STORAGE_KEY);
            if (savedProjectsRaw) {
                const loadedProjects = JSON.parse(savedProjectsRaw) as Project[];
                // Basic validation could be added here if needed
                setUserProjects(loadedProjects || []);
                console.log("Loaded projects from localStorage:", loadedProjects);
            } else {
                setUserProjects([]); // Start with empty if nothing saved
            }
        } catch (error) {
            console.error("Failed to load projects from localStorage:", error);
            setUserProjects([]); // Reset on error
        }
    } else {
        setUserProjects([]); // Clear projects when logged out
    }
  }, [currentUser]); // Re-run when user logs in/out

  // --- Save projects to localStorage whenever they change ---
  useEffect(() => {
    // Only save if user is logged in and projects array is not the initial empty one
    if (currentUser && userProjects.length >= 0) {
        try {
            console.log("Saving projects to localStorage:", userProjects);
            localStorage.setItem(USER_PROJECTS_STORAGE_KEY, JSON.stringify(userProjects));
        } catch (error) {
            console.error("Failed to save projects to localStorage:", error);
            // Maybe show an error to the user?
        }
    }
  }, [userProjects, currentUser]); // Re-run when projects or user changes

  // --- Project/App Management Functions (to be passed down) ---
  // Placeholder functions - implementation will depend on UI views
  const addProject = (newProjectData: Omit<Project, 'id' | 'apps'>) => {
      setUserProjects(prev => {
          const newProject: Project = {
              ...newProjectData,
              id: Date.now(), // Simple unique ID
              apps: [],
              usage: 0, // Default values
              cap: 0,
              package: 'custom',
          };
          return [...prev, newProject];
      });
      // Navigate to the new project view?
      // setActiveView(`project-${newProject.id}`);
  };

  const updateProject = (updatedProject: Project) => {
      setUserProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (projectId: number) => {
      if (confirm("Are you sure you want to delete this project and all its apps?")) {
        setUserProjects(prev => prev.filter(p => p.id !== projectId));
        // Navigate away if viewing the deleted project?
        if (activeView === `project-${projectId}`) {
            setActiveView('dashboard');
        }
      }
  };

  const addAppToProject = (projectId: number, newAppData: Omit<AppInfo, 'id'>) => {
     setUserProjects(prev => prev.map(p => {
         if (p.id === projectId) {
             const newApp: AppInfo = { ...newAppData, id: Date.now() + 1 }; // Simple unique ID
             return { ...p, apps: [...p.apps, newApp] };
         }
         return p;
     }));
     // Navigate to the new app view?
     // setActiveView(`app-${newApp.id}`);
  };

  const updateApp = (projectId: number, updatedApp: AppInfo) => {
     setUserProjects(prev => prev.map(p => {
         if (p.id === projectId) {
             return { ...p, apps: p.apps.map(a => a.id === updatedApp.id ? updatedApp : a) };
         }
         return p;
     }));
  };

  const deleteApp = (projectId: number, appId: number) => {
     if (confirm("Are you sure you want to delete this app?")) {
        setUserProjects(prev => prev.map(p => {
            if (p.id === projectId) {
                return { ...p, apps: p.apps.filter(a => a.id !== appId) };
            }
            return p;
        }));
        // Navigate away if viewing the deleted app?
         if (activeView === `app-${appId}` || activeView.startsWith(`app-${appId}/`)) {
            setActiveView(`project-${projectId}`); // Go back to project view
        }
     }
  };

  // Create the populated navigation structure using useMemo
  const populatedNavigation = useMemo(() => {
    console.log("Recalculating populatedNavigation, currentUser:", currentUser);
    // Use the base navigation structure (already includes Webhooks)
    const navCopy = JSON.parse(JSON.stringify(navigation)) as NavItem[];
    const projectsCategory = navCopy.find(item => item.id === 'nav-projects');

    if (projectsCategory && projectsCategory.type === 'category') {
      console.log("Found projects category item:", projectsCategory);
      if (currentUser) {
        // Use userProjects state instead of mockProjects
        console.log("Current user exists, mapping userProjects:", userProjects);
        try {
          // Ensure subItems is initialized
          projectsCategory.subItems = [];
          // Map user projects
          projectsCategory.subItems = userProjects.map(project => {
            console.log(`Mapping project: ${project.name} (ID: ${project.id})`);
            return {
              label: project.name,
              type: 'category',
              viewId: `project-${project.id}`,
              // Ensure apps array exists before mapping
              subItems: (project.apps || []).map(app => ({
                label: app.name,
                type: 'link',
                viewId: `app-${app.id}`
              }))
            };
          });
          console.log("Finished mapping projects, projectsCategory.subItems:", projectsCategory.subItems);
        } catch (error) {
            console.error("Error during userProjects mapping:", error);
        }
      } else {
        console.log("Current user is null, clearing projects subItems.");
        projectsCategory.subItems = [];
      }
    } else {
        console.log("Did not find projects category item with id 'nav-projects'.");
    }

    console.log("Finished populatedNavigation calculation.");
    return navCopy;
  }, [currentUser, userProjects]); // Add userProjects dependency

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
    // Pass management functions down eventually
    const projectManagementProps = {
        addProject, updateProject, deleteProject, addAppToProject, updateApp, deleteApp
    };

    const apiViewProps: Omit<ApiViewProps, 'projects'> & { currentUser: User | null } = {
      activeAppId,
      setActiveAppId,
      currentUser,
      // Add management functions here? Or pass directly to specific views?
    };

    const apiLayoutProps = {
      initialWidth: sidebarWidth,
      onResize: setSidebarWidth 
    };

    // Project/App View Logic
    if (activeView.startsWith('project-')) {
      const projectId = parseInt(activeView.split('-')[1].split('/')[0], 10);
      // Find project from userProjects state
      const project = userProjects.find(p => p.id === projectId);
      
      if (project) {
        return (
          <main className="main-content">
            <ProjectView 
              project={project} 
              onNavigate={handleNavClick}
              {...projectManagementProps} // Pass management functions
            />
          </main>
        );
      }
    }
    if (activeView.startsWith('app-')) {
      const parts = activeView.split('/');
      const appId = parseInt(parts[0].split('-')[1], 10);
      const tabPart = parts[1];   // e.g., "keys" (optional)

      let app: AppInfo | undefined;
      let project: Project | undefined;
      
      // Find the app and its project
      for (const p of userProjects) {
        const foundApp = p.apps?.find(a => a.id === appId);
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
              {...projectManagementProps} // Pass management functions
            />
          </main>
        );
      }
    }

    // Standard Views
    let ViewComponent: React.FC<any> | null = null;
    switch (activeView) {
      case 'dashboard':
        ViewComponent = Dashboard;
        break;
      case 'tweets':
        ViewComponent = TweetsView;
        break;
      case 'users':
        ViewComponent = UsersView;
        break;
      case 'account-activity':
        ViewComponent = AccountActivityView;
        break;
      case 'webhooks': // Add case for the new view
        ViewComponent = WebhooksView;
        break;
      default:
        // Handle potential project/app views if not caught above
        // or render a default/not found view
        if (!activeView.startsWith('project-') && !activeView.startsWith('app-')) {
           console.warn(`No view component found for activeView: ${activeView}`);
           // Optionally render a NotFound component
           // ViewComponent = NotFoundView;
        }
    }

    if (ViewComponent) {
       if (['tweets', 'users', 'account-activity', 'webhooks'].includes(activeView)) {
        // Render API views with the ApiViewLayout
        return (
          <main className="main-content">
            <ViewComponent 
              {...apiViewProps} 
              {...apiLayoutProps} 
              projects={userProjects} // Pass user projects state
              // Pass management functions if needed by these views?
            />
          </main>
        );
      } else {
        // Render Dashboard (or other non-API views) directly
        return (
          <main className="main-content">
            <ViewComponent 
                currentUser={currentUser} 
                onNavigate={handleNavClick} 
                onLogin={activeView === 'dashboard' ? handleLogin : undefined} 
                projects={activeView === 'dashboard' ? userProjects : undefined} // Pass user projects state
                {...projectManagementProps} // Pass management functions
            />
          </main>
        );
      }
    }

    // If it's a project/app view or no component matched, return null or a loading/error state
    // (The project/app logic above already returns)
    return null; 
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
