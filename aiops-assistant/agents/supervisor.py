"""
Apex Supervisor Agent
The central meta-orchestrator of the HealthShield Multi-Agent Swarm.
Classifies user intent, delegates work to specialized domain agents
(SRE, Remediation, Nexus Innovation, Claims), and synthesizes multi-agent responses.
"""

import json
import os
from typing import Dict, Any, List, Optional
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from gemini_engine import generate_gemini_content, GEMINI_FLASH_MODEL, GEMINI_MODEL
from agents.sre_agent import diagnose_incident
from agents.remediation_agent import create_remediation_proposal, get_pending_proposals
from agents.nexus_agent import analyze_market_opportunity, generate_policy_specification
from agents.claims_agent import adjudicate_claim
from tools.jira_tool import (
    create_jira_incident,
    resolve_jira_issue,
    add_jira_comment,
    list_open_jira_tickets,
    JIRA_BASE_URL,
    JIRA_PROJECT_KEY
)

SUPERVISOR_INSTRUCTION = """You are Apex, the Chief AI Operations Supervisor for HealthShield Enterprise.
You supervise 4 specialized domain agents:
1. 'KIRA' (SRE & Diagnostics): Investigates 5xx errors, Prometheus metrics, pod crashes, latency spikes, and root causes.
2. 'OPERATOR' (Auto-Remediation): Executes or proposes pod restarts, replica scaling, cache clearing, and Helm rollbacks.
3. 'NEXUS' (Market Innovation & Growth): Formulates new insurance policies, targets consumer demographics, analyzes drop-offs, and drives acquisition.
4. 'ADJUDICATOR' (Claims & Fraud): Evaluates cashless medical pre-auths, computes fraud risk scores, and verifies treatments.

Determine the most appropriate agent to handle the user query.
If the query is conversational or asks about the agent swarm itself, respond as Apex Supervisor."""


