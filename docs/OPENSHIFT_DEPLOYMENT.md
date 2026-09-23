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

---

## 6. OpenShift Developer Sandbox Architecture & Resource Quotas

Red Hat OpenShift Developer Sandbox enforces strict cluster-level quotas that require specific configuration in Helm charts and Kubernetes manifests:

### A. The 30 ReplicaSets Quota Limit (`count/replicasets.apps = 30`)
* **The Constraint**: The sandbox enforces a hard ceiling of 30 ReplicaSets across the namespace (`for-kumarh5149-replicas`).
* **The Trap**: By default, Kubernetes deployments specify `revisionHistoryLimit: 10`. With 14 deployments running (microservices + Postgres + Kafka + Loki + Frontend), even 2 revisions per service equals 28 ReplicaSets. A 3rd revision immediately fails with:
  ```text
  Warning ReplicaSetCreateError: Failed to create new replica set:
  replicasets.apps is forbidden: exceeded quota: for-kumarh5149-replicas, limited: count/replicasets.apps=30
  ```
* **The Solution**: Set `revisionHistoryLimit: 1` explicitly across all Helm deployment templates. When a new rollout triggers, Kubernetes prunes the previous inactive ReplicaSet immediately, keeping total namespace ReplicaSets between 12 and 15.

### B. Pruning Stale ReplicaSets Command
```bash
# Delete all 0-replica inactive ReplicaSets
oc get rs -n kumarh5149-dev -o jsonpath='{range .items[?(@.spec.replicas==0)]}{.metadata.name}{"\n"}{end}' | xargs -r oc delete rs -n kumarh5149-dev
```

---

## 7. Pod Rolling Restarts & Image Pull Behavior

### Why Pods Don't Restart on New Image Pushes
When using mutable image tags like `:latest`, running `helm upgrade` without template modifications will **not restart pods**. 
1. **Idempotent Manifests**: Kubernetes only updates pods if `spec.template` changes. If the image is `my-app:latest` before and after deployment, Kubernetes sees no changes.
2. **Node-Level Image Caching**: If `imagePullPolicy` is `IfNotPresent`, the node reuses its cached Docker layer even if a pod restarts.

### How HealthShield Enforces Immediate Restarts:
1. **Dynamic Rollout Annotation**:
   In every Helm deployment template:
   ```yaml
   template:
     metadata:
       annotations:
         rolloutTimestamp: {{ .Values.global.rolloutTimestamp | default (now | quote) }}
   ```
2. **Force ECR Layer Pulling**:
   In `charts/healthshield/values.yaml`:
   ```yaml
   global:
     imagePullPolicy: Always
   ```
3. **Automated Rollout Restart in Jenkins CD Pipeline**:
   ```groovy
   stage('Rolling Restart & Fresh Image Pull') {
       steps {
           sh '''
           oc rollout restart deployment/gateway deployment/frontend deployment/auth \
             deployment/policy-service deployment/claim-service deployment/billing-service \
             deployment/member-service deployment/hospital-service deployment/document-service \
             deployment/support-service deployment/aiops-assistant -n kumarh5149-dev
           '''
       }
   }
   ```

---

## 8. OpenShift Web Console: Permissions & Perspective Troubleshooting

If actions or buttons appear disabled, greyed out, or forbidden in the OpenShift Web Console:

1. **Check Perspective (Top-Left Dropdown)**:
   * **Developer Perspective (Recommended)**: Shows Topology, Pods, Deployments, Logs, Terminal, and Helm Releases. All actions in your assigned project work.
   * **Administrator Perspective**: Clicking cluster-scoped menus (*Nodes, Operators, Cluster Settings, CRDs*) will result in `Forbidden: User cannot list resource at cluster scope`.
2. **Check Project Dropdown (Top Bar)**:
   * Ensure **`Project: kumarh5149-dev`** is selected.
   * If `All Projects`, `sandbox-shared-models`, or `openshift-virtualization-os-images` is selected, all mutation buttons (*Add, Create, Edit, Delete*) are disabled because those projects are read-only.
3. **Session Expiry**:
   * OpenShift Web Console OAuth tokens expire after extended sessions. If forms or buttons become unresponsive, refresh the browser (`Ctrl + Shift + R`) or log out and log back in via Red Hat SSO.

---

For the complete list of all OpenShift, Helm, and AWS commands, see [docs/COMMANDS_USED_TODAY.md](./COMMANDS_USED_TODAY.md).


