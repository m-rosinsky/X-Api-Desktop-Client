import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ApiViewProps, Endpoint, User, Project } from '../types/index'; 
import GenericApiView from './GenericApiView';

// Type for the Rust state structure
interface NgrokTunnelInfo {
    is_active: boolean;
    url: string | null;
    console_log: string[];
}

// Interface for received webhook data
interface WebhookRequestInfo {
    method: string;
    uri: string;
    headers: Record<string, string>;
    body: string; // Base64 encoded body
}

// Props for the Webhooks view
interface WebhooksViewProps extends Omit<ApiViewProps, 'setActiveAppId'> { 
    initialWidth: number;
    onResize: (newWidth: number) => void;
    currentUser: User | null;
    projects: Project[]; 
    activeAppId: number | null; 
    setActiveAppId: (id: number | null) => void; 
}

// Define endpoint data specific to Webhooks API with categories
const webhooksEndpoints: Endpoint[] = [
    // Webhook Management Category
    {
        id: 'get-webhooks',
        method: 'GET',
        path: '/2/webhooks', 
        summary: 'Returns all webhooks registered for the authenticating app.',
        queryParams: [], 
        expansionOptions: [], 
        category: 'Webhook Management' 
    },
    {
        id: 'post-webhook',
        method: 'POST',
        path: '/2/webhooks', 
        summary: 'Registers a new webhook URL for the authenticating app.',
        bodyParams: [
            {
                name: 'url',
                type: 'string',
                description: 'The URL to register as a webhook.',
                required: true,
                example: 'https://webhook-tester.glitch.me/' 
            }
        ],
        category: 'Webhook Management' 
    },
    {
        id: 'delete-webhook',
        method: 'DELETE',
        path: '/2/webhooks/:webhook_id', 
        summary: 'Removes the webhook subscription for the provided webhook_id.',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook to delete.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        category: 'Webhook Management' 
    },
    {
        id: 'put-webhook-crc',
        method: 'PUT',
        path: '/2/webhooks/:webhook_id', 
        summary: 'Challenges the specified webhook URL to validate ownership (CRC check).',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook to challenge.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        category: 'Webhook Management' 
    },
];

