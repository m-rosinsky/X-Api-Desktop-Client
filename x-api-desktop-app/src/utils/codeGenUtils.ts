import { Endpoint, DtabPair } from "../types/index";

const BASE_URL = "https://api.twitter.com";

// --- Helper to build URL --- 
function buildUrl(
    endpoint: Endpoint,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>,
    expansions?: string
): string {
    let path = endpoint.path;
    if (endpoint.pathParams) {
        for (const param of endpoint.pathParams) {
          const value = pathParams[param.name];
          // Use placeholder if value is missing, encode otherwise
          path = path.replace(
              `:${param.name}`, 
              value ? encodeURIComponent(value) : `[${param.name}_missing]`
           ); 
        }
    }

    // Combine queryParams and expansions
    const allQueryParams = { ...queryParams };
    if (expansions) {
        allQueryParams['expansions'] = expansions;
    }

    const queryString = Object.entries(allQueryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");

    return `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

// --- cURL Generator --- 
export function generateCurlCommand(
  endpoint: Endpoint | undefined | null,
  pathParams: Record<string, string>,
  queryParams: Record<string, string>,
  expansions?: string,
  bearerToken?: string | null,
  dtabs?: DtabPair[] | undefined,
  enableTracing?: boolean
): string {
  if (!endpoint) return "";

  const fullUrl = buildUrl(endpoint, pathParams, queryParams, expansions);
  let curlCommand = `curl "${fullUrl}"`;
  
  if (endpoint.method !== 'GET') {
      curlCommand += ` -X ${endpoint.method}`;
  }

  // Use provided token or placeholder
  const token = bearerToken || 'YOUR_BEARER_TOKEN';
  curlCommand += ` \\\n  -H "Authorization: Bearer ${token}"`; 

  // Construct Dtab header from array
  const validDtabs = dtabs
    ?.filter(dtab => dtab.from.trim() !== '' && dtab.to.trim() !== '')
    .map(dtab => `${dtab.from.trim()} => ${dtab.to.trim()}`) || [];
  if (validDtabs.length > 0) {
    curlCommand += ` \\\n  -H "Dtab-Local: ${validDtabs.join(';')}"`;
  }

  if (enableTracing) {
      curlCommand += ` \\\n  -H "X-B3-Flags: 1"`;
  }

  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
       curlCommand += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"your_key":"your_value"}'`; 
  }

  return curlCommand;
}

// --- Python (requests) Generator ---
export function generatePythonRequestsCode(
    endpoint: Endpoint | undefined | null,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>,
    expansions?: string,
    bearerToken?: string | null,
    dtabs?: DtabPair[] | undefined,
    enableTracing?: boolean
): string {
    if (!endpoint) return "";
    
    const baseUrl = buildUrl(endpoint, pathParams, {}, undefined);

    const allQueryParams = { ...queryParams };
    if (expansions) {
        allQueryParams['expansions'] = expansions;
    }

    // Use provided token or placeholder
    const token = bearerToken || 'YOUR_BEARER_TOKEN';
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
    };
    let body = null;
    
    // Construct Dtab header from array
    const validDtabs = dtabs
        ?.filter(dtab => dtab.from.trim() !== '' && dtab.to.trim() !== '')
        .map(dtab => `${dtab.from.trim()} => ${dtab.to.trim()}`) || [];
    if (validDtabs.length > 0) {
        headers["Dtab-Local"] = validDtabs.join(';');
    }
    
    if (enableTracing) {
        headers["X-B3-Flags"] = '1';
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        headers["Content-Type"] = "application/json";
        body = { your_key: "your_value" };
    }

    const paramsDictString = Object.keys(allQueryParams).length > 0 
        ? `params = ${JSON.stringify(allQueryParams, null, 4)}\n` 
        : "";
    const headersDictString = `headers = ${JSON.stringify(headers, null, 4)}\n`;
    const bodyJsonString = body ? `payload = ${JSON.stringify(body, null, 4)}\n` : "";

    const requestArgs = [
        Object.keys(allQueryParams).length > 0 ? "params=params" : null,
        "headers=headers",
        body ? "json=payload" : null
    ].filter(Boolean).join(", ");

    return (
`import requests
import json

url = "${baseUrl}"
${paramsDictString}${headersDictString}${bodyJsonString}
response = requests.request(
    "${endpoint.method}", 
    url, 
    ${requestArgs}
)

print(response.status_code)
print(response.text)`
    );
}

// --- JavaScript (fetch) Generator ---
export function generateJavascriptFetchCode(
    endpoint: Endpoint | undefined | null,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>,
    expansions?: string,
    bearerToken?: string | null,
    dtabs?: DtabPair[] | undefined,
    enableTracing?: boolean
): string {
    if (!endpoint) return "";

    const fullUrl = buildUrl(endpoint, pathParams, queryParams, expansions);
    
    // Use provided token or placeholder
    const token = bearerToken || 'YOUR_BEARER_TOKEN';
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
    };

    // Construct Dtab header from array
    const validDtabs = dtabs
        ?.filter(dtab => dtab.from.trim() !== '' && dtab.to.trim() !== '')
        .map(dtab => `${dtab.from.trim()} => ${dtab.to.trim()}`) || [];
    if (validDtabs.length > 0) {
        headers["Dtab-Local"] = validDtabs.join(';');
    }

    if (enableTracing) {
        headers["X-B3-Flags"] = '1';
    }

    const options: RequestInit = {
        method: endpoint.method,
        headers: headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        (options.headers as Record<string, string>)["Content-Type"] = "application/json";
        options.body = JSON.stringify({ your_key: "your_value" }); 
    }

    const optionsString = JSON.stringify(options, null, 2).replace(/\n/g, '\n  ');

    return (
`const url = "${fullUrl}";
const options = ${optionsString};

fetch(url, options)
  .then(res => {
    if (!res.ok) {
      throw new Error(\`HTTP error! status: \${res.status}\`);
    }
    return res.json();
  })
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.error('Fetch error:', error);
  });`
    );
} 