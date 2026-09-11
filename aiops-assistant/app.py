"""
HealthShield AIOps Assistant — Streamlit Chat UI
Supports Dual AI Backends:
  1. Google Antigravity / Gemini Engine (Fast, Local & Free, No AWS charges)
  2. AWS Bedrock Agent (Kira)
"""

import streamlit as st
import boto3
import uuid
import json
import os
from dotenv import load_dotenv
from antigravity_agent import invoke_antigravity_agent

load_dotenv()

# Config from environment
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AGENT_ID = os.getenv("BEDROCK_AGENT_ID")
AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID")
ANTIGRAVITY_API_KEY = os.getenv("ANTIGRAVITY_API_KEY") or os.getenv("GEMINI_API_KEY")

st.set_page_config(
    page_title="HealthShield — AIOps SRE Assistant",
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
        padding: 1rem 0;
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
        margin-bottom: 1.2rem;
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
</style>
""", unsafe_allow_html=True)

# Sidebar Configuration
with st.sidebar:
    st.image("https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Kubernetes.svg", width=50)
    st.title("SRE Agent Settings")
    
    engine_choice = st.radio(
        "Select AI Backend Engine:",
        ["⚡ Antigravity / Gemini Engine", "☁️ AWS Bedrock Agent (Kira)"],
        index=0,
        help="Antigravity runs locally/via Gemini API without AWS Bedrock costs. AWS Bedrock connects to your cloud agent."
    )
    
    st.divider()
    if "Antigravity" in engine_choice:
        st.subheader("⚡ Antigravity Configuration")
        api_key_input = st.text_input("Antigravity / Gemini API Key (Optional):", value=ANTIGRAVITY_API_KEY or "", type="password")
        st.caption("Works offline in smart diagnostic mode even without an API key.")
    else:
        st.subheader("☁️ AWS Bedrock Configuration")
        st.write(f"Region: `{AWS_REGION}`")
        st.write(f"Agent ID: `{AGENT_ID or 'Not Set'}`")

if "messages" not in st.session_state:
    st.session_state.messages = []
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

@st.cache_resource
def get_bedrock_client():
    kwargs = {"service_name": "bedrock-agent-runtime", "region_name": AWS_REGION}
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
        if AWS_SESSION_TOKEN:
            kwargs["aws_session_token"] = AWS_SESSION_TOKEN
    return boto3.client(**kwargs)

def invoke_bedrock(prompt: str) -> str:
    if not (AGENT_ID and AGENT_ALIAS_ID):
        return "⚠️ AWS Bedrock Agent is not configured. Set BEDROCK_AGENT_ID and BEDROCK_AGENT_ALIAS_ID in `.env`, or switch to the Antigravity Engine in the sidebar."
    client = get_bedrock_client()
    try:
        response = client.invoke_agent(
            agentId=AGENT_ID,
            agentAliasId=AGENT_ALIAS_ID,
            sessionId=st.session_state.session_id,
            inputText=prompt,
        )
        full_response = ""
        for event in response["completion"]:
            if "chunk" in event and "bytes" in event["chunk"]:
                full_response += event["chunk"]["bytes"].decode("utf-8")
        return full_response
    except Exception as e:
        return f"⚠️ Error invoking Bedrock Agent: {str(e)}"

# Header
st.markdown("""
<div class="main-header">
    <h1>🛡️ KIRA — HealthShield SRE Assistant</h1>
    <p>Automated Root Cause Analysis Engine for Health Insurance Microservices</p>
</div>
""", unsafe_allow_html=True)

# Active Status Bar
is_antigravity = "Antigravity" in engine_choice
st.markdown(f"""
<div class="status-bar">
    <div class="status-dot"></div>
    <span style="color: #38bdf8;">ACTIVE ENGINE: {'ANTIGRAVITY SRE ENGINE' if is_antigravity else 'AWS BEDROCK (KIRA)'}</span>
    <span style="color: #334155;">|</span>
    <span style="color: #94a3b8;">Cluster: healthshield-eks</span>
    <span style="color: #334155;">|</span>
    <span style="color: #94a3b8;">Namespace: health-insurance</span>
</div>
""", unsafe_allow_html=True)

# Quick Inquiries
st.markdown("##### 🔍 Quick Diagnostic Inquiries:")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Check pod & deployment health"):
        st.session_state.prompt_input = "Are all health-insurance pods and deployments healthy in healthshield-eks?"
with col2:
    if st.button("Investigate claim 503 errors"):
        st.session_state.prompt_input = "Why are users getting 503 errors when submitting medical claims?"
with col3:
    if st.button("Check database connections"):
        st.session_state.prompt_input = "Check database latency and connection pool status for policies_db and claims_db."

# Render Chat History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

user_input = st.chat_input("Ask Kira to investigate logs, metrics, or cluster health...")

if "prompt_input" in st.session_state and st.session_state.prompt_input:
    user_input = st.session_state.prompt_input
    st.session_state.prompt_input = None

if user_input:
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        spinner_msg = "Antigravity is querying telemetry and diagnosing..." if is_antigravity else "Kira is invoking Bedrock Agent..."
        with st.spinner(spinner_msg):
            if is_antigravity:
                api_k = api_key_input if "api_key_input" in locals() and api_key_input else None
                reply = invoke_antigravity_agent(user_input, api_key=api_k)
            else:
                reply = invoke_bedrock(user_input)
            st.markdown(reply)
            st.session_state.messages.append({"role": "assistant", "content": reply})
