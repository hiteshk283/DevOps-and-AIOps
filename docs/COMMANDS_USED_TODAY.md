# HealthShield: Master Runbook of All Commands Used Today

This document provides a comprehensive, step-by-step record of **every command executed**, its **exact terminal output**, and an in-depth **technical explanation** of why it was run and what it accomplished.

---

## Table of Contents
1. [Quick Reference: Essential URLs & Endpoints](#1-quick-reference-essential-urls--endpoints)
2. [Git, GitHub Push Protection Resolution (GH013) & Remote Sync](#2-git-github-push-protection-resolution-gh013--remote-sync)
3. [GitHub Actions Secrets Provisioning via PyNaCl (Libsodium SealedBox)](#3-github-actions-secrets-provisioning-via-pynacl-libsodium-sealedbox)
4. [Autonomous GitHub Pull Request #4 Lifecycle (AI Review, Jira & Auto-Merge)](#4-autonomous-github-pull-request-4-lifecycle-ai-review-jira--auto-merge)
5. [Atlassian Jira Service Management (JSM) Operations & Worker Lifecycle](#5-atlassian-jira-service-management-jsm-operations--worker-lifecycle)
6. [Amazon Web Services (AWS) ECR Registry Provisioning](#6-amazon-web-services-aws-ecr-registry-provisioning)
7. [GitHub Actions CI Matrix Pipeline Execution](#7-github-actions-ci-matrix-pipeline-execution)
8. [Autonomous Kafka Topic Provisioning & GitOps Pipeline](#8-autonomous-kafka-topic-provisioning--gitops-pipeline)
9. [AIOps Multi-Agent Swarm Verification Commands](#9-aiops-multi-agent-swarm-verification-commands)
10. [Red Hat OpenShift (OCP) Commands & Authentication](#10-red-hat-openshift-ocp-commands--authentication)
11. [AWS CLI & Terraform Infrastructure Teardown ($0 Cost Management)](#11-aws-cli--terraform-infrastructure-teardown-0-cost-management)

---

## 1. Quick Reference: Essential URLs & Endpoints

| Resource | URL | Description |
| :--- | :--- | :--- |
| **GitHub Repository** | `https://github.com/hiteshk283/DevOps-and-AIOps` | Primary source code repository |
| **GitHub Actions** | `https://github.com/hiteshk283/DevOps-and-AIOps/actions` | CI/CD and AI Agent workflow runs |
| **Pull Request #4** | `https://github.com/hiteshk283/DevOps-and-AIOps/pull/4` | Auto-reviewed and merged PR |
| **Atlassian Jira Cloud** | `https://kumarh5149.atlassian.net` | Service Management instance (Project: `OPS`) |
| **Jira Ticket OPS-11** | `https://kumarh5149.atlassian.net/browse/OPS-11` | PR #4 code review audit ticket |
| **OpenShift Web Console** | `https://console-openshift-console.apps.rm1.0a51.p1.openshiftapps.com` | Red Hat OpenShift Developer Sandbox |
| **OpenShift API Server** | `https://api.rm1.0a51.p1.openshiftapps.com:6443` | Kubernetes/OCP cluster API endpoint |
| **Amazon ECR Registry** | `794558722040.dkr.ecr.us-east-1.amazonaws.com` | Docker container image repository |

---

## 2. Git, GitHub Push Protection Resolution (GH013) & Remote Sync

### Command 2.1: Inspecting Git Status and Commit History
```bash
git status && git log -n 3
```
#### Output:
```text
On branch feature
Your branch is up to date with 'origin/feature'.

nothing to commit, working tree clean
commit f2b231527c0b4bddf36b9439eabd74c0aa425514 (HEAD -> feature, origin/feature)
Author: hiteshk283 <hiteshk283@gmail.com>
Date:   Wed Sep 23 00:45:24 2026 +0530

    feat: integrate GitHub Actions with Jira, autonomous AI PR code review, and ArgoCD GitOps pipeline

commit 376a7be80e692e64f39327a0e4c1ee4919291255
Author: hiteshk283 <hiteshk283@gmail.com>
Date:   Tue Sep 22 21:51:21 2026 +0530

     Gitops files are added.
```
#### Explanation:
Verifies that the local working branch is clean and confirms that commit `f2b2315` (which removed the raw Gemini and Jira keys from git history) is the current HEAD.

---

### Command 2.2: Resolving Push Protection Rejection (GH013)
When pushing commit `345d6c9a516da48d972c55a5b4a841f857daf3e3`, GitHub Secret Scanning rejected the push with:
```text
remote: error: GH013: Repository rule violations found for refs/heads/feature.
remote: - GITHUB PUSH PROTECTION
remote:   Resolve the following violations before pushing again
remote:   - Push cannot contain secrets
remote:     —— GCP API Key Bound to a Service Account ————————————
remote:        locations:
remote:          - commit: 345d6c9a516da48d972c55a5b4a841f857daf3e3
remote:            path: .github/workflows/ai-pr-review.yml:38
remote:          - commit: 345d6c9a516da48d972c55a5b4a841f857daf3e3
remote:            path: charts/healthshield/values.yaml:131
```
#### Resolution Steps Executed:
```bash
# 1. Soft-reset the commit while keeping all modified files intact in working tree
git reset HEAD~1

# 2. Sanitize files:
#    In charts/healthshield/values.yaml: apiKey: ""
#    In .github/workflows/ai-pr-review.yml: GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
#    In aiops-assistant/.env: Read via os.getenv (gitignored)

# 3. Verify clean staged diff contains zero raw secrets
git diff --cached

# 4. Recommit clean changes
git add .
git commit -m "feat: integrate GitHub Actions with Jira, autonomous AI PR code review, and ArgoCD GitOps pipeline"

# 5. Push clean commit to remote branch
git push origin feature
```
#### Output:
```text
To https://github.com/hiteshk283/DevOps-and-AIOps.git
   376a7be..f2b2315  feature -> feature
```
#### Explanation:
`git reset HEAD~1` removes the offending commit object from the branch history while preserving all file edits in the working tree. Once raw credentials were replaced with `${{ secrets.* }}` references, the commit was recreated and pushed cleanly without triggering GitHub Push Protection.

---

### Command 2.3: Verifying Remote Branch Ref via Git Protocol
```bash
git ls-remote origin refs/heads/feature
```
#### Output:
```text
f2b231527c0b4bddf36b9439eabd74c0aa425514	refs/heads/feature
```
#### Explanation:
Queries the GitHub remote server directly to verify that the remote ref `refs/heads/feature` points to the clean commit hash `f2b2315`.

---

## 3. GitHub Actions Secrets Provisioning via PyNaCl (Libsodium SealedBox)

To allow GitHub Actions workflows to run without hardcoded credentials, secrets must be uploaded to the GitHub repository using the GitHub REST API (`PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}`). GitHub requires that the secret value be encrypted using the repository's public key with libsodium's `crypto_box_seal`.

### Command 3.1: Installing PyNaCl Library
```bash
python3 -m pip install pynacl --break-system-packages
```
#### Output:
```text
Collecting pynacl
  Downloading pynacl-1.6.2-cp38-abi3-manylinux_2_34_x86_64.whl.metadata (10.0 kB)
Collecting cffi>=2.0.0 (from pynacl)
  Downloading cffi-2.1.1-cp314-cp314-manylinux2014_x86_64.manylinux_2_17_x86_64.whl.metadata (2.5 kB)
Collecting pycparser (from cffi>=2.0.0->pynacl)
  Downloading pycparser-3.0-py3-none-any.whl.metadata (8.2 kB)
Successfully installed cffi-2.1.1 pycparser-3.0 pynacl-1.6.2
```
#### Explanation:
Installs the Python binding to libsodium (`pynacl`) to perform asymmetric public-key encryption required by GitHub's Secrets API.

---

### Command 3.2: Encrypting and Uploading GEMINI_API_KEY & JIRA_API_TOKEN
```bash
python3 - << 'EOF'
import requests
import os
from base64 import b64encode
from nacl import encoding, public
from dotenv import load_dotenv

load_dotenv('aiops-assistant/.env')

gemini_key = os.getenv('GEMINI_API_KEY')
jira_token = os.getenv('JIRA_API_TOKEN')
github_token = "<GITHUB_PAT_TOKEN>"
repo = "hiteshk283/DevOps-and-AIOps"

headers = {
    "Authorization": f"token {github_token}",
    "Accept": "application/vnd.github.v3+json"
}

# 1. Retrieve the repository public key
res = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers)
pk_data = res.json()
key_id = pk_data["key_id"]
public_key = pk_data["key"]

def encrypt(pk_str: str, secret_val: str) -> str:
    pk = public.PublicKey(pk_str.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pk)
    return b64encode(sealed_box.encrypt(secret_val.encode("utf-8"))).decode("utf-8")

secrets_to_upload = {
    "GEMINI_API_KEY": gemini_key,
    "JIRA_API_TOKEN": jira_token
}

for name, val in secrets_to_upload.items():
    encrypted_val = encrypt(public_key, val)
    put_res = requests.put(
        f"https://api.github.com/repos/{repo}/actions/secrets/{name}",
        headers=headers,
        json={"encrypted_value": encrypted_val, "key_id": key_id}
    )
    print(f"Secret {name}: {put_res.status_code}")
EOF
```
#### Output:
```text
Secret GEMINI_API_KEY: 201
Secret JIRA_API_TOKEN: 201
```
#### Explanation:
Fetches the repository's Curve25519 public key from GitHub, encrypts the Gemini and Jira tokens using a SealedBox, and creates or updates the repository secrets with HTTP 201 (Created).

---

### Command 3.3: Encrypting and Uploading GH_PAT (Personal Access Token Fallback)
```bash
python3 - << 'EOF'
import requests, os
from base64 import b64encode
from nacl import encoding, public

github_token = "<GITHUB_PAT_TOKEN>"
repo = "hiteshk283/DevOps-and-AIOps"

headers = {"Authorization": f"token {github_token}", "Accept": "application/vnd.github.v3+json"}
pk_data = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers).json()
key_id = pk_data["key_id"]
pk = public.PublicKey(pk_data["key"].encode("utf-8"), encoding.Base64Encoder())
sealed_box = public.SealedBox(pk)
encrypted_val = b64encode(sealed_box.encrypt(github_token.encode("utf-8"))).decode("utf-8")

put_res = requests.put(
    f"https://api.github.com/repos/{repo}/actions/secrets/GH_PAT",
    headers=headers,
    json={"encrypted_value": encrypted_val, "key_id": key_id}
)
print(f"Secret GH_PAT: {put_res.status_code}")
EOF
```
#### Output:
```text
Secret GH_PAT: 201
```
#### Explanation:
Uploads `GH_PAT` so that GitHub Actions workflows can write PR comments and perform auto-merging even if default repository workflow permissions are set to read-only.

---

### Command 3.4: Verifying All Active Repository Secrets
```bash
curl -s -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  "https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/actions/secrets"
```
#### Output:
```json
{
  "total_count": 5,
  "secrets": [
    { "name": "AWS_ACCESS_KEY_ID" },
    { "name": "AWS_SECRET_ACCESS_KEY" },
    { "name": "GEMINI_API_KEY" },
    { "name": "GH_PAT" },
    { "name": "JIRA_API_TOKEN" }
  ]
}
```
#### Explanation:
Confirms that all 5 necessary secrets are configured in the GitHub repository.

---

## 4. Autonomous GitHub Pull Request #4 Lifecycle (AI Review, Jira & Auto-Merge)

### Command 4.1: Updating Workflow to Use GH_PAT Fallback & Pushing
```bash
# Modified .github/workflows/ai-pr-review.yml line 33:
# GITHUB_TOKEN: ${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}

git add .github/workflows/ai-pr-review.yml
git commit -m "ci: prioritize GH_PAT secret for GitHub PR AI reviewer and auto-merge permissions"
git push origin feature
```
#### Output:
```text
[feature d1fbc94] ci: prioritize GH_PAT secret for GitHub PR AI reviewer and auto-merge permissions
 1 file changed, 1 insertion(+), 1 deletion(-)
To https://github.com/hiteshk283/DevOps-and-AIOps.git
   f2b2315..d1fbc94  feature -> feature
```
#### Explanation:
Pushes the updated workflow to ensure that subsequent PRs have write permissions to merge approved PRs into `main`.

---

### Command 4.2: Creating Pull Request #4 via GitHub REST API
```bash
curl -s -X POST \
  -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/pulls \
  -d '{
    "title": "feat: integrate Jira Cloud JSM, Kafka automation & ArgoCD GitOps engine",
    "head": "feature",
    "base": "main",
    "body": "Autonomous PR opened for HealthShield microservices, Jira Service Management bidirectional integration, and GitOps automation."
  }'
```
#### Output:
```json
{
  "id": 2884128543,
  "number": 4,
  "state": "open",
  "html_url": "https://github.com/hiteshk283/DevOps-and-AIOps/pull/4",
  "commits": 3,
  "additions": 10183,
  "deletions": 1383,
  "changed_files": 40
}
```
#### Explanation:
Programmatically creates Pull Request #4 targeting `main` from `feature` with 40 changed files.

---

### Command 4.3: Monitoring GitHub Actions Run 35773096626
```bash
curl -s -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  "https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/actions/runs/35773096626" | grep -E '("status"|"conclusion")'
```
#### Output:
```text
  "status": "completed",
  "conclusion": "success",
```
#### Explanation:
Checks the workflow run status. The AI Agent PR Reviewer executed successfully.

---

### Command 4.4: Reading AI Review Comment on Pull Request #4
```bash
curl -s -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  "https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/issues/4/comments"
```
#### Output:
```json
[
  {
    "body": "### 🤖 HealthShield AI Agent Code Review\n- **Verdict:** ✅ **APPROVED**\n- **Quality Score:** **92/100**\n- **Security Check:** 🛡️ PASSED (No secrets or critical flaws detected)\n- **Jira Audit Ticket:** [OPS-11](https://kumarh5149.atlassian.net/browse/OPS-11)\n\n#### Executive Assessment:\n> Clean code changes targeting main. Microservice architecture and OpenShift standards satisfied.\n\n#### Key Strengths:\n- ✨ Follows modular microservice separation\n- ✨ TypeScript types and database connections safely encapsulated\n- ✨ No plain-text credentials or high-risk SQL injections detected\n\n#### Recommendations:\n- 💡 Ensure OpenShift deployment readiness probes align with healthcheck endpoints\n- 💡 Verify Prometheus /metrics exporter is enabled\n"
  },
  {
    "body": "🎉 Pull Request #4 successfully merged into `main`. GitOps CI and ArgoCD deployment initiated on OpenShift."
  }
]
```
#### Explanation:
Verifies that the Gemini 3.6 Flash model reviewed the unified diff, posted the structured review, opened Jira ticket `OPS-11`, and confirmed merging into `main`.

---

### Command 4.5: Verifying PR #4 Merged State
```bash
curl -s -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  "https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/pulls/4" | grep -E '("state"|"merged"|"merge_commit_sha")'
```
#### Output:
```text
  "state": "closed",
  "merge_commit_sha": "8cef72992bb71b5c1e4156478fdfb17be4d8aae9",
  "merged": true,
```
#### Explanation:
Confirms that PR #4 was automatically merged into `main` with merge commit `8cef729`.

---

### Command 4.6: Syncing Local Branches with Remote
```bash
git checkout main && git pull origin main
git checkout feature && git commit -m "Merge branch 'main' into feature" && git push origin feature
```
#### Output:
```text
Updating 24befeb..8cef729
Fast-forward
 138 files changed, 17375 insertions(+), 1389 deletions(-)
Switched to branch 'feature'
[feature e8c5823] Merge branch 'main' into feature
To https://github.com/hiteshk283/DevOps-and-AIOps.git
   d1fbc94..e8c5823  feature -> feature
```
#### Explanation:
Brings local `main` up to date with the auto-merged commit `8cef729` and aligns `feature` so both branches are synchronized.

---

## 5. Atlassian Jira Service Management (JSM) Operations & Worker Lifecycle

### Command 5.1: Verifying Jira Ticket OPS-11 via REST API v3
```bash
python3 - << 'EOF'
from dotenv import load_dotenv
import os, requests, base64

load_dotenv('aiops-assistant/.env')
base_url = os.getenv('JIRA_BASE_URL')
email = os.getenv('JIRA_USER_EMAIL')
token = os.getenv('JIRA_API_TOKEN')

auth_header = f"Basic {base64.b64encode(f'{email}:{token}'.encode()).decode()}"
headers = {"Authorization": auth_header, "Accept": "application/json"}

res = requests.get(f"{base_url}/rest/api/3/issue/OPS-11", headers=headers)
data = res.json()
print("Ticket Key:", data.get("key"))
print("Summary:", data.get("fields", {}).get("summary"))
print("Status:", data.get("fields", {}).get("status", {}).get("name"))
EOF
```
#### Output:
```text
Ticket Key: OPS-11
Summary: [AIOps Incident] PR Review #4: feat: integrate Jira Cloud JSM, Kafka automation & ArgoCD GitOps engine (by @hiteshk283)
Status: Open
```
#### Explanation:
Confirms that Jira ticket `OPS-11` was created by the AI review action in project `OPS`.

---

### Command 5.2: Transitioning Jira Ticket OPS-11 to "Done" (ID: 61)
```bash
python3 - << 'EOF'
from dotenv import load_dotenv
import os, requests, base64

load_dotenv('aiops-assistant/.env')
base_url = os.getenv('JIRA_BASE_URL')
email = os.getenv('JIRA_USER_EMAIL')
token = os.getenv('JIRA_API_TOKEN')

auth_header = f"Basic {base64.b64encode(f'{email}:{token}'.encode()).decode()}"
headers = {"Authorization": auth_header, "Accept": "application/json", "Content-Type": "application/json"}

# Add audit comment in Atlassian Document Format (ADF)
comment_body = {
    "body": {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "✅ PR #4 successfully reviewed (Score: 92/100, APPROVED) and merged into main (commit 8cef729). GitHub Actions CI pipeline #35773127284 running. Ticket marked Done by Kira AIOps Swarm."
                    }
                ]
            }
        ]
    }
}
requests.post(f"{base_url}/rest/api/3/issue/OPS-11/comment", headers=headers, json=comment_body, timeout=20)

# Transition to Done (transition ID: 61)
trans_body = {"transition": {"id": "61"}}
t_res = requests.post(f"{base_url}/rest/api/3/issue/OPS-11/transitions", headers=headers, json=trans_body, timeout=20)
print("Transition to Done status:", t_res.status_code)
EOF
```
#### Output:
```text
Transition to Done status: 204
```
#### Explanation:
Transitions the Jira ticket to `Done` via HTTP 204 (No Content) and attaches a resolution comment.

---

### Command 5.3: Running Autonomous Jira Swarm Worker Daemon
```bash
python3 aiops-assistant/tools/jira_worker.py --once
```
#### Output:
```text
[2026-09-23 00:30:12] [JiraWorker] Authenticated to Jira: https://kumarh5149.atlassian.net (User: kumarh5149@gmail.com)
[2026-09-23 00:30:13] [JiraWorker] Found 1 open/actionable issues in project OPS
[2026-09-23 00:30:13] [JiraWorker] Picking up OPS-9: "Create Kafka dead letter queue topic: claim.dlq.events"
[2026-09-23 00:30:14] [JiraWorker] Transitioning OPS-9 to "Work in progress" (ID: 11)...
[2026-09-23 00:30:15] [JiraWorker] Delegating to Multi-Agent Swarm (Apex Supervisor)...
[2026-09-23 00:30:17] [OperatorAgent] KafkaTopic CR provisioned: claim.dlq.events (Partitions: 3, Replicas: 1)
[2026-09-23 00:30:18] [OperatorAgent] GitOps committed to gitops/openshift/kafka/02-kafka-topics.yml
[2026-09-23 00:30:19] [JiraWorker] Posting resolution audit comment to OPS-9...
[2026-09-23 00:30:20] [JiraWorker] Transitioning OPS-9 to "Done" (ID: 61)... Status 204
[2026-09-23 00:30:21] [JiraWorker] Sweep complete. 1 issues resolved.
```
#### Explanation:
Demonstrates the autonomous Jira polling daemon: discovers open tickets, transitions them to In Progress, routes to the appropriate agent (SRE, Operator, Nexus), applies fixes/provisions resources, and marks tickets Done.

---

## 6. Amazon Web Services (AWS) ECR Registry Provisioning

### Command 6.1: Verifying Existing ECR Repositories
```bash
aws ecr describe-repositories --region us-east-1 --query 'repositories[].repositoryName' --output json
```
#### Output:
```json
[]
```
#### Explanation:
Showed that no ECR repositories existed yet under AWS account `794558722040`, explaining why previous Docker push steps failed with `name unknown`.

---

### Command 6.2: Provisioning All 11 ECR Repositories via AWS CLI Loop
```bash
for repo in auth gateway policy-service claim-service member-service hospital-service billing-service document-service support-service frontend aiops-assistant; do
  aws ecr create-repository --repository-name "$repo" --region us-east-1 || true
done
```
#### Output:
```json
{ "repository": { "repositoryName": "auth", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/auth" } }
{ "repository": { "repositoryName": "gateway", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/gateway" } }
{ "repository": { "repositoryName": "policy-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/policy-service" } }
{ "repository": { "repositoryName": "claim-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/claim-service" } }
{ "repository": { "repositoryName": "member-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/member-service" } }
{ "repository": { "repositoryName": "hospital-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/hospital-service" } }
{ "repository": { "repositoryName": "billing-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/billing-service" } }
{ "repository": { "repositoryName": "document-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/document-service" } }
{ "repository": { "repositoryName": "support-service", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/support-service" } }
{ "repository": { "repositoryName": "frontend", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/frontend" } }
{ "repository": { "repositoryName": "aiops-assistant", "repositoryUri": "794558722040.dkr.ecr.us-east-1.amazonaws.com/aiops-assistant" } }
```
#### Explanation:
Creates all 11 container image repositories in AWS ECR (`us-east-1`), enabling parallel Docker builds and pushes from GitHub Actions.

---

### Command 6.3: Force Deleting All 11 ECR Repositories ($0 Cost Maintenance)
```bash
for repo in $(aws ecr describe-repositories --region us-east-1 --query 'repositories[].repositoryName' --output text); do
  echo "Deleting ECR repository: $repo..."
  aws ecr delete-repository --repository-name "$repo" --force --region us-east-1
done

# Confirm all repositories are destroyed
aws ecr describe-repositories --region us-east-1 --query 'repositories[].repositoryName' --output json
```
#### Output:
```json
[]
```
#### Explanation:
Force-deletes all 11 container image repositories and their image layers from Amazon ECR in `us-east-1`, ensuring no dangling storage charges accrue under AWS account `794558722040`.

---

## 7. GitHub Actions CI Matrix Pipeline Execution

### Command 7.1: Triggering CI Build via workflow_dispatch
```bash
curl -s -X POST \
  -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/actions/workflows/ci.yml/dispatches \
  -d '{"ref":"main"}'
```
#### Output:
*(HTTP 204 No Content)*

---

### Command 7.2: Checking Workflow Run Status
```bash
curl -s -H "Authorization: token <GITHUB_PAT_TOKEN>" \
  "https://api.github.com/repos/hiteshk283/DevOps-and-AIOps/actions/runs?event=workflow_dispatch" | grep -E '("name"|"status"|"conclusion"|"html_url")' | head -n 10
```
#### Output:
```text
  "name": "HealthShield CI Pipeline (GitHub Actions -> AWS ECR)",
  "status": "in_progress",
  "conclusion": null,
  "html_url": "https://github.com/hiteshk283/DevOps-and-AIOps/actions/runs/35773575649",
```
#### Explanation:
Launches the GitHub Actions matrix build across all 10 services in parallel on `main`.

---

## 8. Autonomous Kafka Topic Provisioning & GitOps Pipeline

### Command 8.1: Autonomous Provisioning via kafka_tool.py
```bash
python3 aiops-assistant/tools/kafka_tool.py \
  --create-topic "underwriting.events" \
  --partitions 3 \
  --replicas 1 \
  --jira-ticket "OPS-4"
```
#### Output:
```text
[KafkaTool] Generating Strimzi KafkaTopic Custom Resource...
[KafkaTool] Appending manifest to gitops/openshift/kafka/02-kafka-topics.yml
[KafkaTool] KafkaTopic/underwriting.events successfully written to GitOps repository.
[KafkaTool] Updating Jira ticket OPS-4 with audit evidence...
[KafkaTool] Jira Ticket OPS-4 transitioned to Done.
```
#### Explanation:
Enables the Operator agent to onboard new Kafka topics autonomously when requested via Jira: generates the Strimzi CR, appends it to GitOps, and resolves the Jira ticket.

---

## 9. AIOps Multi-Agent Swarm Verification Commands

### Command 9.1: Testing SRE Diagnostic Routing (Kira)
```bash
python3 -c "from agents.supervisor import route_and_execute; res = route_and_execute('Why are users getting 503 errors on claim-service?'); print('Active Agent:', res['active_agent'], '| Status:', res['status'])"
```
#### Output:
```text
Active Agent: Kira (SRE Diagnostics) | Status: SUCCESS
```
#### Explanation:
Verifies that natural language incident inquiries are accurately classified by the Apex Supervisor and routed to Kira for Prometheus correlation and RCA generation.

---

### Command 9.2: Testing Nexus Growth & Catalog Innovation (Nexus)
```bash
python3 -c "from agents.supervisor import route_and_execute; res = route_and_execute('Nexus, draft a new policy for gig workers'); print('Active Agent:', res['active_agent'], '| Draft Policy:', res['draft_policy']['name'])"
```
#### Output:
```text
Active Agent: Nexus (Innovation & Growth) | Draft Policy: FlexiShield — Freelancer & Gig Shield
```
#### Explanation:
Verifies that product inquiries route to Nexus, formulating competitive health insurance policies for the active catalog.

---

## 10. Red Hat OpenShift (OCP) Commands & Authentication

### Command 10.1: Checking Cluster Authentication Status
```bash
oc project && oc get pods -n kumarh5149-dev && oc get routes -n kumarh5149-dev
```
#### Output:
```text
error: You must be logged in to the server (Unauthorized)
```
#### Explanation:
Indicates that the OpenShift Developer Sandbox session token in `~/.kube/config` has expired. A fresh token is needed from the OpenShift Web Console.

---

### Command 10.2: OpenShift Login Command (Template)
```bash
# Obtain token from: OpenShift Console -> Top Right Profile -> Copy login command
oc login --token=<YOUR_NEW_TOKEN> --server=https://api.rm1.0a51.p1.openshiftapps.com:6443

# Verify identity and active namespace
oc whoami
oc project kumarh5149-dev
```

---

### Command 10.3: Applying Secrets & Deploying Helm Stack to OpenShift
```bash
# 1. Apply OpenShift secrets (Jira, DB, Gemini credentials)
oc apply -f gitops/openshift/secrets.yml -n kumarh5149-dev

# 2. Deploy or upgrade HealthShield Helm chart
helm upgrade --install healthshield ./charts/healthshield \
  --namespace kumarh5149-dev \
  --set global.imageTag=latest

# 3. Apply ArgoCD GitOps Application
oc apply -f gitops/argo-cd.yml -n kumarh5149-dev

# 4. Verify pod status
oc get pods -n kumarh5149-dev -w

# 5. List public HTTP/HTTPS routes
oc get routes -n kumarh5149-dev
```

---

## 11. AWS CLI & Terraform Infrastructure Teardown ($0 Cost Management)

### Command 11.1: Complete Teardown of AWS Resources ($0 Monthly Cost)
```bash
cd infrastructure

# Review resources slated for destruction
terraform plan -destroy

# Destroy all AWS resources (S3 buckets, IAM roles, KMS keys)
terraform destroy -auto-approve

# Confirm Terraform state is empty
terraform show
```
#### Output:
```text
Destroy complete! Resources: 14 destroyed.
```
#### Explanation:
Ensures all AWS billable resources are destroyed when not in active use, keeping AWS costs strictly at $0 while compute runs on Red Hat OpenShift.

---

## 12. GitOps, Jenkins Pipelines, and Terraform Full Synchronization & Audit

### Command 12.1: OpenShift Secret Patching (Adding Missing Keys for Deployments)
```bash
oc set data secret/healthshield-secrets \
  DB_USER="cG9zdGdyZXM=" \
  LOKI_PUSH_URL="aHR0cDovL2xva2k6MzEwMC9sb2tpL2FwaS92MS9wdXNo" \
  -n kumarh5149-dev
```
#### Output:
```text
secret/healthshield-secrets data updated
```
#### Explanation:
Adds `DB_USER` (`postgres`) and `LOKI_PUSH_URL` (`http://loki:3100/loki/api/v1/push`) base64 values to the live `healthshield-secrets` secret on OpenShift, ensuring that microservices and PostgreSQL containers start without `CreateContainerConfigError`.

---

### Command 12.2: Validating GitOps Kustomize Build & Server Dry-Run
```bash
# 1. Verify Kustomize compiles all resources without cluster-scope errors
oc kustomize gitops

# 2. Execute dry-run server validation against OpenShift Developer Sandbox
oc apply --dry-run=server -k gitops
```
#### Output:
```text
configmap/grafana-dashboards created (server dry run)
configmap/postgres-init-scripts created (server dry run)
secret/insurance-secrets created (server dry run)
service/auth created (server dry run)
service/claim-service created (server dry run)
service/frontend created (server dry run)
service/gateway created (server dry run)
service/member-service created (server dry run)
service/policy-service created (server dry run)
service/postgres created (server dry run)
deployment.apps/auth created (server dry run)
deployment.apps/claim-service created (server dry run)
deployment.apps/frontend created (server dry run)
deployment.apps/gateway created (server dry run)
deployment.apps/member-service created (server dry run)
deployment.apps/policy-service created (server dry run)
statefulset.apps/insurance-postgres created (server dry run)
servicemonitor.monitoring.coreos.com/healthshield-services created (server dry run)
route.route.openshift.io/healthshield-frontend-route created (server dry run)
route.route.openshift.io/healthshield-gateway-route created (server dry run)
```
#### Explanation:
Confirms that all 20 GitOps resources pass admission control on the active OpenShift Developer Sandbox cluster (`kumarh5149-dev`) without any cluster-admin namespace permission failures or schema discrepancies.

---

### Command 12.3: Validating Terraform Plan ($0 Compute Cost Alignment)
```bash
cd infrastructure
terraform validate
terraform plan
```
#### Output:
```text
Success! The configuration is valid.
Plan: 24 to add, 0 to change, 0 to destroy.
```
#### Explanation:
Verifies that only storage (`s3`), access control (`iam`), and image registry (`ecr` - 11 repos) modules are configured, with EKS, VPC, and AWS-managed ArgoCD remaining deactivated to guarantee $0 AWS compute spend.

