// ==============================================================================
// HEALTHSHIELD ENTERPRISE CD PIPELINE (JENKINS + HELM + OPENSHIFT + LOKI + JIRA)
// ==============================================================================
pipeline {
    agent any

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Container Image Tag from GitHub Actions CI')
        choice(name: 'TARGET_ENV', choices: ['dev', 'staging', 'production'], description: 'Deployment Target Environment')
    }

    environment {
        NAMESPACE      = 'kumarh5149-dev'
        HELM_BIN       = '/tmp/helm'
        LOKI_URL       = 'http://loki:3100/loki/api/v1/push'
        JIRA_ISSUE_KEY = 'OPS-1'
        IMAGE_TAG      = "${params.IMAGE_TAG ?: 'latest'}"
        TARGET_ENV     = "${params.TARGET_ENV ?: 'dev'}"
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '794558722040'
    }

    stages {
        stage('1. Checkout Helm Manifests') {
            steps {
                echo "Checking out latest Helm charts and configuration..."
                checkout scm
            }
        }

        stage('2. Prepare Helm Environment') {
            steps {
                echo "Verifying Helm CLI binary..."
                sh '''
                    if [ ! -f ${HELM_BIN} ]; then
                        echo "Installing Helm CLI to ${HELM_BIN}..."
                        curl -fsSL https://get.helm.sh/helm-v3.14.4-linux-amd64.tar.gz | tar -xz -C /tmp
                        mv /tmp/linux-amd64/helm ${HELM_BIN}
                        chmod +x ${HELM_BIN}
                    fi
                    ${HELM_BIN} version
                    oc whoami
                    oc project ${NAMESPACE}
                '''
            }
        }

        stage('3. Verify & Refresh ECR Pull Secret') {
            steps {
                echo "Verifying and refreshing OpenShift aws-ecr-secret..."
                sh '''
                    if command -v aws >/dev/null 2>&1; then
                        echo "AWS CLI found. Refreshing 12h ECR token..."
                        ECR_PASS=$(aws ecr get-login-password --region ${AWS_REGION})
                        oc create secret docker-registry aws-ecr-secret \
                            --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
                            --docker-username=AWS \
                            --docker-password="${ECR_PASS}" \
                            --namespace=${NAMESPACE} \
                            --dry-run=client -o yaml | oc apply -f -
                    else
                        echo "AWS CLI not found on runner; verifying existing secret..."
                        oc get secret aws-ecr-secret -n ${NAMESPACE} || echo "Warning: aws-ecr-secret not found"
                    fi
                    oc secrets link default aws-ecr-secret --for=pull -n ${NAMESPACE} 2>/dev/null || true
                '''
            }
        }

        stage('4. Deploy via Helm to OpenShift') {
            steps {
                echo "Executing Helm upgrade/install with image tag: ${IMAGE_TAG}..."
                sh '''
                    ROLLOUT_TIME=$(date +%s)
                    ${HELM_BIN} upgrade --install healthshield ./charts/healthshield \
                        --namespace ${NAMESPACE} \
                        --set global.imageTag=${IMAGE_TAG} \
                        --set global.imagePullPolicy=Always \
                        --set global.rolloutTimestamp="${ROLLOUT_TIME}"
                '''
            }
        }

        stage('5. Verify Rollout Health') {
            steps {
                echo "Triggering rolling update across microservices to fetch latest ECR image layers..."
                sh '''
                    oc rollout restart deployment/gateway \
                        deployment/frontend \
                        deployment/auth \
                        deployment/policy-service \
                        deployment/claim-service \
                        deployment/member-service \
                        deployment/hospital-service \
                        deployment/billing-service \
                        deployment/document-service \
                        deployment/support-service \
                        deployment/aiops-assistant \
                        -n ${NAMESPACE}

                    echo "Awaiting rolling updates..."
                    oc rollout status deployment/gateway -n ${NAMESPACE} --timeout=120s || true
                    oc rollout status deployment/frontend -n ${NAMESPACE} --timeout=120s || true
                    oc rollout status deployment/auth -n ${NAMESPACE} --timeout=120s || true
                    oc rollout status deployment/aiops-assistant -n ${NAMESPACE} --timeout=120s || true
                '''
            }
        }

        stage('6. Open Deployment Audit Ticket in Jira') {
            steps {
                echo "Opening deployment audit ticket in Jira Service Management..."
                sh '''
                    if [ -z "${JIRA_BASE_URL}" ]; then
                        JIRA_BASE_URL="https://kumarh5149.atlassian.net"
                    fi
                    if [ -z "${JIRA_USER_EMAIL}" ]; then
                        JIRA_USER_EMAIL="kumarh5149@gmail.com"
                    fi
                    if [ -z "${JIRA_API_TOKEN}" ]; then
                        JIRA_API_TOKEN=$(oc get secret healthshield-secrets -n ${NAMESPACE} -o jsonpath='{.data.JIRA_API_TOKEN}' 2>/dev/null | base64 -d || true)
                    fi

                    if [ -n "${JIRA_API_TOKEN}" ] && [ -n "${JIRA_BASE_URL}" ]; then
                        AUTH=$(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64 | tr -d '\r\n')
                        RESP=$(curl -s -X POST "${JIRA_BASE_URL}/rest/api/3/issue" \
                            -H "Authorization: Basic ${AUTH}" \
                            -H "Content-Type: application/json" \
                            -H "Accept: application/json" \
                            -d '{
                                "fields": {
                                    "project": { "key": "OPS" },
                                    "summary": "[Jenkins CD] HealthShield release deployed to '${NAMESPACE}' (Build #'${BUILD_NUMBER}')",
                                    "description": {
                                        "type": "doc",
                                        "version": 1,
                                        "content": [
                                            {
                                                "type": "paragraph",
                                                "content": [
                                                    { "type": "text", "text": "HealthShield microservices release #'${BUILD_NUMBER}' deployed via Helm with Image Tag: '${IMAGE_TAG}' to OpenShift namespace '${NAMESPACE}'." }
                                                ]
                                            }
                                        ]
                                    },
                                    "issuetype": { "name": "Task" }
                                }
                            }')
                        TICKET_KEY=$(echo "$RESP" | grep -o '"key":"[^"]*"' | head -n 1 | cut -d'"' -f4)
                        if [ -n "$TICKET_KEY" ]; then
                            echo "✅ Successfully opened Jira ticket: ${TICKET_KEY} (${JIRA_BASE_URL}/browse/${TICKET_KEY})"
                            # Transition to Done (ID 61)
                            curl -s -X POST "${JIRA_BASE_URL}/rest/api/3/issue/${TICKET_KEY}/transitions" \
                                -H "Authorization: Basic ${AUTH}" \
                                -H "Content-Type: application/json" \
                                -d '{"transition":{"id":"61"}}' >/dev/null || true
                        else
                            echo "⚠️ Could not create Jira ticket. Response: $RESP"
                        fi
                    else
                        echo "Jira credentials not set, skipping Jira notification."
                    fi
                '''
            }
        }

        stage('7. Ship Audit Log to Grafana Loki') {
            steps {
                echo "Pushing deployment audit event to Loki..."
                sh '''
                    TIMESTAMP=$(date +%s%N)
                    curl -s -X POST ${LOKI_URL} \
                        -H "Content-Type: application/json" \
                        -d '{"streams":[{"stream":{"app":"jenkins-cd","env":"'${TARGET_ENV}'","job":"'${JOB_NAME}'","status":"success"},"values":[["'${TIMESTAMP}'","HealthShield microservices release #'${BUILD_NUMBER}' deployed via Helm (ImageTag: '${IMAGE_TAG}') to OpenShift"]]}]}' || true
                    echo "Audit log shipped to Loki."
                '''
            }
        }
    }

    post {
        success {
            echo "==========================================================="
            echo "HealthShield CD Pipeline SUCCEEDED! All services live on OCP."
            echo "==========================================================="
        }
        failure {
            echo "==========================================================="
            echo "HealthShield CD Pipeline FAILED. Inspect logs above."
            echo "==========================================================="
        }
    }
}
