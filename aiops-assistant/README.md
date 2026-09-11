# HealthShield AIOps Assistant — Kira

An AI-powered Site Reliability Engineer (SRE) assistant built on **AWS Bedrock Agent**.

Kira actively diagnoses production incidents across the Health Insurance microservices by correlating:
1. **CloudWatch Logs**: `/eks/health-insurance/pods` via [`fetch_logs`](./lambda/fetch_logs/)
2. **Prometheus Metrics**: CPU/Memory spikes and replica availability via [`fetch_metrics`](./lambda/fetch_metrics/)
3. **EKS Health**: `healthshield-eks` cluster state, node groups, and pod crash loops via [`fetch_health`](./lambda/fetch_health/)

---

## Directory Structure

```
aiops-assistant/
├── README.md               # SRE Assistant setup & guide
├── app.py                  # Streamlit chat interface
├── deploy.sh               # Bedrock Agent deployment script
├── setup-iam.sh            # IAM roles & policies provisioning
├── requirements.txt        # Python dependencies (streamlit, boto3, python-dotenv)
├── .env.example            # Environment variables template
├── lambda/
│   ├── fetch_health/       # Checks healthshield-eks & health-insurance namespace
│   ├── fetch_logs/         # Queries CloudWatch Logs for 5xx/timeouts
│   └── fetch_metrics/      # Queries Prometheus range metrics
└── schemas/                # OpenAPI 3.0 schemas for Bedrock Action Groups
    ├── fetch_health.json
    ├── fetch_logs.json
    └── fetch_metrics.json
```

---

## Quick Start

### 1. Provision IAM Roles
```bash
cd projects/health-insurance-microservices/aiops-assistant
chmod +x setup-iam.sh deploy.sh
./setup-iam.sh
```

### 2. Deploy Bedrock Agent
```bash
./deploy.sh
```
*(Copy the printed `Agent ID`)*

### 3. Launch Streamlit UI
```bash
cp .env.example .env
# Edit .env and paste your BEDROCK_AGENT_ID

pip install -r requirements.txt
streamlit run app.py
```
Open **http://localhost:8501** to interact with Kira.
