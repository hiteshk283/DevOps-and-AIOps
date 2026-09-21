# HealthShield — Enterprise Health Insurance Microservices Platform

A cloud-native, production-ready **Health Insurance Microservices Ecosystem** running on **Red Hat OpenShift Container Platform (OCP)**, featuring zero-cost log analytics via **Grafana Loki**, live **Jira Service Management (JSM)** integration, **Kafka event streaming** to AWS S3, and GitOps/CI/CD automated via **Helm**, **Jenkins**, and **GitHub Actions**.

---

## Architecture Diagram

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │           Unified React Web Portal (Port 3000)         │
                                  │      [👤 Customer]   [🏥 Hospital/TPA]   [⚙️ Claims]    │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ HTTPS (OpenShift Route)
                                                              ▼
                                                  ┌───────────────────────┐
                                                  │  API Gateway Service  │
                                                  │       Port 3001       │
                                                  │ (Prometheus /metrics) │
                                                  └───────────┬───────────┘
                                                              │
         ┌────────────┬─────────────┬─────────────┬───────────┴─┬─────────────┬─────────────┬─────────────┐
         │            │             │             │             │             │             │             │
   ┌─────▼────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
   │   Auth   │ │  Policy   │ │   Claim   │ │   Member  │ │  Hospital │ │  Billing  │ │ Document  │ │  Support  │
   │  & KYC   │ │ & Explain │ │  & PreAuth│ │  Service  │ │  Network  │ │ & Payments│ │ & Consent │ │& Jira/Loki│
   │ Port 3002│ │ Port 3003 │ │ Port 3004 │ │ Port 3005 │ │ Port 3008 │ │ Port 3006 │ │ Port 3009 │ │ Port 3010 │
   └────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
        │             │             │             │             │             │             │             │
        └─────────────┴─────────────┴──────┬──────┴─────────────┴─────────────┴─────────────┴─────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │   PostgreSQL Relational Storage     │
                        │       Multi-Database (Port 5432)    │
                        └──────────────────┬──────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌─────────────────┐             ┌─────────────────────┐             ┌─────────────────┐
│ Apache Kafka &  │             │    Grafana Loki     │             │  Jira Service   │
│ S3 Sink Connect │             │  Zero-Cost Log Lake │             │   Management    │
│  (AWS S3 Vault) │             │     (Port 3100)     │             │  (Atlassian JSM)│
└─────────────────┘             └─────────────────────┘             └─────────────────┘
```

---

## Services & Ports Catalog

| Service | Port | Technology | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | `3000` | React 18, TypeScript, Vanilla CSS | Unified portal for Patients, Hospital Desk, Claims Adjudicators, and Support. |
| **API Gateway** | `3001` | Express, Reverse Proxy, Prometheus | Rate limiting, unified routing, request tracing, and Prometheus metrics. |
| **Auth & KYC** | `3002` | Express, bcrypt, JWT, Postgres | Customer & Hospital registration, Aadhaar/PAN mock verification, RBAC. |
| **Policy Service** | `3003` | Express, Postgres, Explainability Engine | Tiered policy catalog (Bronze/Silver/Gold/Platinum), waiting period calculations. |
| **Claim Service** | `3004` | Express, Postgres, Pre-Auth Engine | Cashless pre-authorizations, OPD/IPD reimbursements, adjudicator review. |
| **Member Service** | `3005` | Express, Postgres | Subscriber profiles, dependent coverage, active policy bindings. |
| **Billing Service** | `3006` | Express, Postgres, Idempotency Keys | UPI/Card checkout, Section 80D tax receipts, refund handling. |
| **Hospital Service** | `3008` | Express, Postgres, Geo/City Filter | Cashless hospital directory, specialty filtering, emergency tiering. |
| **Document Service** | `3009` | Express, S3 Vault, Crypto Checksums | SHA-256 encrypted storage for medical bills & IRDAI-compliant consent tracking. |
| **Support Service** | `3010` | Express, JSM REST API, Loki Push API | Live ticketing on Atlassian Jira Service Management & real-time log ingestion to Loki. |

---

## Operational Runbooks & Documentation

All technical deep dives, flowcharts, credentials mappings, and command histories are stored in [`docs/`](./docs):

| Document | Description |
| :--- | :--- |
| **[docs/COMMANDS_USED_TODAY.md](./docs/COMMANDS_USED_TODAY.md)** | **Master runbook containing all commands executed today across AWS, OpenShift, Helm, Docker, Git, and cURL.** |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Comprehensive architectural breakdown, database schemas, and networking topology. |
| **[docs/OPENSHIFT_DEPLOYMENT.md](./docs/OPENSHIFT_DEPLOYMENT.md)** | OpenShift deployment runbook, Helm install/uninstall, and Jenkins start/stop commands. |
| **[docs/APPLICATION_FLOWS.md](./docs/APPLICATION_FLOWS.md)** | End-to-end user journeys (Policy purchase, Cashless Pre-Auth, Reimbursements, JSM Support). |
| **[docs/INTEGRATIONS_AND_SECRETS.md](./docs/INTEGRATIONS_AND_SECRETS.md)** | Exact secret keys, file locations, line numbers, and API endpoints for Jira, Loki, S3, and DB. |
| **[docs/TERRAFORM_AWS.md](./docs/TERRAFORM_AWS.md)** | Terraform AWS infrastructure specifications and $0 cost destruction guide. |
| **[docs/KAFKA_S3_CONNECTOR.md](./docs/KAFKA_S3_CONNECTOR.md)** | Strimzi Kafka Connect configuration with AWS S3 Sink Connector. |

---

## 1. Red Hat OpenShift & Helm Deployment

The entire HealthShield platform is packaged into a production-ready Helm chart located in [`charts/healthshield/`](./charts/healthshield).

### Deploy via Helm:
```bash
# Render and dry-run test
helm template healthshield ./charts/healthshield --namespace kumarh5149-dev --set global.imageTag=latest

