# HealthShield: OpenShift (OCP) Deployment Runbook

This runbook guides you through deploying HealthShield microservices, Kafka event streaming, and OpenShift Routes onto **Red Hat OpenShift Container Platform (OCP)**.

---

## 1. Prerequisites & CLI Setup

### Installing `oc` CLI (if not already installed)
```bash
# Download OpenShift Client for Linux
curl -LO https://mirror.openshift.com/pub/openshift-v4/clients/ocp/latest/openshift-client-linux.tar.gz

# Extract and move to PATH
tar -xvf openshift-client-linux.tar.gz
sudo mv oc kubectl /usr/local/bin/

# Verify
oc version --client
```

### Logging into your OpenShift Cluster
1. In your **OpenShift Web Console**, click your username in the top-right corner.
2. Click **"Copy login command"** → **"Display Token"**.
3. Copy and run the command in your terminal:
```bash
oc login --token=sha256~YOUR_TOKEN --server=https://api.YOUR_CLUSTER.openshift.com:6443
```

---

## 2. Deploying HealthShield to OpenShift

### Step 1: Create the Project / Namespace
```bash
oc new-project health-insurance || oc project health-insurance
```

### Step 2: Configure OpenShift Secrets
Edit `gitops/openshift/secrets-template.yml` with your database password, AWS S3 bucket names, and IAM keys, then apply:
```bash
oc apply -f gitops/openshift/secrets-template.yml
```

### Step 3: Deploy PostgreSQL Database
```bash
oc apply -f gitops/k8s/database/statefulset.yml
oc apply -f gitops/k8s/database/service.yml
oc apply -f gitops/k8s/database/configmap.yml
```

### Step 4: Deploy Strimzi Kafka & S3 Sink Connector
If the Strimzi Operator is installed in your cluster:
```bash
# 1. Deploy Kafka Cluster
oc apply -f gitops/openshift/kafka/01-kafka-strimzi.yml

# 2. Deploy Kafka Topics (payment.events, claim.events, policy.events)
oc apply -f gitops/openshift/kafka/02-kafka-topics.yml

# 3. Deploy Kafka Connect with AWS S3 Sink Connector
oc apply -f gitops/openshift/kafka/03-kafka-s3-sink-connector.yml
```

### Step 5: Deploy All Microservices & Frontend
```bash
oc apply -f gitops/openshift/apps/services.yml
oc apply -f gitops/openshift/apps/deployments.yml
oc apply -f gitops/openshift/apps/routes.yml
```

---

## 3. Accessing Public URLs (OpenShift Routes)

To get the publicly accessible HTTPS URLs created by OpenShift Routes:

```bash
# Get all Routes
oc get routes -n health-insurance
```

Output will look like:
```
NAME                           HOST/PORT                                                         SERVICES   PORT
healthshield-frontend-route    healthshield-frontend.apps.your-cluster.openshift.com             frontend   3000
healthshield-gateway-route     healthshield-gateway.apps.your-cluster.openshift.com              gateway    3001
```

* Open the `healthshield-frontend-route` host in your web browser to view the **HealthShield Consumer & Admin Portal**!
* Open `healthshield-gateway-route/api/status` to view the **Microservices Gateway Telemetry**.

---

## 4. Deploying via Helm Chart (`charts/healthshield`)

Instead of applying individual manifests, deploy the entire platform via Helm:

```bash
# Preview rendered templates
helm template healthshield ./charts/healthshield \
  --namespace kumarh5149-dev \
  --set global.imageTag=latest

# Deploy or upgrade
helm upgrade --install healthshield ./charts/healthshield \
  --namespace kumarh5149-dev \
  --set global.imageTag=latest

# Uninstall all microservices
helm uninstall healthshield --namespace kumarh5149-dev
```

---

## 5. Jenkins Operations (Safe Stop & Resume)

To preserve OpenShift Developer Sandbox quotas (3 vCPUs, 30 GiB RAM):

```bash
# Safely stop Jenkins (frees compute while keeping all data on the 1Gi EBS PVC):
oc scale dc/jenkins --replicas=0 -n kumarh5149-dev

# Resume Jenkins (restores all pipelines, jobs, credentials):
oc scale dc/jenkins --replicas=1 -n kumarh5149-dev
```

For the complete list of all OpenShift, Helm, and AWS commands, see [docs/COMMANDS_USED_TODAY.md](./COMMANDS_USED_TODAY.md).

