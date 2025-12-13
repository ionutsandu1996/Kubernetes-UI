import React, { useCallback, useEffect, useState } from "react";
import { formatAge } from "./utils/time";

const REFRESH_MS = 10000; // 10 secunde
const AGE_TICK_MS = 1000; // re-render pentru "Age"

function PodsPage({ namespace }) {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // doar ca să forțăm re-render la 1s pentru Age
  const [, force] = useState(0);

  const phaseClass = (phase) => {
    if (!phase) return "row-warn";

    const bad = [
      "Failed",
      "CrashLoopBackOff",
      "Error",
      "ImagePullBackOff",
      "ErrImagePull",
    ];

    const warn = ["Pending", "Unknown", "ContainerCreating", "Terminating"];

    if (phase === "Running") return "row-ok";
    if (bad.includes(phase)) return "row-bad";
    if (warn.includes(phase)) return "row-warn";

    return "row-warn";
  };

  // ✅ loadPods stable (nu se recreează aiurea)
  const loadPods = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/pods?namespace=${encodeURIComponent(namespace)}`
      );

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setPods(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  const restartPod = useCallback(
    async (pod) => {
      if (
        !window.confirm(
          `Sigur vrei să dai restart la pod-ul "${pod.name}" din namespace "${pod.namespace}"?`
        )
      ) {
        return;
      }

      try {
        const res = await fetch(`/api/pods/restart`, {
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
        setError(err?.message || "Restart error");
      }
    },
    [loadPods]
  );

  // ✅ ticker pentru Age (hook la nivel de componentă)
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), AGE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // ✅ load pods + auto-refresh când tab-ul e vizibil
  useEffect(() => {
    loadPods();

    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadPods();
      }
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, [loadPods]);

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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phase</th>
                <th>Node</th>
                <th>Pod IP</th>
                <th>Containers / Images</th>
                <th>Age</th>
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

                  <td>{formatAge(pod.startTime)}</td>

                  <td>
                    <button onClick={() => restartPod(pod)}>Restart</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PodsPage;
