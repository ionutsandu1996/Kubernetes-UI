const express = require('express');
const cors = require('cors');
const k8s = require('@kubernetes/client-node');

const app = express();
app.use(cors());
app.use(express.json());

// ================== KUBERNETES CONFIG ==================

const kc = new k8s.KubeConfig();

if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster();
  console.log('Loaded kubeconfig from in-cluster ServiceAccount');
} else {
  kc.loadFromDefault();
  console.log('Loaded kubeconfig from ~/.kube/config');
}

const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

// helper: cum identificăm „aplicația” după label-uri
function getAppInstance(labels = {}) {
  return (
    labels['app.kubernetes.io/instance'] ||
    labels['app.kubernetes.io/name'] ||
    labels['app'] ||
    null
  );
}

// ================== ENDPOINTS ==================

// ================== PODS ==================
// listează pods dintr-un namespace
app.get('/api/pods', async (req, res) => {
  try {
    console.log('--- /api/pods CALLED ---');
    console.log('raw url:', req.url);
    console.log('req.query =', req.query);

    let namespace = 'default';
    if (
      typeof req.query.namespace === 'string' &&
      req.query.namespace.trim() !== ''
    ) {
      namespace = req.query.namespace.trim();
    }

    console.log('>>> using namespace =', namespace);

    const resp = await coreApi.listNamespacedPod({ namespace });
    const items = resp.items ?? resp.body?.items ?? [];

    console.log('K8s API call OK, pods:', items.length);

    const pods = items.map(p => {
      const containers = p.spec?.containers || [];
      const containerInfos = containers.map(c => ({
        name: c.name,
        image: c.image,
      }));

      return {
        name: p.metadata?.name,
        namespace: p.metadata?.namespace,
        phase: p.status?.phase || '',
        nodeName: p.spec?.nodeName || '',
        podIP: p.status?.podIP || '',
        startTime: p.status?.startTime || '',
        containers: containerInfos,
      };
    });

    res.json(pods);
  } catch (err) {
    console.error('Error listing pods:', err.body || err.message || err);
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error listing pods' });
  }
});


// healthcheck simplu
app.get('/api/health', (req, res) => {
  res.json({ status: 'backend merge!', k8sConfigured: true });
});

// listează toate namespace-urile – îți poate prinde bine în UI
app.get('/api/namespaces', async (req, res) => {
  try {
    console.log('--- /api/namespaces CALLED ---');
    const resp = await coreApi.listNamespace({});
    const items = resp.items ?? resp.body?.items ?? [];
    const namespaces = items.map(ns => ({
      name: ns.metadata?.name,
      status: ns.status?.phase,
    }));
    res.json(namespaces);
  } catch (err) {
    console.error('Error listing namespaces:', err.body || err.message || err);
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error listing namespaces' });
  }
});

// ================== DEPLOYMENTS ==================
// listează deployments dintr-un namespace
app.get('/api/deployments', async (req, res) => {
  try {
    console.log('--- /api/deployments CALLED ---');
    console.log('raw url:', req.url);
    console.log('req.query =', req.query);

    let namespace = 'default';
    if (
      typeof req.query.namespace === 'string' &&
      req.query.namespace.trim() !== ''
    ) {
      namespace = req.query.namespace.trim();
    }

    console.log('>>> using namespace =', namespace);

    const resp = await appsApi.listNamespacedDeployment({ namespace });
    const items = resp.items ?? resp.body?.items ?? [];

    console.log('K8s API call OK, deployments:', items.length);

    const deployments = items.map(d => {
      const containers =
        d.spec?.template?.spec?.containers || [];
      const images = containers
        .map(c => c.image)
        .filter(Boolean);

      return {
        name: d.metadata?.name,
        namespace: d.metadata?.namespace,
        replicas: d.spec?.replicas || 0,
        availableReplicas: d.status?.availableReplicas || 0,
        images,
      };
    });

    res.json(deployments);
  } catch (err) {
    console.error('Error listing deployments:', err.body || err.message || err);
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error listing deployments' });
  }
});

// ================== STATEFULSETS ==================
// listează statefulset-urile dintr-un namespace
app.get('/api/statefulsets', async (req, res) => {
  try {
    console.log('--- /api/statefulsets CALLED ---');
    console.log('raw url:', req.url);
    console.log('req.query =', req.query);

    let namespace = 'default';
    if (
      typeof req.query.namespace === 'string' &&
      req.query.namespace.trim() !== ''
    ) {
      namespace = req.query.namespace.trim();
    }

    console.log('>>> using namespace =', namespace);

    const resp = await appsApi.listNamespacedStatefulSet({ namespace });
    const items = resp.items ?? resp.body?.items ?? [];

    console.log('K8s API call OK, statefulsets:', items.length);

    const statefulsets = items.map(s => {
      const containers =
        s.spec?.template?.spec?.containers || [];
      const images = containers
        .map(c => c.image)
        .filter(Boolean);

      return {
        name: s.metadata?.name,
        namespace: s.metadata?.namespace,
        replicas: s.spec?.replicas || 0,
        // la statefulset „available” = readyReplicas
        availableReplicas: s.status?.readyReplicas || 0,
        images,
      };
    });

    res.json(statefulsets);
  } catch (err) {
    console.error(
      'Error listing statefulsets:',
      err.body || err.message || err
    );
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error listing statefulsets' });
  }
});

