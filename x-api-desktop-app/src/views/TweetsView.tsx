import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiViewProps, Endpoint, QueryParam, PathParam, User, Project } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import QueryParamBuilder from '../components/QueryParamBuilder';
import PathParamBuilder from '../components/PathParamBuilder';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';
import ExpansionsSelector from '../components/ExpansionsSelector';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

// Type workaround
const Highlighter: any = SyntaxHighlighter;

// Define the additional props passed down from App.tsx
interface TweetsViewProps extends ApiViewProps {
  initialWidth: number;
  onResize: (newWidth: number) => void;
}

// Update endpoint data with queryParams and pathParams
const tweetsEndpoints: Endpoint[] = [
  {
    id: 'get-tweets',
    method: 'GET',
    path: '/2/tweets',
    summary: 'Retrieve multiple Tweets specified by ID',
    queryParams: [
      {
        name: 'ids',
        type: 'array', // Twitter API expects comma-separated string for array
        description: 'A comma-separated list of Tweet IDs. Up to 100 are allowed in a single request.',
        required: true, // Mark as required
        example: '1460323737035677698,1293593516040269825' // Example comma-separated IDs
      },
      // Add other query parameters for GET /2/tweets here as needed
      // Example: { name: 'expansions', type: 'array', description: '...' },
    ],
    expansionOptions: [ // Added expansion options
      { name: 'author_id', description: 'Expand the author user object.' },
      { name: 'referenced_tweets.id', description: 'Expand referenced tweet objects.' },
      { name: 'attachments.media_keys', description: 'Expand media objects.' },
      { name: 'geo.place_id', description: 'Expand location data.' }, // Dummy
    ],
  },
  {
    id: 'get-tweet-by-id',
    method: 'GET',
    path: '/2/tweets/:id',
    summary: 'Retrieve a single Tweet by ID',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the Tweet to retrieve.',
        example: '1460323737035677698' // Example Tweet ID
      },
    ],
    // Note: Path parameters like :id are handled differently, not via QueryParamBuilder
    queryParams: [ // Add queryParams here
      // Add other potential query params for single tweet lookup if needed
    ],
    expansionOptions: [ // Added expansion options
      { name: 'author_id', description: 'Expand the author user object.' },
      { name: 'referenced_tweets.id', description: 'Expand referenced tweet objects.' },
      { name: 'attachments.media_keys', description: 'Expand media objects.' },
      // Add other dummy expansions if needed
    ],
  },
  {
    id: 'post-tweet',
    method: 'POST',
    path: '/2/tweets',
    summary: 'Create a new Tweet',
    // POST requests often use request bodies, not query params (though possible)
  },
  {
    id: 'delete-tweet',
    method: 'DELETE',
    path: '/2/tweets/:id',
    summary: 'Delete a Tweet',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the Tweet to delete.',
        example: '1460323737035677698' // Example Tweet ID
      },
    ],
  },
];

