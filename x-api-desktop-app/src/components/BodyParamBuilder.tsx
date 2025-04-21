import React, { useState, useEffect } from 'react';
import { BodyParam } from '../types';
import { Info } from 'lucide-react';
import '../styles/query-param-builder.css'; // Keep using these styles

interface BodyParamBuilderProps {
  params: BodyParam[];
  onChange: (values: Record<string, any>) => void;
}

const BodyParamBuilder: React.FC<BodyParamBuilderProps> = ({ params, onChange }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [hoveredDescParam, setHoveredDescParam] = useState<string | null>(null);

  useEffect(() => {
    const initialValues: Record<string, any> = {};
    params.forEach(param => { initialValues[param.name] = ''; });
    setValues(initialValues);
  }, [params]);

  const handleChange = (name: string, value: string) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    onChange(newValues);
  };

  if (!params || params.length === 0) {
    return null;
  }

  // Sort params: required first, then alphabetically (like QueryParamBuilder)
  const sortedParams = [...params].sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="query-param-builder body-param-builder"> 
      <h3 className="query-param-label">Request Body</h3>
      <div className="query-param-grouped-section">
        <div className="param-inputs-container">
          {sortedParams.map((param) => (
            <div key={`body-input-${param.name}`} className="param-input-item" style={{ position: 'relative' }}>
              <div 
                className="param-label-container" 
                onMouseEnter={() => setHoveredDescParam(param.name)}
                onMouseLeave={() => setHoveredDescParam(null)} 
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <label htmlFor={`body-input-val-${param.name}`} className="query-param-label">
                  {param.required && <span className="required-badge">Required</span>} 
                  {param.name}:
                </label>
                {param.description && (
                  <Info 
                    size={14} 
                    className="info-icon" 
                    style={{ marginLeft: '0.4em', cursor: 'help', color: 'var(--text-color-secondary)' }}
                  />
                )}
              </div>
              <div className="param-input-area">
                {
                  param.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      id={`body-input-val-${param.name}`}
                      checked={!!values[param.name]}
                      onChange={(e) => handleChange(param.name, e.target.checked ? 'true' : 'false')}
                    />
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'} 
                      id={`body-input-val-${param.name}`}
                      placeholder={param.example ? `${param.example}` : `Enter value for ${param.name}...`}
                      value={values[param.name] || ''}
                      onChange={(e) => handleChange(param.name, e.target.value)}
                      required={param.required}
                      spellCheck="false"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  )
                }
              </div>
              {hoveredDescParam === param.name && param.description && (
                <div className="param-tooltip" style={{
                  position: 'absolute',
                  left: '0',
                  top: '100%',
                  marginTop: '4px', 
                  backgroundColor: 'var(--background-color-tooltip, #333)', 
                  color: 'var(--text-color-tooltip, #eee)',
                  border: '1px solid var(--border-color-darker, #555)',
                  borderRadius: '4px',
                  padding: '0.5em 0.8em',
                  fontSize: '0.85em',
                  maxWidth: '300px',
                  zIndex: 10,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  textAlign: 'left'
                }}>
                  {param.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BodyParamBuilder; 