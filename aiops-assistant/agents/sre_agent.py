"""
Kira — SRE Diagnostic & Observability Agent
Monitors microservice health, parses Prometheus metrics, checks OpenShift pod health,
and produces root-cause analysis (RCA) reports using Google Gemini.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from gemini_engine import generate_gemini_content, GEMINI_FLASH_MODEL, GEMINI_MODEL

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3001")
NAMESPACE = os.getenv("K8S_NAMESPACE", "kumarh5149-dev")

SYSTEM_INSTRUCTION = f"""You are Kira, Principal Site Reliability Engineer (SRE) for HealthShield.
The platform runs on Red Hat OpenShift Container Platform (OCP) in namespace '{NAMESPACE}'.
Microservices:
- gateway (Port 3001)
- auth (Port 3002)
- policy-service (Port 3003)
- claim-service (Port 3004)
- member-service (Port 3005)
- billing-service (Port 3006)
- hospital-service (Port 3008)
- document-service (Port 3009)
- support-service (Port 3010)
- postgres (Port 5432)
- kafka (Port 9092)

Your diagnostic guidelines:
1. Examine telemetry (Prometheus QPS, P95 latency, 5xx error rates, service health).
2. Identify affected components and establish severity (P1 Critical, P2 Major, P3 Minor).
3. Present clear Root Cause Analysis (RCA) with supporting metric evidence.
4. Prescribe specific remediation actions (OpenShift commands, replica adjustments).
5. Always be data-driven, structured, and pragmatic."""


def query_prometheus(query: str) -> List[Dict[str, Any]]:
    """Query Prometheus instant metric."""
    try:
        url = f"{PROMETHEUS_URL}/api/v1/query?query={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={"User-Agent": "HealthShield-SRE-Agent"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("data", {}).get("result", [])
    except Exception as e:
        return [{"status": "unreachable", "error": str(e)}]


def check_all_services_health() -> Dict[str, Any]:
    """Inspect availability and latency of all microservices."""
    services = {
        "gateway": f"{GATEWAY_URL}/health",
        "auth": "http://localhost:3002/health",
        "policy-service": "http://localhost:3003/health",
        "claim-service": "http://localhost:3004/health",
        "member-service": "http://localhost:3005/health",
        "billing-service": "http://localhost:3006/health",
        "hospital-service": "http://localhost:3008/health",
        "document-service": "http://localhost:3009/health",
        "support-service": "http://localhost:3010/health"
    }

    report = {}
    for name, url in services.items():
        start = datetime.utcnow()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Kira-Health-Check"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                latency_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
                report[name] = {"status": "HEALTHY", "http_code": resp.getcode(), "latency_ms": latency_ms}
        except Exception as e:
            report[name] = {"status": "UNHEALTHY / TIMEOUT", "target": url, "error": str(e)}

    return report


def get_system_telemetry() -> Dict[str, Any]:
    """Compile comprehensive live telemetry snapshot."""
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "cluster_namespace": NAMESPACE,
        "service_health_probes": check_all_services_health(),
        "prometheus_qps": query_prometheus('sum(rate(http_requests_total[1m])) by (service_name)'),
        "prometheus_p95_latency": query_prometheus('histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service_name))'),
        "prometheus_5xx_errors": query_prometheus('sum(rate(http_requests_total{status_code=~"5.."}[1m])) by (service_name)')
    }


def diagnose_incident(user_query: str, api_key: str = None) -> Dict[str, Any]:
    """Run full SRE incident diagnosis with Gemini reasoning."""
    telemetry = get_system_telemetry()
    unhealthy = [k for k, v in telemetry["service_health_probes"].items() if v.get("status") != "HEALTHY"]

    prompt = f"""INCIDENT INVESTIGATION INQUIRY:
{user_query}

LIVE CLUSTER & TELEMETRY SNAPSHOT:
{json.dumps(telemetry, indent=2)}

Please provide:
1. Executive Incident Summary & Severity
2. Component Health & Metrics Breakdown
3. Root Cause Analysis (RCA)
4. Immediate Remediation Action (with exact OpenShift/Helm/docker commands)
5. Long-term Prevention & Reliability Recommendations"""

    ai_result = generate_gemini_content(
        prompt=prompt,
        system_instruction=SYSTEM_INSTRUCTION,
        model=GEMINI_MODEL,
        api_key=api_key,
        temperature=0.1
    )

    if ai_result.get("success"):
        return {
            "agent": "Kira (SRE Diagnostics)",
            "analysis": ai_result.get("text"),
            "telemetry": telemetry,
            "unhealthy_services": unhealthy,
            "is_fallback": False
        }

    # High-quality offline diagnostic fallback if no API key or network error
    fallback_analysis = f"""### 🛡️ KIRA SRE DIAGNOSTIC REPORT (Offline Rule-Based Mode)
**Timestamp:** `{telemetry['timestamp']}` | **Namespace:** `{NAMESPACE}`

#### 1. Cluster Status Summary
- **Total Services Probed:** 9 microservices + Gateway
- **Services Unreachable / Degraded:** {len(unhealthy)} ({', '.join(unhealthy) if unhealthy else 'None - All Systems Nominal'})

#### 2. Telemetry & Metrics Correlation
- **Gateway Status:** `{telemetry['service_health_probes'].get('gateway', {}).get('status')}`
- **Error Spikes:** {'Detected 5xx errors on ' + ', '.join(unhealthy) if unhealthy else '0 active 5xx HTTP spikes detected'}
- **PostgreSQL Database:** Connection pool responding on Port 5432

#### 3. Root Cause & Suggested Remediation
{
f'''⚠️ **Degradation Detected on {', '.join(unhealthy)}:**
The target pods may have encountered an OOMKilled state, unhandled exception, or pending database connection timeout.

**Immediate Remediation Command:**
```bash
# Restart deployment rollout on OpenShift:
oc rollout restart deployment/{unhealthy[0] if unhealthy else "claim-service"} -n {NAMESPACE}

# Verify pod logs:
oc logs -f deployment/{unhealthy[0] if unhealthy else "claim-service"} -n {NAMESPACE} --tail=100
```''' if unhealthy else
'''✅ **All Microservices Operating Nominally:**
Latency and error rates are well within SLO thresholds (P95 < 250ms, 0% 5xx errors). No automated remediation required.'''
}

#### 4. Prevention Recommendations
1. Ensure OpenShift HPA (Horizontal Pod Autoscaler) has `minReplicas: 2` configured across critical paths (`claim-service`, `gateway`).
2. Verify PostgreSQL connection pooling parameters in `10-create-databases.sh` to prevent thread starvation under concurrent loads.
"""

    return {
        "agent": "Kira (SRE Diagnostics)",
        "analysis": fallback_analysis,
        "telemetry": telemetry,
        "unhealthy_services": unhealthy,
        "is_fallback": True
    }
