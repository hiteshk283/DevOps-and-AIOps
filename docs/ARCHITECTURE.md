# HealthShield Enterprise: System Architecture

HealthShield is a cloud-native Health + Insurance microservices platform deployed on **Red Hat OpenShift Container Platform (OCP)** with cloud storage and IAM credentials provisioned via **AWS Terraform**.

---

## 1. High-Level Architecture Diagram

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
                                                  │  (Reverse Proxy/CORS) │
                                                  └───────────┬───────────┘
                                                              │
         ┌────────────┬─────────────┬─────────────┬───────────┴─┬─────────────┬─────────────┬─────────────┐
         │            │             │             │             │             │             │             │
   ┌─────▼────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
   │   Auth   │ │  Policy   │ │   Claim   │ │   Member  │ │  Hospital │ │  Billing  │ │ Document  │ │  Support  │
   │  & KYC   │ │ & Explain │ │  & PreAuth│ │  Service  │ │  Network  │ │ & Payments│ │ & Consent │ │ & JSM Desk│
   │ Port 3002│ │ Port 3003 │ │ Port 3004 │ │ Port 3005 │ │ Port 3008 │ │ Port 3006 │ │ Port 3009 │ │ Port 3010 │
   └─────┬────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
         │            │             │             │             │             │             │             │
   ┌─────▼────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
   │ auth_db  │ │policies_db│ │ claims_db │ │members_db │ │hospitals_db││billing_db ││documents_db││support_db  │
   └──────────┴─┴───────────┴─┴───────────┴─┴───────────┴─┴───────────┴─┴───────────┴─┴───────────┴─┴───────────┘
                                                              │
                                                 ┌────────────▼───────────┐
                                                 │ PostgreSQL (Port 5432) │
                                                 └────────────────────────┘

                                             ═══════════ EVENT STREAMING ═══════════
                                                              │
                                                  ┌───────────▼───────────┐
                                                  │  Apache Kafka (Strimzi│
                                                  │   Port 9092 on OCP)   │
                                                  └───────────┬───────────┘
                                                              │
                                                              ▼ S3 Sink Connector
                                                  ┌───────────────────────┐
                                                  │ AWS S3 Event Archive  │
                                                  │  (794558722040)       │
                                                  └───────────────────────┘
```

---

## 2. Microservices Directory & Port Catalog

| Microservice | Port | Database | Primary Responsibility | Key Files |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `3001` | — | Reverse proxy routing, security headers (`helmet`), `/metrics` telemetry | `backend/services/gateway/src/index.ts` |
| **Auth & Identity** | `3002` | `auth_db` | Mobile OTP, KYC (PAN/Aadhaar), Dependents, Nominees, Bank Accounts, RBAC | `backend/services/auth/src/routes/auth.ts` |
| **Policy Service** | `3003` | `policies_db` | Plain-language definitions, comparison engine, quote calculator, proposals | `backend/services/policy-service/src/routes/policies.ts` |
| **Claims Service** | `3004` | `claims_db` | Cashless pre-auth pipeline, reimbursement filing, rule-based fraud scoring | `backend/services/claim-service/src/routes/claims.ts` |
| **Member Service** | `3005` | `members_db` | Active subscriber policy subscriptions, coverage meters | `backend/services/member-service/src/index.ts` |
| **Billing Service** | `3006` | `billing_db` | UPI/Card checkout, idempotency key checks, 80D tax certificates, Kafka emission | `backend/services/billing-service/src/routes/billing.ts` |
| **Hospital Network** | `3008` | `hospitals_db` | Cashless hospital locator, emergency directory, pre-auth verification | `backend/services/hospital-service/src/routes/hospitals.ts` |
| **Document Vault** | `3009` | `documents_db` | S3 encrypted vault, SHA-256 integrity hashing, granular IRDAI consent records | `backend/services/document-service/src/routes/documents.ts` |
| **Support Desk** | `3010` | `support_db` | Customer grievances, SLA tracking, Jira Service Management (JSM) sync, Splunk | `backend/services/support-service/src/routes/support.ts` |

---

## 3. Storage Architecture

1. **Relational Data (PostgreSQL 15)**:
   - 8 isolated databases initialized via `database/init/10-create-databases.sh` and `database/init/20-init-schema.sql`.
2. **Object Storage (AWS S3 via Terraform)**:
   - `healthshield-kafka-events-794558722040`: S3 bucket partitioned by `year=YYYY/month=MM/` for Kafka event stream.
   - `healthshield-documents-794558722040`: Client-side encrypted document bucket for hospital bills, discharge summaries, and policy certificates.
