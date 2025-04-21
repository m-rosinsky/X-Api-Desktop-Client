// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use tauri::Emitter;
use std::time::Duration;
use ngrok::config::TunnelBuilder;
use ngrok::tunnel::UrlTunnel;
use futures::stream::StreamExt;
use std::sync::{Arc, Mutex};

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

// Constants for event names
const NGROK_PROGRESS_EVENT: &str = "ngrok://progress";
const NGROK_URL_EVENT: &str = "ngrok://url-obtained";
const NGROK_ERROR_EVENT: &str = "ngrok://error";

// --- State Definitions --- 
#[derive(Clone, Serialize, Default)]
struct NgrokTunnelInfo {
    is_active: bool,
    url: Option<String>,
    console_log: Vec<String>,
}

struct AppState {
    ngrok_info: Arc<Mutex<Option<NgrokTunnelInfo>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            ngrok_info: Arc::new(Mutex::new(None)),
        }
    }
}
// --- End State Definitions ---

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

// Command to start the ngrok tunnel
#[tauri::command]
async fn start_ngrok_webhook(
    app_handle: tauri::AppHandle,
    window: tauri::Window,
    auth_token: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let ngrok_state = state.ngrok_info.clone();
    let window_clone_for_helpers = window.clone();

    let emit_progress = |msg: String| {
        let state_clone = ngrok_state.clone();
        if let Ok(mut guard) = state_clone.lock() {
            if let Some(info) = guard.as_mut() {
                info.console_log.push(msg.clone());
            }
        }
        if let Err(e) = window_clone_for_helpers.emit(NGROK_PROGRESS_EVENT, Some(msg)) {
            eprintln!("Failed to emit progress event: {}", e);
        }
    };
    let emit_error = |msg: String| -> Result<(), String> {
        let error_msg = format!("Ngrok Error: {}", msg);
        let state_clone = ngrok_state.clone();
        if let Ok(mut guard) = state_clone.lock() {
            if let Some(info) = guard.as_mut() {
                 info.console_log.push(error_msg.clone());
                 info.is_active = false;
                 info.url = None;
            } else {
                 *guard = Some(NgrokTunnelInfo {
                     is_active: false,
                     url: None,
                     console_log: vec![error_msg.clone()],
                 });
            }
        }
        if let Err(e) = window_clone_for_helpers.emit(NGROK_ERROR_EVENT, Some(error_msg.clone())) {
             eprintln!("Failed to emit error event: {}", e);
        }
        Err(error_msg)
    };

    {
        let mut guard = ngrok_state.lock().map_err(|e| format!("Mutex lock error: {}", e))?;
        *guard = Some(NgrokTunnelInfo { is_active: true, ..Default::default() });
    }

    emit_progress("Starting ngrok session...".to_string());

    let session_builder = ngrok::Session::builder().authtoken(auth_token);

    let session = match session_builder.connect().await {
        Ok(s) => {
            emit_progress("Ngrok session connected.".to_string());
            s
        }
        Err(e) => return emit_error(format!("Failed to connect session: {}", e)),
    };

    emit_progress("Starting HTTP tunnel...".to_string());

    let listener = match session.http_endpoint().listen().await {
        Ok(l) => l,
        Err(e) => return emit_error(format!("Failed to start listener: {}", e)),
    };

    let url = listener.url().to_string();
    emit_progress(format!("Tunnel established at: {}", url));

    if let Ok(mut guard) = ngrok_state.lock() {
        if let Some(info) = guard.as_mut() {
            info.url = Some(url.clone());
        }
    }

    if let Err(e) = window.emit(NGROK_URL_EVENT, Some(url)) {
        eprintln!("Failed to emit URL event: {}", e);
    }

    let window_clone = window.clone();
    let mut listener = listener;
    let task_state = ngrok_state.clone();
    tauri::async_runtime::spawn(async move {
        let listener_url = listener.url().to_string();
        println!("Ngrok listener task started for {}", listener_url);

        while let Some(conn_result) = listener.next().await {
            match conn_result {
                Ok(_conn) => {
                    println!("Received connection on ngrok tunnel (not processed yet)");
                }
                Err(e) => {
                    let error_msg = format!("Listener connection error: {}", e);
                    eprintln!("Ngrok listener connection error: {}", e);
                    if let Ok(mut guard) = task_state.lock() {
                        if let Some(info) = guard.as_mut() {
                            info.console_log.push(error_msg.clone());
                            info.is_active = false;
                        }
                    }
                    let _ = window_clone.emit(NGROK_ERROR_EVENT, Some(error_msg));
                    break;
                }
            }
        }
        println!("Ngrok listener task finished for {}", listener_url);
        let finish_msg = "Ngrok listener task finished.".to_string();
        if let Ok(mut guard) = task_state.lock() {
            if let Some(info) = guard.as_mut() {
                info.console_log.push(finish_msg.clone());
                info.is_active = false;
            }
        }
        let _ = window_clone.emit(NGROK_PROGRESS_EVENT, Some(finish_msg));
    });

    emit_progress("Ngrok tunnel is active.".to_string());

    Ok(())
}

// Command to get current status
#[tauri::command]
fn get_ngrok_status(state: tauri::State<'_, AppState>) -> Result<Option<NgrokTunnelInfo>, String> {
    state.ngrok_info.lock()
        .map_err(|e| format!("Mutex lock error: {}", e))
        .map(|guard| guard.clone())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            make_api_request,
            start_ngrok_webhook,
            get_ngrok_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
