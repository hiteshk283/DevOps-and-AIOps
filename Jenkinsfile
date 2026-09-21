// ==============================================================================
// HEALTHSHIELD ENTERPRISE CI/CD PIPELINE (JENKINS + ECR + HELM + OPENSHIFT)
// ==============================================================================
pipeline {
    agent any

    environment {
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '794558722040'
        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG      = "${env.BUILD_NUMBER != null ? env.BUILD_NUMBER : 'latest'}"
        NAMESPACE      = 'kumarh5149-dev'
        LOKI_URL       = 'http://loki:3100/loki/api/v1/push'
    }

    stages {
        stage('1. Checkout Source') {
            steps {
                echo "Checking out HealthShield repository..."
                checkout scm
            }
        }

        stage('2. AWS ECR Authentication') {
            steps {
                echo "Authenticating with Amazon ECR in ${AWS_REGION}..."
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('3. Build & Push Backend Microservices to ECR') {
            steps {
                echo "Building and pushing all microservices to AWS ECR..."
                sh '''
                    SERVICES="auth gateway policy-service claim-service member-service hospital-service billing-service document-service support-service"
                    for SVC in $SERVICES; do
                        echo "================== Building ${SVC} =================="
                        docker build -t ${ECR_REGISTRY}/${SVC}:${IMAGE_TAG} -t ${ECR_REGISTRY}/${SVC}:latest backend/services/${SVC}
                        echo "================== Pushing ${SVC} to ECR =================="
                        docker push ${ECR_REGISTRY}/${SVC}:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/${SVC}:latest
                    done
                '''
            }
        }

        stage('4. Build & Push React Frontend to ECR') {
            steps {
                echo "Building and pushing Frontend portal to AWS ECR..."
                sh '''
                    echo "================== Building Frontend =================="
                    docker build -t ${ECR_REGISTRY}/frontend:${IMAGE_TAG} -t ${ECR_REGISTRY}/frontend:latest frontend
                    echo "================== Pushing Frontend to ECR =================="
                    docker push ${ECR_REGISTRY}/frontend:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/frontend:latest
                '''
            }
        }

        stage('5. Sync OpenShift ECR Pull Secret') {
            steps {
                echo "Updating OpenShift imagePullSecret for ECR in namespace ${NAMESPACE}..."
                sh '''
                    ECR_PASS=$(aws ecr get-login-password --region ${AWS_REGION})
                    oc create secret docker-registry aws-ecr-secret \
                        --docker-server=${ECR_REGISTRY} \
                        --docker-username=AWS \
                        --docker-password="${ECR_PASS}" \
                        -n ${NAMESPACE} --dry-run=client -o yaml | oc apply -f -
                    oc secrets link default aws-ecr-secret --for=pull -n ${NAMESPACE} 2>/dev/null || true
                '''
            }
        }

        stage('6. Deploy with Helm to OpenShift') {
            steps {
                echo "Executing Helm upgrade/install to OpenShift namespace ${NAMESPACE}..."
                sh '''
                    helm upgrade --install healthshield ./charts/healthshield \
                        --namespace ${NAMESPACE} \
                        --set global.ecrRegistry=${ECR_REGISTRY} \
                        --set global.imageTag=${IMAGE_TAG}
                '''
            }
        }

        stage('7. Ship Deployment Telemetry to Loki') {
            steps {
                echo "Pushing deployment telemetry event to Grafana Loki..."
                sh '''
                    TIMESTAMP=$(date +%s%N)
                    curl -s -X POST ${LOKI_URL} \
                        -H "Content-Type: application/json" \
                        -d "{\\"streams\\":[{\\"stream\\":{\\"app\\":\\"jenkins\\",\\"job\\":\\"${JOB_NAME}\\",\\"status\\":\\"success\\"},\\"values\\":[[\"${TIMESTAMP}\",\"HealthShield microservices successfully built, pushed to ECR, and deployed via Helm (Build #${IMAGE_TAG})\"]]}]}" || true
                '''
            }
        }
    }

    post {
        success {
            echo "HealthShield Pipeline finished successfully! All services live on OpenShift."
        }
        failure {
            echo "HealthShield Pipeline encountered an error."
        }
    }
}
