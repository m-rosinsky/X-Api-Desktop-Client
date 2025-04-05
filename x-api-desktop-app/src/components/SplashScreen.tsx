import React from 'react';
import '../styles/splashscreen.css'; // We'll create this next

const SplashScreen: React.FC = () => {
  return (
    <div className="splash-screen">
      <img src="/tauri.svg" className="splash-logo" alt="Loading Logo" />
      {/* Optional: Add a loading message or spinner here */}
    </div>
  );
};

export default SplashScreen; 