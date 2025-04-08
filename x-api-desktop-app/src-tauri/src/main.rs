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
    body: Option<serde_json::Value>, // Optional error body
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
        _ => return Err(ApiError { status: 0, message: format!("Unsupported HTTP method: {}", args.method), body: None }),
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
            // Clone headers before consuming the response body
            let response_headers = response.headers().clone(); 
            
            let body_result = response.json::<serde_json::Value>().await;

            // Convert HeaderMap to HashMap<String, String>
            let mut headers_map: HashMap<String, String> = response_headers
                .iter()
                .filter_map(|(name, value)| {
                    // Attempt to convert value to string, skip if invalid UTF-8
                    value.to_str().ok().map(|val_str| (name.to_string(), val_str.to_string()))
                })
                .collect();

            // Conditionally remove the transaction ID if tracing was not requested
            if !tracing_requested {
                // Remove header (case-insensitive key check - standard is lowercase)
                headers_map.remove("x-transaction-id"); 
            }

            match body_result {
                Ok(body) => {
                    if status >= 200 && status < 300 {
                         Ok(ApiResponse { status, body, headers: headers_map })
                    } else {
                         // Request failed (e.g., 4xx, 5xx), return structured error
                         Err(ApiError {
                            status,
                            message: format!("API request failed with status {}", status),
                            body: Some(body),
                        })
                    }
                }
                Err(e) => {
                     // JSON parsing failed
                     let error_message = format!("Failed to parse response body: {}", e);
                     if status >= 200 && status < 300 {
                        // Successful status but bad body? Include headers anyway
                         Ok(ApiResponse {
                              status,
                              body: serde_json::json!({ "warning": error_message }),
                              headers: headers_map
                         })
                     } else {
                         // Failed status and bad body, return as error without body
                         Err(ApiError {
                            status,
                            message: error_message,
                            body: None,
                        })
                     }
                }
            }
        }
        Err(e) => {
            // Network error or other issue during request sending
            Err(ApiError {
                status: 0, // Use 0 for non-HTTP errors
                message: format!("Request failed: {}", e),
                body: None,
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