# Deploy or upgrade all microservices
helm upgrade --install healthshield ./charts/healthshield --namespace kumarh5149-dev --set global.imageTag=latest

# Uninstall all microservices
helm uninstall healthshield --namespace kumarh5149-dev
```

---

## 2. Managing Jenkins on OpenShift (Zero Data Loss)

Jenkins runs inside your OpenShift Developer Sandbox namespace (`kumarh5149-dev`) backed by an AWS EBS Persistent Volume Claim (`jenkins` PVC, 1Gi `gp3`):

### Stop Jenkins (Save Quota / CPU / RAM):
```bash
oc scale dc/jenkins --replicas=0 -n kumarh5149-dev
```
*The pod shuts down, releasing all compute resources. All job configurations, credentials, and build history remain safely stored on the EBS volume.*

### Resume Jenkins:
```bash
oc scale dc/jenkins --replicas=1 -n kumarh5149-dev
```
*OpenShift remounts the PVC instantly and restores Jenkins to full operation.*

---

## 3. GitHub Actions CI Pipeline

The GitHub Actions workflow is located at [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

* **Trigger Mode**: Configured strictly for **Manual Execution (`workflow_dispatch`)**. It will never run automatically on code push or pull request merge.
* **To Trigger**:
  1. Open your repository on GitHub.
  2. Go to **Actions** → **HealthShield CI Pipeline**.
  3. Click **Run workflow**, select your branch (`feature` or `main`), and run.

---

## 4. AWS Infrastructure as Code & $0 Cost Management

AWS infrastructure is codified via Terraform in [`infrastructure/`](./infrastructure):
* **S3 Buckets**: `healthshield-documents-794558722040`, `healthshield-kafka-events-794558722040`.
* **ECR Repositories**: 10 container repositories for microservices.
* **IAM**: Scoped connector user and least-privilege S3 policy.

### Complete AWS Teardown ($0 Guarantee):
```bash
cd infrastructure
terraform destroy -auto-approve
```

Verify zero lingering resources:
```bash
aws s3 ls
aws ecr describe-repositories --region us-east-1
aws iam list-users --query 'Users[?contains(UserName, `healthshield`)].UserName'
terraform show
```
*(All checks confirm 0 resources tracked, guaranteeing $0.00 ongoing AWS expenditure).*
