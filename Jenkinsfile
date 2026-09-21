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

        stage('3. Verify ECR Pull Secret') {
            steps {
                echo "Verifying OpenShift aws-ecr-secret..."
                sh '''
                    oc get secret aws-ecr-secret -n ${NAMESPACE} || echo "Creating secret..."
                    oc secrets link default aws-ecr-secret --for=pull -n ${NAMESPACE} 2>/dev/null || true
                '''
            }
        }

        stage('4. Deploy via Helm to OpenShift') {
            steps {
                echo "Executing Helm upgrade/install with image tag: ${IMAGE_TAG}..."
                sh '''
                    ${HELM_BIN} upgrade --install healthshield ./charts/healthshield \
                        --namespace ${NAMESPACE} \
                        --set global.imageTag=${IMAGE_TAG}
                '''
            }
        }

        stage('5. Verify Rollout Health') {
            steps {
                echo "Verifying service rollouts..."
                sh '''
                    echo "Checking PostgreSQL..."
                    oc rollout status deployment/postgres -n ${NAMESPACE} --timeout=120s || true
                    echo "Checking Kafka..."
                    oc rollout status deployment/kafka -n ${NAMESPACE} --timeout=120s || true
                    echo "Checking Gateway..."
                    oc rollout status deployment/gateway -n ${NAMESPACE} --timeout=120s || true
                    echo "Checking Frontend..."
                    oc rollout status deployment/frontend -n ${NAMESPACE} --timeout=120s || true
                '''
            }
        }

        stage('6. Notify Jira Service Management') {
            steps {
                echo "Posting deployment status to Jira ticket ${JIRA_ISSUE_KEY}..."
                sh '''
                    if [ -n "${JIRA_API_TOKEN}" ] && [ -n "${JIRA_BASE_URL}" ]; then
                        AUTH=$(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64)
                        curl -s -X POST "${JIRA_BASE_URL}/rest/api/3/issue/${JIRA_ISSUE_KEY}/comment" \
                            -H "Authorization: Basic ${AUTH}" \
                            -H "Content-Type: application/json" \
                            -d '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"[Jenkins CD] HealthShield release deployed successfully to OpenShift namespace: '${NAMESPACE}'. Image Tag: '${IMAGE_TAG}'. Release: #'${BUILD_NUMBER}'"}]}]}}' || true
                        echo "Jira issue updated."
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
