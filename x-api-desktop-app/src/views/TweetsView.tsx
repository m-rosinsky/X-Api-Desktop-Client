import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ApiViewProps, Endpoint, QueryParam, PathParam } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import QueryParamBuilder from '../components/QueryParamBuilder';
import PathParamBuilder from '../components/PathParamBuilder';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';

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

const TweetsView: React.FC<ApiViewProps> = ({ projects, activeAppId, setActiveAppId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(tweetsEndpoints[0]?.id ?? null);
  const [queryParamValues, setQueryParamValues] = useState<Record<string, string>>({});
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});

  // Find the project containing the active app
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

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
  }, [selectedEndpoint]);

  // Memoize the query params for the selected endpoint
  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  // Callback for the QueryParamBuilder
  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  // Callback for the PathParamBuilder
  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  // --- Button Logic ---
  const isRunDisabled = useMemo(() => {
    // Disabled if no app is selected
    if (activeAppId === null) return true;

    // Disabled if any required path parameter is missing
    for (const param of currentPathParams) {
      if (!pathParamValues[param.name]) { // Check if value is empty/falsy
        return true;
      }
    }

    // Disabled if any required query parameter is missing
    for (const param of currentQueryParams) {
      if (param.required && !queryParamValues[param.name]) { // Check if required and value is empty/falsy
         return true;
      }
    }

    return false; // Otherwise, enable the button
  }, [activeAppId, currentPathParams, pathParamValues, currentQueryParams, queryParamValues]);

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
              <li><a href="#">Getting Started</a></li>
              <li><a href="#">Authentication</a></li>
              <li><a href="#">Rate Limits</a></li>
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
          {/* Content inside is only relevant when visible, but rendering it doesn't hurt */}
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
        {/* Add endpoint summary below selector */}
        {endpointDetails?.summary && (
          <p className="endpoint-summary">{endpointDetails.summary}</p>
        )}
        
         {/* Path Parameters */} 
         {currentPathParams.length > 0 && (
           <PathParamBuilder 
             params={currentPathParams}
             values={pathParamValues}
             onChange={handlePathParamChange}
           />
         )}
          
         {/* Query Parameters */}
         {endpointDetails?.method === 'GET' && currentQueryParams.length > 0 && (
           <QueryParamBuilder 
              params={currentQueryParams} 
              onChange={handleQueryParamChange} 
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
        />
      </div>
    </ApiViewLayout>
  );
};

export default TweetsView; 