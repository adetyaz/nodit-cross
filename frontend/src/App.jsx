import React from "react";
import WhaleTrackerDashboard from "./components/whale-tracker-dashboard";

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Cross-Chain Whale Tracker Dashboard</h1>
      <p>Visualize whale movements across Ethereum, Polygon, and XRPL.</p>
      <div>
        {/* Whale activity, alerts, and analytics will be displayed here */}
        <p>Loading whale data...</p>
        <WhaleTrackerDashboard />
      </div>
    </div>
  );
}
