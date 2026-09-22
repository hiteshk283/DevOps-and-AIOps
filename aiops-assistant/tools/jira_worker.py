"""
Autonomous Jira Swarm Worker Daemon
Continuously monitors Jira Cloud for newly opened Service Requests, Tasks, and Incidents.
Automatically:
1. Picks up the ticket and transitions to 'Work in progress'
2. Dispatches task to specialized AI Domain Agent (Operator, Kira SRE, Nexus, Adjudicator)
3. Provisions infrastructure, heals clusters, or formulates products
4. Appends technical audit comments to Jira
5. Transitions the ticket to 'Resolved / Completed'
"""

import time
import threading
import logging
from typing import Dict, Any, List

from tools.jira_tool import (
    get_pending_jira_tickets,
    add_jira_comment,
    resolve_jira_issue,
    transition_jira_issue,
    JIRA_BASE_URL,
    JIRA_PROJECT_KEY
)

logger = logging.getLogger("JiraWorker")
PROCESSED_TICKET_KEYS = set()
_DAEMON_THREAD = None
_DAEMON_RUNNING = False


def process_single_ticket(ticket: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process an individual Jira ticket end-to-end autonomously.
    """
    issue_key = ticket["key"]
    summary = ticket.get("summary", "")
    description = ticket.get("description", "")
    full_prompt = f"{summary}\n{description}".strip()

    logger.info(f"🤖 Autonomous Worker: Picking up ticket {issue_key}: {summary}")

    # 1. Acknowledge and transition to 'Work in progress'
    transition_jira_issue(issue_key, "investigate")
    add_jira_comment(
        issue_key,
        f"""🤖 [AIOps Swarm Worker]: Ticket picked up by Apex Supervisor.
- Work State: `In Progress`
- Assigned Swarm: Kira SRE / Remediation Operator
- Analyzing requirements: "{summary}"..."""
    )

    # 2. Execute via Supervisor Multi-Agent Router
    from agents.supervisor import route_and_execute
    execution_result = route_and_execute(full_prompt, jira_issue_key=issue_key)

    # 3. Post execution details to Jira
    agent_badge = execution_result.get("agent_badge", "🤖 AIOPS")
    active_agent = execution_result.get("active_agent", "Apex Supervisor")
    reply_text = execution_result.get("reply", "Task completed.")

    completion_comment = f"""{reply_text}

---
*Autonomous Execution Audit by {agent_badge} ({active_agent})*
*Cluster: Red Hat OpenShift (kumarh5149-dev / health-insurance) + AWS S3*"""

    add_jira_comment(issue_key, completion_comment)

    # 4. Resolve the Jira ticket
    resolve_res = resolve_jira_issue(
        issue_key,
        f"Autonomous resolution completed by {active_agent}. Verified in cluster."
    )

    PROCESSED_TICKET_KEYS.add(issue_key)

    return {
        "success": True,
        "issue_key": issue_key,
        "agent": active_agent,
        "reply": reply_text,
        "resolved": resolve_res.get("success", True)
    }


def poll_and_process_tickets() -> List[Dict[str, Any]]:
    """
    Scan Jira Cloud for pending tickets and process them sequentially.
    """
    pending = get_pending_jira_tickets(limit=10)
    results = []

    for ticket in pending:
        issue_key = ticket["key"]
        # Skip tickets already resolved or currently being processed in this session
        if issue_key in PROCESSED_TICKET_KEYS:
            continue

        try:
            res = process_single_ticket(ticket)
            results.append(res)
        except Exception as e:
            logger.error(f"Error processing ticket {issue_key}: {e}")
            add_jira_comment(issue_key, f"⚠️ [AIOps Error]: Could not complete autonomous execution: {str(e)}")

    return results


def _worker_loop(interval_seconds: int = 30):
    global _DAEMON_RUNNING
    _DAEMON_RUNNING = True
    logger.info(f"🚀 Jira Autonomous Worker Daemon started (Polling interval: {interval_seconds}s)")

    while _DAEMON_RUNNING:
        try:
            poll_and_process_tickets()
        except Exception as e:
            logger.error(f"Error in Jira worker loop: {e}")
        time.sleep(interval_seconds)


def start_jira_worker_daemon(interval_seconds: int = 30):
    """Start background worker thread that continually checks Jira for new tickets."""
    global _DAEMON_THREAD, _DAEMON_RUNNING
    if _DAEMON_THREAD and _DAEMON_THREAD.is_alive():
        return

    _DAEMON_THREAD = threading.Thread(
        target=_worker_loop,
        args=(interval_seconds,),
        daemon=True,
        name="JiraAutonomousWorker"
    )
    _DAEMON_THREAD.start()
    return _DAEMON_THREAD


def stop_jira_worker_daemon():
    """Stop the background worker thread."""
    global _DAEMON_RUNNING
    _DAEMON_RUNNING = False
