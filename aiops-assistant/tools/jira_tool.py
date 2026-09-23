"""
Atlassian Jira Service Management (JSM) Tool for HealthShield AI Swarm
Directly connects AI Agents (Kira SRE, Operator, Supervisor) to live Jira Cloud.
Capabilities:
- Open P1/P2 Incident tickets (IssueType 10003: [System] Incident)
- Create Service Requests (IssueType 10001)
- Add investigation and RCA comments
- Resolve and close tickets with audit notes
- Query open tickets via JQL
"""

import json
import os
import base64
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
except ImportError:
    pass

# Built-in robust .env parser fallback
def _load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and not os.environ.get(k):
                            os.environ[k] = v
        except Exception:
            pass

_load_env_file()

# Load Jira credentials from environment
JIRA_BASE_URL = os.getenv("JIRA_BASE_URL", "https://kumarh5149.atlassian.net").rstrip("/")
JIRA_USER_EMAIL = os.getenv("JIRA_USER_EMAIL", "kumarh5149@gmail.com")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "OPS")


def _get_auth_header() -> str:
    """Generate HTTP Basic Auth header for Atlassian Cloud."""
    email = os.getenv("JIRA_USER_EMAIL", JIRA_USER_EMAIL)
    token = os.getenv("JIRA_API_TOKEN", JIRA_API_TOKEN)
    token_str = f"{email}:{token}"
    return "Basic " + base64.b64encode(token_str.encode("utf-8")).decode("utf-8")


def create_jira_incident(
    summary: str,
    description: str,
    service_name: str = "cluster",
    priority: str = "High",
    issue_type_id: str = "10003"  # [System] Incident
) -> Dict[str, Any]:
    """Open an Incident ticket in Jira Service Management."""
    base_url = os.getenv("JIRA_BASE_URL", JIRA_BASE_URL).rstrip("/")
    project_key = os.getenv("JIRA_PROJECT_KEY", JIRA_PROJECT_KEY)
    url = f"{base_url}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": f"[AIOps Incident] {summary}",
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}]
                    }
                ]
            },
            "issuetype": {"id": issue_type_id},
            "labels": ["HealthShield", "AIOps", service_name.replace(" ", "-")]
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": _get_auth_header(),
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ticket_key = data.get("key")
            ticket_url = f"{base_url}/browse/{ticket_key}"
            return {
                "success": True,
                "key": ticket_key,
                "url": ticket_url,
                "message": f"Successfully created live Jira Incident ticket: {ticket_key}"
            }
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
            err_msg = ", ".join(err_data.get("errorMessages", []))
            if not err_msg and "errors" in err_data:
                err_msg = "; ".join(f"{k}: {v}" for k, v in err_data["errors"].items())
            if not err_msg:
                err_msg = str(e)
        except Exception:
            err_msg = str(e)
        return {
            "success": False,
            "error": f"Jira API HTTP {e.code}: {err_msg}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to open Jira ticket: {str(e)}"
        }