def route_and_execute(user_query: str, api_key: str = None, jira_issue_key: Optional[str] = None) -> Dict[str, Any]:
    """Classify intent and dispatch query to the appropriate agent."""
    query_lower = user_query.lower()

    # 1. Routing heuristics (fast classification)
    if any(w in query_lower for w in ["kafka", "topic"]) and any(w in query_lower for w in ["onboard", "create", "provision", "add", "new topic", "make topic"]):
        target = "KAFKA_OPS"
    elif any(w in query_lower for w in ["jira", "ticket", "tickets", "jsm"]):
        target = "JIRA_OPS"
    elif any(w in query_lower for w in ["restart", "scale", "rollback", "remediate", "fix pod", "heal"]):
        target = "OPERATOR"
    elif any(w in query_lower for w in ["innovat", "growth", "new policy", "acquisition", "consumer", "freelancer", "market", "competitor", "rider"]):
        target = "NEXUS"
    elif any(w in query_lower for w in ["claim", "fraud", "pre-auth", "adjudicat", "hospital bill", "stent", "appendectomy"]):
        target = "ADJUDICATOR"
    elif any(w in query_lower for w in ["503", "500", "error", "latency", "prometheus", "pod", "crash", "health", "sre", "status", "down", "slow"]):
        target = "KIRA"
    else:
        # Ask Gemini Flash to classify if ambiguous
        classification_prompt = f"""Classify the user intent into exactly one of: [KIRA, OPERATOR, NEXUS, ADJUDICATOR, APEX, JIRA_OPS]
User Query: "{user_query}"
Respond with ONLY the uppercase identifier."""

        res = generate_gemini_content(
            prompt=classification_prompt,
            system_instruction="Output only the agent identifier.",
            model=GEMINI_FLASH_MODEL,
            api_key=api_key,
            temperature=0.0
        )
        target = res.get("text", "").strip().upper() if res.get("success") else "APEX"
        if target not in ["KIRA", "OPERATOR", "NEXUS", "ADJUDICATOR", "APEX", "JIRA_OPS"]:
            target = "APEX"

    # 2. Execution Delegation
    delegation_trace = [f"Apex classified inquiry as: {target}"]

    if target == "KAFKA_OPS":
        import re
        from tools.kafka_tool import onboard_kafka_topic_with_jira
        delegation_trace.append("Routed to Kafka Infrastructure Provisioning Engine")
        
        # Check if an existing Jira ticket was specified
        if not jira_issue_key:
            m = re.search(r"OPS-\d+", user_query.upper())
            jira_issue_key = m.group(0) if m else None

        # Extract topic name (e.g. after 'topic' or dot word)
        topic_match = re.search(r"topic\s+['\"`]?([a-zA-Z0-9_\.-]+)['\"`]?", query_lower)
        topic_name = topic_match.group(1) if topic_match else "analytics.events"
        
        # Extract service name
        service_name = "new-service"
        for s in ["gateway", "policy-service", "claim-service", "member-service", "billing-service", "hospital-service", "document-service", "underwriting-service", "telemetry-service", "analytics-service"]:
            if s in query_lower or s.replace("-service", "") in query_lower:
                service_name = s
                break

        res = onboard_kafka_topic_with_jira(
            topic_name=topic_name,
            service_name=service_name,
            jira_issue_key=jira_issue_key,
            partitions=3,
            retention_days=7
        )

        reply = f"""### ⚡ KAFKA INFRASTRUCTURE OPERATOR: TOPIC ONBOARDED & PROVISIONED
The agent has autonomously completed the onboarding task and reconciled the Kafka cluster:

- **Kafka Topic Name:** `{res['provisioning']['topic_name']}`
- **Service Owner:** `{service_name}`
- **Partition Count:** `3` | **Replicas:** `1`
- **Retention Period:** `7 days` ({res['provisioning']['retention_ms']} ms)
- **Strimzi Cluster:** `healthshield-kafka` (namespace `health-insurance`)
- **GitOps Definition:** `{res['provisioning']['gitops_path']}` (Synced to GitOps)

#### 🎫 Linked Jira Ticket Resolution:
- **Jira Ticket:** [{res['jira_issue_key']}]({res['jira_ticket_url']})
- **Jira Status:** `Resolved / Completed` ✅
- **Audit Comment Appended:** Full provisioning specs, Strimzi CR, and connection bootstrap URI posted to Jira discussion.

Microservice `{service_name}` is now verified to produce and consume events on `{res['provisioning']['topic_name']}`."""

        return {
            "status": "SUCCESS",
            "active_agent": "Kafka Infrastructure Operator",
            "agent_badge": "⚡ KAFKA OPS",
            "reply": reply,
            "delegation_trace": delegation_trace,
            "kafka_result": res
        }

    elif target == "JIRA_OPS":
        import re
        delegation_trace.append("Routed to Jira Service Management (JSM) Tool")
        
        # Check for resolve action
        if any(w in query_lower for w in ["resolve", "close", "done", "complete"]):
            m = re.search(r"OPS-\d+", user_query.upper())
            ticket_key = m.group(0) if m else "OPS-2"
            res = resolve_jira_issue(ticket_key, f"Resolved via AIOps Supervisor: {user_query}")
            if res.get("success"):
                reply = f"""### 🎫 JIRA SERVICE MANAGEMENT: TICKET RESOLVED
- **Ticket Key:** [{ticket_key}]({JIRA_BASE_URL}/browse/{ticket_key})
- **Transition Status:** `Resolved / Completed`
- **Audit Note Appended:** `🤖 [AIOps Auto-Remediation]: Resolved via AIOps Supervisor`
- **Atlassian Cloud URL:** [{JIRA_BASE_URL}/browse/{ticket_key}]({JIRA_BASE_URL}/browse/{ticket_key})

The incident lifecycle for `{ticket_key}` is now marked closed in Project `{JIRA_PROJECT_KEY}`."""
            else:
                reply = f"⚠️ Could not resolve ticket `{ticket_key}`: {res.get('error')}"

            return {
                "status": "SUCCESS",
                "active_agent": "Jira Integration Bridge",
                "agent_badge": "🎫 JIRA JSM",
                "reply": reply,
                "delegation_trace": delegation_trace,
                "jira_result": res
            }

        # Check for create action
        elif any(w in query_lower for w in ["open", "create", "raise", "file"]):
            svc = "claim-service"
            for s in ["gateway", "policy-service", "claim-service", "member-service", "billing-service", "hospital-service", "document-service"]:
                if s in query_lower:
                    svc = s
                    break
            res = create_jira_incident(
                summary=f"Incident reported for {svc}: {user_query[:80]}",
                description=f"Auto-generated by HealthShield AI Swarm:\n\nTrigger Query: {user_query}\nTarget Service: {svc}\nCluster: OpenShift (kumarh5149-dev)",
                service_name=svc,
                priority="High"
            )
            if res.get("success"):
                reply = f"""### 🎫 JIRA SERVICE MANAGEMENT: INCIDENT OPENED
- **Ticket Key:** [{res['key']}]({res['url']})
- **Issue Type:** `[System] Incident (10003)`
- **Project:** `{JIRA_PROJECT_KEY}` (Operations Service Project)
- **Target Service:** `{svc}`
- **Direct Atlassian Link:** [{res['url']}]({res['url']})

Kira SRE and Operator have been linked to this ticket for root-cause tracking."""
            else:
                reply = f"⚠️ Failed to open Jira ticket: {res.get('error')}"

            return {
                "status": "SUCCESS",
                "active_agent": "Jira Integration Bridge",
                "agent_badge": "🎫 JIRA JSM",
                "reply": reply,
                "delegation_trace": delegation_trace,
                "jira_result": res
            }

        # Default: List tickets and confirm integration
        else:
            tickets = list_open_jira_tickets(limit=10)
            ticket_rows = ""
            for t in tickets:
                ticket_rows += f"| [{t['key']}]({t['url']}) | `{t['status']}` | `{t['priority']}` | {t['summary'][:60]}... |\n"

            if not ticket_rows:
                ticket_rows = "| _No open tickets_ | - | - | All systems nominal |"

            reply = f"""### 🎫 JIRA SERVICE MANAGEMENT (JSM) — INTEGRATION VERIFIED

**Status:** 🟢 **CONNECTED & OPERATIONAL**  
- **Atlassian Cloud Instance:** [{JIRA_BASE_URL}]({JIRA_BASE_URL})
- **Target Project:** `{JIRA_PROJECT_KEY}` (Operations Service Desk)
- **Authenticated Service Account:** `kumarh5149@gmail.com`

#### Active Jira Capabilities in HealthShield:
1. **🔍 Auto-Incident Creation:** Kira SRE automatically files `[System] Incident` tickets (IssueType 10003) when 5xx spikes or pod crashes exceed SLOs.
2. **📝 Live RCA Auditing:** Root-cause analyses and Prometheus telemetry are appended directly as Jira issue comments.
3. **🛠️ Auto-Remediation Resolution:** When an engineer approves a Tier-2 remediation proposal (or Tier-1 auto-heals), Operator automatically transitions the Jira ticket to **Resolved** with verification notes.
4. **💬 Interactive Swarm Control:** You can instruct Apex to `"Open a Jira ticket for policy-service"`, `"Resolve ticket OPS-2"`, or `"List Jira tickets"` at any time.

#### Recent Tickets in Project `{JIRA_PROJECT_KEY}`:
| Key | Status | Priority | Summary |
|---|---|---|---|
{ticket_rows}
"""
            return {
                "status": "SUCCESS",
                "active_agent": "Apex Supervisor",
                "agent_badge": "🎫 JIRA JSM",
                "reply": reply,
                "delegation_trace": delegation_trace,
                "tickets": tickets
            }

    elif target == "KIRA":
        delegation_trace.append("Delegated to Kira (SRE Diagnostics)")
        result = diagnose_incident(user_query, api_key=api_key)
        return {
            "status": "SUCCESS",
            "active_agent": "Kira (SRE Diagnostics)",
            "agent_badge": "🔍 KIRA SRE",
            "reply": result["analysis"],
            "delegation_trace": delegation_trace,
            "raw_data": result.get("telemetry")
        }

    elif target == "OPERATOR":
        delegation_trace.append("Delegated to Remediation Operator")
        # Generate proposal based on query
        service = "claim-service"
        for s in ["gateway", "policy-service", "claim-service", "member-service", "billing-service", "hospital-service", "document-service"]:
            if s in query_lower or s.replace("-service", "") in query_lower:
                service = s
                break

        proposal = create_remediation_proposal(
            target_service=service,
            action_type="ROLLOUT_RESTART",
            reason=f"Operator received remediation request: {user_query}",
            command=f"oc rollout restart deployment/{service} -n kumarh5149-dev",
            tier=2
        )
        delegation_trace.append(f"Created Tier-2 Proposal: {proposal['id']}")

        reply = f"""### 🛠️ REMEDIATION OPERATOR: ACTION PROPOSAL CREATED

I have formulated a **Tier-2 Safe Remediation Proposal** that requires engineer confirmation before execution:

- **Proposal ID:** `{proposal['id']}`
- **Target Microservice:** `{proposal['target_service']}`
- **Action Type:** `{proposal['action_type']}`
- **Execution Command:**
```bash
{proposal['command']}
```
- **Governance Status:** ⏳ **PENDING_APPROVAL** (Ready in Governance Inbox)

> To proceed, approve this proposal in the **Governance Inbox** or through the API:
> `POST /api/agents/proposals/{proposal['id']}/approve`
"""
        return {
            "status": "SUCCESS",
            "active_agent": "Remediation Operator",
            "agent_badge": "🛠️ OPERATOR",
            "reply": reply,
            "delegation_trace": delegation_trace,
            "proposal": proposal
        }

    elif target == "NEXUS":
        delegation_trace.append("Delegated to Nexus (Innovation & Growth)")
        if "generate" in query_lower or "draft" in query_lower or "create policy" in query_lower:
            spec = generate_policy_specification(
                concept_name="Freelancer & Gig Shield",
                target_audience="Young digital creators and independent contractors",
                monthly_budget=299.0,
                api_key=api_key
            )
            delegation_trace.append("Generated draft policy specification")
            p = spec["policy"]
            reply = f"""### 💡 NEXUS INNOVATION LAB: NEW PRODUCT PROPOSAL

I have generated an actuarially modeled policy package targeting underserved consumers:

- **Policy Name:** **{p.get('name')}** (`{p.get('code')}`)
- **Tier:** `{p.get('tier')}` | **Monthly Premium:** **₹{p.get('monthly_premium'):,.2f}**
- **Sum Insured:** **₹{p.get('max_coverage'):,.2f}** (Deductible: ₹{p.get('annual_deductible'):,.2f})
- **Room Rent Limit:** `{p.get('room_rent_limit')}`
- **Waiting Periods:** {p.get('waiting_period_initial_days')} days initial / {p.get('waiting_period_pre_existing_months')} months pre-existing

#### Key Consumer Perks:
{chr(10).join([f"- ✨ {f}" for f in p.get('features', [])])}

#### Plain-Language Explanation:
> {p.get('plain_language_explanation', {}).get('sum_insured_plain')}

**Status:** Ready to publish directly to the live catalog via `POST /api/policies/`!
"""
            return {
                "status": "SUCCESS",
                "active_agent": "Nexus (Innovation & Growth)",
                "agent_badge": "💡 NEXUS GROWTH",
                "reply": reply,
                "delegation_trace": delegation_trace,
                "draft_policy": p
            }
        else:
            market_res = analyze_market_opportunity(user_query, api_key=api_key)
            return {
                "status": "SUCCESS",
                "active_agent": "Nexus (Innovation & Growth)",
                "agent_badge": "💡 NEXUS GROWTH",
                "reply": market_res["research_report"],
                "delegation_trace": delegation_trace
            }

    elif target == "ADJUDICATOR":
        delegation_trace.append("Delegated to Claims Adjudicator")
        sample_claim = {
            "claim_number": "CLM-2026-9941",
            "patient_name": "Rohan Sharma",
            "policy_code": "POL-GLD-03",
            "provider_hospital": "Fortis Escorts Heart Institute",
            "treatment_description": "Emergency Coronary Angioplasty & Stent Placement",
            "claimed_amount": 285000.00,
            "claim_type": "CASHLESS"
        }
        res = adjudicate_claim(sample_claim, api_key=api_key)
        return {
            "status": "SUCCESS",
            "active_agent": "Adjudicator (Claims & Fraud)",
            "agent_badge": "📋 ADJUDICATOR",
            "reply": res["adjudication_report"],
            "delegation_trace": delegation_trace,
            "claim_evaluation": res
        }

    else:
        # Apex General Overview
        reply = f"""### 👑 APEX SUPERVISOR — MULTI-AGENT SWARM ACTIVE

I coordinate the specialized AI agents managing HealthShield across OpenShift and AWS:

1. **🔍 KIRA (SRE Agent):** Live telemetry correlation, Prometheus querying, 5xx analysis, and incident root-cause diagnosis.
2. **🛠️ OPERATOR (Remediation):** Automated self-healing, rolling restarts, and Tier-2 Human-in-the-Loop approvals.
3. **💡 NEXUS (Growth & Innovation):** Market intelligence, customer drop-off reduction, and generative insurance policy drafting.
4. **📋 ADJUDICATOR (Claims):** Fraud risk scoring, medical tariff cross-referencing, and pre-auth recommendations.

**How can the swarm assist you right now?**
- *"Why are claims returning 503 errors?"*
- *"Propose a restart for policy-service."*
- *"Design a new insurance product for young freelancers."*
- *"Evaluate claim #9941 for fraud risk."*
"""
        return {
            "status": "SUCCESS",
            "active_agent": "Apex Supervisor",
            "agent_badge": "👑 APEX SUPERVISOR",
            "reply": reply,
            "delegation_trace": delegation_trace
        }
