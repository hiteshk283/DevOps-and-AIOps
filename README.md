# HealthShield — Health Insurance Microservices Platform

A production-ready, cloud-native **Health Insurance Microservices Application** built with the exact same architecture, technology stack, and cloud infrastructure as the DevOps & AIOps series.

---

## Architecture Overview

```
                                      ┌────────────────────────┐
                                      │   React Frontend UI    │
                                      │       Port 3000        │
                                      └───────────┬────────────┘
                                                  │
                                      ┌───────────▼────────────┐
                                      │   API Gateway Service  │
                                      │       Port 3001        │
                                      │ (Prometheus /metrics)  │
                                      └───────────┬────────────┘
                                                  │
            ┌──────────────────────────┬──────────┴───────────┬──────────────────────────┐
            │                          │                      │                          │
     ┌──────▼──────┐            ┌──────▼──────┐        ┌──────▼──────┐            ┌──────▼──────┐
     │Auth Service │            │PolicyService│        │Claim Service│            │MemberService│
     │  Port 3002  │            │  Port 3003  │        │  Port 3004  │            │  Port 3005  │
     └──────┬──────┘            └──────┬──────┘        └──────┬──────┘            └──────┬──────┘
            │                          │                      │                          │
     ┌──────▼──────┐            ┌──────▼──────┐        ┌──────▼──────┐            ┌──────▼──────┐
     │   auth_db   │            │ policies_db │        │  claims_db  │            │  members_db │
     └─────────────┴────────────┴─────────────┴────────┴─────────────┴───────────┴──────┬──────┘
                                                                                         │
                                                                           ┌─────────────▼─────────────┐
                                                                           │   PostgreSQL (Port 5432)  │
                                                                           └───────────────────────────┘

 ┌───────────────────────────────────────────────────────────┐
 │                     Monitoring Stack                      │
 │     Prometheus (Port 9090) ◄──── Grafana (Port 3007)      │
 └───────────────────────────────────────────────────────────┘
```

---

## Services & Ports

| Service | Port | Technology | Database | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `3000` | React 18, TypeScript, Responsive CSS | — | Patient & member portal for plans, claims, and ID card |
| **API Gateway** | `3001` | Express, Reverse Proxy, `prom-client` | — | Central entry point; collects HTTP SLA metrics at `/metrics` |
| **Auth Service** | `3002` | Express, bcrypt, JWT, `pg` | `auth_db` | User registration, login, role-based tokens |
| **Policy Service** | `3003` | Express, `pg`, `prom-client` | `policies_db` | Health insurance plans (Bronze, Silver, Gold, Platinum) |
| **Claim Service** | `3004` | Express, `pg`, `prom-client` | `claims_db` | File claims, process hospital invoices, track status |
| **Member Service** | `3005` | Express, `pg`, `prom-client` | `members_db` | Member subscriber records, active policy subscriptions |
| **PostgreSQL** | `5432` | PostgreSQL 15 Alpine | Multi-DB | Relational persistence initialized via scripts |
| **Prometheus** | `9090` | Prometheus TSDB | — | Scrapes performance & error metrics from all services |
| **Grafana** | `3007` | Grafana Dashboard | — | Visualizes real-time request rates, p95 latency, 5xx errors |

---

## 1. Quick Start Locally (Docker Compose)

Running locally is **100% free** and requires no cloud resources.

### Prerequisites
* [Docker Desktop](https://www.docker.com/) / Docker Engine + Compose plugin
* [Git](https://git-scm.com/)

### Start All Services:
```bash
cd projects/health-insurance-microservices
docker compose up -d
```

### Accessing the Applications:
* **Member Portal (React UI)**: [http://localhost:3000](http://localhost:3000)
* **API Gateway & Status**: [http://localhost:3001/api/status](http://localhost:3001/api/status)
* **Prometheus Metrics**: [http://localhost:3001/metrics](http://localhost:3001/metrics)
* **Grafana Dashboard**: [http://localhost:3007](http://localhost:3007) *(Default credentials: `admin` / `admin`)*
* **Prometheus Targets**: [http://localhost:9090/targets](http://localhost:9090/targets)

### Stopping All Services:
```bash
docker compose down
```

---

---

## 2. Infrastructure as Code (Terraform)

Dedicated, modular Terraform configuration is located in [`infrastructure/`](./infrastructure):
* **VPC Module**: Custom `HealthShield-VPC` with 3 Multi-AZ subnets across `us-east-1`.
* **EKS Module**: Kubernetes cluster `healthshield-eks` (v1.34) with managed node group and automated EBS CSI IRSA integration.
* **ECR Module**: Creates 6 dedicated container repositories (`frontend`, `gateway`, `auth`, `policy-service`, `claim-service`, `member-service`).
* **ArgoCD & Monitoring**: Deploys ArgoCD (namespace `argocd`) and Prometheus/Grafana (namespace `monitoring`) via Helm.

### Provisioning Infrastructure on AWS:
```bash
cd projects/health-insurance-microservices/infrastructure
terraform init
terraform apply
```

To tear down after your learning session:
```bash
terraform destroy
```

---

## 3. Deploying to Kubernetes / AWS EKS (GitOps)

### Option A: Automated GitOps via ArgoCD (Recommended)
Once your cloud infrastructure is provisioned by Terraform:
```bash
# Apply the ArgoCD Application manifest to sync from Git automatically:
kubectl apply -f gitops/argo-cd.yml
```

### Option B: Manual Apply via Kustomize
```bash
# Apply all namespace, secrets, database, backend services, frontend, and monitors:
kubectl apply -k gitops/
```

### Option C: Trigger CI/CD Pipeline
Push your changes to GitHub or trigger manually in GitHub Actions (`.github/workflows/ci.yml`). The workflow will:
1. Build all 6 microservice images
2. Push images with the Git commit SHA and `latest` tags to Amazon ECR
3. Update manifests in `gitops/k8s/` and commit them back, prompting ArgoCD to reconcile

---

## 4. AIOps SRE Assistant — Kira

The dedicated SRE assistant located in [`aiops-assistant/`](./aiops-assistant):
* Correlates logs from `/eks/health-insurance/pods`, Prometheus PromQL metrics, and `healthshield-eks` cluster health.
* Powered by **AWS Bedrock Agent** with senior SRE diagnosis protocol.
* Includes **Streamlit Chat UI** (`app.py`) for plain-English incident triage.

### Quick Start with AIOps:
```bash
cd projects/health-insurance-microservices/aiops-assistant
chmod +x setup-iam.sh deploy.sh
./setup-iam.sh
./deploy.sh

# Run the Chat UI:
pip install -r requirements.txt
streamlit run app.py
```

