import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "./App";

const REFRESH_MS = 10000; // 10 secunde

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

  const restartPod = async (pod) => {
    if (
      !window.confirm(
        `Sigur vrei să dai restart la pod-ul "${pod.name}" din namespace "${pod.namespace}"?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/pods/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespace: pod.namespace,
          name: pod.name,
        }),
      });

      if (!res.ok) {
        throw new Error(`Restart failed: ${res.status}`);
      }

      await loadPods();
    } catch (err) {
      console.error(err);
      setError(err.message || "Restart error");
    }
  };

  useEffect(() => {
    loadPods();

    // auto-refresh inteligent: doar când tab-ul este vizibil
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadPods();
      }
    }, REFRESH_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  const phaseClass = (phase) => {
  if (!phase) return "row-warn";

  const bad = [
    "Failed",
    "CrashLoopBackOff",
    "Error",
    "ImagePullBackOff",
    "ErrImagePull",
  ];

  const warn = [
    "Pending",
    "Unknown",
    "ContainerCreating",
    "Terminating"
  ];

  if (phase === "Running") return "row-ok";
  if (bad.includes(phase)) return "row-bad";
  if (warn.includes(phase)) return "row-warn";

  return "row-warn"; // default
};

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr
                key={`${pod.namespace}-${pod.name}`}
                className={phaseClass(pod.phase)}
              >
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
                <td>
                  <button onClick={() => restartPod(pod)}>Restart</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PodsPage;
