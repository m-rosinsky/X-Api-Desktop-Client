// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};

// Define the structure for the request payload coming from the frontend
#[derive(Deserialize)]
struct ApiRequestArgs {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<serde_json::Value>, // Keep incoming body as Value for flexibility
}

// Define the structure for the response payload going back to the frontend
#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    body: String, // <-- CHANGE: Send body as raw string
    headers: HashMap<String, String>,
}

// Define the structure for the error payload going back to the frontend
#[derive(Serialize)]
struct ApiError {
    status: u16,
    message: String,
    body: Option<String>, // <-- CHANGE: Send error body as optional raw string
    headers: Option<HashMap<String, String>>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Tauri command to make the actual API request
#[tauri::command]
async fn make_api_request(args: ApiRequestArgs) -> Result<ApiResponse, ApiError> {
    let client = reqwest::Client::new();
    let method = match args.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(ApiError { status: 0, message: format!("Unsupported HTTP method: {}", args.method), body: None, headers: None }),
    };

    let mut request_builder = client.request(method.clone(), &args.url);

    // Check if tracing was requested by the frontend
    let mut tracing_requested = false;

    // Add headers from frontend request
    for (key, value) in args.headers {
        if key.eq_ignore_ascii_case("X-B3-Flags") && value == "1" {
            tracing_requested = true;
        }
        request_builder = request_builder.header(&key, value);
    }

    // Add body if present
    if let Some(body) = args.body {
        if method == reqwest::Method::POST || method == reqwest::Method::PUT || method == reqwest::Method::PATCH {
            request_builder = request_builder.json(&body);
        }
    }

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let response_headers = response.headers().clone();

            // Convert headers early
            let mut headers_map: HashMap<String, String> = response_headers
                .iter()
                .filter_map(|(name, value)| {
                    value.to_str().ok().map(|val_str| (name.to_string(), val_str.to_string()))
                })
                .collect();

            if !tracing_requested {
                headers_map.remove("x-transaction-id");
            }

            // Attempt to parse the body into serde_json::Value first
            let body_value_result = response.json::<serde_json::Value>().await;

            match body_value_result {
                Ok(body_value) => {
                    // Attempt to pretty-print the parsed Value
                    match serde_json::to_string_pretty(&body_value) {
                        Ok(pretty_body_string) => {
                            // Successfully parsed and pretty-printed
                            if status >= 200 && status < 300 {
                                Ok(ApiResponse { status, body: pretty_body_string, headers: headers_map })
                            } else {
                                Err(ApiError {
                                    status,
                                    message: format!("API request failed with status {}", status),
                                    body: Some(pretty_body_string),
                                    headers: Some(headers_map),
                                })
                            }
                        }
                        Err(e) => {
                            // Failed to pretty-print (highly unlikely for valid Value, but handle anyway)
                             let error_message = format!("Failed to serialize parsed body to pretty JSON string: {}", e);
                             // Fallback: send the non-pretty string representation of the Value
                             let fallback_body = serde_json::to_string(&body_value).unwrap_or_else(|_| "Error serializing fallback body".to_string());
                             Err(ApiError {
                                status, // Report original status
                                message: error_message,
                                body: Some(fallback_body),
                                headers: Some(headers_map), 
                            })
                        }
                    }
                }
                Err(e) => {
                     // Failed to parse body as JSON
                     let error_message = format!("Failed to parse response body as JSON: {}", e);
                     // Attempt to get raw body text as fallback for error reporting
                     // This requires consuming the response again, which isn't ideal.
                     // For simplicity, we'll just report the parse error without the body.
                     // If raw body is crucial on parse failure, more complex handling needed.
                     Err(ApiError {
                        status, // Report original status
                        message: error_message,
                        body: None, // Indicate body parsing failed
                        headers: Some(headers_map), 
                    })
                }
            }
        }
        Err(e) => {
            // Network error
            Err(ApiError {
                status: 0,
                message: format!("Request failed: {}", e),
                body: None,
                headers: None,
            })
        }
    }
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, make_api_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
