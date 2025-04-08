import React from 'react';
import { ApiViewProps, Endpoint, User, Project } from '../types/index';
import GenericApiView from './GenericApiView';

// Props for the wrapper view
interface UsersViewProps extends Omit<ApiViewProps, 'setActiveAppId'> {
  initialWidth: number;
  onResize: (newWidth: number) => void;
  currentUser: User | null;
    projects: Project[];
    activeAppId: number | null;
    setActiveAppId: (id: number | null) => void;
}

// Define endpoint data specific to Users
const usersEndpoints: Endpoint[] = [
  {
    id: 'get-users',
    method: 'GET',
    path: '/2/users',
        summary: 'Look up multiple users based on IDs',
    queryParams: [
      {
        name: 'ids',
        type: 'array',
                description: 'A comma-separated list of User IDs. Up to 100 allowed.',
        required: true,
                example: '2244994945,6253282'
      },
    ],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
            { name: 'profile_image_url', description: 'Include profile image URL.' },
    ],
  },
  {
    id: 'get-user-by-id',
    method: 'GET',
    path: '/2/users/:id',
    summary: 'Look up a single user by ID',
    pathParams: [
      {
        name: 'id',
        description: 'The unique identifier of the User to retrieve.',
                example: '2244994945'
      },
    ],
        queryParams: [],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
            { name: 'description', description: 'Include user description.' },
    ],
  },
  {
    id: 'get-user-by-username',
    method: 'GET',
    path: '/2/users/by/username/:username',
    summary: 'Look up a single user by username',
    pathParams: [
      {
        name: 'username',
                description: 'The Twitter username (handle) to retrieve.',
        example: 'XDevelopers'
      },
    ],
        queryParams: [],
    expansionOptions: [
      { name: 'pinned_tweet_id', description: 'Expand the pinned tweet object.' },
            { name: 'location', description: 'Include user location.' },
    ],
  },
];

const UsersView: React.FC<UsersViewProps> = (props) => {
    // Render the generic view, passing the usersEndpoints and all other props
    return <GenericApiView {...props} endpoints={usersEndpoints} />;
};

export default UsersView; 