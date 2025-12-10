import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "./App";

function PodsPage({ namespace }) {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPods = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/pods?namespace=${encodeURIComponent(namespace)}`
      );

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setPods(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPods();
    // poți pune și auto-refresh dacă vrei:
    // const id = setInterval(loadPods, 10000);
    // return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  return (
    <div>
      <div className="page-header">
  <h1>Pods</h1>
  <span className="ns-badge">{namespace}</span>
</div>

      {loading && <p>Loading pods...</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && pods.length === 0 && (
        <p>No pods found in namespace "{namespace}".</p>
      )}

      {!loading && pods.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phase</th>
              <th>Node</th>
              <th>Pod IP</th>
              <th>Containers / Images</th>
              <th>Start Time</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={`${pod.namespace}-${pod.name}`}>
                <td>{pod.name}</td>
                <td>{pod.phase}</td>
                <td>{pod.nodeName}</td>
                <td>{pod.podIP}</td>
                <td>
                  {pod.containers && pod.containers.length > 0 ? (
                    <ul>
                      {pod.containers.map((c) => (
                        <li key={c.name}>
                          <strong>{c.name}:</strong> {c.image}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <em>no containers</em>
                  )}
                </td>
                <td>{pod.startTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PodsPage;
