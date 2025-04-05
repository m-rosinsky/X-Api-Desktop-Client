import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ApiViewProps, Endpoint, PathParam } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import PathParamBuilder from '../components/PathParamBuilder';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';
import QueryParamBuilder from '../components/QueryParamBuilder';
import ExpansionsSelector from '../components/ExpansionsSelector';

// Moved from App.tsx as it seems specific to this view
const usersEndpoints: Endpoint[] = [
  {
    id: 'get-users',
    method: 'GET',
    path: '/2/users',
    summary: 'Look up multiple users based on query parameters (e.g., ids, usernames)',
    // TODO: Add query params for GET /2/users (e.g., ids, usernames)
    queryParams: [
      // Add necessary params like ids or usernames here later
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
        example: '2244994945' // Example User ID (TwitterDev)
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
        example: 'XDevelopers' // Changed Example Username
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

const UsersView: React.FC<ApiViewProps> = ({ projects, activeAppId, setActiveAppId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(usersEndpoints[0]?.id ?? null);
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [queryParamValues, setQueryParamValues] = useState<Record<string, string>>({});
  const [selectedExpansions, setSelectedExpansions] = useState<string>('');

  // Find the project containing the active app (duplicate logic, could be extracted)
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

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
    // for (const param of currentQueryParams) { ... }
    return false;
  }, [activeAppId, currentPathParams, pathParamValues/*, currentQueryParams, queryParamValues*/]);

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
          <pre><code>{`// Sample Request for ${endpointDetails.path}
curl ...`}</code></pre>
          <pre><code>{`// Sample Response for ${endpointDetails.path}
{
  "data": [...]
}`}</code></pre>
          {/* Add more detailed docs here */} 
        </> 
      ) : (
        <> 
          <h3>API Documentation</h3>
          <p>Select an endpoint from the list on the left to view its documentation.</p>
            <h3>Guides</h3>
            <ul className="info-list links">
              <li><a href="#">Understanding User Objects</a></li>
              <li><a href="#">Privacy Considerations</a></li>
            </ul>
        </> 
      )}
    </>
  );

  return (
    // Use the ApiViewLayout
    <ApiViewLayout sidebarContent={sidebarContent}>
       {/* Main Content */}
      <div className="api-header-section">
        <div className="selector-and-package">
          <AppSelector projects={projects} selectedAppId={activeAppId} onChange={setActiveAppId} />
          {/* Conditionally render package label outside selector */}
          {activeProject && (
            <span className={`project-package package-${activeProject.package.toLowerCase()}`}>
              {activeProject.package}
            </span>
          )}
        </div>
          {/* Always render usage preview container, toggle visibility with class */}
        <div className={`api-usage-preview ${activeProject ? 'visible' : ''}`}>
            {/* Content inside is only relevant when visible */}
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
        {/* Add endpoint summary below selector */}
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

        {/* TODO: Add QueryParamBuilder if needed for GET /2/users */}
        {/* Query Parameters - Render if GET request and params exist */}
        {endpointDetails?.method === 'GET' && currentQueryParams.length > 0 && (
          <QueryParamBuilder 
             params={currentQueryParams} 
             onChange={handleQueryParamChange} 
           />
        )}

        {/* Expansions Selector */}
        {endpointDetails?.method === 'GET' && currentExpansionOptions.length > 0 && (
          <ExpansionsSelector 
            options={currentExpansionOptions} 
            onChange={handleExpansionChange} 
          />
        )}

         {/* Add Run Request Button */}
        <div className="run-request-section">
           {/* Display usage estimate */}
           <span className="usage-estimate">{usageEstimateText}</span>
           <button 
             className="run-button" 
             onClick={() => { /* TODO: Implement request logic */ console.log('Run Request Clicked!'); }}
             disabled={isRunDisabled} // Apply disabled state
             title={isRunDisabled ? "Select an active app and fill all required parameters (*)" : "Run the API request"} // Add helpful title
           >
             Run Request
           </button>
        </div>

        {/* Use CodeSnippetDisplay component */} 
        <CodeSnippetDisplay 
          endpoint={endpointDetails} 
          pathParams={pathParamValues} 
          queryParams={queryParamValues} 
          expansions={selectedExpansions}
        />
      </div>
    </ApiViewLayout>
  );
};

export default UsersView; 