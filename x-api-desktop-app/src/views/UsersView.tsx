import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

// Define structure for successful backend response
interface BackendApiResponse {
  status: number;
  body: any; 
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
  const [overwriteToken, setOverwriteToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<BackendApiResponse | null>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<{ status: number, message: string, body?: any } | null>(null);
  const [dtabFrom, setDtabFrom] = useState<string>('');
  const [dtabTo, setDtabTo] = useState<string>('');

  const projectsForSelector = useMemo(() => {
    return currentUser ? projects : [];
  }, [currentUser, projects]);
  
  // Find the active project
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projectsForSelector.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projectsForSelector, activeAppId]);

  // Find the active app and its token
  const activeApp = useMemo(() => {
    if (!activeProject || activeAppId === null) return null;
    return activeProject.apps.find(app => app.id === activeAppId);
  }, [activeProject, activeAppId]);

  const originalBearerToken = activeApp?.keys.bearerToken;
  const effectiveBearerToken = overwriteToken.trim() !== '' ? overwriteToken : originalBearerToken;

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  const endpointDetails = useMemo(() => {
    return usersEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  useEffect(() => {
    setPathParamValues({});
    setQueryParamValues({});
    setSelectedExpansions('');
    setApiResponse(null);
    setApiErrorDetails(null);
  }, [selectedEndpoint]);

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  const currentExpansionOptions = useMemo(() => {
    return endpointDetails?.expansionOptions ?? [];
  }, [endpointDetails]);

  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  const handleExpansionChange = useCallback((newExpansions: string) => {
    setSelectedExpansions(newExpansions);
  }, []);

  const isRunDisabled = useMemo(() => {
    if (activeAppId === null && !overwriteToken) return true;
    if (!effectiveBearerToken) return true;

    for (const param of currentPathParams) {
      if (!pathParamValues[param.name]) return true;
    }
    for (const param of currentQueryParams) {
       if (param.required && !queryParamValues[param.name]) {
         return true;
      }
    }
    return false;
  }, [activeAppId, overwriteToken, effectiveBearerToken, currentPathParams, pathParamValues, currentQueryParams, queryParamValues]);

  // --- API Request Logic using Tauri invoke ---
  const handleRunRequest = useCallback(async () => {
    if (!endpointDetails || !effectiveBearerToken) return;

    setIsLoading(true);
    setApiResponse(null);
    setApiErrorDetails(null);

    try {
      let path = endpointDetails.path;
      currentPathParams.forEach(param => {
        path = path.replace(`:${param.name}`, encodeURIComponent(pathParamValues[param.name] || ''));
      });
      const baseUrl = 'https://api.twitter.com';
      const url = new URL(baseUrl + path);

      Object.entries(queryParamValues).forEach(([key, value]) => {
        if (value) { url.searchParams.append(key, value); }
      });
      if (selectedExpansions) {
        url.searchParams.append('expansions', selectedExpansions);
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${effectiveBearerToken}`,
        'Content-Type': 'application/json'
      };

      if (dtabFrom.trim() !== '' && dtabTo.trim() !== '') {
        headers['Dtab-Local'] = `${dtabFrom.trim()} => ${dtabTo.trim()}`;
      }

      let requestBody = null;

      const result = await invoke<BackendApiResponse>('make_api_request', {
        args: {
          method: endpointDetails.method,
          url: url.toString(),
          headers: headers,
          body: requestBody
        }
      });

      setApiResponse(result);

    } catch (error: any) {
      console.error("API Request Failed via Backend:", error);
      setApiErrorDetails({
        status: error.status ?? 0,
        message: error.message ?? 'An unexpected error occurred.',
        body: error.body
      });
      setApiResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [
      endpointDetails, 
      effectiveBearerToken, 
      pathParamValues, 
      queryParamValues, 
      selectedExpansions, 
      currentPathParams,
      dtabFrom,
      dtabTo
  ]);

  const usageEstimateText = useMemo(() => {
    if (endpointDetails?.method === 'GET') {
        return `Usage estimate: 1 Request`; 
    }
    return "";
  }, [endpointDetails]);

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

        <div className="form-group">
          <label htmlFor="overwrite-token-input">Override Bearer Token (Optional):</label>
          <input
            id="overwrite-token-input"
            type="password"
            className="text-input"
            placeholder="Paste Bearer token here to override app selection"
            value={overwriteToken}
            onChange={(e) => setOverwriteToken(e.target.value)}
          />
        </div>

        <details className="advanced-details">
          <summary className="advanced-summary">Advanced Options</summary>
          <div className="advanced-section-content form-group">
            <label htmlFor="dtab-from-input">Dtabs:</label>
            <div className="dtab-input-container">
              <input
                id="dtab-from-input"
                type="text"
                className="text-input dtab-input"
                placeholder="/s/role/service"
                value={dtabFrom}
                onChange={(e) => setDtabFrom(e.target.value)}
              />
              <span className="dtab-separator">=&gt;</span>
              <input
                id="dtab-to-input"
                type="text"
                className="text-input dtab-input"
                placeholder="/srv#/env/dc/role/service"
                value={dtabTo}
                onChange={(e) => setDtabTo(e.target.value)}
              />
            </div>
          </div>
        </details>

        <div className="run-request-section">
           <span className="usage-estimate">{usageEstimateText}</span>
           <button
             className="run-button"
             onClick={handleRunRequest}
             disabled={isRunDisabled || isLoading}
             title={isRunDisabled ? "Select an active app/token and fill required parameters (*)" : "Run the API request"}
           >
             {isLoading ? 'Running...' : 'Run Request'}
           </button>
        </div>

        <div className="api-response-area" style={{ marginTop: '2em' }}>
          {isLoading && <div className="loading-indicator">Loading response...</div>}
          {apiErrorDetails && (
             <div className="error-message" style={{ color: '#ffcccc', background: '#4d2020', border: '1px solid #a85050', padding: '1em', borderRadius: '4px', marginBottom: '1em' }}>
               <strong>Error {apiErrorDetails.status > 0 ? `(HTTP ${apiErrorDetails.status})` : ''}:</strong> {apiErrorDetails.message}
               {apiErrorDetails.body && (
                  <div style={{marginTop: '1em'}}>
                   <h4>Error Response Body:</h4>
                    <Highlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '300px', overflowY: 'auto' }} wrapLongLines={true}>
                       {JSON.stringify(apiErrorDetails.body, null, 2)}
                     </Highlighter>
                  </div>
               )}
             </div>
           )}
           {apiResponse && !apiErrorDetails && (
             <div>
               <h4 className={`response-status status-${Math.floor((apiResponse.status || 0) / 100)}xx`}>
                 Status: {apiResponse.status}
               </h4>
               <Highlighter 
                 language="json" 
                 style={vscDarkPlus} 
                 customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '400px', overflowY: 'auto' }} 
                 wrapLongLines={true}
               >
                 {JSON.stringify(apiResponse.body, null, 2)}
               </Highlighter>
             </div>
           )}
         </div>

        <CodeSnippetDisplay 
          endpoint={endpointDetails} 
          pathParams={pathParamValues} 
          queryParams={queryParamValues} 
          expansions={selectedExpansions}
          bearerToken={effectiveBearerToken}
          dtabFrom={dtabFrom}
          dtabTo={dtabTo}
        />
      </div>
    </ApiViewLayout>
  );
};

export default UsersView; 