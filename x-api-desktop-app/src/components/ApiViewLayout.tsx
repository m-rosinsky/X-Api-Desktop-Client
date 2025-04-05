import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ApiViewLayoutProps {
  children: React.ReactNode; // Main content goes here
  sidebarContent: React.ReactNode; // Content for the right sidebar
}

const MIN_SIDEBAR_WIDTH = 150; // Minimum width for the sidebar
const MAX_SIDEBAR_WIDTH_PERCENT = 60; // Max width as a percentage of window width

const ApiViewLayout: React.FC<ApiViewLayoutProps> = ({ children, sidebarContent }) => {
  const [sidebarWidth, setSidebarWidth] = useState(280); 
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null); // Ref for the sidebar element
  const layoutRef = useRef<HTMLDivElement>(null); // Ref for the layout container

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent text selection during drag
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !layoutRef.current) return;

    const layoutRect = layoutRef.current.getBoundingClientRect();
    const newWidth = layoutRect.right - e.clientX; // Calculate width from right edge

    // Enforce min width
    const clampedMinWidth = Math.max(newWidth, MIN_SIDEBAR_WIDTH);

    // Enforce max width (percentage)
    const maxAllowedWidth = layoutRect.width * (MAX_SIDEBAR_WIDTH_PERCENT / 100);
    const finalWidth = Math.min(clampedMinWidth, maxAllowedWidth);

    setSidebarWidth(finalWidth);
  }, [isDragging]);

  // Add global event listeners for mousemove and mouseup
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={`api-view-layout`} ref={layoutRef}>
      <div className="api-main-content">
        {children}
      </div>
      <aside 
        className="api-docs-sidebar" 
        style={{ width: `${sidebarWidth}px` }} 
        ref={sidebarRef}
      >
        {/* Resize Handle */}
        <div 
          className={`resize-handle ${isDragging ? 'dragging' : ''}`} 
          onMouseDown={handleMouseDown} 
        ></div> 
        <div className="sidebar-content-area">
          {sidebarContent}
        </div>
      </aside>
    </div>
  );
};

export default ApiViewLayout; 