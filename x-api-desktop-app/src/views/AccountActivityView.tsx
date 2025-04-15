import React, { useState } from 'react';
import { ApiViewProps, Endpoint, User, Project } from '../types/index'; 
import GenericApiView from './GenericApiView';

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

    // State to track if the webhook setup process is active
    const [isWebhookSetupActive, setIsWebhookSetupActive] = useState<boolean>(false);

    // Handler to initiate the webhook setup (mock for now)
    const handleWebhookSetupClick = () => {
        setIsWebhookSetupActive(true);
        // In the future, backend calls will go here
    };

    // Define the custom section for webhook testing as a collapsible spoiler
    const webhookTestSection = (
        <details className="advanced-details" style={{ marginTop: '20px' }} open={isWebhookSetupActive}> {/* Keep spoiler open when active */}
            <summary className="advanced-summary">Test Webhooks</summary>
            <div className="advanced-section-content">
                <p>Use this section to stand up a temporary webhook endpoint to test receiving events.</p>
                {
                    !isWebhookSetupActive ? (
                        // Show button if setup is not active
                        <button className="run-button" onClick={handleWebhookSetupClick}>
                            Stand up Temporary Webhook
                        </button>
                    ) : (
                        // Show mock console if setup is active
                        <div className="mock-console" style={{
                            backgroundColor: 'var(--code-background, #1e1e1e)',
                            color: 'var(--text-color-secondary, #ccc)',
                            padding: '10px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.9em',
                            height: '150px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap' // Keep line breaks
                        }}>
                            Starting webhook setup...
                            [INFO] Checking prerequisites...
                            [INFO] Allocating temporary endpoint...
                            [INFO] Configuring ngrok tunnel...
                            [INFO] Registering webhook with Twitter API...
                            {/* Add more mock output or a loading indicator here later */}
                        </div>
                    )
                }
            </div>
        </details>
    );

    // Render the generic view, passing the categorized endpoints and the custom section
    return (
        <GenericApiView
            {...props}
            endpoints={accountActivityEndpoints}
            customSection={webhookTestSection} // Pass the custom section here
        />
    );
};

export default AccountActivityView; 