# HealthShield: Master Directory of All Required URLs & Endpoints

This document aggregates all web consoles, cluster APIs, CI/CD routes, external service endpoints, and monitoring dashboards utilized across the HealthShield platform.

---

## 1. Web Consoles & Platforms

| Platform | URL | Purpose / Notes |
| :--- | :--- | :--- |
| **GitHub Repository** | [https://github.com/hiteshk283/DevOps-and-AIOps](https://github.com/hiteshk283/DevOps-and-AIOps) | Main Git repository containing all code, Helm charts, and docs |
| **GitHub Actions** | [https://github.com/hiteshk283/DevOps-and-AIOps/actions](https://github.com/hiteshk283/DevOps-and-AIOps/actions) | Manual CI pipeline (`workflow_dispatch`) |
| **Red Hat OpenShift Web Console** | [https://console-openshift-console.apps.rm1.0a51.p1.openshiftapps.com](https://console-openshift-console.apps.rm1.0a51.p1.openshiftapps.com) | Developer Sandbox Console (User: `kumarh5149`, Project: `kumarh5149-dev`) |
| **OpenShift Kubernetes API** | `https://api.rm1.0a51.p1.openshiftapps.com:6443` | Target API server for `oc login` CLI authentication |
| **Atlassian Jira Service Management** | [https://kumarh5149.atlassian.net](https://kumarh5149.atlassian.net) | Jira Cloud portal (Project Key: **`OPS`**, User: `kumarh5149@gmail.com`) |
| **Jira Ticket `OPS-1` (Live Verified)** | [https://kumarh5149.atlassian.net/browse/OPS-1](https://kumarh5149.atlassian.net/browse/OPS-1) | Production test incident ticket created via REST API |

---

## 2. CI/CD & Pipeline URLs

| Component | URL | Notes |
| :--- | :--- | :--- |
| **Jenkins Web Dashboard** | [https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com](https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com) | Public OpenShift Route for Jenkins UI |
| **Jenkins CD Deploy Job** | [https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/job/healthshield-pipeline/](https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/job/healthshield-pipeline/) | Executes Helm deployment, Jira update, and Loki audit |
| **Jenkins Uninstall Teardown Job** | [https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/job/healthshield-uninstall/](https://jenkins-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/job/healthshield-uninstall/) | Executes clean teardown with interactive safety confirmation |
| **Jenkins JNLP Tunnel** | `jenkins-jnlp.kumarh5149-dev.svc:50000` | Internal agent communication port |

---

## 3. Microservices & Application Public Routes (OpenShift)

When deployed via Helm (`charts/healthshield`), the services are accessible via OpenShift edge HTTPS routes:

| Service | Public Route URL | Internal Cluster Endpoint |
| :--- | :--- | :--- |
| **Frontend Portal** | `https://healthshield-frontend-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com` | `http://frontend:3000` |
| **API Gateway** | `https://healthshield-gateway-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com` | `http://gateway:3001` |
| **Gateway Health & Status** | `https://healthshield-gateway-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/api/status` | `http://gateway:3001/api/status` |
| **Gateway Prometheus Metrics** | `https://healthshield-gateway-kumarh5149-dev.apps.rm1.0a51.p1.openshiftapps.com/metrics` | `http://gateway:3001/metrics` |

---

## 4. Internal Microservice Cluster Endpoints

Inside the `kumarh5149-dev` OpenShift namespace:

| Microservice | Cluster DNS Endpoint | Port | Database / Backend |
| :--- | :--- | :--- | :--- |
| **Auth & KYC** | `http://auth:3002` | `3002` | `auth_db` |
| **Policy Service** | `http://policy-service:3003` | `3003` | `policies_db` |
| **Claim Service** | `http://claim-service:3004` | `3004` | `claims_db` |
| **Member Service** | `http://member-service:3005` | `3005` | `members_db` |
| **Billing Service** | `http://billing-service:3006` | `3006` | `billing_db` |
| **Hospital Network** | `http://hospital-service:3008` | `3008` | `hospitals_db` |
| **Document Vault** | `http://document-service:3009` | `3009` | S3 Vault / Metadata |
| **Support Service** | `http://support-service:3010` | `3010` | JSM REST & Loki HTTP |
| **PostgreSQL Database** | `postgres:5432` | `5432` | 7 PostgreSQL schemas |

---

## 5. Observability & Logging Endpoints

| Service | Endpoint URL | Description |
| :--- | :--- | :--- |
| **Grafana Loki Service** | `http://loki:3100` | Cluster-internal endpoint for LogQL and HTTP Push |
| **Loki Readiness Check** | `http://loki:3100/ready` | Health check endpoint |
| **Loki Log Ingestion API** | `http://loki:3100/loki/api/v1/push` | JSON payload ingestion endpoint |
| **Loki LogQL Query API** | `http://loki:3100/loki/api/v1/query` | Log query endpoint (`{app="healthshield"}`) |
| **Prometheus Metrics** | `http://prometheus:9090` | Internal metrics aggregator |
| **Grafana Dashboard** | `http://grafana:3007` | Metrics & log visualizer (credentials: `admin` / `admin`) |

---

## 6. AWS Endpoints & Cloud Consoles

* **AWS Region**: `us-east-1`
* **AWS Account ID**: `794558722040`
* **IAM User**: `arn:aws:iam::794558722040:user/Linux`

| Service | Console URL / Resource URI | Details |
| :--- | :--- | :--- |
| **AWS Management Console** | [https://us-east-1.console.aws.amazon.com/](https://us-east-1.console.aws.amazon.com/) | Central AWS web console |
| **Amazon ECR Registry** | `794558722040.dkr.ecr.us-east-1.amazonaws.com` | Docker login target |
| **Amazon ECR Console** | [https://us-east-1.console.aws.amazon.com/ecr/repositories?region=us-east-1](https://us-east-1.console.aws.amazon.com/ecr/repositories?region=us-east-1) | Container repository management |
| **Amazon S3 Console** | [https://s3.console.aws.amazon.com/s3/home?region=us-east-1](https://s3.console.aws.amazon.com/s3/home?region=us-east-1) | S3 buckets management |
| **AWS IAM Console** | [https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1](https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1) | IAM users, roles, and policy management |
| **S3 Kafka Event Store** | `s3://healthshield-kafka-events-794558722040` | Bucket URI (when provisioned) |
| **S3 Document Vault** | `s3://healthshield-documents-794558722040` | Bucket URI (when provisioned) |
