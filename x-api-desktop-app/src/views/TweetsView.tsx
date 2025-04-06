import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ApiViewProps, Endpoint, QueryParam, PathParam, User, Project } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import QueryParamBuilder from '../components/QueryParamBuilder';
import PathParamBuilder from '../components/PathParamBuilder';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';
import ExpansionsSelector from '../components/ExpansionsSelector';

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

  // Find the project containing the active app
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

  // Filter projects based on currentUser BEFORE passing to AppSelector
  const projectsForSelector = useMemo(() => {
    return currentUser ? projects : []; // Pass empty array if logged out
  }, [currentUser, projects]);

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

        <div className="run-request-section">
           <span className="usage-estimate">{usageEstimateText}</span>
           <button 
             className="run-button" 
             onClick={() => { /* TODO: Implement request logic */ console.log('Run Request Clicked!'); }}
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
        />
      </div>
    </ApiViewLayout>
  );
};

export default TweetsView; 