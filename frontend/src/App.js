import React, { useState, useEffect } from "react";
import "./App.css";
import PodsPage from "./PodsPage";
import DeploymentsPage from "./DeploymentsPage";
import StatefulsetsPage from "./StatefulsetsPage";

export const BACKEND_URL =
  process.env.REACT_APP_API_BASE_URL || "";

console.log("BACKEND_URL =", BACKEND_URL);

function App() {
  const [namespace, setNamespace] = useState("default");
  const [namespaces, setNamespaces] = useState([]);  
  const [selectedTab, setSelectedTab] = useState("pods");

  // ======================
  // 1. Load namespaces din backend
  // ======================

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadNamespaces = async () => {
      try {
        const res = await fetch(`/api/namespaces`);
        const data = await res.json();

        const list = data.map((ns) => ns.name);
        setNamespaces(list);

        // dacă namespace curent nu există în listă -> îl facem primul
        if (list.length > 0 && !list.includes(namespace)) {
          setNamespace(list[0]);
        }
      } catch (err) {
        console.error("Error loading namespaces:", err);
      }
    };

    loadNamespaces();
  }, []); // rulează doar o dată, la load.

  // ======================
  // Render tab curent
  // ======================
  let content = null;
  if (selectedTab === "pods") {
    content = <PodsPage namespace={namespace} />;
  } else if (selectedTab === "deployments") {
    content = <DeploymentsPage namespace={namespace} />;
  } else if (selectedTab === "statefulsets") {
    content = <StatefulsetsPage namespace={namespace} />;
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
                  {namespaces.map((ns) => (
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
              className={selectedTab === "pods" ? "menu-item active" : "menu-item"}
              onClick={() => setSelectedTab("pods")}
            >
              <span className="menu-icon">📦</span>
              Pods
            </button>

            <button
              className={selectedTab === "deployments" ? "menu-item active" : "menu-item"}
              onClick={() => setSelectedTab("deployments")}
            >
              <span className="menu-icon">🚀</span>
              Deployments
            </button>

            <button
              className={selectedTab === "statefulsets" ? "menu-item active" : "menu-item"}
              onClick={() => setSelectedTab("statefulsets")}
            >
              <span className="menu-icon">🏗️</span>
              Statefulsets
            </button>
          </nav>
        </div>
      </aside>

      <main className="content">{content}</main>
    </div>
  );
}

export default App;
