export interface AppInfo {
  id: number;
  name: string;
  icon?: string; // Add optional icon field
  environment: 'production' | 'staging' | 'development'; // Add environment field
  keys: { // Add keys object
    bearerToken: string;
    // Add apiKey, apiSecret later if needed
  };
}

export interface Project {
  id: number;
  name: string;
  usage: number;
  cap: number;
  package: string; // Add package field
  description?: string; // Add optional description
  apps: AppInfo[]; // Add apps array
}

export interface NavItem {
  label: string;
  type: 'header' | 'link' | 'category';
  viewId?: string; // Only for type: link
  subItems?: NavItem[]; // Only for type: category
  id?: string; // Optional unique identifier
}

export interface DashboardProps {
  projects: Project[];
  currentUser: User | null;
  onNavigate?: (viewId: string | undefined) => void; // Add optional navigation handler
  onLogin?: () => void; // Add the login handler prop
}

export interface AppSelectorProps {
  projects: Project[];
  selectedAppId: number | null;
  onChange: (selectedId: number | null) => void;
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  queryParams?: QueryParam[]; // Add query parameters array
  pathParams?: PathParam[]; // Add path parameters array
  expansionOptions?: ExpansionOption[]; // Add expansion options array
}

export interface EndpointSelectorProps {
  endpoints: Endpoint[];
  selectedEndpointId: string | null;
  onChange: (selectedId: string | null) => void;
}

export interface ApiViewProps {
  projects: Project[];
  activeAppId: number | null;
  setActiveAppId: (id: number | null) => void;
  currentUser: User | null;
}

// New type for Query Parameters
export interface QueryParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array'; // Add more types as needed
  description?: string;
  required?: boolean;
  example?: string; // Add example field
}

// New type for Path Parameters
export interface PathParam {
  name: string; // The name used in the path string (e.g., 'id')
  description?: string;
  example?: string; // Add example field
  // Type could be added later if needed for validation (e.g., number)
}

// New type for Expansion Options
export interface ExpansionOption {
  name: string;
  description?: string;
} 

export interface User {
  id: string;
  name: string;
  email: string; // Or username
  initials?: string; // Optional for display
} 

// Structure for a single Dtab key-value pair
export interface DtabPair {
    id: number; // Unique ID for React key
    from: string;
    to: string;
} 
