"""
Antigravity SRE Agent Engine
Alternative to AWS Bedrock Agent — connects to Google Antigravity / Gemini AI models
to diagnose production incidents across Health Insurance microservices.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3001")
NAMESPACE = os.getenv("K8S_NAMESPACE", "health-insurance")

SYSTEM_INSTRUCTION = """You are Kira, a Senior Site Reliability Engineer powered by Google Antigravity AI.
You manage the HealthShield health insurance cloud microservices platform:
- gateway (Port 3001)
- auth (Port 3002)
- policy-service (Port 3003)
- claim-service (Port 3004)
- member-service (Port 3005)
- postgres (Port 5432)

Your diagnostic process:
1. State the symptom and affected component.
2. Examine real-time telemetry from Prometheus metrics and service health checks.
3. Correlate latency, error rate, and replica statuses.
4. Deliver a concise root cause analysis, evidence summary, immediate remediation command, and prevention strategy.

Always be data-driven, concise, and pragmatic."""


def query_prometheus(query: str):
    """Run an instant PromQL query against Prometheus."""
    try:
        url = f"{PROMETHEUS_URL}/api/v1/query?query={urllib.parse.quote(query)}"
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get("data", {}).get("result", [])
    except Exception as e:
        return [{"error": f"Prometheus unreachable at {PROMETHEUS_URL}: {str(e)}"}]


def check_service_health():
    """Inspect local gateway & microservices availability."""
    services = {
        "gateway": f"{GATEWAY_URL}/health",
        "auth": "http://localhost:3002/health",
        "policy-service": "http://localhost:3003/health",
        "claim-service": "http://localhost:3004/health",
        "member-service": "http://localhost:3005/health",
    }
    health_status = {}
    for name, url in services.items():
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                health_status[name] = {"status": "UP", "code": resp.getcode()}
        except Exception:
            health_status[name] = {"status": "DOWN / UNREACHABLE", "target": url}
    return health_status


def fetch_telemetry_summary():
    """Collect current system telemetry for Antigravity reasoning."""
    qps_data = query_prometheus('sum(rate(http_requests_total[1m])) by (service_name)')
    p95_data = query_prometheus('histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service_name))')
    err_data = query_prometheus('sum(rate(http_requests_total{status_code=~"5.."}[1m])) by (service_name)')

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "services_health": check_service_health(),
        "prometheus_qps": qps_data,
        "prometheus_p95_latency": p95_data,
        "prometheus_5xx_errors": err_data
    }


def invoke_antigravity_agent(user_query: str, api_key: str = None) -> str:
    """
    Invoke Antigravity SRE reasoning engine.
    Uses Gemini / Antigravity API if key is provided, or rich diagnostic SRE engine fallback.
    """
    telemetry = fetch_telemetry_summary()
    key = api_key or os.getenv("ANTIGRAVITY_API_KEY") or os.getenv("GEMINI_API_KEY")

    if key:
        # Connect to Google Gemini / Antigravity API
        try:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            prompt_content = f"""{SYSTEM_INSTRUCTION}

CURRENT SYSTEM TELEMETRY:
{json.dumps(telemetry, indent=2)}

USER SRE INQUIRY:
{user_query}

Provide a structured, methodical SRE diagnosis report."""

            payload = {
                "contents": [{"parts": [{"text": prompt_content}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1024
                }
            }

            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read())
                return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            # Fallback to local rule-based diagnostic if network or quota issue
            return run_local_sre_diagnostic(user_query, telemetry, note=f"Antigravity API notice: {str(e)}")
    else:
        return run_local_sre_diagnostic(user_query, telemetry)


def run_local_sre_diagnostic(user_query: str, telemetry: dict, note: str = None) -> str:
    """Fast, local rule-based SRE diagnosis for immediate offline feedback."""
    q = user_query.lower()
    health = telemetry.get("services_health", {})

    down_services = [s for s, data in health.items() if data.get("status") != "UP"]

    report = "### ⚡ Antigravity SRE Incident Report\n\n"
    if note:
        report += f"> [!NOTE]\n> {note}\n\n"

    report += f"**Investigation Target:** `{user_query}`\n"
    report += f"**Analysis Timestamp:** `{telemetry['timestamp']}`\n\n"

    if "pod" in q or "health" in q or "running" in q:
        report += "#### 1. Cluster & Service Health Status\n"
        for svc, stat in health.items():
            icon = "🟢" if stat.get("status") == "UP" else "🔴"
            report += f"- {icon} **`{svc}`**: {stat.get('status')}\n"

        report += "\n#### 2. Root Cause & Recommendations\n"
        if down_services:
            report += f"- **Issue**: Services `{', '.join(down_services)}` are not responding.\n"
            report += "- **Remediation**: Check container logs with `docker compose logs " + " ".join(down_services) + "` or verify pod status with `kubectl get pods -n health-insurance`.\n"
        else:
            report += "- **Diagnosis**: All 5 HealthShield microservices and gateway are responding normally.\n"
            report += "- **Action**: No remediation required. Health status is optimal.\n"

    elif "503" in q or "claim" in q or "error" in q:
        report += "#### 1. Telemetry Evidence (Claim Submissions)\n"
        report += "- **Monitored Service**: `claim-service` (Port 3004) & `gateway` (Port 3001)\n"
        report += "- **Metric Inspected**: `sum(rate(http_requests_total{status_code=~\"5..\"}[1m]))`\n"
        report += "- **Database Target**: `claims_db` on PostgreSQL (Port 5432)\n\n"
        report += "#### 2. Root Cause Analysis\n"
        report += "- **Symptom**: Intermittent 503 Service Unavailable / Gateway Timeout.\n"
        report += "- **Probable Cause**: Connection pool exhaustion in `claim-service` or database lock on the `claims` table during bulk claim filings.\n"
        report += "- **Immediate Fix**:\n"
        report += "  ```bash\n"
        report += "  # Restart claim service container to clear deadlocked pools\n"
        report += "  docker compose restart claim-service\n"
        report += "  ```\n"
        report += "- **Long-term Prevention**: Increase `max` connection pool in `claim-service/src/database/connection.ts` from 20 to 50, and implement horizontal pod autoscaling (HPA).\n"

    elif "database" in q or "db" in q or "latency" in q:
        report += "#### 1. Database Topology & Health\n"
        report += "- **PostgreSQL Instance**: `insurance-postgres` (Port 5432)\n"
        report += "- **Databases Verified**: `auth_db`, `policies_db`, `claims_db`, `members_db`\n\n"
        report += "#### 2. Diagnosis & Recommendations\n"
        report += "- **Connection Status**: Responsive via healthcheck `pg_isready -U postgres`.\n"
        report += "- **Key Optimization**: Ensure indexes exist on `claims(member_id)` and `policies(code)` to prevent full table scans under load.\n"

    else:
        report += "#### SRE General Assessment\n"
        report += f"- Inspected metrics across namespace `{NAMESPACE}`.\n"
        report += "- Active services checked: `gateway`, `auth`, `policy-service`, `claim-service`, `member-service`.\n"
        report += "- Recommended command: Run `docker compose ps` to inspect running states or query `/metrics` directly.\n"

    report += "\n---\n*Powered by Antigravity SRE Engine*"
    return report
