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
    body: Option<serde_json::Value>, // Optional JSON body
}

// Define the structure for the response payload going back to the frontend
#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    body: serde_json::Value, // Represent body as flexible JSON value
    headers: HashMap<String, String>, // Added headers map
}

// Define the structure for the error payload going back to the frontend
#[derive(Serialize)]
struct ApiError {
    status: u16,
    message: String,
    body: Option<serde_json::Value>,
    headers: Option<HashMap<String, String>>, // Add optional headers field
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
        // Check for the tracing header (case-insensitive key comparison)
        if key.eq_ignore_ascii_case("X-B3-Flags") && value == "1" {
            tracing_requested = true;
        }
        request_builder = request_builder.header(&key, value);
    }

    // Add body if present (now we can borrow method again)
    if let Some(body) = args.body {
        if method == reqwest::Method::POST || method == reqwest::Method::PUT || method == reqwest::Method::PATCH {
            request_builder = request_builder.json(&body);
        } 
    }

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let response_headers = response.headers().clone(); 
            
            // Convert headers early so they are available for error reporting
            let mut headers_map: HashMap<String, String> = response_headers
                .iter()
                .filter_map(|(name, value)| {
                    value.to_str().ok().map(|val_str| (name.to_string(), val_str.to_string()))
                })
                .collect();

            if !tracing_requested {
                headers_map.remove("x-transaction-id"); 
            }
            
            let body_result = response.json::<serde_json::Value>().await;

            match body_result {
                Ok(body) => {
                    if status >= 200 && status < 300 {
                         Ok(ApiResponse { status, body, headers: headers_map })
                    } else {
                         Err(ApiError {
                            status,
                            message: format!("API request failed with status {}", status),
                            body: Some(body),
                            headers: Some(headers_map), // Include headers in error
                        })
                    }
                }
                Err(e) => {
                     let error_message = format!("Failed to parse response body: {}", e);
                     if status >= 200 && status < 300 {
                        // Successful status but bad body - treat as success for headers
                         Ok(ApiResponse {
                              status,
                              body: serde_json::json!({ "warning": error_message }),
                              headers: headers_map
                         })
                     } else {
                         // Failed status and bad body
                         Err(ApiError {
                            status,
                            message: error_message,
                            body: None,
                            headers: Some(headers_map), // Include headers in error
                        })
                     }
                }
            }
        }
        Err(e) => {
            // Network error - headers are not available here
            Err(ApiError {
                status: 0, 
                message: format!("Request failed: {}", e),
                body: None,
                headers: None, // No headers available
            })
        }
    }
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init()) // Re-add the plugin initialization
        .invoke_handler(tauri::generate_handler![greet, make_api_request]) // Add the new command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
