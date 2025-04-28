import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiViewProps, Endpoint, DtabPair, Project, AppInfo, User, BodyParam } from '../types/index'; // Ensure all necessary types are imported
import AppSelector from '../components/AppSelector';
import EndpointSelector from '../components/EndpointSelector';
import ApiViewLayout from '../components/ApiViewLayout';
import PathParamBuilder from '../components/PathParamBuilder';
import QueryParamBuilder from '../components/QueryParamBuilder';
import BodyParamBuilder from '../components/BodyParamBuilder';
import ExpansionsSelector from '../components/ExpansionsSelector';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import CodeSnippetDisplay from '../components/CodeSnippetDisplay';

// Type workaround
const Highlighter: any = SyntaxHighlighter;

// Define structure for successful backend response
interface BackendApiResponse {
  status: number;
  body: string; // Keep body as raw string
  headers: Record<string, string>;
}

// Extend the backend request args structure expectation (frontend side)
interface BackendRequestArgs {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    authType: 'bearer' | 'oauth1a' | 'oauth2'; // Add auth type
    bearerToken?: string; // Optional bearer token
    oauth1Keys?: { // Optional OAuth1 keys
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessSecret: string;
    };
    // Add oauth2Keys later if needed
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
  const [bodyParamValues, setBodyParamValues] = useState<Record<string, any>>({});
  const [selectedExpansions, setSelectedExpansions] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<BackendApiResponse | null>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<{ status: number, message: string, body?: any, headers?: Record<string, string> } | null>(null);
  const [dtabs, setDtabs] = useState<DtabPair[]>([{ id: Date.now(), from: '', to: '' }]);
  const [enableTracing, setEnableTracing] = useState<boolean>(false);
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

  useEffect(() => {
    setPathParamValues({});
    setQueryParamValues({});
    setBodyParamValues({});
    setSelectedExpansions('');
    setApiResponse(null);
    setApiErrorDetails(null);
  }, [selectedEndpoint]); // Runs when endpoint selection changes

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

  const endpointDetails = useMemo(() => {
    return endpoints.find(ep => ep.id === selectedEndpoint);
  }, [selectedEndpoint, endpoints]); // Add endpoints dependency

  const currentPathParams = useMemo(() => {
    return endpointDetails?.pathParams ?? [];
  }, [endpointDetails]);

  const currentQueryParams = useMemo(() => {
    return endpointDetails?.queryParams ?? [];
  }, [endpointDetails]);

  const currentBodyParams = useMemo(() => {
    return endpointDetails?.bodyParams ?? [];
  }, [endpointDetails]);

  const currentExpansionOptions = useMemo(() => {
    return endpointDetails?.expansionOptions ?? [];
  }, [endpointDetails]);

  // Calculate Usage Percentage
  const usagePercentage = useMemo(() => {
    if (!activeProject || !activeProject.cap || activeProject.cap === 0) {
      return 0; // Return 0 if no project, no cap, or cap is zero
    }
    const percentage = (activeProject.usage / activeProject.cap) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }, [activeProject]);

  // --- Determine Effective Keys/Token based on authType --- 
  const authDetails = useMemo(() => {
    const authType = endpointDetails?.authType || 'bearer'; // Default to bearer
    if (authType === 'oauth1a') {
        const keys = activeApp?.oauth1Keys;
        if (keys?.apiKey && keys?.apiSecret && keys?.accessToken && keys?.accessSecret) {
            return {
                authType: 'oauth1a' as const, // Use const assertion
                oauth1Keys: { 
                    apiKey: keys.apiKey, 
                    apiSecret: keys.apiSecret, 
                    accessToken: keys.accessToken, 
                    accessSecret: keys.accessSecret 
                },
                bearerToken: undefined // Ensure bearer is undefined
            };
        } else {
            console.warn("OAuth 1.0a endpoint selected, but required keys are missing in the active app.");
            return { authType: 'oauth1a' as const, oauth1Keys: undefined, bearerToken: undefined, error: "Missing OAuth 1.0a keys" };
        }
    } else { // Default to bearer
        const token = activeApp?.oauth1Keys?.bearerToken;
        if (token) {
             return { 
                 authType: 'bearer' as const, 
                 bearerToken: token, 
                 oauth1Keys: undefined // Ensure oauth1Keys is undefined
             };
        } else {
            console.warn("Bearer token endpoint selected, but no bearer token found in active app.");
             return { authType: 'bearer' as const, bearerToken: undefined, oauth1Keys: undefined, error: "Missing Bearer Token" };
        }
    }
    // Handle oauth2 later
  }, [activeApp, endpointDetails]);

