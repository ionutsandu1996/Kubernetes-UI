import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "./App";

function DeploymentsPage({ namespace }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDeployments = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/deployments?namespace=${encodeURIComponent(
          namespace
        )}`
      );

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setDeployments(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const changeReplicas = async (dep, newReplicas) => {
    if (newReplicas < 0) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/scale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespace: dep.namespace,
          name: dep.name,
          kind: "Deployment",
          replicas: newReplicas,
        }),
      });

      if (!res.ok) {
        throw new Error(`Scale failed: ${res.status}`);
      }

      await loadDeployments();
    } catch (err) {
      console.error(err);
      setError(err.message || "Scale error");
    }
  };

  useEffect(() => {
    loadDeployments();
    const id = setInterval(loadDeployments, 10000); // auto-refresh 10 sec
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  return (
    <div>
      <h1>Deployments in namespace "{namespace}"</h1>

      {loading && <p>Loading deployments...</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && deployments.length === 0 && (
        <p>No deployments found in namespace "{namespace}".</p>
      )}

      {!loading && deployments.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Images</th>
              <th>Replicas</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((dep) => (
              <tr key={`${dep.namespace}-${dep.name}`}>
                <td>{dep.name}</td>
                <td>{dep.namespace}</td>
                <td>
                  {dep.images && dep.images.length > 0 ? (
                    <ul>
                      {dep.images.map((img) => (
                        <li key={img}>{img}</li>
                      ))}
                    </ul>
                  ) : (
                    <em>no images</em>
                  )}
                </td>
                <td>{dep.replicas}</td>
                <td>{dep.availableReplicas}</td>
                <td>
                  <button
                    onClick={() => changeReplicas(dep, dep.replicas - 1)}
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeReplicas(dep, dep.replicas + 1)}
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

export default DeploymentsPage;
