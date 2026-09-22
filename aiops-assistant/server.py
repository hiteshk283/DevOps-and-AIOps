"""
HealthShield AIOps Multi-Agent Swarm Server
Headless REST service on Port 3011.
Supports both FastAPI (when installed) and a built-in standard library HTTP server fallback,
ensuring zero crashes and 100% portable execution anywhere.
"""

import json
import os
import sys
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, Optional

from agents.supervisor import route_and_execute
from agents.sre_agent import diagnose_incident, get_system_telemetry
from agents.remediation_agent import (
    create_remediation_proposal,
    get_pending_proposals,
    approve_proposal,
    reject_proposal
)
from agents.nexus_agent import (
    analyze_market_opportunity,
    generate_policy_specification,
    publish_policy_to_catalog
)
from agents.claims_agent import adjudicate_claim
from tools.jira_tool import (
    list_open_jira_tickets,
    create_jira_incident,
    resolve_jira_issue,
    add_jira_comment
)
from tools.jira_worker import (
    poll_and_process_tickets,
    start_jira_worker_daemon
)

# Check for FastAPI availability
try:
    from fastapi import FastAPI, HTTPException, Body
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


# ==============================================================================
# 1. FASTAPI IMPLEMENTATION (Preferred)
# ==============================================================================
if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="HealthShield AIOps Swarm API",
        description="Multi-Agent AI Autonomous Operations & Innovation Service",
        version="2.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class ChatRequest(BaseModel):
        query: str
        api_key: Optional[str] = None

    class ProposalActionRequest(BaseModel):
        reason: Optional[str] = "Approved by operator"

    class InnovateRequest(BaseModel):
        topic: str
        budget: Optional[float] = 299.0
        api_key: Optional[str] = None

    @app.get("/")
    @app.get("/health")
    def health_check():
        return {
            "status": "HEALTHY",
            "service": "aiops-assistant",
            "version": "2.0.0",
            "mode": "FastAPI",
            "swarm_status": "ONLINE"
        }

    @app.get("/api/agents/status")
    def get_agents_status():
        return {
            "swarm": "HealthShield Autonomous Multi-Agent System",
            "agents": [
                {"id": "apex-supervisor", "name": "Apex Supervisor", "badge": "👑 APEX", "role": "Orchestrator & Intent Router", "status": "ACTIVE"},
                {"id": "kira-sre", "name": "Kira", "badge": "🔍 KIRA SRE", "role": "Diagnostics & Incident RCA", "status": "MONITORING"},
                {"id": "remediation-operator", "name": "Remediation Operator", "badge": "🛠️ OPERATOR", "role": "Cluster Auto-Healing (Tier 1 & 2)", "status": "READY"},
                {"id": "nexus-innovation", "name": "Nexus", "badge": "💡 NEXUS GROWTH", "role": "Consumer Acquisition & Product R&D", "status": "IDLE"},
                {"id": "claims-adjudicator", "name": "Adjudicator", "badge": "📋 ADJUDICATOR", "role": "Fraud Risk & Medical Validation", "status": "READY"}
            ],
            "telemetry_summary": get_system_telemetry()
        }

    @app.post("/api/agents/chat")
    def handle_chat(req: ChatRequest):
        if not req.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty.")
        return route_and_execute(req.query, api_key=req.api_key)

    @app.post("/api/agents/sre/diagnose")
    def trigger_sre_diagnose(req: ChatRequest):
        return diagnose_incident(req.query, api_key=req.api_key)

    @app.post("/api/agents/nexus/innovate")
    def trigger_nexus_innovate(req: InnovateRequest):
        research = analyze_market_opportunity(req.topic, api_key=req.api_key)
        spec = generate_policy_specification(
            concept_name=req.topic,
            target_audience=req.topic,
            monthly_budget=req.budget or 299.0,
            api_key=req.api_key
        )
        return {
            "market_research": research,
            "draft_policy": spec.get("policy")
        }

    @app.post("/api/agents/nexus/publish")
    def trigger_nexus_publish(policy: Dict[str, Any] = Body(...)):
        return publish_policy_to_catalog(policy)

    @app.get("/api/agents/proposals")
    def list_proposals():
        return get_pending_proposals()

    @app.post("/api/agents/proposals/{proposal_id}/approve")
    def approve_remediation_proposal(proposal_id: str):
        result = approve_proposal(proposal_id)
        if not result.get("success") and "not found" in result.get("error", ""):
            raise HTTPException(status_code=404, detail=result.get("error"))
        return result

    @app.post("/api/agents/proposals/{proposal_id}/reject")
    def reject_remediation_proposal(proposal_id: str, req: ProposalActionRequest):
        result = reject_proposal(proposal_id, reason=req.reason or "Rejected by engineer")
        if not result.get("success"):
            raise HTTPException(status_code=404, detail=result.get("error"))
        return result

    @app.post("/api/agents/claims/adjudicate")
    def evaluate_claim(claim_data: Dict[str, Any] = Body(...), api_key: Optional[str] = None):
        return adjudicate_claim(claim_data, api_key=api_key)

    @app.get("/api/agents/jira/tickets")
    def get_jira_tickets(limit: int = 15):
        return list_open_jira_tickets(limit=limit)

    @app.post("/api/agents/jira/create")
    def create_jira_ticket(body: Dict[str, Any] = Body(...)):
        return create_jira_incident(
            summary=body.get("summary", "AIOps Incident"),
            description=body.get("description", "Reported by HealthShield Multi-Agent Swarm"),
            service_name=body.get("service_name", "cluster"),
            priority=body.get("priority", "High")
        )

    @app.post("/api/agents/jira/{issue_key}/resolve")
    def resolve_jira_ticket(issue_key: str, body: Dict[str, Any] = Body(default={})):
        note = body.get("note", "Resolved by HealthShield AIOps Swarm")
        return resolve_jira_issue(issue_key, resolution_note=note)

    @app.post("/api/agents/jira/{issue_key}/comment")
    def comment_jira_ticket(issue_key: str, body: Dict[str, Any] = Body(...)):
        text = body.get("comment", "")
        return add_jira_comment(issue_key, text)

    @app.post("/api/agents/jira/poll")
    def trigger_jira_poll():
        results = poll_and_process_tickets()
        return {
            "success": True,
            "processed_count": len(results),
            "tickets": results,
            "message": f"Autonomous worker processed {len(results)} pending ticket(s)."
        }

    @app.post("/api/agents/jira/webhook")
    def handle_jira_webhook(payload: Dict[str, Any] = Body(default={})):
        issue = payload.get("issue", {})
        key = issue.get("key")
        if key:
            fields = issue.get("fields", {})
            summary = fields.get("summary", "")
            from tools.jira_worker import process_single_ticket
            res = process_single_ticket({"key": key, "summary": summary, "description": ""})
            return {"success": True, "executed": res}
        results = poll_and_process_tickets()
        return {"success": True, "processed": len(results)}


