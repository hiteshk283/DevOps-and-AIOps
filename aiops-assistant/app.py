"""
HealthShield AIOps Multi-Agent Swarm Console
Interactive Streamlit Mission Control Center
Powered by Google Gemini Models & AWS Bedrock
Agents: Apex Supervisor, Kira (SRE), Operator (Remediation), Nexus (Innovation), Adjudicator (Claims)
"""

import streamlit as st
import uuid
import json
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from agents.supervisor import route_and_execute
from agents.sre_agent import diagnose_incident, get_system_telemetry
from agents.remediation_agent import get_pending_proposals, approve_proposal, reject_proposal
from agents.nexus_agent import analyze_market_opportunity, generate_policy_specification, publish_policy_to_catalog
from agents.claims_agent import adjudicate_claim

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("ANTIGRAVITY_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
NAMESPACE = os.getenv("K8S_NAMESPACE", "kumarh5149-dev")

st.set_page_config(
    page_title="HealthShield — Multi-Agent Swarm",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap');

    .stApp {
        background-color: #070b14;
        color: #f8fafc;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .main-header {
        padding: 0.8rem 0;
        border-bottom: 1px solid #1e293b;
        margin-bottom: 1rem;
    }
    .main-header h1 {
        font-family: 'JetBrains Mono', monospace;
        color: #38bdf8;
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0;
    }
    .main-header p {
        color: #94a3b8;
        font-size: 0.85rem;
        margin-top: 0.3rem;
    }

    .status-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
    }
    .status-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 8px #10b981;
    }
    .agent-chip {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #1e293b;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        color: #38bdf8;
        margin-right: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.image("https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Kubernetes.svg", width=45)
    st.title("🛡️ Swarm Settings")
    
    st.caption(f"Cluster: **OpenShift (OCP)** | Namespace: `{NAMESPACE}`")
    
    engine_choice = st.radio(
        "Foundational LLM Engine:",
        ["⚡ Google Gemini Swarm", "☁️ AWS Bedrock Agent (Legacy)"],
        index=0
    )
    
    st.divider()
    api_key_input = st.text_input(
        "Gemini API Key (Optional):",
        value=GEMINI_API_KEY or "",
        type="password",
        help="Works automatically in offline heuristic diagnostic & simulation mode if empty."
    )
    
    st.markdown("##### 🤖 Active Agents in Swarm:")
    st.markdown("• **👑 Apex Supervisor** (Orchestrator)")
    st.markdown("• **🔍 Kira SRE** (Incident Diagnostics)")
    st.markdown("• **🛠️ Operator** (Auto-Remediation)")
    st.markdown("• **💡 Nexus** (Innovation & Growth)")
    st.markdown("• **📋 Adjudicator** (Claims & Fraud)")
    
    pending_count = len(get_pending_proposals())
    if pending_count > 0:
        st.warning(f"⚠️ {pending_count} Tier-2 Action(s) Pending Approval!")

# Header
st.markdown("""
<div class="main-header">
    <h1>🛡️ HEALTHSHIELD — MULTI-AGENT AIOPS MISSION CONTROL</h1>
    <p>Autonomous SRE Operations, Auto-Remediation, and Market Growth Swarm</p>
</div>
""", unsafe_allow_html=True)

st.markdown(f"""
<div class="status-bar">
    <div class="status-dot"></div>
    <span style="color: #38bdf8;">SWARM ACTIVE: 5 SPECIALIZED AGENTS ONLINE</span>
    <span style="color: #334155;">|</span>
    <span style="color: #94a3b8;">Compute: Red Hat OpenShift ({NAMESPACE})</span>
    <span style="color: #334155;">|</span>
    <span style="color: #94a3b8;">Storage: AWS S3 + Postgres</span>
</div>
""", unsafe_allow_html=True)

# Tabs
tab_chat, tab_sre, tab_nexus, tab_governance = st.tabs([
    "💬 Swarm Command Center",
    "🔍 Kira SRE Incident Desk",
    "💡 Nexus Innovation Lab",
    f"⏳ Governance & Approvals ({pending_count})"
])

# ------------------------------------------------------------------------------
# TAB 1: Swarm Command Center
# ------------------------------------------------------------------------------
with tab_chat:
    st.markdown("##### 🔍 Quick Multi-Agent Inquiries:")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        if st.button("Diagnose 503 Claim Errors", use_container_width=True):
            st.session_state.prompt_input = "Why are users getting 503 errors when submitting claims to claim-service?"
    with col2:
        if st.button("Propose Pod Rollout Restart", use_container_width=True):
            st.session_state.prompt_input = "Propose a rollout restart for claim-service deployment in OpenShift."
    with col3:
        if st.button("Draft Freelancer Policy (Nexus)", use_container_width=True):
            st.session_state.prompt_input = "Nexus, generate an affordable health policy for young freelancers with dental coverage."
    with col4:
        if st.button("Audit High-Value Cardiac Claim", use_container_width=True):
            st.session_state.prompt_input = "Adjudicate a claim for Emergency Angioplasty of ₹2,85,000 for patient Rohan Sharma."

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            if "badge" in msg:
                st.markdown(f"<span class='agent-chip'>{msg['badge']}</span>", unsafe_allow_html=True)
            st.markdown(msg["content"])

    user_input = st.chat_input("Ask any agent in the swarm (SRE, Remediation, Innovation, Claims)...")
    if "prompt_input" in st.session_state and st.session_state.prompt_input:
        user_input = st.session_state.prompt_input
        st.session_state.prompt_input = None

    if user_input:
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        with st.chat_message("assistant"):
            with st.spinner("Apex Supervisor is coordinating the swarm..."):
                response = route_and_execute(user_input, api_key=api_key_input)
                badge = response.get("agent_badge", "👑 APEX")
                reply = response.get("reply", "No response generated.")

                st.markdown(f"<span class='agent-chip'>{badge}</span>", unsafe_allow_html=True)
                st.markdown(reply)

                st.session_state.messages.append({
                    "role": "assistant",
                    "content": reply,
                    "badge": badge
                })

# ------------------------------------------------------------------------------
# TAB 2: Kira SRE Incident Desk
# ------------------------------------------------------------------------------
with tab_sre:
    st.subheader("🔍 Live Cluster Telemetry & SRE Probes")
    telemetry = get_system_telemetry()

    # Metric summary row
    m_col1, m_col2, m_col3 = st.columns(3)
    with m_col1:
        st.metric("Monitored Microservices", "9 Services", "All Probed")
    with m_col2:
        st.metric("OpenShift Namespace", NAMESPACE, "Active")
    with m_col3:
        st.metric("PostgreSQL Database", "Port 5432", "Online")

    st.markdown("##### Microservice Health Check Grid:")
    probes = telemetry.get("service_health_probes", {})
    cols = st.columns(3)
    for idx, (svc_name, data) in enumerate(probes.items()):
        c = cols[idx % 3]
        status = data.get("status")
        is_healthy = status == "HEALTHY"
        c.markdown(f"""
        <div style="padding: 0.5rem; background: #0f172a; border-radius: 6px; border-left: 4px solid {'#10b981' if is_healthy else '#ef4444'}; margin-bottom: 0.5rem;">
            <strong>{svc_name}</strong><br/>
            <span style="font-size: 0.8rem; color: #94a3b8;">Status: {status} ({data.get('latency_ms', 0)}ms)</span>
        </div>
        """, unsafe_allow_html=True)

    if st.button("🚀 Trigger Full Automated SRE Root Cause Diagnosis"):
        with st.spinner("Kira is correlating metrics and generating RCA..."):
            diag = diagnose_incident("Full cluster health assessment", api_key=api_key_input)
            st.markdown(diag["analysis"])

# ------------------------------------------------------------------------------
# TAB 3: Nexus Innovation Lab
# ------------------------------------------------------------------------------
with tab_nexus:
    st.subheader("💡 Nexus Market Innovation & Consumer Growth Lab")
    st.write("Formulate data-backed insurance products to capture underserved market demographics.")

    inno_topic = st.text_input(
        "Enter Target Demographic or Policy Concept:",
        value="Tier-2/3 City Families seeking OPD & Dengue Monsoon Shield"
    )
    target_budget = st.slider("Target Monthly Premium (₹):", min_value=99, max_value=1499, value=349, step=50)

    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        if st.button("📊 Conduct Market Research & Persona Simulation", use_container_width=True):
            with st.spinner("Nexus is researching competitors and running synthetic persona swarm..."):
                res = analyze_market_opportunity(inno_topic, api_key=api_key_input)
                st.markdown(res["research_report"])

    with col_btn2:
        if st.button("🛠️ Draft Policy Specification Schema", use_container_width=True):
            with st.spinner("Nexus is formulating policy schema and plain-language clauses..."):
                spec = generate_policy_specification(inno_topic, inno_topic, monthly_budget=target_budget, api_key=api_key_input)
                policy_obj = spec["policy"]
                st.session_state.drafted_policy = policy_obj
                st.json(policy_obj)

    if "drafted_policy" in st.session_state and st.session_state.drafted_policy:
        st.success("Draft policy package generated!")
        if st.button(f"🚀 Publish {st.session_state.drafted_policy.get('code')} to Live Policy Service Catalog"):
            pub_res = publish_policy_to_catalog(st.session_state.drafted_policy)
            st.success(pub_res["message"])

# ------------------------------------------------------------------------------
# TAB 4: Governance & Approvals
# ------------------------------------------------------------------------------
with tab_governance:
    st.subheader("⏳ Human-in-the-Loop Governance Inbox")
    st.write("High-impact cluster changes (Tier-2) require human engineer approval before execution.")

    proposals = get_pending_proposals()
    if not proposals:
        st.info("✅ No pending remediation proposals. All systems running safely within autonomous bounds.")
    else:
        for prop in proposals:
            with st.expander(f"⚠️ Action Required: {prop['action_type']} on {prop['target_service']} ({prop['id']})", expanded=True):
                st.markdown(f"**Reason:** {prop['reason']}")
                st.markdown(f"**Target Microservice:** `{prop['target_service']}`")
                st.code(prop["command"], language="bash")
                st.caption(f"Created At: {prop['created_at']}")

                col_a, col_r = st.columns(2)
                with col_a:
                    if st.button("✅ Approve & Execute", key=f"app_{prop['id']}"):
                        res = approve_proposal(prop["id"])
                        st.success(res.get("message", "Executed successfully"))
                        st.rerun()
                with col_r:
                    if st.button("❌ Reject Action", key=f"rej_{prop['id']}"):
                        reject_proposal(prop["id"])
                        st.warning("Proposal rejected and archived.")
                        st.rerun()