def add_jira_comment(issue_key: str, comment_text: str) -> Dict[str, Any]:
    """Post an RCA or remediation comment to an existing Jira ticket."""
    url = f"{JIRA_BASE_URL}/rest/api/3/issue/{issue_key}/comment"
    payload = {
        "body": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": comment_text}]
                }
            ]
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": _get_auth_header(),
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {
                "success": True,
                "issue_key": issue_key,
                "message": f"Added comment to Jira ticket {issue_key}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


def resolve_jira_issue(issue_key: str, resolution_note: str) -> Dict[str, Any]:
    """Transition a Jira ticket to Resolved / Closed and add an RCA note."""
    # 1. Add resolution comment first
    add_jira_comment(issue_key, f"🤖 [AIOps Auto-Remediation]: {resolution_note}")

    # 2. Fetch available transitions
    trans_url = f"{JIRA_BASE_URL}/rest/api/3/issue/{issue_key}/transitions"
    try:
        req = urllib.request.Request(
            trans_url,
            headers={"Authorization": _get_auth_header(), "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            transitions = data.get("transitions", [])

        # Find target transition to Done (ID 61, 111, or name matches done/resolve/closed)
        target_trans = None
        for t in transitions:
            t_id = str(t.get("id"))
            t_name = t.get("name", "").lower()
            to_name = t.get("to", {}).get("name", "").lower()
            if t_id in ["61", "111"] or "done" in to_name or any(k in t_name for k in ["done", "resolve", "closed", "complete", "mark as done"]):
                target_trans = t
                break

        # If ticket is in Pending (where direct Done is not available), first move to In Progress (11) then Done (61)
        if not target_trans:
            wip_trans = next((t for t in transitions if str(t.get("id")) in ["11", "31"] or "progress" in t.get("name", "").lower()), None)
            if wip_trans:
                urllib.request.urlopen(urllib.request.Request(
                    trans_url,
                    data=json.dumps({"transition": {"id": wip_trans["id"]}}).encode("utf-8"),
                    headers={"Authorization": _get_auth_header(), "Content-Type": "application/json", "Accept": "application/json"},
                    method="POST"
                ), timeout=20)
                # Re-fetch transitions from Work in progress state
                with urllib.request.urlopen(req, timeout=20) as resp2:
                    transitions2 = json.loads(resp2.read().decode("utf-8")).get("transitions", [])
                    target_trans = next((t for t in transitions2 if str(t.get("id")) in ["61", "111"] or "done" in t.get("to", {}).get("name", "").lower()), None)

        if target_trans:
            post_trans_req = urllib.request.Request(
                trans_url,
                data=json.dumps({"transition": {"id": target_trans["id"]}}).encode("utf-8"),
                headers={
                    "Authorization": _get_auth_header(),
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(post_trans_req, timeout=20) as resp:
                pass

        return {
            "success": True,
            "issue_key": issue_key,
            "transition": target_trans.get("name") if target_trans else "Updated Comment",
            "message": f"Jira ticket {issue_key} successfully resolved with remediation audit note."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to transition ticket {issue_key}: {str(e)}"
        }


def list_open_jira_tickets(limit: int = 15) -> List[Dict[str, Any]]:
    """Retrieve tickets from Project OPS using Jira Cloud API v3 search/jql."""
    url = f"{JIRA_BASE_URL}/rest/api/3/search/jql"
    payload = {
        "jql": f"project = {JIRA_PROJECT_KEY} ORDER BY created DESC",
        "maxResults": limit,
        "fields": ["summary", "status", "priority", "created", "issuetype", "labels"]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": _get_auth_header(),
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            issues = data.get("issues", [])
            output = []
            for iss in issues:
                fields = iss.get("fields", {})
                output.append({
                    "key": iss.get("key"),
                    "summary": fields.get("summary"),
                    "status": fields.get("status", {}).get("name", "Open"),
                    "priority": fields.get("priority", {}).get("name", "Medium"),
                    "created": fields.get("created"),
                    "issue_type": fields.get("issuetype", {}).get("name", "Incident"),
                    "labels": fields.get("labels", []),
                    "url": f"{JIRA_BASE_URL}/browse/{iss.get('key')}"
                })
            return output
    except Exception as e:
        print(f"Jira search error: {e}")
        return []


def transition_jira_issue(issue_key: str, target_state_keyword: str) -> Dict[str, Any]:
    """
    Transition a Jira ticket towards a target state keyword 
    (e.g. 'investigate', 'progress', 'resolve', 'done', 'close').
    """
    trans_url = f"{JIRA_BASE_URL}/rest/api/3/issue/{issue_key}/transitions"
    try:
        req = urllib.request.Request(
            trans_url,
            headers={"Authorization": _get_auth_header(), "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            transitions = data.get("transitions", [])

        target_trans = None
        kw = target_state_keyword.lower()
        for t in transitions:
            t_name = t.get("name", "").lower()
            to_name = t.get("to", {}).get("name", "").lower()
            if kw in ["investigate", "progress", "start"]:
                if any(x in t_name or x in to_name for x in ["progress", "investigate", "in progress"]):
                    target_trans = t
                    break
            elif kw in t_name or kw in to_name:
                target_trans = t
                break

        if target_trans:
            post_req = urllib.request.Request(
                trans_url,
                data=json.dumps({"transition": {"id": target_trans["id"]}}).encode("utf-8"),
                headers={
                    "Authorization": _get_auth_header(),
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(post_req, timeout=10) as resp:
                pass
            return {"success": True, "transition": target_trans.get("name")}
        return {"success": False, "error": f"No matching transition found for keyword '{target_state_keyword}'"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_pending_jira_tickets(limit: int = 15) -> List[Dict[str, Any]]:
    """Retrieve tickets from Project OPS that are awaiting action (statusCategory != Done)."""
    url = f"{JIRA_BASE_URL}/rest/api/3/search/jql"
    payload = {
        "jql": f"project = {JIRA_PROJECT_KEY} AND statusCategory != Done ORDER BY created ASC",
        "maxResults": limit,
        "fields": ["summary", "status", "priority", "created", "issuetype", "labels", "description"]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": _get_auth_header(),
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            issues = data.get("issues", [])
            output = []
            for iss in issues:
                fields = iss.get("fields", {})
                desc_text = ""
                # Parse description if present
                desc_raw = fields.get("description")
                if isinstance(desc_raw, dict):
                    paragraphs = desc_raw.get("content", [])
                    for p in paragraphs:
                        for c in p.get("content", []):
                            desc_text += c.get("text", "") + "\n"
                elif isinstance(desc_raw, str):
                    desc_text = desc_raw

                output.append({
                    "key": iss.get("key"),
                    "summary": fields.get("summary", ""),
                    "description": desc_text.strip(),
                    "status": fields.get("status", {}).get("name", "Open"),
                    "priority": fields.get("priority", {}).get("name", "Medium"),
                    "created": fields.get("created"),
                    "issue_type": fields.get("issuetype", {}).get("name", "Task"),
                    "labels": fields.get("labels", []),
                    "url": f"{JIRA_BASE_URL}/browse/{iss.get('key')}"
                })
            return output
    except Exception as e:
        print(f"Jira pending tickets error: {e}")
        return []


def find_jira_ticket_by_summary(summary_prefix: str) -> Optional[Dict[str, Any]]:
    """Find the most recent Jira ticket matching a summary prefix for deduplication."""
    try:
        url = f"{JIRA_BASE_URL}/rest/api/3/search/jql"
        # Search for tickets containing prefix in summary
        payload = {
            "jql": f'project = {JIRA_PROJECT_KEY} AND text ~ "{summary_prefix}" ORDER BY created DESC',
            "maxResults": 5,
            "fields": ["summary", "status", "priority", "created"]
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": _get_auth_header(),
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            issues = data.get("issues", [])
            for iss in issues:
                summ = iss.get("fields", {}).get("summary", "")
                if summary_prefix.lower() in summ.lower():
                    return {
                        "key": iss.get("key"),
                        "summary": summ,
                        "status": iss.get("fields", {}).get("status", {}).get("name", "Open"),
                        "url": f"{JIRA_BASE_URL}/browse/{iss.get('key')}"
                    }
    except Exception as e:
        print(f"Jira find by summary warning: {e}")
    return None

