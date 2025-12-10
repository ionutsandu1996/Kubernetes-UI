import React, { useState } from "react";

const initialNamespaces = ["default", "kube-system", "kube-public"];

export default function SettingsPage() {
  const [namespaces, setNamespaces] = useState(initialNamespaces);
  const [selectedNamespace, setSelectedNamespace] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newNamespace, setNewNamespace] = useState("");

  const handleAddClick = () => {
    setIsAdding(true);
    setNewNamespace("");
  };

  const handleConfirmAdd = () => {
    const trimmed = newNamespace.trim();

    if (!trimmed) {
      return;
    }

    if (namespaces.includes(trimmed)) {
      alert("Namespace-ul există deja.");
      return;
    }

    setNamespaces([...namespaces, trimmed]);
    setIsAdding(false);
    setNewNamespace("");
  };

  const handleDelete = () => {
    if (!selectedNamespace) {
      return;
    }

    setNamespaces(namespaces.filter((ns) => ns !== selectedNamespace));
    setSelectedNamespace(null);
  };

  return (
    <div className="settings-layout">
      {/* STÂNGA: Add / Remove controls */}
      <aside className="settings-sidebar">
        <h2>Settings</h2>

        <div className="settings-section">
          <h3>Namespaces</h3>

          {/* Buton Add */}
          {!isAdding && (
            <button className="btn primary" onClick={handleAddClick}>
              Add namespace
            </button>
          )}

          {/* Când apăsăm Add, apare textbox + buton de confirm */}
          {isAdding && (
            <div className="add-namespace-box">
              <input
                type="text"
                placeholder="ex: dbdetect-prod"
                value={newNamespace}
                onChange={(e) => setNewNamespace(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmAdd();
                  }
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewNamespace("");
                  }
                }}
              />
              <div className="add-actions">
                <button className="btn primary" onClick={handleConfirmAdd}>
                  Save
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setIsAdding(false);
                    setNewNamespace("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Buton Delete */}
          <button
            className="btn danger"
            onClick={handleDelete}
            disabled={!selectedNamespace}
          >
            Delete selected
          </button>

          {selectedNamespace && (
            <p className="selected-info">
              Selected: <strong>{selectedNamespace}</strong>
            </p>
          )}
        </div>
      </aside>

      {/* DREAPTA: Lista de namespaces */}
      <main className="settings-content">
        <h2>Namespaces list</h2>

        {namespaces.length === 0 ? (
          <p>No namespaces defined yet.</p>
        ) : (
          <ul className="namespace-list">
            {namespaces.map((ns) => (
              <li
                key={ns}
                className={
                  "namespace-item" +
                  (ns === selectedNamespace ? " selected" : "")
                }
                onClick={() => setSelectedNamespace(ns)}
              >
                {ns}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
