export interface AppInfo {
  id: number;
  name: string;
  icon?: string; // Add optional icon field
  description?: string; // Add optional description field
  environment: 'production' | 'staging' | 'development'; // Add environment field
  oauth1Keys?: { // Optional object for OAuth 1.0a
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessSecret?: string;
    bearerToken?: string; // Often used with v1.1 endpoints too
  };
  oauth2Keys?: { // Optional object for OAuth 2.0
    clientId?: string;
    clientSecret?: string;
    // bearerToken might live here conceptually, but let's keep one main bearer for simplicity?
    // Or we could have a separate bearerToken field outside these objects if used by both.
    // Keeping bearerToken in OAuth1 for now as it aligns with v1.1 usage.
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
  onNavigate?: (viewId: string) => void;
  onLogin?: () => void;
  addProject: (newProjectData: Omit<Project, 'id' | 'apps'>) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: number) => void;
  addAppToProject: (projectId: number, newAppData: Omit<AppInfo, 'id'>) => void;
  updateApp: (projectId: number, updatedApp: AppInfo) => void;
  deleteApp: (projectId: number, appId: number) => void;
}

export interface AppSelectorProps {
  projects: Project[];
  selectedAppId: number | null;
  onChange: (selectedId: number | null) => void;
}

export interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  summary: string;
  queryParams?: QueryParam[];
  pathParams?: PathParam[];
  bodyParams?: BodyParam[];
  expansionOptions?: ExpansionOption[];
  category?: string; // Optional category for grouping
  authType?: 'bearer' | 'oauth1a' | 'oauth2'; // Add auth type (default: bearer)
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

// New type for Body Parameters
export interface BodyParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'; // Add object type
  description?: string;
  required?: boolean;
  example?: string | object; // Example can be object too
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

export interface AppViewProps {
  app: AppInfo;
  project: Project;
  initialTab?: 'overview' | 'keys' | 'settings'; // Add settings to initialTab options
  onNavigate?: (viewId: string | undefined) => void;
  // Change projectId and appId to number
  updateApp: (projectId: number, updatedApp: AppInfo) => void;
  deleteApp: (projectId: number, appId: number) => void;
}

export interface ProjectViewProps {
  project: Project;
  onNavigate?: (viewId: string | undefined) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: number) => void;
  addAppToProject: (projectId: number, newAppData: Omit<AppInfo, 'id'>) => void;
} 
