import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ApiViewProps, Endpoint, User } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import PathParamBuilder from '../components/PathParamBuilder';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';
import QueryParamBuilder from '../components/QueryParamBuilder';
import ExpansionsSelector from '../components/ExpansionsSelector';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

// Type workaround
const Highlighter: any = SyntaxHighlighter;

// Define the additional props passed down from App.tsx
interface UsersViewProps extends ApiViewProps {
  initialWidth: number;
  onResize: (newWidth: number) => void;
  currentUser: User | null;
}

// Moved from App.tsx as it seems specific to this view
const usersEndpoints: Endpoint[] = [
  {
    id: 'get-users',
    method: 'GET',
    path: '/2/users',
    summary: 'Look up multiple users based on query parameters (e.g., ids, usernames)',
    queryParams: [
      {
        name: 'ids',
        type: 'array',
        description: 'A comma-separated list of User IDs. Up to 100 are allowed in a single request.',
        required: true,
        example: '2244994945,6253282' // Example User IDs
      },
    ],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
      { name: 'profile_image_url', description: 'Include profile image URL (dummy).' },
    ],
  },
  {
    id: 'get-user-by-id',
    method: 'GET',
    path: '/2/users/:id',
    summary: 'Look up a single user by ID',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the User to retrieve.',
        example: '2244994945' // Example User ID
      },
    ],
    queryParams: [
      // Add other potential query params for single user lookup if needed
    ],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
      { name: 'description', description: 'Include user description (dummy).' },
    ],
  },
  {
    id: 'get-user-by-username',
    method: 'GET',
    path: '/2/users/by/username/:username',
    summary: 'Look up a single user by username',
    pathParams: [
      {
        name: 'username',
        description: 'The Twitter username (handle) of the User to retrieve.',
        example: 'XDevelopers'
      },
    ],
    queryParams: [
      // Add other potential query params for single user lookup if needed
    ],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
      { name: 'location', description: 'Include user location (dummy).' },
    ],
  },
];

