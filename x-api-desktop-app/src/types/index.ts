export interface AppInfo {
  id: number;
  name: string;
  icon?: string; // Add optional icon field
  environment: 'production' | 'staging' | 'development'; // Add environment field
}

export interface Project {
  id: number;
  name: string;
  usage: number;
  cap: number;
  package: string; // Add package field
  apps: AppInfo[]; // Add apps array
}

export interface NavItem {
  label: string;
  type: 'link' | 'category' | 'header'; // Add type property
  viewId?: string; // ID to identify the view to render
  href?: string; // Keep href for potential future use or external links
  subItems?: NavItem[]; // Optional sub-items for categories
}

export interface DashboardProps {
  projects: Project[];
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
} 