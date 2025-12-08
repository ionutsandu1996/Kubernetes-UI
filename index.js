const express = require('express');
const cors = require('cors');
const k8s = require('@kubernetes/client-node');

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// CONFIGURARE KUBECONFIG
// ===============================
const kc = new k8s.KubeConfig();

if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster();
  console.log("Loaded kubeconfig from cluster (ServiceAccount)");
} else {
  kc.loadFromDefault();
  console.log("Loaded kubeconfig from ~/.kube/config");
}

const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);

// ===============================
// HEALTHCHECK
// ===============================
app.get('/api/health', (req, res) => {
  res.json({ status: "backend merge!", k8sConfigured: true });
});

// ===============================
// LISTARE NAMESPACE-URI
// ===============================
app.get("/api/namespaces", async (req, res) => {
  try {
    const resp = await coreApi.listNamespace();
    const namespaces = resp.body.items.map(ns => ({
      name: ns.metadata.name
    }));
    res.json(namespaces);
  } catch (err) {
    console.error("Error listing namespaces:", err.body || err.message);
    res.status(500).json({ error: err.body || err.message });
  }
});

// ===============================
// FUNCTIE: extragem numele app-ului din label-uri
// ===============================
function getAppInstance(labels) {
  return (
    labels["app"] ||
    labels["app.kubernetes.io/instance"] ||
    labels["app.kubernetes.io/name"]
  );
}

// ===============================
// LISTARE APLICAȚII (apps)
// ===============================
app.get("/api/apps", async (req, res) => {
  try {
    console.log("--- /api/apps CALLED ---");

    const namespace = req.query.namespace?.trim();
    if (!namespace) {
      return res.status(400).json({ error: "Missing required query parameter: namespace" });
    }

    // cerem deployments și statefulsets în paralel
    const [deployResp, stsResp] = await Promise.all([
      appsApi.listNamespacedDeployment(namespace),
      appsApi.listNamespacedStatefulSet(namespace),
    ]);

    const deployments = deployResp.body.items || [];
    const statefulsets = stsResp.body.items || [];

    const appMap = new Map();

    function add(kind, obj) {
      const labels = obj.metadata?.labels || {};
      const appName = getAppInstance(labels);
      if (!appName) return;

      if (!appMap.has(appName)) {
        appMap.set(appName, {
          appName,
          namespace,
          deployments: [],
          statefulsets: [],
          resourceCount: 0
        });
      }

      const entry = appMap.get(appName);

      // extragem imaginea containerelor
      const containers = obj.spec?.template?.spec?.containers || [];
      const images = containers.map(c => c.image);
      const image = images[0] || null;

      const base = {
        kind,
        name: obj.metadata?.name,
        namespace,
        replicas: obj.spec?.replicas || 0,
        ready:
          obj.status?.readyReplicas ??
          obj.status?.availableReplicas ??
          0,
        image   // 🔥 imaginea containerului
      };

      if (kind === "Deployment") entry.deployments.push(base);
      if (kind === "StatefulSet") entry.statefulsets.push(base);

      entry.resourceCount++;
    }

    deployments.forEach(d => add("Deployment", d));
    statefulsets.forEach(s => add("StatefulSet", s));

    res.json(Array.from(appMap.values()));

  } catch (err) {
    console.error("Error listing apps:", err.body || err.message);
    res.status(500).json({ error: err.body || err.message });
  }
});

// ===============================
// SCALING DEPLOYMENT / STATEFULSET / APP
// ===============================
app.post("/api/scale", async (req, res) => {
  try {
    const { namespace, kind, name, replicas, appName } = req.body;

    if (!namespace || !replicas) {
      return res.status(400).json({ error: "Missing required fields: namespace, replicas" });
    }

    // --------------------------------------
    // 1) SCALING PE ÎNTREAGA APP
    // --------------------------------------
    if (appName) {
      console.log(`Scaling entire app ${appName} to ${replicas} replicas`);

      // preluăm listele
      const [deployResp, stsResp] = await Promise.all([
        appsApi.listNamespacedDeployment(namespace),
        appsApi.listNamespacedStatefulSet(namespace),
      ]);

      const deployments = deployResp.body.items || [];
      const statefulsets = stsResp.body.items || [];

      let scaled = [];

      function scaleIfMatch(kind, obj) {
        const labels = obj.metadata?.labels || {};
        const inst = getAppInstance(labels);
        if (inst !== appName) return;

        const r = {
          kind,
          name: obj.metadata.name,
          namespace,
          spec: { replicas }
        };

        scaled.push(r);

        if (kind === "Deployment") {
          appsApi.patchNamespacedDeployment(
            obj.metadata.name,
            namespace,
            r,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { "Content-Type": "application/merge-patch+json" } }
          );
        } else {
          appsApi.patchNamespacedStatefulSet(
            obj.metadata.name,
            namespace,
            r,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { "Content-Type": "application/merge-patch+json" } }
          );
        }
      }

      deployments.forEach(d => scaleIfMatch("Deployment", d));
      statefulsets.forEach(s => scaleIfMatch("StatefulSet", s));

      return res.json({ mode: "app", scaled });
    }

    // --------------------------------------
    // 2) SCALING PE O SINGURĂ RESURSĂ
    // --------------------------------------
    if (!kind || !name) {
      return res.status(400).json({ error: "Missing required fields: kind, name" });
    }

    const patch = {
      spec: { replicas }
    };

    if (kind === "Deployment") {
      await appsApi.patchNamespacedDeployment(
        name,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { "Content-Type": "application/merge-patch+json" } }
      );
    } else if (kind === "StatefulSet") {
      await appsApi.patchNamespacedStatefulSet(
        name,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { "Content-Type": "application/merge-patch+json" } }
      );
    } else {
      return res.status(400).json({ error: "Unsupported kind. Use Deployment or StatefulSet." });
    }

    return res.json({
      mode: "single-resource",
      result: { kind, name, namespace, replicas }
    });

  } catch (err) {
    console.error("Error scaling:", err.body || err.message);
    res.status(500).json({ error: err.body || err.message });
  }
});

// ===============================
// PORNIRE SERVER
// ===============================
const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Backend-ul ascultă pe portul ${PORT}`);
});
