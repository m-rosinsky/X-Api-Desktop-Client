import React, { useState, useEffect, useRef } from 'react';
import { AppInfo, Project, AppViewProps } from '../types'; // Import AppViewProps
import '../styles/app-view.css';
import '../styles/project-view.css'; // Borrow styles for settings

const AppView: React.FC<AppViewProps> = ({ app, project, initialTab, onNavigate, updateApp, deleteApp }) => {
  // State to track the active tab - include 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'settings'>(initialTab || 'overview');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const overviewTabRef = useRef<HTMLButtonElement>(null);
  const keysTabRef = useRef<HTMLButtonElement>(null);
  const settingsTabRef = useRef<HTMLButtonElement>(null); // Ref for settings tab
  // State for indicator style
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // --- State for editable settings --- 
  const [editedAppName, setEditedAppName] = useState(app.name);
  const [editedAppDescription, setEditedAppDescription] = useState(app.description || '');
  const [editedAppEnvironment, setEditedAppEnvironment] = useState(app.environment);
  
  // --- State for editable keys (new structure) --- 
  // OAuth 1.0a
  const [editedOauth1ApiKey, setEditedOauth1ApiKey] = useState(app.oauth1Keys?.apiKey || '');
  const [editedOauth1ApiSecret, setEditedOauth1ApiSecret] = useState(app.oauth1Keys?.apiSecret || '');
  const [editedOauth1AccessToken, setEditedOauth1AccessToken] = useState(app.oauth1Keys?.accessToken || '');
  const [editedOauth1AccessSecret, setEditedOauth1AccessSecret] = useState(app.oauth1Keys?.accessSecret || '');
  const [editedOauth1BearerToken, setEditedOauth1BearerToken] = useState(app.oauth1Keys?.bearerToken || '');
  const [showOauth1ApiSecret, setShowOauth1ApiSecret] = useState(false);
  const [showOauth1AccessSecret, setShowOauth1AccessSecret] = useState(false);
  const [showOauth1Bearer, setShowOauth1Bearer] = useState(false);
  // OAuth 2.0
  const [editedOauth2ClientId, setEditedOauth2ClientId] = useState(app.oauth2Keys?.clientId || '');
  const [editedOauth2ClientSecret, setEditedOauth2ClientSecret] = useState(app.oauth2Keys?.clientSecret || '');
  const [showOauth2ClientSecret, setShowOauth2ClientSecret] = useState(false);

  // Reset tab and local state if initialTab or app changes
  useEffect(() => {
      setActiveTab(initialTab || 'overview');
      // Reset settings
      setEditedAppName(app.name);
      setEditedAppDescription(app.description || '');
      setEditedAppEnvironment(app.environment);
      // Reset key state from potentially undefined objects
      setEditedOauth1ApiKey(app.oauth1Keys?.apiKey || '');
      setEditedOauth1ApiSecret(app.oauth1Keys?.apiSecret || '');
      setEditedOauth1AccessToken(app.oauth1Keys?.accessToken || '');
      setEditedOauth1AccessSecret(app.oauth1Keys?.accessSecret || '');
      setEditedOauth1BearerToken(app.oauth1Keys?.bearerToken || '');
      setEditedOauth2ClientId(app.oauth2Keys?.clientId || '');
      setEditedOauth2ClientSecret(app.oauth2Keys?.clientSecret || '');
      // Hide secrets on app change
      setShowOauth1ApiSecret(false);
      setShowOauth1AccessSecret(false);
      setShowOauth1Bearer(false);
      setShowOauth2ClientSecret(false);
  }, [initialTab, app]);

  // Effect to update indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsContainerRef.current) return;
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      let targetTabRect: DOMRect | null = null;

      // Find the active tab's ref
      if (activeTab === 'overview' && overviewTabRef.current) {
        targetTabRect = overviewTabRef.current.getBoundingClientRect();
      } else if (activeTab === 'keys' && keysTabRef.current) { 
        targetTabRect = keysTabRef.current.getBoundingClientRect();
      } else if (activeTab === 'settings' && settingsTabRef.current) { // Check settings tab
        targetTabRect = settingsTabRef.current.getBoundingClientRect();
      }

      // Calculate and set style
      if (targetTabRect) {
        const left = targetTabRect.left - containerRect.left + tabsContainerRef.current.scrollLeft;
        const width = targetTabRect.width;
        setIndicatorStyle({ left, width });
      } else {
         setIndicatorStyle({ left: 0, width: 0 });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]); // Re-run when activeTab changes

  // --- Save Handler --- 
  const handleSaveChanges = () => {
      const valueOrUndefined = (val: string): string | undefined => {
          const trimmed = val.trim();
          return trimmed === '' ? undefined : trimmed;
      }

      const updatedAppData: AppInfo = {
          ...app,
          name: editedAppName.trim(),
          description: valueOrUndefined(editedAppDescription),
          environment: editedAppEnvironment,
          // Construct keys objects
          oauth1Keys: {
              apiKey: valueOrUndefined(editedOauth1ApiKey),
              apiSecret: valueOrUndefined(editedOauth1ApiSecret),
              accessToken: valueOrUndefined(editedOauth1AccessToken),
              accessSecret: valueOrUndefined(editedOauth1AccessSecret),
              bearerToken: valueOrUndefined(editedOauth1BearerToken),
          },
          oauth2Keys: {
              clientId: valueOrUndefined(editedOauth2ClientId),
              clientSecret: valueOrUndefined(editedOauth2ClientSecret),
          }
      };

      // Clean up empty key objects - Check for existence first
      if (updatedAppData.oauth1Keys && 
          Object.values(updatedAppData.oauth1Keys).every(v => v === undefined)) {
          delete updatedAppData.oauth1Keys;
      }
      if (updatedAppData.oauth2Keys && 
          Object.values(updatedAppData.oauth2Keys).every(v => v === undefined)) {
          delete updatedAppData.oauth2Keys;
      }

      updateApp(project.id, updatedAppData);
  };

  // --- Delete Handler --- 
  const handleDeleteApp = () => {
      // Confirmation handled in App.tsx
      deleteApp(project.id, app.id);
  };

  // Determine if changes have been made
  const hasChanges = 
      editedAppName !== app.name || 
      editedAppDescription !== (app.description || '') ||
      editedAppEnvironment !== app.environment ||
      // Check key changes vs potentially undefined original keys
      editedOauth1ApiKey !== (app.oauth1Keys?.apiKey || '') ||
      editedOauth1ApiSecret !== (app.oauth1Keys?.apiSecret || '') ||
      editedOauth1AccessToken !== (app.oauth1Keys?.accessToken || '') ||
      editedOauth1AccessSecret !== (app.oauth1Keys?.accessSecret || '') ||
      editedOauth1BearerToken !== (app.oauth1Keys?.bearerToken || '') ||
      editedOauth2ClientId !== (app.oauth2Keys?.clientId || '') ||
      editedOauth2ClientSecret !== (app.oauth2Keys?.clientSecret || '');

  return (
    <div className="app-view">
      {/* Update H1 to breadcrumb style */}
      <h1 className="breadcrumb-header">
        {/* Make "Projects" clickable -> dashboard */}
        <span className="breadcrumb-link" onClick={() => onNavigate?.('dashboard')}>
          Projects
        </span>
        <span className="breadcrumb-separator">/</span>
        {/* Make project name clickable -> project view */}
        <span className="breadcrumb-link" onClick={() => onNavigate?.(`project-${project.id}`)}>
          {project.name}
        </span>
        <span className="breadcrumb-separator">/</span>
        {/* Current app name (not clickable) */}
        <span>{app.name}</span> 
        {/* Keep environment small and to the side */}
        <span className="app-environment">({app.environment})</span> 
      </h1>
      
      {/* Tabs - Add Settings Button */}
      <div className="app-details-tabs" ref={tabsContainerRef}>
        <button 
          ref={overviewTabRef} 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          ref={keysTabRef} 
          className={`tab-button ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          Keys & Tokens
        </button>
        <button 
          ref={settingsTabRef} // Add ref for settings
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <div className="active-tab-indicator" style={indicatorStyle}></div>
      </div>

      {/* Tab Content */} 
      <div className="app-details-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <p><strong>App ID:</strong> {app.id}</p>
            <p><strong>Full Name:</strong> {app.name}</p>
            <p><strong>Environment:</strong> {app.environment}</p>
            <p><strong>Icon:</strong> {app.icon || '(none)'}</p>
            <p><strong>Description:</strong> {app.description || '(none)'}</p>
          </div>
        )}
        {activeTab === 'keys' && (
          <div className="keys-section settings-section"> 
            {/* --- OAuth 1.0a Section --- */}
            <fieldset className="key-group">
                <legend>OAuth 1.0a Keys</legend>
                {/* API Key */} 
                <div className="setting-item">
                    <label htmlFor="oauth1ApiKey">API Key</label>
                    <input 
                        type="text" 
                        id="oauth1ApiKey" 
                        value={editedOauth1ApiKey} 
                        onChange={(e) => setEditedOauth1ApiKey(e.target.value)}
                        placeholder="Enter OAuth 1.0a API Key"
                    />
                </div>
                {/* API Secret */} 
                <div className="setting-item">
                    <label htmlFor="oauth1ApiSecret">API Secret</label>
                    <div className="password-input-container">
                        <input 
                            type={showOauth1ApiSecret ? "text" : "password"} 
                            id="oauth1ApiSecret" 
                            value={editedOauth1ApiSecret} 
                            onChange={(e) => setEditedOauth1ApiSecret(e.target.value)}
                            placeholder="Enter OAuth 1.0a API Secret"
                        />
                        <button onClick={() => setShowOauth1ApiSecret(!showOauth1ApiSecret)} className="visibility-toggle">
                            {showOauth1ApiSecret ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                 {/* Access Token */} 
                <div className="setting-item">
                    <label htmlFor="oauth1AccessToken">Access Token</label>
                    <input 
                        type="text" 
                        id="oauth1AccessToken" 
                        value={editedOauth1AccessToken} 
                        onChange={(e) => setEditedOauth1AccessToken(e.target.value)}
                        placeholder="Enter OAuth 1.0a Access Token"
                    />
                </div>
                 {/* Access Secret */} 
                <div className="setting-item">
                    <label htmlFor="oauth1AccessSecret">Access Secret</label>
                    <div className="password-input-container">
                        <input 
                            type={showOauth1AccessSecret ? "text" : "password"} 
                            id="oauth1AccessSecret" 
                            value={editedOauth1AccessSecret} 
                            onChange={(e) => setEditedOauth1AccessSecret(e.target.value)}
                            placeholder="Enter OAuth 1.0a Access Secret"
                        />
                        <button onClick={() => setShowOauth1AccessSecret(!showOauth1AccessSecret)} className="visibility-toggle">
                            {showOauth1AccessSecret ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                 {/* Bearer Token (OAuth 1.0a / v1.1) */} 
                <div className="setting-item">
                    <label htmlFor="oauth1BearerToken">Bearer Token (Legacy v1.1)</label>
                     <div className="password-input-container">
                        <textarea 
                            id="oauth1BearerToken" 
                            value={editedOauth1BearerToken} 
                            onChange={(e) => setEditedOauth1BearerToken(e.target.value)}
                            rows={editedOauth1BearerToken.length > 60 ? 3 : 1} 
                            placeholder="Enter OAuth 1.0a / v1.1 Bearer Token"
                            style={{ 
                                fontFamily: 'monospace', fontSize: '0.9em', minHeight: '2.4em', resize: 'vertical',
                                //@ts-ignore
                                WebkitTextSecurity: showOauth1Bearer ? 'none' : 'disc', 
                                textSecurity: showOauth1Bearer ? 'none' : 'disc'
                            }}
                        />
                        <button onClick={() => setShowOauth1Bearer(!showOauth1Bearer)} className="visibility-toggle">
                            {showOauth1Bearer ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
            </fieldset>

            {/* --- OAuth 2.0 Section --- */}
            <fieldset className="key-group">
                <legend>OAuth 2.0 Keys</legend>
                {/* Client ID */} 
                <div className="setting-item">
                    <label htmlFor="oauth2ClientId">Client ID</label>
                    <input 
                        type="text" 
                        id="oauth2ClientId" 
                        value={editedOauth2ClientId} 
                        onChange={(e) => setEditedOauth2ClientId(e.target.value)}
                        placeholder="Enter OAuth 2.0 Client ID"
                    />
                </div>
                {/* Client Secret */} 
                <div className="setting-item">
                    <label htmlFor="oauth2ClientSecret">Client Secret</label>
                    <div className="password-input-container">
                        <input 
                            type={showOauth2ClientSecret ? "text" : "password"} 
                            id="oauth2ClientSecret" 
                            value={editedOauth2ClientSecret} 
                            onChange={(e) => setEditedOauth2ClientSecret(e.target.value)}
                            placeholder="Enter OAuth 2.0 Client Secret"
                        />
                        <button onClick={() => setShowOauth2ClientSecret(!showOauth2ClientSecret)} className="visibility-toggle">
                            {showOauth2ClientSecret ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
            </fieldset>

            {/* --- Save Action --- */} 
             <div className="setting-item-actions">
                 <button 
                     className="action-button" 
                     onClick={handleSaveChanges} 
                     disabled={!hasChanges} 
                 >
                     Save Key Changes
                 </button>
             </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="settings-section"> 
            <h2>App Settings</h2>
            <div className="setting-item">
                <label htmlFor="appName">App Name</label>
                <input 
                    type="text" 
                    id="appName" 
                    value={editedAppName} 
                    onChange={(e) => setEditedAppName(e.target.value)}
                />
            </div>
            <div className="setting-item">
                <label htmlFor="appDesc">Description</label>
                <textarea 
                    id="appDesc" 
                    value={editedAppDescription} 
                    onChange={(e) => setEditedAppDescription(e.target.value)}
                    rows={3}
                ></textarea>
            </div>
            <div className="setting-item">
                <label>Environment</label>
                <select 
                    id="appEnv"
                    value={editedAppEnvironment}
                    onChange={(e) => setEditedAppEnvironment(e.target.value as typeof editedAppEnvironment)}
                >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                </select>
            </div>
            <div className="setting-item-actions">
                <button 
                    className="action-button" 
                    onClick={handleSaveChanges} 
                    disabled={!hasChanges} 
                >
                    Save App Settings
                </button>
                <button 
                    className="action-button danger" 
                    onClick={handleDeleteApp}
                >
                    Delete App
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppView; 