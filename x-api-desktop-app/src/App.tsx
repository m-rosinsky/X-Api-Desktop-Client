import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Define structure for App data
interface AppInfo {
  id: number;
  name: string;
}

// Define structure for Project data
interface Project {
  id: number;
  name: string;
  usage: number;
  cap: number;
  apps: AppInfo[]; // Add apps array
}

// Mock project data with apps
const mockProjects: Project[] = [
  {
    id: 1,
    name: "Project Alpha",
    usage: 750,
    cap: 1000,
    apps: [
      { id: 101, name: "Alpha Web App" },
      { id: 102, name: "Alpha Mobile App" },
    ],
  },
  {
    id: 2,
    name: "Project Beta",
    usage: 300,
    cap: 1500,
    apps: [
      { id: 201, name: "Beta Main Service" },
    ],
  },
  {
    id: 3,
    name: "Project Gamma",
    usage: 1200,
    cap: 1200,
    apps: [
      { id: 301, name: "Gamma Analytics" },
      { id: 302, name: "Gamma Data Pipeline" },
      { id: 303, name: "Gamma Reporting UI" },
    ],
  },
  {
    id: 4,
    name: "Project Delta",
    usage: 150,
    cap: 500,
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

// --- Dashboard Component --- //
const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  return (
    <div className="dashboard">
      <h2>Project Dashboard</h2>
      <div className="project-list">
        {projects.map((project: Project) => {
          const usagePercentage = Math.min((project.usage / project.cap) * 100, 100);
          return (
            <div key={project.id} className="project-item">
              <h3>{project.name}</h3>
              <p>Usage: {project.usage.toLocaleString()} / {project.cap.toLocaleString()}</p>
              <div className="usage-bar-container">
                <div
                  className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
              {/* Add Apps List */}
              {project.apps.length > 0 && (
                <div className="app-list">
                  <h4>Apps:</h4>
                  <ul>
                    {project.apps.map((app: AppInfo) => (
                      <li key={app.id} className="app-item">
                        <span>{app.name}</span>
                        <div className="app-item-actions">
                          <span className="key-icon" title="View Keys">🔑</span>
                          <span className="settings-icon" title="App Settings">⚙️</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // State to track the currently active view
  const [activeView, setActiveView] = useState<string>("dashboard"); // Default to dashboard

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  // Function to toggle category expansion
  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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

  // Function to render the current view based on activeView state
  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard projects={mockProjects} />;
      case 'tweets':
        return <div><h2>Tweets API</h2><p>Tweets API management goes here.</p></div>;
      case 'users':
        return <div><h2>Users API</h2><p>Users API management goes here.</p></div>;
      case 'subscription':
        return <div><h2>Subscription</h2><p>Subscription details go here.</p></div>;
      case 'invoices':
        return <div><h2>Invoices</h2><p>Invoice list goes here.</p></div>;
      default:
        return <div><h2>Select a section</h2></div>; // Fallback
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
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <nav className="sidebar">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar} title="Toggle Sidebar">
            <span>☰</span>
          </button>
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