  // --- Input Handlers ---

  const handlePathParamChange = useCallback((paramName: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  const handleQueryParamChange = useCallback((newValues: Record<string, string>) => {
    setQueryParamValues(newValues);
  }, []);

  const handleBodyParamChange = useCallback((newValues: Record<string, any>) => {
    setBodyParamValues(newValues);
  }, []);

  const handleExpansionChange = useCallback((newExpansions: string) => {
    setSelectedExpansions(newExpansions);
  }, []);

  // --- Dtab Handlers ---
  const handleDtabChange = useCallback((index: number, field: 'from' | 'to', value: string) => {
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
  }, [dtabs]);

  const handleAddDtab = useCallback(() => {
    setDtabs([...dtabs, { id: Date.now(), from: '', to: '' }]);
  }, [dtabs]);

  const handleRemoveDtab = useCallback((index: number) => {
    if (dtabs.length === 1) {
      setDtabs([{ id: dtabs[0].id, from: '', to: '' }]);
      return;
    }
    const newDtabs = dtabs.filter((_, i) => i !== index);
    setDtabs(newDtabs);
  }, [dtabs]);

  // --- Save/Load/Delete Dtab Set Handlers ---
  const handleSaveDtabs = useCallback(() => {
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
  }, [dtabs, dtabSetName, savedDtabSets]);

  const handleLoadDtabs = useCallback(() => {
    if (!selectedDtabSet || !savedDtabSets[selectedDtabSet]) {
        alert("Please select a saved set to load.");
        return;
    }
    const loadedSet = savedDtabSets[selectedDtabSet];
    const newDtabsState = loadedSet.map(d => ({ ...d, id: Date.now() + Math.random() }));
    setDtabs(newDtabsState.length > 0 ? newDtabsState : [{ id: Date.now(), from: '', to: '' }]);
  }, [selectedDtabSet, savedDtabSets]);

   const handleDeleteDtabSet = useCallback(() => {
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
    }, [selectedDtabSet, savedDtabSets]);

  // --- Run Request Logic ---

  const isRunDisabled = useMemo(() => {
    if (!activeApp || !endpointDetails || authDetails.error) return true;
    // Check if auth details are valid for the required type
    if (authDetails.authType === 'bearer' && !authDetails.bearerToken) return true;
    if (authDetails.authType === 'oauth1a' && !authDetails.oauth1Keys) return true;

    // Parameter checks (unchanged)
    for (const param of currentPathParams) {
      if (!pathParamValues[param.name]) {
        return true;
      }
    }
    for (const param of currentQueryParams) {
      if (param.required && (queryParamValues[param.name] === undefined || queryParamValues[param.name] === '')) {
         return true;
      }
    }
    for (const param of currentBodyParams) {
       if (param.required && (bodyParamValues[param.name] === undefined || bodyParamValues[param.name] === '')) {
         return true;
       }
    }
    return false;
  }, [
    activeApp, endpointDetails, authDetails, 
    currentPathParams, pathParamValues, 
    currentQueryParams, queryParamValues, 
    currentBodyParams, bodyParamValues
  ]);

  const buildUrl = useCallback(() => {
    if (!endpointDetails) return '';
    
    // --- Define the Base URL --- 
    // TODO: Make this configurable or derive from project/app settings if needed
    const baseUrl = "https://api.twitter.com"; 
    
    let path = endpointDetails.path;
    console.log("buildUrl - Raw path:", path); // Log raw path
    console.log("buildUrl - currentPathParams:", currentPathParams); // Log expected params
    
    // Substitute path parameters - Change to replace :param_name format
    for (const param of currentPathParams) {
      const placeholder = `:${param.name}`;
      const value = pathParamValues[param.name] || '';
      console.log(`buildUrl - Replacing '${placeholder}' with '${value}'`); // Log replacement
      // Use a loop or regex for global replacement if a param could appear multiple times (unlikely for path)
      path = path.replace(placeholder, value); 
    }
    
    // Construct the full URL
    let fullUrl = baseUrl + path;

    // --- Append Query Parameters (if any) --- 
    const queryParamsToInclude: Record<string, string> = {};

    // Add standard query params from the builder
    for (const param of currentQueryParams) {
        if (queryParamValues[param.name] !== undefined && queryParamValues[param.name] !== '') {
             queryParamsToInclude[param.name] = queryParamValues[param.name];
        }
    }
    // Add expansions if selected
    if (selectedExpansions) {
       queryParamsToInclude['expansions'] = selectedExpansions;
    }

    // Build query string if there are params
    const queryString = new URLSearchParams(queryParamsToInclude).toString();

    if (queryString) {
        fullUrl += `?${queryString}`;
    }

    // Remove path parameters that were placeholders in the base path definition
    // (This logic might be redundant if path params are correctly handled above, but keeping for safety)
    // for (const param of currentPathParams) {
    //   fullUrl = fullUrl.replace(`{${param.name}}`, ''); // Should already be replaced
    // }
    
    console.log("Built URL:", fullUrl); // Log the final built URL
    return fullUrl;
    
  }, [endpointDetails, pathParamValues, queryParamValues, selectedExpansions, currentPathParams, currentQueryParams]); // Added dependencies

  // Helper function to try pretty-printing JSON
  const formatResponseBody = (rawBody: string): string => {
    try {
      const parsed = JSON.parse(rawBody);
      return JSON.stringify(parsed, null, 2); // Pretty print with 2 spaces
    } catch (e) {
      // If parsing fails, return the raw string
      console.warn("Response body is not valid JSON, displaying raw text.");
      return rawBody;
    }
  };

  const handleRunRequest = useCallback(async () => {
    if (!endpointDetails || !authDetails || authDetails.error) {
         setApiErrorDetails({ status: 0, message: authDetails?.error || "Authentication details missing or invalid." });
         return;
    }
    if (authDetails.authType === 'bearer' && !authDetails.bearerToken) return; // Should be caught by isRunDisabled, but double check
    if (authDetails.authType === 'oauth1a' && !authDetails.oauth1Keys) return; // Should be caught by isRunDisabled, but double check

    setIsLoading(true);
    setApiResponse(null);
    setApiErrorDetails(null);

    const finalUrl = buildUrl();
    let headers: Record<string, string> = {}; // Start with empty headers
    let requestBody: any = null; // Initialize body to null

    // --- Authentication Headers --- 
    if (authDetails.authType === 'bearer' && authDetails.bearerToken) {
        headers['Authorization'] = `Bearer ${authDetails.bearerToken}`;
    }
    // OAuth1 headers are handled by the backend signer

    // --- Dtabs, Tracing, TFE Headers --- 
    const activeDtabs = dtabs.filter(d => d.from.trim() && d.to.trim());
    if (activeDtabs.length > 0) {
        headers['Dtab-Local'] = activeDtabs.map(d => `${d.from}=>${d.to}`).join(';');
    }
    if (enableTracing) {
        headers['X-B3-Flags'] = '1';
    }
    if (tfeEnvironment === 'staging1' || tfeEnvironment === 'staging2') {
        headers['X-TFE-Experiment-environment'] = tfeEnvironment;
        headers['X-Decider-Overrides'] = `tfe_route:des_apiservice_${tfeEnvironment}=on`;
    }
    
    // --- Body Preparation (ONLY for methods that have a body) --- 
    if (['POST', 'PUT', 'PATCH'].includes(endpointDetails.method)) {
         // Prepare body object first
         let constructedBody: Record<string, any> | null = null;
         if (currentBodyParams.length > 0) {
            const body: Record<string, any> = {};
            currentBodyParams.forEach(param => {
              if (bodyParamValues[param.name] !== undefined) {
                 if (param.type === 'object' || param.type === 'array') {
                    try {
                        body[param.name] = JSON.parse(bodyParamValues[param.name]);
                    } catch (e) {
                        console.warn(`Could not parse body parameter ${param.name} as JSON, sending as string.`);
                        body[param.name] = bodyParamValues[param.name]; // Send as string if parsing fails
                    }
                 } else {
                    body[param.name] = bodyParamValues[param.name];
                 }
              } else if (param.required) {
                console.warn(`Required body parameter ${param.name} is missing.`); // Still warn if required is missing
              }
            });
             if (Object.keys(body).length > 0) {
                 constructedBody = body;
             }
         } else if (Object.keys(bodyParamValues).length > 0 && currentBodyParams.length === 0 && bodyParamValues['rawJson']) {
              // Handle raw JSON input only if rawJson field has content
               try {
                    const parsedRaw = JSON.parse(bodyParamValues['rawJson']);
                     // Ensure it's an object or array, not primitive for JSON body
                    if (typeof parsedRaw === 'object' && parsedRaw !== null) { 
                         constructedBody = parsedRaw;
                    } else {
                         console.error("Raw JSON input must parse to an object or array.");
                         setApiErrorDetails({ status: 0, message: "Raw JSON input must be an object or array." });
                         setIsLoading(false);
                         return; 
                    }
               } catch (e) {
                    console.error("Invalid JSON entered in raw body input.", e);
                     setApiErrorDetails({ status: 0, message: "Invalid JSON in request body." });
                     setIsLoading(false);
                     return; 
               }
         }

         // Only set body and Content-Type if we actually constructed a body
         if (constructedBody !== null) {
             requestBody = constructedBody;
             headers['Content-Type'] = 'application/json'; 
         }
    }

    // Construct the arguments for the backend
    const requestArgs: BackendRequestArgs = {
        method: endpointDetails.method,
        url: finalUrl,
        headers: headers,
        body: requestBody, // Pass null if no body was constructed
        authType: authDetails.authType, 
        bearerToken: authDetails.bearerToken, 
        oauth1Keys: authDetails.oauth1Keys   
    };

    console.log("--- Sending API Request Args to Backend ---");
    console.log(JSON.stringify(requestArgs, null, 2)); // Log stringified version for clarity
    console.log("-------------------------------------------");

    try {
        console.log("Invoking make_api_request...");
        const result = await invoke<BackendApiResponse>('make_api_request', { args: requestArgs });
        console.log("--- Backend Raw Success Result ---", result);
        
        const formattedBody = formatResponseBody(result.body); // Format the body

        if (result.status < 200 || result.status >= 300) {
             console.log(`Received non-2xx status (${result.status}), treating as error.`);
             setApiErrorDetails({
                status: result.status,
                message: `Request failed with status ${result.status}`,
                body: formattedBody, // Use formatted body
                headers: result.headers
             });
             setApiResponse(null);
        } else {
             setApiResponse({ ...result, body: formattedBody }); // Use formatted body
             setApiErrorDetails(null);
        }

    } catch (error: any) {
        console.error("--- Backend Raw Error Catch --- Object received:", error);
        let errorStatus: number = 0;
        let errorMessage: string = "An unknown error occurred.";
        let errorBody: string | null = null;
        let errorHeaders: Record<string, string> | undefined = undefined;

        // Check if the caught error is an object with expected fields from ApiError
        if (typeof error === 'object' && error !== null) {
            errorStatus = typeof error.status === 'number' ? error.status : 0;
            errorMessage = typeof error.message === 'string' ? error.message : errorMessage;
            errorHeaders = typeof error.headers === 'object' && error.headers !== null ? error.headers : undefined;
            
            // Format the body if it exists and is a string
            if (typeof error.body === 'string') {
                 errorBody = formatResponseBody(error.body); 
            } else if (error.body) {
                 // If body exists but isn't a string, try to stringify it
                 try {
                     errorBody = JSON.stringify(error.body);
                 } catch (e) {
                     console.warn("Could not stringify non-string error body:", error.body);
                 }
            }
        } else if (typeof error === 'string') {
            // Fallback if error is unexpectedly a string (previous logic, less likely now)
            errorMessage = error;
            errorBody = error; // Display raw error string as body
        } else if (error instanceof Error) {
            // Fallback for standard JS Error objects
            errorMessage = error.message;
        }
        
        setApiErrorDetails({
            status: errorStatus,
            message: errorMessage,
            body: errorBody,
            headers: errorHeaders
        });
        setApiResponse(null);
    } finally {
        console.log("Setting isLoading to false.");
        setIsLoading(false);
    }
  }, [
    endpointDetails, authDetails, dtabs, enableTracing, tfeEnvironment,
    pathParamValues, queryParamValues, bodyParamValues,
    currentPathParams, currentQueryParams, currentBodyParams,
    buildUrl
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

  // Log apiErrorDetails state before rendering
  useEffect(() => {
    if (apiErrorDetails) {
      console.log("--- apiErrorDetails State Update ---", apiErrorDetails);
    }
  }, [apiErrorDetails]);

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
                  onChange={handleExpansionChange}
                />
              )}

              {/* Body Param Builder */}
              {['POST', 'PUT', 'PATCH'].includes(endpointDetails.method) && currentBodyParams.length > 0 && (
                 <BodyParamBuilder 
                   params={currentBodyParams}
                   onChange={handleBodyParamChange}
                 />
              )}

              {/* Advanced Settings (Dtabs, Tracing) */}
              <details className="advanced-details">
                <summary className="advanced-summary">Advanced Settings</summary>
                <div className="advanced-section-content">
                  <div className="form-group"> 
                    {/* Tracing Checkbox */}
                    <div className="tracing-section">
                      <label className="checkbox-label">
                        <span className="checkbox-input-area">
                          <input
                            type="checkbox"
                            checked={enableTracing}
                            onChange={(e) => setEnableTracing(e.target.checked)}
                          />
                        </span>
                        <span className="checkbox-text-label">
                          Enable Tracing (Adds X-B3-Flags: 1 header)
                        </span>
                      </label>
                    </div>

                    {/* TFE Environment Dropdown */}
                    <div className="tfe-environment-section">
                      <label htmlFor="tfe-env-select" className="tfe-env-label">TFE Environment:</label>
                      <select
                        id="tfe-env-select"
                        value={tfeEnvironment}
                        onChange={(e) => setTfeEnvironment(e.target.value)}
                        className="tfe-env-select"
                      >
                        <option value="prod">prod</option>
                        <option value="staging1">staging1</option>
                        <option value="staging2">staging2</option>
                      </select>
                    </div>

                    {/* Dtabs Section */}
                    <div className="dtabs-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5em' }}>
                        <h4>Dtabs:</h4>
                        {/* Save/Load Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                          <div className="dtab-save-load">
                              <input
                                type="text"
                                placeholder="Save set as..."
                                value={dtabSetName}
                                onChange={(e) => setDtabSetName(e.target.value)}
                                className="text-input save-name-input"
                                spellCheck="false"
                              />
                              <button onClick={handleSaveDtabs} className="dtab-action-button" title="Save current Dtabs" disabled={!dtabs.some(d => d.from.trim() || d.to.trim())}>Save</button>
                              <select
                                value={selectedDtabSet}
                                onChange={(e) => setSelectedDtabSet(e.target.value)}
                                className="dtab-select"
                              >
                                <option value="" disabled>Load Set...</option>
                                {Object.keys(savedDtabSets).sort().map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                              <button onClick={handleLoadDtabs} className="dtab-action-button" title="Load selected Dtab set" disabled={!selectedDtabSet}>Load</button>
                              <button onClick={handleDeleteDtabSet} className="dtab-action-button remove" title="Delete selected Dtab set" disabled={!selectedDtabSet}>Delete</button>
                          </div>
                        </div>
                      </div>
                      {/* Dtab Input Rows */}
                      {dtabs.map((dtab, index) => (
                        <div key={dtab.id} className="dtab-input-container">
                          <input
                            type="text"
                            placeholder="/s/role/service"
                            value={dtab.from}
                            onChange={(e) => handleDtabChange(index, 'from', e.target.value)}
                            className="text-input dtab-input"
                          />
                          <span>=&gt;</span>
                          <input
                            type="text"
                            placeholder="/#srv/env/dc/role/service"
                            value={dtab.to}
                            onChange={(e) => handleDtabChange(index, 'to', e.target.value)}
                            className="text-input dtab-input"
                          />
                          <button onClick={() => handleRemoveDtab(index)} className="dtab-action-button remove" title="Remove Dtab Row">×</button>
                        </div>
                      ))}
                      {/* Add Dtab Button */}
                      <div className="add-dtab-button-container">
                        <button onClick={handleAddDtab} className="dtab-action-button add" title="Add Dtab Row">+</button>
                      </div>
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

                {/* Restore Detailed Error Display */}
                {apiErrorDetails && (
                  <div> 
                    <div className="response-details">
                      {/* Status Code */} 
                      <p><strong>Status:</strong> <span className={`status-code status-${String(apiErrorDetails.status)[0]}xx`}>{apiErrorDetails.status || 'Error'}</span></p>
                      {/* Display Trace ID if available in error headers */}
                      {apiErrorDetails.headers && apiErrorDetails.headers['x-transaction-id'] && (
                        <div className="trace-id-display">
                          <p>
                            <strong>Trace ID:</strong> {apiErrorDetails.headers['x-transaction-id']}
                          </p>
                        </div>
                      )}
                      {/* Display Headers spoiler if available in error headers */}
                      {apiErrorDetails.headers && Object.keys(apiErrorDetails.headers).filter(h => h !== 'x-transaction-id').length > 0 && (
                        <details className="response-headers-details">
                          <summary>Response Headers</summary>
                          <Highlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)' }} wrapLongLines={true}>
                            {/* Headers are already an object, stringify them */}
                            {JSON.stringify(
                              Object.fromEntries(Object.entries(apiErrorDetails.headers).filter(([key]) => key !== 'x-transaction-id')),
                              null,
                              2
                            )}
                          </Highlighter>
                        </details>
                      )}
                    </div>
                    {/* Error Body */} 
                    {apiErrorDetails.body && (
                      <div className="response-body-container">
                        <h4>Error Response Body:</h4> 
                        <Highlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color-error, #a85050)' }} wrapLongLines={true}>
                           {/* apiErrorDetails.body is already a string (potentially formatted) */}
                           {apiErrorDetails.body}
                        </Highlighter>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Response Display */} 
                {apiResponse && !apiErrorDetails && (
                  <div>
                     <div className="response-details">
                       {/* Status Code */} 
                       <p><strong>Status:</strong> <span className={`status-code status-${String(apiResponse.status)[0]}xx`}>{apiResponse.status}</span></p>
                       {/* Display Trace ID only if the header exists in the response */}
                       {apiResponse.headers && apiResponse.headers['x-transaction-id'] && (
                         <div className="trace-id-display">
                           <p>
                             <strong>Trace ID:</strong> {apiResponse.headers['x-transaction-id']}
                           </p>
                         </div>
                       )}
                       {/* Render headers if they exist */}
                       {apiResponse.headers && Object.keys(apiResponse.headers).filter(h => h !== 'x-transaction-id').length > 0 && (
                         <details className="response-headers-details">
                             <summary>Response Headers</summary>
                              <Highlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '300px', overflowY: 'auto' }} wrapLongLines={true}>
                                 {/* Headers are already an object, stringify them */}
                                 {JSON.stringify(
                                     Object.fromEntries(Object.entries(apiResponse.headers).filter(([key]) => key !== 'x-transaction-id')), // Filter out trace ID here too
                                     null,
                                     2
                                 )}
                              </Highlighter>
                         </details>
                       )}
                     </div>
 
                     {/* Wrap main body highlighter for styling */} 
                     <div className="response-body-container">
                       <Highlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border-color)' }} wrapLongLines={true}>
                         {/* apiResponse.body is already a string (potentially formatted) */}
                         {apiResponse.body}
                       </Highlighter>
                     </div>
                  </div>
                )}
              </div>

              {/* --- Code Snippets Section --- */}
              <div className="code-snippets-section">
                 <h3>Code Snippets</h3>
                  <CodeSnippetDisplay
                      endpoint={endpointDetails} 
                      pathParams={pathParamValues}
                      queryParams={queryParamValues}
                      bodyParams={bodyParamValues} 
                      expansions={selectedExpansions}
                      // Pass token/keys based on auth type
                      bearerToken={authDetails.authType === 'bearer' ? authDetails.bearerToken : null}
                      // Add oauth1Keys prop later if needed by codegen
                      dtabs={dtabs.filter(d => d.from.trim() && d.to.trim())} // Pass only active dtabs
                      enableTracing={enableTracing}
                      tfeEnvironment={tfeEnvironment}
                  />
              </div> 
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