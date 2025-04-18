import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiViewProps, Endpoint, DtabPair, Project, AppInfo, User } from '../types/index'; // Ensure all necessary types are imported
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

// Define structure for successful backend response
interface BackendApiResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

const LOCAL_STORAGE_KEY = 'savedDtabSets'; // Keep consistent key for now

// Props for the GenericApiView
interface GenericApiViewProps extends ApiViewProps {
  initialWidth: number;
  onResize: (newWidth: number) => void;
  currentUser: User | null;
  endpoints: Endpoint[]; // Pass endpoints as a prop
  customSection?: React.ReactNode; // Add prop for custom content
  // projects, activeAppId, setActiveAppId are already in ApiViewProps
}

const GenericApiView: React.FC<GenericApiViewProps> = ({
  projects,
  activeAppId,
  setActiveAppId,
  currentUser,
  initialWidth,
  onResize,
  endpoints, // Receive endpoints via props
  customSection // Destructure the new prop
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(endpoints[0]?.id ?? null);
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [queryParamValues, setQueryParamValues] = useState<Record<string, string>>({});
  const [selectedExpansions, setSelectedExpansions] = useState<string>('');
  const [overwriteToken, setOverwriteToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<BackendApiResponse | null>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<{ status: number, message: string, body?: any, headers?: Record<string, string> } | null>(null);
  const [dtabs, setDtabs] = useState<DtabPair[]>([{ id: Date.now(), from: '', to: '' }]);
  const [enableTracing, setEnableTracing] = useState<boolean>(false);
  // Add state for TFE Environment selection
  const [tfeEnvironment, setTfeEnvironment] = useState<string>('prod');

  // State for save/load feature
  const [savedDtabSets, setSavedDtabSets] = useState<Record<string, DtabPair[]>>({});
  const [dtabSetName, setDtabSetName] = useState<string>('');
  const [selectedDtabSet, setSelectedDtabSet] = useState<string>('');

  // Load saved sets from localStorage on mount
  useEffect(() => {
    try {
      const savedSetsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSetsRaw) {
        const loadedSets = JSON.parse(savedSetsRaw);
        setSavedDtabSets(loadedSets || {});
      }
    } catch (error) {
      console.error("Failed to load saved Dtab sets:", error);
      setSavedDtabSets({});
    }
  }, []);

  // Reset selected endpoint if the available endpoints change and the current one is no longer valid
  useEffect(() => {
      if (!endpoints.find(ep => ep.id === selectedEndpoint)) {
          setSelectedEndpoint(endpoints[0]?.id ?? null);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoints]); // Rerun only when endpoints array itself changes


  // --- Derived State & Memoized Values ---

  const projectsForSelector = useMemo(() => {
    return currentUser ? projects : [];
  }, [currentUser, projects]);

  const activeProject = useMemo(() => {
    if (activeAppId === null) return null;
    return projectsForSelector.find(p => p.apps.some(app => app.id === activeAppId));
  }, [projectsForSelector, activeAppId]);

  const activeApp = useMemo(() => {
    if (!activeProject || activeAppId === null) return null;
    return activeProject.apps.find(app => app.id === activeAppId);
  }, [activeProject, activeAppId]);

  const originalBearerToken = activeApp?.keys.bearerToken;
  const effectiveBearerToken = overwriteToken.trim() !== '' ? overwriteToken : originalBearerToken;

  const usagePercentage = activeProject ? Math.min((activeProject.usage / activeProject.cap) * 100, 100) : 0;

  const endpointDetails = useMemo(() => {
    return endpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint, endpoints]); // Add endpoints dependency

  useEffect(() => {
    setPathParamValues({});
    setQueryParamValues({});
    setSelectedExpansions('');
    setApiResponse(null);
    setApiErrorDetails(null);
  }, [selectedEndpoint]); // Runs when endpoint selection changes

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  const currentExpansionOptions = useMemo(() => {
    return endpointDetails?.expansionOptions ?? [];
  }, [endpointDetails]);

  // --- Input Handlers ---

  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  const handleExpansionChange = useCallback((newExpansions: string) => {
    setSelectedExpansions(newExpansions);
  }, []);

  // --- Dtab Handlers ---
  const handleDtabChange = (index: number, field: 'from' | 'to', value: string) => {
    const newDtabs = [...dtabs];
    const currentDtab = newDtabs[index];

    if (field === 'from' && value.includes('=>')) {
      // If pasting into 'from' and it contains =>, split and update both
      const parts = value.split('=>', 2); // Split into max 2 parts
      const fromPart = parts[0]?.trim() || '';
      const toPart = parts[1]?.trim() || '';
      newDtabs[index] = { ...currentDtab, from: fromPart, to: toPart };
    } else {
      // Otherwise, update the specific field as usual
      newDtabs[index] = { ...currentDtab, [field]: value };
    }
    
    setDtabs(newDtabs);
  };

  const handleAddDtab = () => {
    setDtabs([...dtabs, { id: Date.now(), from: '', to: '' }]);
  };

  const handleRemoveDtab = (index: number) => {
    if (dtabs.length === 1) {
      setDtabs([{ id: dtabs[0].id, from: '', to: '' }]);
      return;
    }
    const newDtabs = dtabs.filter((_, i) => i !== index);
    setDtabs(newDtabs);
  };

  // --- Save/Load/Delete Dtab Set Handlers ---
  const handleSaveDtabs = () => {
    const name = dtabSetName.trim();
    if (!name) {
      alert("Please enter a name to save the Dtab set.");
      return;
    }
    const dtabsToSave = dtabs.filter(d => d.from.trim() || d.to.trim());
    const newSavedSets = { ...savedDtabSets, [name]: dtabsToSave };
    setSavedDtabSets(newSavedSets);
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSavedSets));
        setDtabSetName('');
        setSelectedDtabSet(name);
    } catch (error) {
        console.error("Failed to save Dtab set to localStorage:", error);
        alert("Error saving Dtabs. Check browser permissions or console.");
    }
  };

  const handleLoadDtabs = () => {
    if (!selectedDtabSet || !savedDtabSets[selectedDtabSet]) {
        alert("Please select a saved set to load.");
        return;
    }
    const loadedSet = savedDtabSets[selectedDtabSet];
    const newDtabsState = loadedSet.map(d => ({ ...d, id: Date.now() + Math.random() }));
    setDtabs(newDtabsState.length > 0 ? newDtabsState : [{ id: Date.now(), from: '', to: '' }]);
  };

   const handleDeleteDtabSet = () => {
      if (!selectedDtabSet || !savedDtabSets[selectedDtabSet]) {
        alert("Please select a saved set to delete.");
        return;
      }
      if (!confirm(`Are you sure you want to delete the Dtab set "${selectedDtabSet}"?`)) {
          return;
      }
      const newSavedSets = { ...savedDtabSets };
      delete newSavedSets[selectedDtabSet];
      setSavedDtabSets(newSavedSets);
      try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSavedSets));
          setSelectedDtabSet('');
      } catch (error) {
          console.error("Failed to update localStorage after deleting Dtab set:", error);
          alert("Error updating saved Dtabs. Check browser permissions or console.");
      }
    };

  // --- Run Request Logic ---

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

  const handleRunRequest = useCallback(async () => {
    if (!endpointDetails || !effectiveBearerToken) return;

    setIsLoading(true);
    setApiResponse(null);
    setApiErrorDetails(null);

    // 1. Construct URL with Path Params
    let urlPath = endpointDetails.path;
    for (const param of currentPathParams) {
      urlPath = urlPath.replace(`:${param.name}`, encodeURIComponent(pathParamValues[param.name] || ''));
    }
    const url = new URL(urlPath, 'https://api.twitter.com'); // Base URL

    // 2. Add Query Params & Expansions
    Object.entries(queryParamValues).forEach(([key, value]) => {
      if (value) { // Only add if value is present
        url.searchParams.append(key, value);
      }
    });
    if (selectedExpansions && endpointDetails.method === 'GET') { // Only add expansions for GET
      url.searchParams.append('expansions', selectedExpansions);
    }

    // 3. Prepare Headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${effectiveBearerToken}`,
      'Content-Type': 'application/json', // Assuming JSON for POST/PUT bodies if any
    };

    // Add Dtabs header if any exist - Use Dtab-Local to match curl generation
    const activeDtabs = dtabs.filter(d => d.from.trim() && d.to.trim());
    if (activeDtabs.length > 0) {
      headers['Dtab-Local'] = activeDtabs.map(d => `${d.from}=>${d.to}`).join(';');
    }

    // Add tracing header if enabled
    if (enableTracing) {
      headers['X-B3-Flags'] = '1';
    }

    // Add TFE environment header if staging selected
    if (tfeEnvironment === 'staging1' || tfeEnvironment === 'staging2') {
      headers['X-TFE-Experiment-environment'] = tfeEnvironment;
      // Add corresponding decider override header
      headers['X-Decider-Overrides'] = `tfe_route:des_apiservice_${tfeEnvironment}=on`;
    }

    // 4. Prepare Body (for POST/PUT etc.) - Placeholder for now
    let requestBody: any = null;
    if (endpointDetails.method === 'POST' /* || endpointDetails.method === 'PUT' etc. */) {
      // TODO: Need a way to define and input request bodies
      // requestBody = { text: "Hello World!" }; // Example
    }

    // 5. Invoke Tauri Command
    try {
      const result = await invoke<BackendApiResponse>('make_api_request', {
        args: {
          method: endpointDetails.method,
          url: url.toString(),
          headers: headers,
          body: requestBody // Pass request body
        }
      });

      // 6. Handle Success Response from Backend
      setApiResponse(result);

    } catch (error: any) {
      console.error("API Request Failed via Backend:", error);
      setApiErrorDetails({
        status: error.status ?? 0,
        message: error.message ?? 'An unexpected error occurred.',
        body: error.body,
        headers: error.headers
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
      currentPathParams, // Added dependency
      dtabs,
      enableTracing,
      tfeEnvironment, // Add tfeEnvironment dependency
      // We don't need all dependencies like isLoading, apiResponse etc. here
  ]);

  // Generalized Usage Estimate Text
  const usageEstimateText = useMemo(() => {
    // Basic estimate based on method - can be refined later if needed
    if (endpointDetails?.method === 'GET' || endpointDetails?.method === 'DELETE') {
        return `Usage estimate: 1 Request`;
    }
    if (endpointDetails?.method === 'POST' || endpointDetails?.method === 'PUT') { // Assume POST/PUT might involve more usage
        return `Usage estimate: 1+ Request`;
    }
    return "";
  }, [endpointDetails]);

  // --- Render Logic ---

  return (
    <ApiViewLayout
      initialWidth={initialWidth}
      onResize={onResize}
      // Sidebar remains unchanged for now, containing documentation/guides
      sidebarContent={(
        <div>
          {endpointDetails ? (
            <>
              {/* Display selected endpoint info */}
              <h3><span className={`endpoint-method method-${endpointDetails.method.toLowerCase()}`}>{endpointDetails.method}</span> {endpointDetails.path}</h3>
              {endpointDetails.summary && <p>{endpointDetails.summary}</p>}

              {/* Placeholder/Example Request Body */}
              {(endpointDetails.method === 'POST' || endpointDetails.method === 'PUT') && (
                 <>
                    <p className="sidebar-code-label">Example Request Body:</p>
                    <Highlighter
                        language="json"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '0.5em', fontSize: '0.85em', borderRadius: '4px', marginBottom: '1em' }}
                    >
                        {/* TODO: Make this example dynamic or based on endpoint definition */}
                        {`{\n  "text": "Hello world!"\n}`}
                    </Highlighter>
                 </>
              )}

              {/* Placeholder/Example Response Body */}
              <p className="sidebar-code-label">Example Response:</p>
              <Highlighter
                language="json"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '0.5em', fontSize: '0.85em', borderRadius: '4px' }}
              >
                 {/* TODO: Make this example dynamic or based on endpoint definition */}
                 {`{\n  "data": {\n    "id": "12345...",\n    "text": "Example response..."\n  }\n}`}
              </Highlighter>
            </>
          ) : (
            /* Default content when no endpoint is selected */
            <>
              <h3>API Documentation</h3>
              <p>Select an endpoint from the list to view its documentation.</p>
            </>
          )}
          {/* Static Guides Section */}
          <h3>Guides</h3>
          <ul className="info-list links">
            <li><a href="#">Getting Started</a></li>
            <li><a href="#">Authentication</a></li>
            <li><a href="#">Rate Limits</a></li>
          </ul>
        </div>
      )}
      // Main content area
      children={(
        <>
          <div className="api-header-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5em' }}>
             <AppSelector
                projects={projectsForSelector}
                selectedAppId={activeAppId}
                onChange={setActiveAppId}
              />
              <div className={`api-usage-preview ${activeProject ? 'visible' : ''}`}>
                  {activeProject && (
                    <div className="usage-meter">
                      <span className="usage-label">{activeProject.name} Usage</span>
                      <div className="usage-bar-container">
                        <div
                          className="usage-bar"
                          style={{ width: `${usagePercentage}%` }}
                        ></div>
                      </div>
                      <span className="usage-value">{activeProject.usage.toLocaleString()} / {activeProject.cap.toLocaleString()}</span>
                    </div>
                  )}
              </div>
          </div>

          {endpointDetails ? (
            <div className="view-content">
              <EndpointSelector
                endpoints={endpoints}
                selectedEndpointId={selectedEndpoint}
                onChange={setSelectedEndpoint}
              />

              {/* Parameter Builders */}
              {currentPathParams.length > 0 && (
                <PathParamBuilder
                  params={currentPathParams}
                  values={pathParamValues}
                  onChange={handlePathParamChange}
                />
              )}
              {endpointDetails.method === 'GET' && currentQueryParams.length > 0 && (
                <QueryParamBuilder
                  params={currentQueryParams}
                  onChange={handleQueryParamChange}
                />
              )}
               {endpointDetails.method === 'GET' && currentExpansionOptions.length > 0 && (
                <ExpansionsSelector
                  options={currentExpansionOptions}
                  selectedValues={selectedExpansions}
                  onChange={handleExpansionChange}
                />
              )}

              {/* Bearer Token Override */}
              <div className="form-group">
                <label htmlFor="overwrite-token-input">Override Bearer Token (Optional):</label>
                <input
                  id="overwrite-token-input"
                  type="password"
                  className="text-input"
                  placeholder="Paste Bearer token here to override app selection"
                  value={overwriteToken}
                  onChange={(e) => setOverwriteToken(e.target.value)}
                  disabled={!currentUser} // Disable if not logged in
                />
              </div>

              {/* Advanced Settings (Dtabs, Tracing) */}
              <details className="advanced-details">
                <summary className="advanced-summary">Advanced Settings</summary>
                <div className="advanced-section-content">
                  <div className="form-group">
                    <div className="tracing-section">
                      {/* ... tracing checkbox ... */}
                    </div>
                    {/* Add TFE Environment Dropdown */}
                    <div className="tfe-environment-section">
                     {/* ... TFE env select ... */}
                    </div>
                    <div className="dtabs-section">
                      {/* ... Dtab controls ... */}
                    </div>
                  </div> {/* End of form-group wrapper */}
                </div>
              </details>

              {/* Render custom section here, AFTER Advanced Settings */}
              {customSection}

              {/* Action Button */}
              <div className="run-request-section">
                {/* {usageEstimateText && !isLoading && <span className="usage-estimate">{usageEstimateText}</span>} */}
                <button
                  onClick={handleRunRequest}
                  disabled={isRunDisabled || isLoading}
                  className="run-button"
                >
                  {isLoading ? 'Running...' : 'Run Request'}
                </button>
              </div>


              {/* --- Response Area --- */}
              <div className="response-area">
                <h3>Response</h3>
                {isLoading && <p>Loading...</p>}

                {/* Error Display */}
                {apiErrorDetails && (
                  <div>
                    {/* ... error details rendering ... */}
                  </div>
                )}

                {/* Success Response Display */}
                {apiResponse && !apiErrorDetails && (
                  <div>
                    {/* ... success response details rendering ... */}
                  </div>
                )}
              </div>

              {/* Restore CodeSnippetDisplay */}
              <CodeSnippetDisplay
                endpoint={endpointDetails}
                pathParams={currentPathParams}
                queryParams={currentQueryParams}
                pathValues={pathParamValues}
                queryValues={queryParamValues}
                expansions={selectedExpansions}
                bearerToken={effectiveBearerToken}
                dtabs={dtabs}
                enableTracing={enableTracing}
                tfeEnvironment={tfeEnvironment}
              />
            </div>
          ) : (
            <div className="placeholder-content">
             {endpoints.length > 0 ? (
                 <h3>API Documentation</h3>
              ) : (
                 <h3>No Endpoints Defined</h3>
              )}
              <p>Select an endpoint from the list on the left to view its documentation and make requests.</p>
              {/* Render custom section here as well if desired when no endpoint selected? */}
              {/* {customSection} */}
              <h3>Guides</h3>
              <ul className="info-list links">
                <li><a href="#">Getting Started</a></li>
                <li><a href="#">Authentication</a></li>
                <li><a href="#">Rate Limits</a></li>
              </ul>
            </div>
          )}
        </>
      )}
    />
  );
};

export default GenericApiView;