const TweetsView: React.FC<TweetsViewProps> = ({ 
  projects, 
  activeAppId, 
  setActiveAppId, 
  currentUser,
  initialWidth,
  onResize
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(tweetsEndpoints[0]?.id ?? null);
  const [queryParamValues, setQueryParamValues] = useState<Record<string, string>>({});
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [selectedExpansions, setSelectedExpansions] = useState<string>('');
  const [overwriteToken, setOverwriteToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<{ status: number, message: string, body?: any } | null>(null);

  // Find the project containing the active app
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

  // Filter projects based on currentUser BEFORE passing to AppSelector
  const projectsForSelector = useMemo(() => {
    return currentUser ? projects : []; // Pass empty array if logged out
  }, [currentUser, projects]);

  // *** Find the active app and its token ***
  const activeApp = useMemo(() => {
    if (!activeProject || activeAppId === null) return null;
    return activeProject.apps.find(app => app.id === activeAppId);
  }, [activeProject, activeAppId]);

  const originalBearerToken = activeApp?.keys.bearerToken; // Get original token or undefined

  // Use overwrite token if available, otherwise use the original token
  const effectiveBearerToken = overwriteToken.trim() !== '' ? overwriteToken : originalBearerToken;

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  // Find the details *and params* for the selected endpoint
  const endpointDetails = useMemo(() => {
    return tweetsEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  // Reset path params when endpoint changes
  useEffect(() => {
    setPathParamValues({}); 
    // Also reset query params when endpoint changes
    setQueryParamValues({}); 
    setSelectedExpansions('');
    setApiResponse(null); // Clear results on endpoint change
    setApiErrorDetails(null);
  }, [selectedEndpoint]);

  // Memoize the query params for the selected endpoint
  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  // Memoize the expansion options for the selected endpoint
  const currentExpansionOptions = useMemo(() => {
    return endpointDetails?.expansionOptions ?? [];
  }, [endpointDetails]);

  // Callback for the QueryParamBuilder
  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  // Callback for the PathParamBuilder
  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  // Callback for the ExpansionsSelector
  const handleExpansionChange = useCallback((newExpansions: string) => {
    setSelectedExpansions(newExpansions);
  }, []);

  // --- Button Logic ---
  const isRunDisabled = useMemo(() => {
    if (activeAppId === null && !overwriteToken) return true;
    if (!effectiveBearerToken) return true;

    for (const param of currentPathParams) {
      if (!pathParamValues[param.name]) {
        return true;
      }
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
      // 1. Construct URL
      let path = endpointDetails.path;
      currentPathParams.forEach(param => {
        path = path.replace(`:${param.name}`, encodeURIComponent(pathParamValues[param.name] || ''));
      });
      const baseUrl = 'https://api.twitter.com';
      const url = new URL(baseUrl + path);

      // 2. Add Query Params (only for GET requests usually)
      if (endpointDetails.method === 'GET') {
          Object.entries(queryParamValues).forEach(([key, value]) => {
            if (value) { url.searchParams.append(key, value); }
          });
          if (selectedExpansions) {
            url.searchParams.append('expansions', selectedExpansions);
          }
          // TODO: Add other query params like tweet.fields, etc.
      }

      // 3. Prepare Headers
      const headers = {
        'Authorization': `Bearer ${effectiveBearerToken}`,
        // Let backend handle Content-Type based on body presence
      };

      // 4. Prepare Body (Only for POST/PUT for now)
      let requestBody = null;
      if (endpointDetails.method === 'POST') {
        // Simple placeholder for POST body - adjust as needed
        requestBody = { text: "Hello from Tauri X Client!" }; 
      }
       // DELETE requests won't have a body sent via JSON

      // 5. Invoke Tauri Command
       const result = await invoke('make_api_request', {
        args: {
          method: endpointDetails.method,
          url: url.toString(),
          headers: headers,
          body: requestBody // Pass request body (null if not POST/PUT)
        }
      });

      // 6. Handle Success Response from Backend
      setApiResponse((result as any).body);

    } catch (error: any) {
      console.error("API Request Failed via Backend:", error);
      // Backend returns ApiError structure directly on error
      setApiErrorDetails({
        status: error.status ?? 0,
        message: error.message ?? 'An unexpected error occurred.',
        body: error.body // Body might be included
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
      currentPathParams
  ]);

  const usageEstimateText = useMemo(() => {
    if (endpointDetails?.id === 'get-tweets' && queryParamValues.ids) {
      const idCount = queryParamValues.ids.split(',').filter(id => id.trim() !== '').length;
      return `Usage estimate: ${idCount} Post${idCount !== 1 ? 's' : ''}`;
    }
    if (endpointDetails?.method === 'GET' || endpointDetails?.method === 'DELETE') {
        return `Usage estimate: 1 Request`;
    }
    if (endpointDetails?.method === 'POST') {
        return `Usage estimate: 1+ Request`;
    }
    return "";
  }, [endpointDetails, queryParamValues]);

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
            {/* Placeholder - Actual body depends on POST/PUT etc. */}
            {`{
  "text": "Hello world!"
}`}
          </Highlighter>
          <p className="sidebar-code-label">Example Response:</p>
          <Highlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '0.5em', fontSize: '0.85em', borderRadius: '4px' }}
          >
            {/* Example JSON string */} 
            {`{
  "data": [
    {
      "id": "1460323737035677698",
      "text": "Who am I? I'm Jean Valjean!"
    }
  ]
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
            endpoints={tweetsEndpoints} 
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

        {/* --- Response/Error Display Area --- */}
        <div className="api-response-area" style={{ marginTop: '2em' }}>
          {isLoading && (
            <div className="loading-indicator">Loading response...</div>
          )}

          {apiErrorDetails && (
            <div className="error-message" style={{ color: '#ffcccc', background: '#4d2020', border: '1px solid #a85050', padding: '1em', borderRadius: '4px', marginBottom: '1em' }}>
              <strong>Error {apiErrorDetails.status > 0 ? `(HTTP ${apiErrorDetails.status})` : ''}:</strong> {apiErrorDetails.message}
              {apiErrorDetails.body && (
                 <div style={{marginTop: '1em'}}>
                  <h4>Error Response Body:</h4>
                   <Highlighter
                      language="json"
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '300px', overflowY: 'auto' }}
                      wrapLongLines={true}
                    >
                      {JSON.stringify(apiErrorDetails.body, null, 2)}
                    </Highlighter>
                 </div>
              )}
            </div>
          )}

          {apiResponse && !apiErrorDetails && (
            <div>
              <h4>API Response:</h4>
              <Highlighter
                language="json"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '400px', overflowY: 'auto' }}
                wrapLongLines={true}
              >
                {JSON.stringify(apiResponse, null, 2)}
              </Highlighter>
            </div>
          )}
        </div>
        {/* --- End Response Display --- */}

        <CodeSnippetDisplay 
          endpoint={endpointDetails} 
          pathParams={pathParamValues} 
          queryParams={queryParamValues} 
          expansions={selectedExpansions}
          bearerToken={effectiveBearerToken}
        />
      </div>
    </ApiViewLayout>
  );
};

export default TweetsView; 