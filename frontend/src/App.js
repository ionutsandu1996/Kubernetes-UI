import React, { useState } from "react";
import "./App.css";
import PodsPage from "./PodsPage";
import DeploymentsPage from "./DeploymentsPage";
import StatefulsetsPage from "./StatefulsetsPage";
import SettingsPage from "./SettingsPage";

export const BACKEND_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

// deocamdată hardcodăm namespace-urile
const NAMESPACES = ["default", "actimize-actone"];

function App() {
  const [namespace, setNamespace] = useState("default");
  const [selectedTab, setSelectedTab] = useState("pods"); // pods | deployments | statefulsets | settings

  let content = null;
  if (selectedTab === "pods") {
    content = <PodsPage namespace={namespace} />;
  } else if (selectedTab === "deployments") {
    content = <DeploymentsPage namespace={namespace} />;
  } else if (selectedTab === "statefulsets") {
    content = <StatefulsetsPage namespace={namespace} />;
  } else if (selectedTab === "settings") {
    content = <SettingsPage namespace={namespace} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-section">
            <h2 className="brand">K8s Control</h2>

            <div className="ns-card">
              <div className="ns-card-label">NAMESPACE</div>
              <div className="ns-card-body">
                <span className="ns-chip-icon">📂</span>
                <select
                  className="ns-select"
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                >
                  {NAMESPACES.map((ns) => (
                    <option key={ns} value={ns}>
                      {ns}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="sidebar-separator" />

          <nav className="sidebar-menu">
            <button
              className={
                selectedTab === "pods" ? "menu-item active" : "menu-item"
              }
              onClick={() => setSelectedTab("pods")}
            >
              <span className="menu-icon">📦</span>
              Pods
            </button>
            <button
              className={
                selectedTab === "deployments"
                  ? "menu-item active"
                  : "menu-item"
              }
              onClick={() => setSelectedTab("deployments")}
            >
              <span className="menu-icon">🚀</span>
              Deployments
            </button>
            <button
              className={
                selectedTab === "statefulsets"
                  ? "menu-item active"
                  : "menu-item"
              }
              onClick={() => setSelectedTab("statefulsets")}
            >
              <span className="menu-icon">🏗️</span>
              Statefulsets
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button
            className={
              selectedTab === "settings" ? "menu-item active" : "menu-item"
            }
            onClick={() => setSelectedTab("settings")}
          >
            <span className="menu-icon">⚙️</span>
            Settings
          </button>
        </div>
      </aside>

      <main className="content">{content}</main>
    </div>
  );
}

export default App;