# ==============================================================================
# 2. STANDARD LIBRARY HTTP SERVER FALLBACK (Zero External Dependencies)
# ==============================================================================
else:
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class FallbackHTTPHandler(BaseHTTPRequestHandler):
        def _set_cors(self, status=200):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()

        def do_OPTIONS(self):
            self._set_cors(204)

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            if path in ["", "/health"]:
                self._set_cors(200)
                self.wfile.write(json.dumps({"status": "HEALTHY", "mode": "StandardLib Fallback", "version": "2.0.0"}).encode())
            elif path == "/api/agents/status":
                self._set_cors(200)
                data = {
                    "swarm": "HealthShield Autonomous Multi-Agent System",
                    "agents": [
                        {"id": "apex", "name": "Apex Supervisor", "badge": "👑 APEX", "role": "Orchestrator", "status": "ACTIVE"},
                        {"id": "kira", "name": "Kira", "badge": "🔍 KIRA SRE", "role": "Diagnostics", "status": "MONITORING"},
                        {"id": "operator", "name": "Operator", "badge": "🛠️ OPERATOR", "role": "Remediation", "status": "READY"},
                        {"id": "nexus", "name": "Nexus", "badge": "💡 NEXUS GROWTH", "role": "Innovation", "status": "IDLE"},
                        {"id": "claims", "name": "Adjudicator", "badge": "📋 ADJUDICATOR", "role": "Claims", "status": "READY"}
                    ],
                    "telemetry_summary": get_system_telemetry()
                }
                self.wfile.write(json.dumps(data).encode())
            elif path == "/api/agents/proposals":
                self._set_cors(200)
                self.wfile.write(json.dumps(get_pending_proposals()).encode())
            elif path == "/api/agents/jira/tickets":
                self._set_cors(200)
                self.wfile.write(json.dumps(list_open_jira_tickets()).encode())
            else:
                self._set_cors(404)
                self.wfile.write(json.dumps({"error": "Not Found"}).encode())

        def do_POST(self):
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            length = int(self.headers.get("content-length", 0))
            body = json.loads(self.rfile.read(length).decode()) if length > 0 else {}

            if path == "/api/agents/chat":
                self._set_cors(200)
                res = route_and_execute(body.get("query", ""), api_key=body.get("api_key"))
                self.wfile.write(json.dumps(res).encode())
            elif path == "/api/agents/sre/diagnose":
                self._set_cors(200)
                res = diagnose_incident(body.get("query", ""), api_key=body.get("api_key"))
                self.wfile.write(json.dumps(res).encode())
            elif path.startswith("/api/agents/proposals/") and path.endswith("/approve"):
                prop_id = path.split("/")[-2]
                res = approve_proposal(prop_id)
                self._set_cors(200 if res.get("success") else 404)
                self.wfile.write(json.dumps(res).encode())
            elif path == "/api/agents/jira/create":
                self._set_cors(200)
                res = create_jira_incident(
                    summary=body.get("summary", "AIOps Incident"),
                    description=body.get("description", "Reported by Swarm"),
                    service_name=body.get("service_name", "cluster"),
                    priority=body.get("priority", "High")
                )
                self.wfile.write(json.dumps(res).encode())
            elif path.startswith("/api/agents/jira/") and path.endswith("/resolve"):
                key = path.split("/")[-2]
                res = resolve_jira_issue(key, body.get("note", "Resolved by Operator"))
                self._set_cors(200 if res.get("success") else 400)
                self.wfile.write(json.dumps(res).encode())
            else:
                self._set_cors(404)
                self.wfile.write(json.dumps({"error": "Endpoint not recognized"}).encode())


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
if __name__ == "__main__":
    port = int(os.getenv("PORT", "3011"))

    # Launch autonomous Jira background watcher
    try:
        start_jira_worker_daemon(interval_seconds=30)
        print("🤖 Autonomous Jira Swarm Worker daemon initiated (30s polling cycle).")
    except Exception as e:
        print(f"Warning starting Jira daemon: {e}")

    if FASTAPI_AVAILABLE:
        print(f"🚀 Starting HealthShield AIOps Multi-Agent Swarm (FastAPI mode) on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
    else:
        print(f"🚀 Starting HealthShield AIOps Multi-Agent Swarm (Zero-Dependency Fallback) on port {port}...")
        server = HTTPServer(("0.0.0.0", port), FallbackHTTPHandler)
        server.serve_forever()
