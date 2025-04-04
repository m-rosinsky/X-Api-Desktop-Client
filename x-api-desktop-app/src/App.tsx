import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Define the structure for navigation items
interface NavItem {
  label: string;
  href?: string; // Optional href for direct links
  subItems?: NavItem[]; // Optional sub-items for categories
}

// Sample navigation structure
const navigation: NavItem[] = [
  { label: "Dashboard", href: "#" },
  {
    label: "Analytics",
    subItems: [
      { label: "Overview", href: "#" },
      { label: "Reports", href: "#" },
      { label: "Real-time", href: "#" },
    ],
  },
  {
    label: "Management",
    subItems: [
      { label: "Users", href: "#" },
      { label: "Products", href: "#" },
      { label: "Orders", href: "#" },
    ],
  },
  { label: "Settings", href: "#" },
  { label: "Profile", href: "#" },
];

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  // State to track expanded categories (using label as key)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Function to render navigation items recursively
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      const isExpanded = expandedCategories[item.label] || false;
      if (item.subItems) {
        // Render a category with sub-items
        return (
          <li key={item.label} className={`nav-item nav-category ${isExpanded ? 'expanded' : ''}`}>
            <div className="nav-category-header" onClick={() => toggleCategory(item.label)}>
              <span>{item.label}</span>
              <span className="expand-icon">{isExpanded ? '-' : '+'}</span> {/* Simple +/- icon */}
            </div>
            {isExpanded && (
              <ul className="sub-nav-list">
                {renderNavItems(item.subItems)} {/* Recursive call for sub-items */}
              </ul>
            )}
          </li>
        );
      } else {
        // Render a regular navigation link
        return (
          <li key={item.label} className="nav-item">
            <a href={item.href || '#'}>{item.label}</a>
          </li>
        );
      }
    });
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
            <button className="sidebar-toggle-btn" onClick={toggleSidebar} title="Toggle Sidebar">
              <span>☰</span>
            </button>
            <span>User Actions</span>
          </div>
        </div>
      </nav>
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <nav className="sidebar">
          <ul className="nav-list">
            {renderNavItems(navigation)}
          </ul>
        </nav>
        <main className="main-content">
          <div className="content">
            <h1>Welcome to Tauri + React</h1>

            <div className="row">
              <a href="https://vitejs.dev" target="_blank">
                <img src="/vite.svg" className="logo vite" alt="Vite logo" />
              </a>
              <a href="https://tauri.app" target="_blank">
                <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
              </a>
              <a href="https://reactjs.org" target="_blank">
                <img src={reactLogo} className="logo react" alt="React logo" />
              </a>
            </div>
            <p>Click on the Tauri, Vite, and React logos to learn more.</p>

            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                greet();
              }}
            >
              <input
                id="greet-input"
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Enter a name..."
              />
              <button type="submit">Greet</button>
            </form>
            <p>{greetMsg}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