const WebhooksView: React.FC<WebhooksViewProps> = (props) => {

    // State for Webhook Testing
    const [isWebhookSetupActive, setIsWebhookSetupActive] = useState<boolean>(false);
    const [ngrokToken, setNgrokToken] = useState<string>('');
    const [consumerSecret, setConsumerSecret] = useState<string>('');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [receivedWebhooks, setReceivedWebhooks] = useState<WebhookRequestInfo[]>([]);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    const consoleContainerRef = useRef<HTMLDivElement>(null); 

    // Effect to listen for Tauri events AND fetch initial state for Ngrok
    useEffect(() => {
        let isMounted = true; 

        const fetchInitialState = async () => {
            try {
                const initialState = await invoke<NgrokTunnelInfo | null>('get_ngrok_status');
                if (isMounted && initialState) {
                    console.log("Fetched initial ngrok state:", initialState);
                    setConsoleOutput(initialState.console_log || []); 
                    setWebhookUrl(initialState.url);
                    setIsWebhookSetupActive(initialState.is_active);
                    if (initialState.is_active) {
                       setSetupError(null); 
                    }
                }
            } catch (err) {
                console.error("Failed to fetch initial ngrok status:", err);
                if (isMounted) setSetupError(`Failed to fetch tunnel status: ${err}`);
            }
        };

        fetchInitialState();

        console.log("Setting up event listeners for WebhooksView..."); 
        const listeners = Promise.all([
            listen<string>('ngrok://progress', (event) => {
               console.log('Received ngrok://progress event:', event.payload);
               if (isMounted) {
                   setConsoleOutput(prev => [...prev, event.payload]);
               }
            }),
            listen<string>('ngrok://url-obtained', (event) => {
               console.log('Received ngrok://url-obtained event:', event.payload);
               if (isMounted) {
                   setWebhookUrl(event.payload);
               }
            }),
            listen<string>('ngrok://error', (event) => {
                console.log('Received ngrok://error event:', event.payload);
                if (isMounted) {
                    setSetupError(event.payload);
                    setConsoleOutput(prev => [...prev, event.payload]); 
                    setIsWebhookSetupActive(false); 
                }
            }),
            listen<WebhookRequestInfo>('ngrok://webhook-received', (event) => {
                 console.log('Received ngrok://webhook-received event:', event.payload);
                 if (isMounted) {
                    setReceivedWebhooks(prev => [event.payload, ...prev]); 
                 }
            })
        ]);

        return () => {
            console.log("Cleaning up event listeners for WebhooksView..."); 
            isMounted = false; 
            listeners.then(unlisteners => {
                unlisteners.forEach(unlisten => unlisten());
            });
        };
    }, [consoleOutput]); 

    const handleWebhookSetupClick = async () => {
        setConsoleOutput([]);
        setWebhookUrl(null);
        setSetupError(null);
        setReceivedWebhooks([]);
        setIsWebhookSetupActive(true); 

        try {
            await invoke('start_ngrok_webhook', { 
                authToken: ngrokToken, 
                consumerSecret: consumerSecret
            });
        } catch (err: any) {
            const errorMsg = `Failed to invoke ngrok setup command: ${err.toString()}`;
            console.error("Error during invoke:", err);
            setSetupError(errorMsg);
            setConsoleOutput(prev => [...prev, errorMsg]);
            setIsWebhookSetupActive(false); 
        }
    };

    const decodeBody = (base64Body: string): string => {
        try {
            return atob(base64Body);
        } catch (e) {
            console.error("Failed to decode base64 body:", e);
            return "[Error decoding body]";
        }
    };

    // Test Webhooks Section JSX
    const webhookTestSection = (
        <details className="advanced-details" style={{ marginTop: '20px' }} open={isWebhookSetupActive || !!setupError}>
            <summary className="advanced-summary">Test Webhooks</summary>
            <div className="advanced-section-content">
                <p>Use this section to stand up a temporary webhook endpoint using ngrok to test receiving events and handling CRC checks.</p>
                
                <div className="form-group" style={{ marginBottom: '1em' }}> 
                    <label htmlFor="ngrok-token-input" style={{ display: 'block', marginBottom: '0.4em', fontWeight: '500' }}>
                        Ngrok Auth Token:
                    </label>
                    <input
                        id="ngrok-token-input"
                        type="password"
                        className="text-input"
                        placeholder="Enter your ngrok auth token"
                        value={ngrokToken}
                        onChange={(e) => setNgrokToken(e.target.value)}
                        disabled={isWebhookSetupActive}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <small style={{ display: 'block', marginTop: '0.5em', fontSize: '0.8em', color: 'var(--text-color-secondary)' }}>
                        Required to authenticate ngrok. Get yours from the <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noopener noreferrer">ngrok dashboard</a>.
                    </small>
                </div>

                <div className="form-group" style={{ marginBottom: '1em' }}> 
                    <label htmlFor="consumer-secret-input" style={{ display: 'block', marginBottom: '0.4em', fontWeight: '500' }}>
                        Twitter Consumer Secret:
                    </label>
                    <input
                        id="consumer-secret-input"
                        type="password"
                        className="text-input"
                        placeholder="Enter your Twitter App's Consumer Secret"
                        value={consumerSecret}
                        onChange={(e) => setConsumerSecret(e.target.value)}
                        disabled={isWebhookSetupActive}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <small style={{ display: 'block', marginTop: '0.5em', fontSize: '0.8em', color: 'var(--text-color-secondary)' }}>
                        Required for handling CRC challenges. Found in your App's Keys & Tokens section on the Developer Portal.
                    </small>
                </div>

                {
                    !isWebhookSetupActive ? (
                        <button 
                            className="run-button" 
                            onClick={handleWebhookSetupClick}
                            disabled={!ngrokToken || !consumerSecret}
                        >
                            Stand up Temporary Webhook
                        </button>
                    ) : (
                        <div 
                            ref={consoleContainerRef} 
                            className="mock-console" 
                            style={{
                                backgroundColor: 'var(--code-background, #1e1e1e)',
                                color: 'var(--text-color-secondary, #ccc)',
                                padding: '10px',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '0.9em',
                                height: '150px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {consoleOutput.map((line, index) => (
                                <div key={`console-${index}`}>{line}</div>
                            ))}
                            <div ref={consoleEndRef} />
                        </div>
                    )
                }
                {setupError && !isWebhookSetupActive && (
                    <div style={{ color: 'var(--error-color, red)', marginTop: '1em' }}>
                        {setupError}
                    </div>
                )}

                {webhookUrl && isWebhookSetupActive && (
                    <div className="received-webhooks-section" style={{ marginTop: '1.5em' }}>
                        <h4>Received Webhooks (Listening at {webhookUrl}):</h4>
                        {receivedWebhooks.length === 0 ? (
                            <p style={{ fontStyle: 'italic', color: 'var(--text-color-secondary)' }}>Waiting for incoming requests...</p>
                        ) : (
                            <div className="webhook-list" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5em' }}>
                                {receivedWebhooks.map((hook, index) => (
                                    <details key={index} className="webhook-item" style={{ marginBottom: '1em', padding: '0.8em', background: 'var(--background-color-secondary)', borderRadius: '4px' }}>
                                        <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                                            {hook.method} {hook.uri} 
                                        </summary>
                                        <div style={{ marginTop: '0.8em', fontSize: '0.9em' }}>
                                            <h5>Headers:</h5>
                                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--code-background)', padding: '0.5em', borderRadius: '3px' }}>
                                                {JSON.stringify(hook.headers, null, 2)}
                                            </pre>
                                            <h5>Body:</h5>
                                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--code-background)', padding: '0.5em', borderRadius: '3px' }}>
                                                {decodeBody(hook.body) || "[Empty Body]"}
                                            </pre>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </details>
    );

    return (
        <GenericApiView
            {...props}
            endpoints={webhooksEndpoints} // Use the webhooks endpoints
            customSection={webhookTestSection} // Include the test section
        />
    );
};

export default WebhooksView; 