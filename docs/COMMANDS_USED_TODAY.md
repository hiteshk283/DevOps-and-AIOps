# HealthShield: Master Runbook of All Commands Used Today

This document contains a categorized reference of all CLI commands executed and utilized during our session across **AWS CLI**, **Terraform**, **Red Hat OpenShift (`oc`)**, **Helm**, **Docker**, **Git**, and **cURL/APIs**.

---

## 1. AWS CLI & Terraform Teardown ($0 Cost Management)

### A. AWS CLI Inspection & Verification
```bash
# Verify caller identity & current AWS account
aws sts get-caller-identity

# List all S3 buckets
aws s3 ls

# Check objects or versions inside HealthShield buckets
aws s3 ls s3://healthshield-documents-794558722040 --recursive
aws s3 ls s3://healthshield-kafka-events-794558722040 --recursive
aws s3api list-object-versions --bucket healthshield-documents-794558722040 --max-items 5
aws s3api list-object-versions --bucket healthshield-kafka-events-794558722040 --max-items 5

# List all Amazon ECR repositories
aws ecr describe-repositories --region us-east-1 --query 'repositories[*].repositoryName' --output json

# Verify specific ECR images
aws ecr list-images --repository-name gateway --region us-east-1
aws ecr list-images --repository-name claim-service --region us-east-1

# Authenticate Docker client with AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 794558722040.dkr.ecr.us-east-1.amazonaws.com

# List IAM users and policies matching healthshield
aws iam list-users --query 'Users[?contains(UserName, `healthshield`)].UserName' --output json
aws iam list-policies --scope Local --query 'Policies[?contains(PolicyName, `healthshield`)].PolicyName' --output json
```

### B. Terraform Deployment & Teardown
```bash
cd infrastructure

# Initialize Terraform providers
terraform init

# Validate configuration syntax
terraform validate

# Preview resources to create
terraform plan

# Deploy infrastructure to AWS
terraform apply -auto-approve

# View generated outputs (bucket names, IAM keys)
terraform output
terraform output -raw kafka_s3_connector_secret_key

# Preview resources to destroy
terraform plan -destroy

# Destroy all AWS resources completely ($0 cost)
terraform destroy -auto-approve

# Verify Terraform state is completely empty
terraform show
```

---

## 2. Red Hat OpenShift (`oc`) CLI

### A. Authentication & Namespace Management
```bash
# Log into OpenShift cluster via token
oc login --token=<YOUR_TOKEN> --server=https://api.rm1.0a51.p1.openshiftapps.com:6443

# Check who you are logged in as
oc whoami

# Check active project / switch project
oc project
oc project kumarh5149-dev

# View overall namespace status
oc status
```

### B. Inspecting Pods, Deployments & Storage
```bash
# List all pods in namespace
oc get pods -n kumarh5149-dev

# Watch pod status changes in real-time
oc get pods -n kumarh5149-dev -w

# Inspect Services and Routes (Public URLs)
oc get svc,route -n kumarh5149-dev

# Check PersistentVolumeClaims (PVCs) and StorageClass
oc get pvc -n kumarh5149-dev

# Describe specific pod or deployment
oc describe pod <pod-name> -n kumarh5149-dev
oc describe deployment/loki -n kumarh5149-dev

# Stream live container logs
oc logs -f <pod-name> -n kumarh5149-dev
```

### C. Jenkins Management (Safe Start & Stop without Data Loss)
```bash
# Check Jenkins DeploymentConfig, PVC, and Pods
oc get dc,deploy,sts,pvc,pods -n kumarh5149-dev | grep -i jenkins

# Inspect Jenkins volume mount (/var/lib/jenkins -> PVC)
oc get dc/jenkins -n kumarh5149-dev -o jsonpath='{.spec.template.spec.containers[0].volumeMounts}'

# STOP Jenkins safely (preserves all data on PVC, frees CPU/RAM quota):
oc scale dc/jenkins --replicas=0 -n kumarh5149-dev

# Verify Jenkins has stopped:
oc get dc/jenkins -n kumarh5149-dev

# RESUME / START Jenkins again (restores all jobs and configs instantly):
oc scale dc/jenkins --replicas=1 -n kumarh5149-dev
```

