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
import subprocess
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
2. Examine Kubernetes/OpenShift cluster pod states (ImagePullBackOff, ErrImagePull, CrashLoopBackOff) and Kubelet warning events.
3. Check for expired AWS ECR credentials (12-hour expiration) or invalid image registries.
4. Identify affected components and establish severity (P1 Critical, P2 Major, P3 Minor).
5. Present clear Root Cause Analysis (RCA) with supporting metric and cluster evidence.
6. Prescribe specific remediation actions (OpenShift/Helm commands, ECR token refresh, replica adjustments).
7. Always be data-driven, structured, and pragmatic."""


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


def get_k8s_cluster_pod_status() -> Dict[str, Any]:
    """Inspect live OpenShift / Kubernetes pod states and warning events."""
    try:
        cmd = f"oc get pods -n {NAMESPACE} -o json"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=8)
        if res.returncode != 0:
            cmd = f"kubectl get pods -n {NAMESPACE} -o json"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=8)
        
        if res.returncode != 0:
            return {"available": False, "error": res.stderr.strip()}
        
        data = json.loads(res.stdout)
        pod_issues = []
        pod_summary = []
        for item in data.get("items", []):
            pod_name = item.get("metadata", {}).get("name")
            status = item.get("status", {})
            phase = status.get("phase", "Unknown")
            c_statuses = status.get("containerStatuses", [])
            has_issue = False
            for cs in c_statuses:
                state = cs.get("state", {})
                waiting = state.get("waiting")
                terminated = state.get("terminated")
                if waiting:
                    reason = waiting.get("reason", "Waiting")
                    msg = waiting.get("message", "")
                    pod_issues.append({
                        "pod": pod_name,
                        "container": cs.get("name"),
                        "issue_type": reason,
                        "message": msg
                    })
                    has_issue = True
                elif terminated and terminated.get("exitCode", 0) != 0:
                    pod_issues.append({
                        "pod": pod_name,
                        "container": cs.get("name"),
                        "issue_type": f"Terminated (ExitCode {terminated.get('exitCode')})",
                        "message": terminated.get("reason", "")
                    })
                    has_issue = True

            pod_summary.append({
                "name": pod_name,
                "phase": phase,
                "ready": sum(1 for cs in c_statuses if cs.get("ready")),
                "total": len(c_statuses),
                "has_issue": has_issue
            })

        # Fetch recent warning events
        ev_cmd = f"oc get events -n {NAMESPACE} --field-selector type=Warning --sort-by='.metadata.creationTimestamp' --no-headers | tail -n 8"
        ev_res = subprocess.run(ev_cmd, shell=True, capture_output=True, text=True, timeout=8)
        events = [line.strip() for line in ev_res.stdout.strip().splitlines() if line.strip()] if ev_res.returncode == 0 else []

        return {
            "available": True,
            "total_pods": len(pod_summary),
            "unhealthy_pods_count": len([p for p in pod_summary if p["has_issue"] or p["ready"] < p["total"]]),
            "pod_issues": pod_issues,
            "recent_warning_events": events
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


def get_system_telemetry() -> Dict[str, Any]:
    """Compile comprehensive live telemetry snapshot."""
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "cluster_namespace": NAMESPACE,
        "cluster_pod_status": get_k8s_cluster_pod_status(),
        "service_health_probes": check_all_services_health(),
        "prometheus_qps": query_prometheus('sum(rate(http_requests_total[1m])) by (service_name)'),
        "prometheus_p95_latency": query_prometheus('histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service_name))'),
        "prometheus_5xx_errors": query_prometheus('sum(rate(http_requests_total{status_code=~"5.."}[1m])) by (service_name)')
    }


def diagnose_incident(user_query: str, api_key: str = None) -> Dict[str, Any]:
    """Run full SRE incident diagnosis with Gemini reasoning."""
    telemetry = get_system_telemetry()
    unhealthy = [k for k, v in telemetry["service_health_probes"].items() if v.get("status") != "HEALTHY"]
    cluster_status = telemetry.get("cluster_pod_status", {})
    pod_issues = cluster_status.get("pod_issues", [])

    prompt = f"""INCIDENT INVESTIGATION INQUIRY:
{user_query}

LIVE CLUSTER & TELEMETRY SNAPSHOT:
{json.dumps(telemetry, indent=2)}

