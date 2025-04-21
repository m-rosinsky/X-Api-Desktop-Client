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

// Props for the wrapper view
interface AccountActivityViewProps extends Omit<ApiViewProps, 'setActiveAppId'> { 
    initialWidth: number;
    onResize: (newWidth: number) => void;
    currentUser: User | null;
    projects: Project[]; 
    activeAppId: number | null; 
    setActiveAppId: (id: number | null) => void; 
}

// Define endpoint data specific to Account Activity API with categories
const accountActivityEndpoints: Endpoint[] = [
    // Webhook Management Category
    {
        id: 'get-webhooks',
        method: 'GET',
        path: '/2/account_activity/webhooks',
        summary: 'Returns all webhooks registered for the authenticating app.',
        queryParams: [], 
        expansionOptions: [], 
        category: 'Webhook Management' // Assign category
    },
    {
        id: 'post-webhook',
        method: 'POST',
        path: '/2/account_activity/webhooks',
        summary: 'Registers a new webhook URL for the authenticating app.',
        queryParams: [
            {
                name: 'url',
                type: 'string',
                description: 'The URL to register as a webhook.',
                required: true,
                example: 'https://example.com/webhooks/twitter'
            }
        ],
        category: 'Webhook Management' // Assign category
    },
    {
        id: 'delete-webhook',
        method: 'DELETE',
        path: '/2/account_activity/webhooks/:webhook_id',
        summary: 'Removes the webhook subscription for the provided webhook_id.',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook to delete.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        category: 'Webhook Management' // Assign category
    },
    {
        id: 'put-webhook-crc',
        method: 'PUT',
        path: '/2/account_activity/webhooks/:webhook_id',
        summary: 'Challenges the specified webhook URL to validate ownership (CRC check).',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook to challenge.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        category: 'Webhook Management' // Assign category
    },
    // Subscriptions Category
    {
        id: 'get-webhook-subscriptions',
        method: 'GET',
        path: '/2/account_activity/webhooks/:webhook_id/subscriptions/all/list',
        summary: 'Returns a list of subscriptions for the specified webhook ID.',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        category: 'Subscriptions' // Assign category
    },
];

const AccountActivityView: React.FC<AccountActivityViewProps> = (props) => {

    const [isWebhookSetupActive, setIsWebhookSetupActive] = useState<boolean>(false);
    const [ngrokToken, setNgrokToken] = useState<string>('');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    // Effect to listen for Tauri events AND fetch initial state
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates after unmount

        // Fetch initial state when component mounts
        const fetchInitialState = async () => {
            try {
                const initialState = await invoke<NgrokTunnelInfo | null>('get_ngrok_status');
                if (isMounted && initialState) {
                    console.log("Fetched initial ngrok state:", initialState);
                    // Update local state based on backend state
                    setConsoleOutput(initialState.console_log || []); // Use stored logs
                    setWebhookUrl(initialState.url);
                    setIsWebhookSetupActive(initialState.is_active);
                    // Clear any previous local error if backend says active
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

        // Set up event listeners (keep these to get live updates)
        const listeners = Promise.all([
            listen<string>('ngrok://progress', (event) => {
               if (isMounted) setConsoleOutput(prev => [...prev, event.payload]);
            }),
            listen<string>('ngrok://url-obtained', (event) => {
               if (isMounted) {
                   setWebhookUrl(event.payload);
                   // Don't add URL to console here, rely on progress event from backend
               }
            }),
            listen<string>('ngrok://error', (event) => {
                if (isMounted) {
                    setSetupError(event.payload);
                    setConsoleOutput(prev => [...prev, event.payload]); // Also log error to console
                    setIsWebhookSetupActive(false); // Mark inactive on new error
                }
            })
        ]);

        // Cleanup function
        return () => {
            isMounted = false; // Mark as unmounted
            listeners.then(unlisteners => {
                unlisteners.forEach(unlisten => unlisten());
            });
        };
    }, []); // Run only once on mount

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [consoleOutput]);

    const handleWebhookSetupClick = async () => {
        // Clear previous state immediately for better UX 
        setConsoleOutput([]);
        setWebhookUrl(null);
        setSetupError(null);
        setIsWebhookSetupActive(true); // Show console immediately

        try {
            await invoke('start_ngrok_webhook', { authToken: ngrokToken });
            // Backend now handles state updates via events and shared state
        } catch (err: any) {
            // Handle immediate error from invoke itself (e.g., command not found)
            const errorMsg = `Failed to invoke ngrok setup command: ${err.toString()}`;
            setSetupError(errorMsg);
            setConsoleOutput(prev => [...prev, errorMsg]);
            setIsWebhookSetupActive(false); // Allow retry
        }
    };

    const webhookTestSection = (
        <details className="advanced-details" style={{ marginTop: '20px' }} open={isWebhookSetupActive || !!setupError}>
            <summary className="advanced-summary">Test Webhooks</summary>
            <div className="advanced-section-content">
                <p>Use this section to stand up a temporary webhook endpoint using ngrok to test receiving events.</p>
                
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

                {
                    !isWebhookSetupActive ? (
                        <button 
                            className="run-button" 
                            onClick={handleWebhookSetupClick}
                            disabled={!ngrokToken}
                        >
                            Stand up Temporary Webhook
                        </button>
                    ) : (
                        <div className="mock-console" style={{
                            backgroundColor: 'var(--code-background, #1e1e1e)',
                            color: 'var(--text-color-secondary, #ccc)',
                            padding: '10px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.9em',
                            height: '150px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {consoleOutput.map((line, index) => (
                                <div key={index}>{line}</div>
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
            </div>
        </details>
    );

    return (
        <GenericApiView
            {...props}
            endpoints={accountActivityEndpoints}
            customSection={webhookTestSection}
        />
    );
};

export default AccountActivityView; 