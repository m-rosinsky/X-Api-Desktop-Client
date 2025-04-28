// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use tauri::Emitter;
use ngrok::config::TunnelBuilder;
use ngrok::tunnel::UrlTunnel;
use futures::stream::StreamExt;
use std::sync::{Arc, Mutex};
use hyper::service::{service_fn};
use hyper::{Body, Request, Response, StatusCode};
use std::convert::Infallible;
use base64::{Engine as _, engine::general_purpose};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hyper::Method;

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
const NGROK_PROGRESS_EVENT: &str = "ngrok-progress-event";
const NGROK_URL_EVENT: &str = "ngrok-url-event";
const NGROK_ERROR_EVENT: &str = "ngrok-error-event";
const NGROK_WEBHOOK_EVENT: &str = "ngrok-webhook-event";

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

// --- Payload for Webhook Event ---
#[derive(Clone, Serialize)]
struct WebhookRequestInfo {
    method: String,
    uri: String,
    headers: HashMap<String, String>,
    body: String, // Send body as base64 encoded string for simplicity
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

            // Attempt to read the body as raw text FIRST
            match response.text().await {
                Ok(body_text) => {
                    // We have the body text, now check status
                    if status >= 200 && status < 300 {
                        // Success Case: Return ApiResponse with raw body string
                        Ok(ApiResponse {
                             status,
                             body: body_text,
                             headers: headers_map,
                        })
                    } else {
                         // Error Case: Return ApiError with raw body string
                         Err(ApiError {
                            status,
                            message: format!("API request failed with status {}", status), // Generic message
                            body: Some(body_text),
                            headers: Some(headers_map),
                        })
                    }
                }
                Err(e) => {
                     // Failed to read body text (network issue during read, etc.)
                     // This is different from failing to *parse* JSON
                     Err(ApiError {
                        status, // Report original status
                        message: format!("Failed to read response body text: {}", e),
                        body: None, // Indicate body reading failed
                        headers: Some(headers_map), 
                    })
                }
            }
        }
        Err(e) => {
            // Network error during the initial send
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
    _app_handle: tauri::AppHandle,
    window: tauri::Window,
    auth_token: String,
    consumer_secret: String,
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

    // Clone necessary items ONCE before the outer task
    let window_clone_outer = window.clone();
    let mut listener = listener;
    let task_state = state.ngrok_info.clone();
    let consumer_secret_clone = consumer_secret.clone();

    tauri::async_runtime::spawn(async move {
        let listener_url = listener.url().to_string();
        println!("Ngrok listener task started for {}", listener_url);

        while let Some(conn_result) = listener.next().await {
            match conn_result {
                Ok(conn) => {
                    // Clone items needed FOR THIS ITERATION
                    let window_for_iteration = window.clone();
                    let consumer_secret_for_service = consumer_secret_clone.clone();

                    tokio::spawn(async move {
                        let window_for_service_move = window_for_iteration.clone();
                        let captured_consumer_secret = consumer_secret_for_service.clone();

                        let service = service_fn(move |req: Request<Body>| {
                            let window_for_req_handler = window_for_service_move.clone();
                            let consumer_secret = captured_consumer_secret.clone();

                            async move {
                                println!("Handling request: {} {}", req.method(), req.uri());

                                let method = req.method();
                                let uri = req.uri();

                                // --- Twitter Webhook Logic ---
                                if method == Method::GET {
                                    // Handle CRC Check
                                    let query_params: HashMap<String, String> = uri.query()
                                        .map(|v| url::form_urlencoded::parse(v.as_bytes()).into_owned().collect())
                                        .unwrap_or_else(HashMap::new);

                                    if let Some(crc_token) = query_params.get("crc_token") {
                                        println!("Received CRC check with token: {}", crc_token);
                                        // Perform HMAC-SHA256
                                        type HmacSha256 = Hmac<Sha256>; // Define the type alias
                                        let mut mac = HmacSha256::new_from_slice(consumer_secret.as_bytes())
                                            .expect("HMAC can take key of any size");
                                        mac.update(crc_token.as_bytes());
                                        let result = mac.finalize();
                                        let code_bytes = result.into_bytes();
                                        let response_token = format!("sha256={}", general_purpose::STANDARD.encode(&code_bytes));

                                        println!("Generated CRC response: {}", response_token);

                                        // Construct JSON response
                                        let json_response = serde_json::json!({
                                            "response_token": response_token
                                        });

                                        match Response::builder()
                                            .status(StatusCode::OK)
                                            .header(hyper::header::CONTENT_TYPE, "application/json")
                                            .body(Body::from(serde_json::to_string(&json_response).unwrap()))
                                        {
                                            Ok(resp) => Ok(resp),
                                            Err(e) => {
                                                eprintln!("Failed to build CRC response: {}", e);
                                                let mut resp = Response::new(Body::from("Internal Server Error"));
                                                *resp.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                Ok(resp)
                                            }
                                        }
                                    } else {
                                        println!("GET request received without crc_token");
                                        let mut resp = Response::new(Body::from("Missing crc_token parameter"));
                                        *resp.status_mut() = StatusCode::BAD_REQUEST;
                                        Ok(resp)
                                    }
                                } else if method == Method::POST {
                                    // Handle incoming webhook event (just acknowledge for now)
                                    println!("Received POST request (webhook event)");

                                    // --- Capture Request Details (Optional - for debugging/display) ---
                                    let request_method = req.method().to_string();
                                    let request_uri = req.uri().to_string();
                                    let headers = req.headers().iter().map(|(k, v)| {
                                        (k.to_string(), v.to_str().unwrap_or("[invalid header value]").to_string())
                                    }).collect();

                                    // Read body bytes
                                    let body_bytes = match hyper::body::to_bytes(req.into_body()).await {
                                        Ok(bytes) => bytes,
                                        Err(e) => {
                                            eprintln!("Failed to read POST request body: {}", e);
                                            let mut response = Response::new(Body::from(format!("Error reading body: {}", e)));
                                            *response.status_mut() = StatusCode::BAD_REQUEST;
                                            return Ok::<_, Infallible>(response);
                                        }
                                    };
                                    // Encode body using Base64
                                    let body_base64 = general_purpose::STANDARD.encode(&body_bytes);

                                    // --- Create Payload & Emit Event ---
                                    let payload = WebhookRequestInfo {
                                        method: request_method,
                                        uri: request_uri,
                                        headers,
                                        body: body_base64,
                                    };
                                    if let Err(e) = window_for_req_handler.emit(NGROK_WEBHOOK_EVENT, Some(&payload)) {
                                         eprintln!("Failed to emit webhook event: {}", e);
                                    }
                                    // --- End Optional Capture ---

                                    // Respond with 200 OK
                                    let mut resp = Response::new(Body::empty());
                                    *resp.status_mut() = StatusCode::OK;
                                    Ok(resp)
                                } else {
                                    // Handle other methods
                                    println!("Received {} request - Method Not Allowed", method);
                                    let mut resp = Response::new(Body::empty());
                                    *resp.status_mut() = StatusCode::METHOD_NOT_ALLOWED;
                                    Ok(resp)
                                }
                            }
                        });

                        // Serve the connection
                        if let Err(err) = hyper::server::conn::Http::new()
                            .serve_connection(conn, service)
                            .await
                        {
                            eprintln!("Error serving connection: {:?}", err);
                            // Use window_for_iteration (which was NOT moved into service_fn)
                            let _ = window_for_iteration.emit(NGROK_ERROR_EVENT, Some(format!("Connection error: {}", err)));
                        }
                    });
                }
                Err(e) => {
                    let error_msg = format!("Listener connection error: {}", e);
                    eprintln!("Ngrok listener connection error: {}", e);
                    // Update state using the clone passed into the outer task
                    if let Ok(mut guard) = task_state.lock() {
                        if let Some(info) = guard.as_mut() {
                            info.console_log.push(error_msg.clone());
                            info.is_active = false;
                        }
                    }
                    // Use the clone created BEFORE the outer task
                    let _ = window_clone_outer.emit(NGROK_ERROR_EVENT, Some(format!("Listener connection error: {}", e)));
                    break;
                }
            }
        }
        // Loop ends - task finished
        println!("Ngrok listener task finished for {}", listener_url);
        let finish_msg = "Ngrok listener task finished.".to_string();
        // Restore state update on task finish
        if let Ok(mut guard) = task_state.lock() {
            if let Some(info) = guard.as_mut() {
                info.console_log.push(finish_msg.clone());
                info.is_active = false;
            }
        }
        // Use the clone created BEFORE the outer task
        let _ = window_clone_outer.emit(NGROK_PROGRESS_EVENT, Some(finish_msg));
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
