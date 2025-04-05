import React, { useState, useMemo } from 'react';
import { ApiViewProps, Endpoint } from '../types';
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';

// Moved from App.tsx as it seems specific to this view
const tweetsEndpoints: Endpoint[] = [
  { id: 'get-tweets', method: 'GET', path: '/2/tweets', summary: 'Retrieve recent Tweets' },
  { id: 'get-tweet-by-id', method: 'GET', path: '/2/tweets/:id', summary: 'Retrieve a single Tweet' },
  { id: 'post-tweet', method: 'POST', path: '/2/tweets', summary: 'Create a new Tweet' },
  { id: 'delete-tweet', method: 'DELETE', path: '/2/tweets/:id', summary: 'Delete a Tweet' },
];

const TweetsView: React.FC<ApiViewProps> = ({ projects, activeAppId, setActiveAppId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // Find the project containing the active app
  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projects.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projects, activeAppId]);

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  // Find the details for the selected endpoint
  const endpointDetails = useMemo(() => {
    return tweetsEndpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint]);

  return (
    <div className="api-view-layout">
      <div className="api-main-content">
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
           <div className="api-tools-content">
             {selectedEndpoint ? (
                <p>Tools/Logs for <strong>{endpointDetails?.path}</strong> on app <strong>{activeAppId || 'N/A'}</strong></p>
             ) : (
                <p>Select an endpoint above to see details and tools.</p>
             )}
          </div>
        </div>
      </div>

      {/* Right Sidebar Docs Panel - Now conditional */}
      <aside className="api-docs-sidebar">
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
      </aside>
    </div>
  );
};

export default TweetsView; 