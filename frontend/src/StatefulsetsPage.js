import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "./App";

function StatefulsetsPage({ namespace }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatefulsets = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/statefulsets?namespace=${encodeURIComponent(
          namespace
        )}`
      );

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const changeReplicas = async (obj, newReplicas) => {
    if (newReplicas < 0) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/scale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespace: obj.namespace,
          name: obj.name,
          kind: "StatefulSet",
          replicas: newReplicas,
        }),
      });

      if (!res.ok) {
        throw new Error(`Scale failed: ${res.status}`);
      }

      await loadStatefulsets();
    } catch (err) {
      console.error(err);
      setError(err.message || "Scale error");
    }
  };

  useEffect(() => {
    loadStatefulsets();
    const id = setInterval(loadStatefulsets, 10000); // auto-refresh 10 sec
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  return (
    <div>
      <div className="page-header">
  <h1>Statefulsets</h1>
  <span className="ns-badge">{namespace}</span>
</div>


      {loading && <p>Loading statefulsets...</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && items.length === 0 && (
        <p>No statefulsets found in namespace "{namespace}".</p>
      )}

      {!loading && items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Images</th>
              <th>Replicas</th>
              <th>Ready</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((obj) => (
              <tr key={`${obj.namespace}-${obj.name}`}>
                <td>{obj.name}</td>
                <td>{obj.namespace}</td>
                <td>
                  {obj.images && obj.images.length > 0 ? (
                    <ul>
                      {obj.images.map((img) => (
                        <li key={img}>{img}</li>
                      ))}
                    </ul>
                  ) : (
                    <em>no images</em>
                  )}
                </td>
                <td>{obj.replicas}</td>
                <td>{obj.availableReplicas}</td>
                <td>
                  <button
                    onClick={() => changeReplicas(obj, obj.replicas - 1)}
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeReplicas(obj, obj.replicas + 1)}
                  >
                    +
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StatefulsetsPage;
