#!/usr/bin/env bash
# =============================================================================
# HealthShield AIOps Assistant — Bedrock Agent Deployment Script
# =============================================================================

set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AGENT_ROLE_NAME="healthshield-aiops-bedrock-role"
AGENT_NAME="healthshield-aiops-assistant"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "============================================="
echo " HealthShield AIOps — Bedrock Agent Deploy"
echo " Account : $ACCOUNT_ID"
echo " Region  : $REGION"
echo "============================================="
echo ""

AGENT_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${AGENT_ROLE_NAME}"

# Step 1: Bedrock Agent Creation
echo "[1/3] Creating Bedrock Agent: $AGENT_NAME..."

AGENT_INSTRUCTION="You are Kira, a senior Site Reliability Engineer managing the HealthShield health insurance platform on AWS (EKS cluster: healthshield-eks, namespace: health-insurance).

You diagnose production incidents across the HealthShield microservices:
- gateway (Port 3001)
- auth (Port 3002)
- policy-service (Port 3003)
- claim-service (Port 3004)
- member-service (Port 3005)
- postgres (Port 5432)

You have 3 tools:
1. fetch_logs: CloudWatch Logs (/eks/health-insurance/pods)
2. fetch_metrics: Prometheus metrics (pod CPU, memory, restarts, unavailable replicas)
3. fetch_service_health: EKS cluster status, node groups, and crashing pods

Incident Investigation Protocol:
Step 1: Understand the symptom (e.g. 503 errors on claim filing, database connection pool exhaustion).
Step 2: Form a hypothesis.
Step 3: Gather evidence using fetch_logs, fetch_metrics, and fetch_service_health.
Step 4: Diagnose by correlating log stack traces with metrics and pod statuses.
Step 5: Provide root cause, evidence summary, immediate fix, and prevention advice.

Always cite concrete log entries or metric values. Be concise, methodical, and data-driven."

EXISTING_AGENT_ID=$(aws bedrock-agent list-agents \
  --region "$REGION" \
  --query "agentSummaries[?agentName=='$AGENT_NAME'].agentId | [0]" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_AGENT_ID" ] && [ "$EXISTING_AGENT_ID" != "None" ]; then
  AGENT_ID="$EXISTING_AGENT_ID"
  echo "  ✓ Agent already exists: $AGENT_ID"
else
  AGENT_ID=$(aws bedrock-agent create-agent \
    --agent-name "$AGENT_NAME" \
    --agent-resource-role-arn "$AGENT_ROLE_ARN" \
    --foundation-model "qwen.qwen3-32b-v1:0" \
    --instruction "$AGENT_INSTRUCTION" \
    --region "$REGION" \
    --query 'agent.agentId' \
    --output text)
  echo "  ✓ Created Bedrock Agent: $AGENT_ID"
fi

echo ""
echo "============================================="
echo " Bedrock Agent Setup Completed!"
echo " Agent ID: $AGENT_ID"
echo " Save this Agent ID in your .env file."
echo "============================================="
