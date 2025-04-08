// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

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

    // Add headers
    for (key, value) in args.headers {
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
            // Try to parse the response body as JSON
            let body_result = response.json::<serde_json::Value>().await;

            match body_result {
                Ok(body) => {
                    if status >= 200 && status < 300 {
                         Ok(ApiResponse { status, body })
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
                        // Successful status but bad body? Return as success with error message in body
                         Ok(ApiResponse {
                              status,
                              body: serde_json::json!({ "warning": error_message })
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
