import React from 'react';
import { Project, AppInfo, DashboardProps, User } from '../types';
import '../styles/dashboard.css';

const Dashboard: React.FC<DashboardProps> = ({ projects, currentUser, onNavigate }) => {
  const handleAppClick = (appId: number, targetTab: 'overview' | 'keys') => {
    if (onNavigate) {
      const viewId = `app-${appId}/${targetTab}`;
      onNavigate(viewId);
    }
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <h2>Dashboard</h2>
        
        {currentUser ? (
          <div className="project-list">
            {projects.length > 0 ? (
              projects.map((project: Project) => {
                const usagePercentage = Math.min((project.usage / project.cap) * 100, 100);
                return (
                  <div key={project.id} className="project-item">
                    <div className="project-header">
                      <h3>{project.name}</h3>
                      <span className={`project-package package-${project.package.toLowerCase()}`}>{project.package}</span>
                    </div>
                    <p>Usage: {project.usage.toLocaleString()} / {project.cap.toLocaleString()}</p>
                    <div className="usage-bar-container">
                      <div
                        className={`usage-bar ${usagePercentage >= 100 ? 'at-cap' : ''}`}
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                    {project.apps.length > 0 && (
                      <div className="app-list">
                        <h4>Apps:</h4>
                        {(['production', 'staging', 'development'] as const).map(env => {
                          const appsInEnv = project.apps.filter(app => app.environment === env);
                          if (appsInEnv.length === 0) return null;
    
                          return (
                            <div key={env} className="app-environment-group">
                              <h5>{env}</h5>
                              <ul>
                                {appsInEnv.map((app: AppInfo) => (
                                  <li key={app.id} className="app-item">
                                    <div className="app-item-info">
                                      <span className="app-icon">{app.icon || '📱'}</span>
                                      <span>{app.name}</span>
                                    </div>
                                    <div className="app-item-actions">
                                      <span 
                                        className="settings-icon" 
                                        title="App Settings"
                                        onClick={() => handleAppClick(app.id, 'overview')}
                                      >⚙️</span>
                                      <span 
                                        className="key-icon" 
                                        title="View Keys"
                                        onClick={() => handleAppClick(app.id, 'keys')}
                                      >🔑</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No projects found.</p>
            )}
          </div>
        ) : (
          <div className="logged-out-message">
            <p>Please sign in to view your projects.</p>
          </div>
        )}
      </div>

      <aside className="dashboard-sidebar">
        <h3>Platform News</h3>
        <ul className="info-list">
          <li>New API v2 Beta released!</li>
          <li>Maintenance scheduled for Sunday.</li>
          <li>Check out the new documentation theme.</li>
        </ul>

        <h3>Resources</h3>
        <ul className="info-list links">
          <li><a href="#" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Example Projects</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Community Forum</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">System Status</a></li>
        </ul>
      </aside>
    </div>
  );
};

export default Dashboard; 