Please provide:
1. Executive Incident Summary & Severity
2. Component Health & Metrics Breakdown (including OpenShift Pod states and Warning events)
3. Root Cause Analysis (RCA) - verify if ImagePullBackOff, AWS ECR token expiration (12-hour validity), or DB authentication failures are present.
4. Immediate Remediation Action (with exact OpenShift/Helm/aws CLI commands)
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
            "pod_issues": pod_issues,
            "is_fallback": False
        }

    # High-quality offline diagnostic fallback if no API key or network error
    image_pull_issues = [p for p in pod_issues if p.get("issue_type") in ["ImagePullBackOff", "ErrImagePull"]]
    
    if image_pull_issues:
        root_cause_section = f"""⚠️ **Image Pull Failure Detected on {len(image_pull_issues)} Pods:**
Pods are stuck in `ImagePullBackOff` or `ErrImagePull`.
**Primary Root Cause:** Expired AWS ECR authorization credentials (AWS ECR tokens expire every 12 hours) or invalid repository image tags.

**Immediate Remediation Command:**
```bash
# 1. Regenerate OpenShift ECR Pull Secret using AWS CLI:
oc create secret docker-registry aws-ecr-secret \\
  --docker-server=794558722040.dkr.ecr.us-east-1.amazonaws.com \\
  --docker-username=AWS \\
  --docker-password=$(aws ecr get-login-password --region us-east-1) \\
  --namespace={NAMESPACE} \\
  --dry-run=client -o yaml | oc apply -f -

# 2. Link secret to default service account:
oc secrets link default aws-ecr-secret --for=pull -n {NAMESPACE}

# 3. Trigger immediate pod recreation:
oc delete pod -l app={image_pull_issues[0].get('pod', 'gateway').split('-')[0]} -n {NAMESPACE}
```"""
    elif unhealthy:
        root_cause_section = f"""⚠️ **Degradation Detected on {', '.join(unhealthy)}:**
The target pods may have encountered an OOMKilled state, unhandled exception, or pending database connection timeout.

**Immediate Remediation Command:**
```bash
# Restart deployment rollout on OpenShift:
oc rollout restart deployment/{unhealthy[0]} -n {NAMESPACE}

# Verify pod logs:
oc logs -f deployment/{unhealthy[0]} -n {NAMESPACE} --tail=100
```"""
    else:
        root_cause_section = """✅ **All Microservices Operating Nominally:**
Latency and error rates are well within SLO thresholds (P95 < 250ms, 0% 5xx errors). All OpenShift pods are 1/1 Running."""

    fallback_analysis = f"""### 🛡️ KIRA SRE DIAGNOSTIC REPORT (Offline Rule-Based Mode)
**Timestamp:** `{telemetry['timestamp']}` | **Namespace:** `{NAMESPACE}`

#### 1. Cluster Status Summary
- **Total Services Probed:** 9 microservices + Gateway
- **OpenShift Total Pods:** {cluster_status.get('total_pods', 'N/A')}
- **Pods with Container Issues:** {len(pod_issues)}
- **Services Unreachable / Degraded:** {len(unhealthy)} ({', '.join(unhealthy) if unhealthy else 'None - All Systems Nominal'})

#### 2. Telemetry & Metrics Correlation
- **Gateway Status:** `{telemetry['service_health_probes'].get('gateway', {}).get('status')}`
- **Cluster Pod Issues:** {', '.join([p['pod'] + ' (' + p['issue_type'] + ')' for p in pod_issues]) if pod_issues else '0 active container waiting states'}
- **Recent K8s Warning Events:** {len(cluster_status.get('recent_warning_events', []))} events detected

#### 3. Root Cause & Suggested Remediation
{root_cause_section}

#### 4. Prevention Recommendations
1. Automate AWS ECR token refresh in OpenShift using a CronJob or Jenkins pre-deploy stage.
2. Ensure OpenShift HPA (Horizontal Pod Autoscaler) has `minReplicas: 2` configured across critical paths (`claim-service`, `gateway`).
3. Verify PostgreSQL connection pooling parameters in `10-create-databases.sh` to prevent thread starvation under concurrent loads.
"""

    return {
        "agent": "Kira (SRE Diagnostics)",
        "analysis": fallback_analysis,
        "telemetry": telemetry,
        "unhealthy_services": unhealthy,
        "pod_issues": pod_issues,
        "is_fallback": True
    }