const UsersView: React.FC<UsersViewProps> = ({ 
  projects, 
  activeAppId, 
  setActiveAppId, 
  currentUser,
  initialWidth,
  onResize
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(usersEndpoints[0]?.id ?? null);
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [queryParamValues, setQueryParamValues] = useState<Record<string, string>>({});
  const [selectedExpansions, setSelectedExpansions] = useState<string>('');

  const projectsForSelector = useMemo(() => {
    return currentUser ? projects : [];
  }, [currentUser, projects]);
  
  // Find the active project
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projectsForSelector.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projectsForSelector, activeAppId]);

  // *** Find the active app and its token ***
  const activeApp = useMemo(() => {
    if (!activeProject || activeAppId === null) return null;
    return activeProject.apps.find(app => app.id === activeAppId);
  }, [activeProject, activeAppId]);

  const bearerToken = activeApp?.keys.bearerToken; // Get token or undefined

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  const endpointDetails = useMemo(() => {
    return usersEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  useEffect(() => {
    setPathParamValues({});
    setQueryParamValues({});
    setSelectedExpansions('');
  }, [selectedEndpoint]);

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  // Placeholder for query params if added later
  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  // Memoize the expansion options for the selected endpoint
  const currentExpansionOptions = useMemo(() => {
    return endpointDetails?.expansionOptions ?? [];
  }, [endpointDetails]);

  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  // Placeholder for query param handler
  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  // Callback for the ExpansionsSelector
  const handleExpansionChange = useCallback((newExpansions: string) => {
    setSelectedExpansions(newExpansions);
  }, []);

   // --- Button Logic ---
  const isRunDisabled = useMemo(() => {
    if (activeAppId === null) return true;
    for (const param of currentPathParams) {
      if (!pathParamValues[param.name]) return true;
    }
    // Add check for required query params if QueryParamBuilder is added
    for (const param of currentQueryParams) {
       if (param.required && !queryParamValues[param.name]) { // Check if required and value is empty/falsy
         return true;
      }
    }
    return false;
  }, [activeAppId, currentPathParams, pathParamValues, currentQueryParams, queryParamValues]);

  const usageEstimateText = useMemo(() => {
    // Basic estimate for users view
     if (endpointDetails?.method === 'GET') {
        return `Usage estimate: 1 Request`; 
    }
    return "";
  }, [endpointDetails]);

  // Sidebar content as a fragment
  const sidebarContent = (
    <>
      {endpointDetails ? (
        <> 
          <h3><span className={`endpoint-method method-${endpointDetails.method.toLowerCase()}`}>{endpointDetails.method}</span> {endpointDetails.path}</h3>
          <p>{endpointDetails.summary}</p>
          <p className="sidebar-code-label">Example Request Body (if applicable):</p>
          <Highlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '0.5em', fontSize: '0.85em', borderRadius: '4px', marginBottom: '1em' }}
          >
            {`{
  /* Request body for POST/PUT users - if needed */
}`}
          </Highlighter>
          <p className="sidebar-code-label">Example Response:</p>
          <Highlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '0.5em', fontSize: '0.85em', borderRadius: '4px' }}
          >
            {`{
  "data": {
    "id": "2244994945",
    "name": "Twitter Dev",
    "username": "TwitterDev"
  }
}`}
          </Highlighter>
        </> 
      ) : (
        <> 
          <h3>API Documentation</h3>
          <p>Select an endpoint from the list on the left to view its documentation.</p>
          <h3>Guides</h3>
          <ul className="info-list links">
            <li><a href="#">Getting Started</a></li>
            <li><a href="#">Authentication</a></li>
            <li><a href="#">Rate Limits</a></li>
          </ul>
        </> 
      )}
    </>
  );

  return (
    <ApiViewLayout 
      sidebarContent={sidebarContent} 
      initialWidth={initialWidth}
      onResize={onResize}          
    >
       {/* Main Content */}
      <div className="api-header-section">
        <div className="selector-and-package">
          <AppSelector 
            projects={projectsForSelector} 
            selectedAppId={activeAppId} 
            onChange={setActiveAppId} 
          />
          {activeProject && (
            <span className={`project-package package-${activeProject.package.toLowerCase()}`}>
              {activeProject.package}
            </span>
          )}
        </div>
        <div className={`api-usage-preview ${activeProject ? 'visible' : ''}`}>
            <p>Project Usage ({activeProject?.name || 'N/A'}): {activeProject?.usage.toLocaleString() || 0} / {activeProject?.cap.toLocaleString() || 0}</p>
            <div className="usage-bar-container">
              <div
                className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
        </div>
      </div>
      <div className="view-content">
        <EndpointSelector 
            endpoints={usersEndpoints} 
            selectedEndpointId={selectedEndpoint}
            onChange={setSelectedEndpoint}
          />
        {endpointDetails?.summary && (
          <p className="endpoint-summary">{endpointDetails.summary}</p>
        )}

        {currentPathParams.length > 0 && (
          <PathParamBuilder 
            params={currentPathParams}
            values={pathParamValues}
            onChange={handlePathParamChange}
          />
        )}

        {endpointDetails?.method === 'GET' && currentQueryParams.length > 0 && (
          <QueryParamBuilder 
             params={currentQueryParams} 
             onChange={handleQueryParamChange} 
           />
        )}

        {endpointDetails?.method === 'GET' && currentExpansionOptions.length > 0 && (
          <ExpansionsSelector 
            options={currentExpansionOptions} 
            onChange={handleExpansionChange} 
          />
        )}

        <div className="run-request-section">
           <span className="usage-estimate">{usageEstimateText}</span>
           <button 
             className="run-button" 
             onClick={() => { console.log('Run Request Clicked!'); }}
             disabled={isRunDisabled}
             title={isRunDisabled ? "Select an active app and fill all required parameters (*)" : "Run the API request"}
           >
             Run Request
           </button>
        </div>

        <CodeSnippetDisplay 
          endpoint={endpointDetails} 
          pathParams={pathParamValues} 
          queryParams={queryParamValues} 
          expansions={selectedExpansions}
          bearerToken={bearerToken}
        />
      </div>
    </ApiViewLayout>
  );
};

export default UsersView; 