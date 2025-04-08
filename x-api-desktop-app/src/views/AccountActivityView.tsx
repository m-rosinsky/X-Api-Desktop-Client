import React from 'react';
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

// Define endpoint data specific to Account Activity API
const accountActivityEndpoints: Endpoint[] = [
    {
        id: 'get-webhooks',
        method: 'GET',
        path: '/2/account_activity/webhooks',
        summary: 'Returns all webhooks registered for the authenticating app.',
        queryParams: [], // No specific query params mentioned for GET all
        expansionOptions: [], // No expansions typically for webhook listing
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
        // Note: POST might typically use a request body, but API v2 uses query param here.
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
    },
    {
        id: 'put-webhook-crc',
        method: 'PUT',
        path: '/2/account_activity/webhooks/:webhook_id',
        summary: 'Challenges the specified webhook URL to validate ownership (CRC check). Returns no response body on success.',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook to challenge.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        // Note: PUT usually implies a body, but CRC check might not require one from the client.
    },
];

const AccountActivityView: React.FC<AccountActivityViewProps> = (props) => {
    // Render the generic view, passing the accountActivityEndpoints and all other props
    return <GenericApiView {...props} endpoints={accountActivityEndpoints} />;
};

export default AccountActivityView; 