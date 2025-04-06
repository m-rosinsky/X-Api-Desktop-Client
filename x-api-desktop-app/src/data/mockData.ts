import { Project, NavItem } from '../types';

// Mock project data with apps (adding default icon and package)
export const mockProjects: Project[] = [
  {
    id: 1,
    name: "Project Alpha",
    usage: 750,
    cap: 1000,
    package: "basic", // Example package
    description: "Web and mobile clients for Alpha service.",
    apps: [
      { id: 101, name: "Alpha Web App", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAbchdjk27736210028Ad821' } },
      { id: 102, name: "Alpha Mobile App", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAbchdjk18ddhc1981726' } },
      { id: 103, name: "Alpha Web Staging", icon: "🧪", environment: "staging", keys: { bearerToken: 'AAAAAAAAAAAAAbchj1GGjs82Anckd098s' } }, // Added staging app
    ],
  },
  {
    id: 2,
    name: "Project Beta",
    usage: 300,
    cap: 1500,
    package: "free", // Example package
    description: "Core services and development instances for Beta.",
    apps: [
      { id: 201, name: "Beta Main Service", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAAA8120fncnai190128w' } },
      { id: 202, name: "Beta Dev Instance", icon: "🛠️", environment: "development", keys: { bearerToken: 'AAAAAAAAAAAAA19010ASDNVH27hdsajh' } }, // Added dev app
    ],
  },
  {
    id: 3,
    name: "Project Gamma",
    usage: 1200,
    cap: 1200,
    package: "enterprise", // Example package
    description: "Data processing and reporting suite.",
    apps: [
      { id: 301, name: "Gamma Analytics", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAASB18237abjskso9' } },
      { id: 302, name: "Gamma Data Pipeline", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAcx1923jksnj92ss' } },
      { id: 303, name: "Gamma Reporting UI", icon: "📱", environment: "production", keys: { bearerToken: 'AAAAAAAAAAAAAdj18273A12023adxa' } },
    ],
  },
  {
    id: 4,
    name: "Project Delta",
    usage: 150,
    cap: 500,
    package: "basic", // Example package
    description: "Initial setup for Delta project.",
    apps: [], // Project with no apps yet
  },
];

// Updated navigation structure with headers and new sections
export const navigation: NavItem[] = [
  { label: "Home", type: 'header' }, 
  { label: "Dashboard", type: 'link', viewId: "dashboard" },
  {
    label: "Projects", 
    type: 'category', 
    id: 'nav-projects', // Add a unique ID for targeting
    subItems: [], // Will be populated dynamically
  },
  
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