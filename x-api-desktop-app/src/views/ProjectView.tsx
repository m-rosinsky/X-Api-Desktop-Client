import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import '../styles/project-view.css';

interface ProjectViewProps {
  project: Project;
  onNavigate?: (viewId: string | undefined) => void;
}

const ProjectView: React.FC<ProjectViewProps> = ({ project, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const overviewTabRef = useRef<HTMLButtonElement>(null);
  const settingsTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsContainerRef.current) return;
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      let targetTabRect: DOMRect | null = null;

      if (activeTab === 'overview' && overviewTabRef.current) {
        targetTabRect = overviewTabRef.current.getBoundingClientRect();
      } else if (activeTab === 'settings' && settingsTabRef.current) {
        targetTabRect = settingsTabRef.current.getBoundingClientRect();
      }

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
  }, [activeTab]);

  const handleAppClick = (appId: number) => {
    if (onNavigate) {
      onNavigate(`app-${appId}`);
    }
  };

  return (
    <div className="project-view">
      <h1 className="breadcrumb-header">
        <span className="breadcrumb-link" onClick={() => onNavigate?.('dashboard')}>
          Projects
        </span>
        <span className="breadcrumb-separator">/</span>
        <span>{project.name}</span>
      </h1>
      
      <div className="project-details-tabs" ref={tabsContainerRef}>
        <button 
          ref={overviewTabRef}
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          ref={settingsTabRef}
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <div className="active-tab-indicator" style={indicatorStyle}></div>
      </div>

      <div className="project-details-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <p><strong>ID:</strong> {project.id}</p>
            <p><strong>Package:</strong> {project.package}</p>
            <p><strong>Description:</strong> {project.description || 'No description provided.'}</p>
            <p><strong>Usage:</strong> {project.usage.toLocaleString()} / {project.cap.toLocaleString()}</p>
            <div className="usage-bar-container">
              <div
                className={`usage-bar ${project.usage >= project.cap ? 'at-cap' : ''}`}
                style={{ width: `${Math.min((project.usage / project.cap) * 100, 100)}%` }}
              ></div>
            </div>
            
            <h2 className="apps-heading">Apps in this Project:</h2>
            {project.apps.length > 0 ? (
              <ul className="overview-app-list">
                {project.apps.map(app => (
                  <li key={app.id} className="overview-app-item" onClick={() => handleAppClick(app.id)}>
                    <span className="app-icon">{app.icon}</span>
                    <span className="app-name">{app.name}</span>
                    <span className="app-environment">({app.environment})</span>
                    <span className="go-to-app">→</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No apps found for this project.</p>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Project Settings</h2>
            <div className="setting-item">
                <label htmlFor="projectName">Project Name</label>
                <input type="text" id="projectName" value={project.name} readOnly />
            </div>
             <div className="setting-item">
                <label htmlFor="projectDesc">Description</label>
                <textarea id="projectDesc" value={project.description || ''} readOnly rows={3}></textarea>
            </div>
            <button className="action-button">Save Changes</button>
            <button className="action-button danger">Delete Project</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectView; 