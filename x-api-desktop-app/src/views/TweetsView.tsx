import React from 'react'; // Simplified imports
import { ApiViewProps, Endpoint, User, Project } from '../types/index';
import GenericApiView from './GenericApiView'; // Import the new generic view

// Define the additional props passed down from App.tsx (specific to this view wrapper if any)
// In this case, it's the same as GenericApiViewProps requires minus 'endpoints'
interface TweetsViewProps extends Omit<ApiViewProps, 'setActiveAppId'> { // Omit setActiveAppId if passed directly
  initialWidth: number;
  onResize: (newWidth: number) => void;
    currentUser: User | null;
    // Add any other props specific ONLY to TweetsView if needed in the future
    // Make sure ApiViewProps contains what GenericApiView needs (projects, activeAppId, setActiveAppId)
    projects: Project[]; // Ensure projects is included
    activeAppId: number | null; // Ensure activeAppId is included
    setActiveAppId: (id: number | null) => void; // Ensure setActiveAppId is included
}

// Define endpoint data specific to Tweets
const tweetsEndpoints: Endpoint[] = [
  {
    id: 'get-tweets',
    method: 'GET',
    path: '/2/tweets',
    summary: 'Retrieve multiple Tweets specified by ID',
    queryParams: [
      {
        name: 'ids',
                type: 'array',
                description: 'A comma-separated list of Tweet IDs. Up to 100 are allowed.',
                required: true,
                example: '1460323737035677698,1293593516040269825'
            },
        ],
        expansionOptions: [
      { name: 'author_id', description: 'Expand the author user object.' },
      { name: 'referenced_tweets.id', description: 'Expand referenced tweet objects.' },
      { name: 'attachments.media_keys', description: 'Expand media objects.' },
            { name: 'geo.place_id', description: 'Expand location data.' },
    ],
  },
  {
    id: 'get-tweet-by-id',
    method: 'GET',
    path: '/2/tweets/:id',
    summary: 'Retrieve a single Tweet by ID',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the Tweet to retrieve.',
                example: '1460323737035677698'
            },
        ],
        queryParams: [],
        expansionOptions: [
      { name: 'author_id', description: 'Expand the author user object.' },
      { name: 'referenced_tweets.id', description: 'Expand referenced tweet objects.' },
      { name: 'attachments.media_keys', description: 'Expand media objects.' },
    ],
  },
  {
    id: 'post-tweet',
    method: 'POST',
    path: '/2/tweets',
    summary: 'Create a new Tweet',
        // TODO: Define body structure/input fields for POST requests later
  },
  {
    id: 'delete-tweet',
    method: 'DELETE',
    path: '/2/tweets/:id',
    summary: 'Delete a Tweet',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the Tweet to delete.',
                example: '1460323737035677698'
      },
    ],
  },
];

const TweetsView: React.FC<TweetsViewProps> = (props) => {
    // Render the generic view, passing the tweetsEndpoints and all other props
    return <GenericApiView {...props} endpoints={tweetsEndpoints} />;
};

export default TweetsView; 