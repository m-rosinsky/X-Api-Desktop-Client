import { Endpoint } from "../types";

const BASE_URL = "https://api.twitter.com";

// --- Helper to build URL --- 
function buildUrl(
    endpoint: Endpoint,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>
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

    const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");

    return `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

// --- cURL Generator --- 
export function generateCurlCommand(
  endpoint: Endpoint | undefined | null,
  pathParams: Record<string, string>,
  queryParams: Record<string, string>
): string {
  if (!endpoint) return "";

  const fullUrl = buildUrl(endpoint, pathParams, queryParams);
  let curlCommand = `curl "${fullUrl}"`;
  
  if (endpoint.method !== 'GET') {
      curlCommand += ` -X ${endpoint.method}`;
  }

  // Add common headers
  curlCommand += ` \\\n  -H "Authorization: Bearer YOUR_BEARER_TOKEN"`; 

  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
       curlCommand += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"your_key":"your_value"}'`; 
  }

  return curlCommand;
}

// --- Python (requests) Generator ---
export function generatePythonRequestsCode(
    endpoint: Endpoint | undefined | null,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>
): string {
    if (!endpoint) return "";
    
    const fullUrl = buildUrl(endpoint, pathParams, {}); // Query params handled separately by requests lib
    const headers: Record<string, string> = {
        "Authorization": "Bearer YOUR_BEARER_TOKEN"
    };
    let body = null;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        headers["Content-Type"] = "application/json";
        body = { your_key: "your_value" }; // Example body
    }

    const paramsDict = Object.keys(queryParams).length > 0 ? `params=${JSON.stringify(queryParams)}` : "";
    const headersDict = `headers=${JSON.stringify(headers)}`;
    const bodyJson = body ? `json=${JSON.stringify(body)}` : "";

    const args = [paramsDict, headersDict, bodyJson].filter(Boolean).join(", ");

    return (
`import requests
import json

url = "${fullUrl}"
${paramsDict ? `params = ${JSON.stringify(queryParams)}\n` : ''}headers = ${JSON.stringify(headers, null, 4)}
${body ? `payload = ${JSON.stringify(body, null, 4)}\n` : ''}response = requests.request(
    "${endpoint.method}", 
    url, 
    ${args.replace(/\\{/g, '{').replace(/\\}/g, '}') /* Basic formatting adjustment */}
)

print(response.status_code)
print(response.text)`
    );
}

// --- JavaScript (fetch) Generator ---
export function generateJavascriptFetchCode(
    endpoint: Endpoint | undefined | null,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>
): string {
    if (!endpoint) return "";

    const fullUrl = buildUrl(endpoint, pathParams, queryParams); // Fetch needs full URL with query string
    
    const options: RequestInit = {
        method: endpoint.method,
        headers: {
            "Authorization": "Bearer YOUR_BEARER_TOKEN",
        }
    };

    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        (options.headers as Record<string, string>)["Content-Type"] = "application/json";
        options.body = JSON.stringify({ your_key: "your_value" }); // Example body
    }

    // Indent options for readability
    const optionsString = JSON.stringify(options, null, 2).replace(/\\n/g, '\\n  ');

    return (
`const url = "${fullUrl}";
const options = ${optionsString};

fetch(url, options)
  .then(res => {
    if (!res.ok) {
      throw new Error(\`HTTP error! status: \${res.status}\`);
    }
    return res.json(); // or res.text()
  })
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.error('Fetch error:', error);
  });`
    );
} 