### D. Managing Secrets
```bash
# Create or update Jira & DB secret
oc create secret generic healthshield-secrets \
  --from-literal=DB_PASSWORD='<DB_PASSWORD>' \
  --from-literal=JWT_SECRET='healthshield-super-secret-jwt-key' \
  --from-literal=JIRA_HOST='https://kumarh5149.atlassian.net' \
  --from-literal=JIRA_EMAIL='kumarh5149@gmail.com' \
  --from-literal=JIRA_API_TOKEN='<API_TOKEN>' \
  --from-literal=JIRA_PROJECT_KEY='OPS' \
  --namespace kumarh5149-dev \
  --dry-run=client -o yaml | oc apply -f -

# List secrets in namespace
oc get secrets -n kumarh5149-dev
```

### E. Grafana Loki (Zero-Cost Logging on OpenShift)
```bash
# Deploy Loki manifests
oc apply -f gitops/openshift/loki/

# Verify Loki pod is running
oc get pods -l app=loki -n kumarh5149-dev

# Test Loki readiness
oc exec deployment/loki -n kumarh5149-dev -- curl -s http://localhost:3100/ready
```

---

## 3. Helm Chart Commands (`charts/healthshield`)

```bash
# Lint and validate Helm chart syntax
helm lint charts/healthshield

# Render Kubernetes manifests locally with debug output (dry-run)
helm template healthshield ./charts/healthshield \
  --namespace kumarh5149-dev \
  --set global.imageTag=latest \
  --debug

# Deploy or upgrade full HealthShield stack via Helm
helm upgrade --install healthshield ./charts/healthshield \
  --namespace kumarh5149-dev \
  --set global.imageTag=latest

# Check status of Helm release
helm status healthshield --namespace kumarh5149-dev

# Uninstall all microservices deployed by Helm
helm uninstall healthshield --namespace kumarh5149-dev
```

---

## 4. Docker & Local Microservice Build Commands

```bash
# Build API Gateway image locally
docker build -t 794558722040.dkr.ecr.us-east-1.amazonaws.com/gateway:latest backend/services/gateway

# Build Claim Service image locally
docker build -t 794558722040.dkr.ecr.us-east-1.amazonaws.com/claim-service:latest backend/services/claim-service

# Build Frontend image locally
docker build -t 794558722040.dkr.ecr.us-east-1.amazonaws.com/frontend:latest frontend

# Push image to Amazon ECR
docker push 794558722040.dkr.ecr.us-east-1.amazonaws.com/claim-service:latest

# Compile TypeScript locally for claim-service
cd backend/services/claim-service
npm run build
```

---

## 5. cURL, API & Integration Testing

### A. Jira Service Management (JSM) REST API Test
```bash
# Create test ticket OPS-1 in Jira
curl -s -u "kumarh5149@gmail.com:<API_TOKEN>" \
  -X POST \
  -H "Content-Type: application/json" \
  https://kumarh5149.atlassian.net/rest/api/3/issue \
  -d '{
    "fields": {
      "project": { "key": "OPS" },
      "summary": "Live Integration Verification from HealthShield DevOps",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [{
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Verified Jira API connection." }]
        }]
      },
      "issuetype": { "name": "Task" }
    }
  }'
```

### B. Grafana Loki Push & Query API Test
```bash
# Ingest test log entry into Loki
TIMESTAMP_NS=$(date +%s%N)
curl -v -H "Content-Type: application/json" -X POST "http://loki:3100/loki/api/v1/push" --data-raw "{
  \"streams\": [
    {
      \"stream\": { \"app\": \"healthshield\", \"service\": \"support-service\", \"env\": \"openshift-dev\" },
      \"values\": [ [ \"${TIMESTAMP_NS}\", \"INFO [Audit] HealthShield system verification log event.\" ] ]
    }
  ]
}"

# Query logs from Loki via LogQL
curl -G -s "http://loki:3100/loki/api/v1/query" --data-urlencode 'query={app="healthshield"}'
```

---

## 6. Git & GitHub Operations

```bash
# Check status and current branch
git status
git branch -a

# View recent commit history
git log -n 5 --oneline

# Add modified files and commit
git add .
git commit -m "feat(pipeline): configure manual trigger only for GitHub Actions"

# Push to remote feature branch
git push origin feature

# Compare difference between branches
git diff main feature
```
