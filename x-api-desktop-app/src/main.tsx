import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Import stylesheets
import "./styles/global.css";
import "./styles/sidebar.css";
import "./styles/dashboard.css";
import "./styles/api-views.css";
import "./styles/selectors.css";
import "./styles/splashscreen.css";
import "./styles/query-param-builder.css";
import "./styles/path-param-builder.css";
import "./styles/code-snippet-display.css";
import "./styles/expansions-selector.css";
import "./styles/project-view.css";
import "./styles/app-view.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
