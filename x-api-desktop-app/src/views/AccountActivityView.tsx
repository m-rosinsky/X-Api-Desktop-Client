import React, { useState, useEffect, useRef } from 'react';
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

// Define endpoint data specific to Account Activity API - ONLY SUBSCRIPTIONS LEFT
const accountActivityEndpoints: Endpoint[] = [
    // Webhook Management Category - REMOVED
    
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
    // Add the new POST subscription endpoint
    {
        id: 'post-webhook-subscription',
        method: 'POST',
        path: '/2/account_activity/webhooks/:webhook_id/subscriptions/all',
        summary: 'Subscribes the app to activity for the app owner.',
        pathParams: [
            {
                name: 'webhook_id',
                description: 'The unique identifier of the webhook.',
                example: '1234567890123456789'
            },
        ],
        queryParams: [],
        bodyParams: [], // No body for this endpoint
        category: 'Subscriptions',
        authType: 'oauth1a' // Specify OAuth 1.0a authentication
    },
];

const AccountActivityView: React.FC<AccountActivityViewProps> = (props) => {

    return (
        <GenericApiView
            {...props}
            endpoints={accountActivityEndpoints}
        />
    );
};

export default AccountActivityView; 