// ================== APPS (grupare după label de app) ==================
app.get('/api/apps', async (req, res) => {
  try {
    console.log('--- /api/apps CALLED ---');

    const namespace = req.query.namespace?.trim();
    if (!namespace) {
      return res.status(400).json({
        error: 'Missing required query parameter: namespace',
      });
    }

    const [deployResp, stsResp] = await Promise.all([
      appsApi.listNamespacedDeployment({ namespace }),
      appsApi.listNamespacedStatefulSet({ namespace }),
    ]);

    const deployments = deployResp.items ?? deployResp.body?.items ?? [];
    const statefulsets = stsResp.items ?? stsResp.body?.items ?? [];

    const appMap = new Map();

    function add(kind, obj) {
      const labels = obj.metadata?.labels || {};
      const app = getAppInstance(labels);
      if (!app) return;

      if (!appMap.has(app)) {
        appMap.set(app, {
          appName: app,
          namespace,
          deployments: [],
          statefulsets: [],
          resourceCount: 0,
        });
      }

      const entry = appMap.get(app);

      const containers =
        obj.spec?.template?.spec?.containers || [];
      const images = containers
        .map(c => c.image)
        .filter(Boolean);
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
        image,
        // images, // dacă vrei și lista completă
      };

      if (kind === 'Deployment') entry.deployments.push(base);
      if (kind === 'StatefulSet') entry.statefulsets.push(base);

      entry.resourceCount++;
    }

    deployments.forEach(d => add('Deployment', d));
    statefulsets.forEach(s => add('StatefulSet', s));

    const apps = Array.from(appMap.values());
    res.json(apps);
  } catch (err) {
    console.error('Error listing apps:', err.body || err.message || err);
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error listing apps' });
  }
});

// ================== SCALING (single resource sau app) ==================
app.post('/api/scale', async (req, res) => {
  try {
    const {
      namespace = 'default',
      name,
      kind,
      appName,
      replicas,
    } = req.body || {};

    console.log('--- /api/scale CALLED ---');
    console.log('body =', req.body);

    if (
      replicas === undefined ||
      replicas === null ||
      isNaN(Number(replicas))
    ) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid field: replicas' });
    }

    const ns = namespace || 'default';
    const desiredReplicas = Number(replicas);

    async function scaleWorkload({ kind, name, namespace }) {
      if (!name) {
        throw new Error('Missing resource name for scaling');
      }

      if (kind === 'StatefulSet') {
        console.log(
          `Scaling StatefulSet ${name} in ns=${namespace} to ${desiredReplicas}`
        );
        const currentResp = await appsApi.readNamespacedStatefulSet({
          name,
          namespace,
        });
        const ss = currentResp.body ?? currentResp;
        ss.spec = ss.spec || {};
        ss.spec.replicas = desiredReplicas;

        const updateResp = await appsApi.replaceNamespacedStatefulSet({
          name,
          namespace,
          body: ss,
        });
        const updated = updateResp.body ?? updateResp;
        return {
          kind,
          name,
          namespace,
          replicas: updated?.spec?.replicas ?? desiredReplicas,
        };
      } else {
        console.log(
          `Scaling Deployment ${name} in ns=${namespace} to ${desiredReplicas}`
        );
        const currentResp = await appsApi.readNamespacedDeployment({
          name,
          namespace,
        });
        const dep = currentResp.body ?? currentResp;
        dep.spec = dep.spec || {};
        dep.spec.replicas = desiredReplicas;

        const updateResp = await appsApi.replaceNamespacedDeployment({
          name,
          namespace,
          body: dep,
        });
        const updated = updateResp.body ?? updateResp;
        return {
          kind: 'Deployment',
          name,
          namespace,
          replicas: updated?.spec?.replicas ?? desiredReplicas,
        };
      }
    }

    // CAZ 1: scale o singură resursă (Deployment / StatefulSet)
    if (name && kind) {
      const result = await scaleWorkload({ kind, name, namespace: ns });
      return res.json({ mode: 'single-resource', result });
    }

    // CAZ 2: scale toată aplicația (toate workloads cu același appName)
    if (appName) {
      console.log(
        `Scaling entire app "${appName}" in ns=${ns} to ${desiredReplicas}`
      );

      const [deployResp, stsResp] = await Promise.all([
        appsApi.listNamespacedDeployment({ namespace: ns }),
        appsApi.listNamespacedStatefulSet({ namespace: ns }),
      ]);

      const deployItems =
        deployResp.items ?? deployResp.body?.items ?? [];
      const stsItems = stsResp.items ?? stsResp.body?.items ?? [];

      const workloadsToScale = [];

      deployItems.forEach(d => {
        const labels = d.metadata?.labels || {};
        if (getAppInstance(labels) === appName) {
          workloadsToScale.push({
            kind: 'Deployment',
            name: d.metadata?.name,
            namespace: ns,
          });
        }
      });

      stsItems.forEach(s => {
        const labels = s.metadata?.labels || {};
        if (getAppInstance(labels) === appName) {
          workloadsToScale.push({
            kind: 'StatefulSet',
            name: s.metadata?.name,
            namespace: ns,
          });
        }
      });

      if (workloadsToScale.length === 0) {
        return res.status(404).json({
          error: `No workloads found for app "${appName}" in namespace "${ns}"`,
        });
      }

      const results = [];
      for (const w of workloadsToScale) {
        const r = await scaleWorkload(w);
        results.push(r);
      }

      return res.json({
        mode: 'app',
        appName,
        namespace: ns,
        replicas: desiredReplicas,
        scaledResources: results,
      });
    }

    return res.status(400).json({
      error: 'Provide either (name + kind) OR (appName) along with replicas',
    });
  } catch (err) {
    console.error('Error scaling workloads:', err.body || err.message || err);
    res
      .status(500)
      .json({ error: err.body || err.message || 'Error scaling workloads' });
  }
});

// ================== START SERVER ==================

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend-ul ascultă pe portul ${PORT}`);
});
