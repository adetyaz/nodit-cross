import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import WhaleTrackerDashboard from "./components/whale-tracker-dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WhaleTrackerDashboard />
  </React.StrictMode>
);
