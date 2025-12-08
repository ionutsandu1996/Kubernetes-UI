const express = require('express');
const cors = require('cors');
const k8s = require('@kubernetes/client-node'); // 🔹 nou

const app = express();
app.use(cors());
app.use(express.json()); // ca să putem citi JSON din body la /api/scale (mai târziu)

// ==== CONFIGURARE KUBERNETES ====

// Ne facem un "KubeConfig" = harta + buletinul cu care intrăm în cluster
const kc = new k8s.KubeConfig();

// Două scenarii:
// 1) Rulezi local → folosim ~/.kube/config (exact ca kubectl)
// 2) Rulează în cluster → folosim ServiceAccount-ul pod-ului
if (process.env.KUBERNETES_SERVICE_HOST) {
  // Suntem în cluster
  kc.loadFromCluster();
  console.log('Loaded kubeconfig from cluster (ServiceAccount)');
} else {
  // Suntem pe mașina ta locală
  kc.loadFromDefault();
  console.log('Loaded kubeconfig from ~/.kube/config');
}

// Facem un client pentru API-ul de "apps" (Deployment, StatefulSet etc.)
const appsApi = kc.makeApiClient(k8s.AppsV1Api);

// ==== ENDPOINT-URI ====

// 1) Healthcheck simplu
app.get('/api/health', (req, res) => {
  res.json({ status: 'backend merge!', k8sConfigured: true });
});

// 2) Listează deployment-urile dintr-un namespace
app.get('/api/deployments', async (req, res) => {
  console.log('>>> req.query =', req.query); // logăm query-ul primit

  const namespace = req.query.namespace || 'default';
  console.log('>>> using namespace =', namespace); // logăm namespace-ul folosit

  try {
    const resp = await appsApi.listNamespacedDeployment(namespace);

    const deployments = resp.body.items.map((d) => ({
      name: d.metadata.name,
      namespace: d.metadata.namespace,
      replicas: d.spec.replicas || 0,
      availableReplicas: d.status.availableReplicas || 0,
    }));

    res.json(deployments);
  } catch (err) {
    console.error('Error listing deployments:', err.body || err.message);
    res.status(500).json({ error: err.body || err.message });
  }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend-ul ascultă pe portul ${PORT}`);
});
