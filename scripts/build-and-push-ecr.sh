#!/bin/bash
set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="794558722040"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
TAG="${1:-latest}"

echo "================================================================="
echo "HealthShield: Authenticating with Amazon ECR (${ECR_REGISTRY})..."
echo "================================================================="
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

SERVICES=("auth" "gateway" "policy-service" "claim-service" "member-service" "hospital-service" "billing-service" "document-service" "support-service")

for SVC in "${SERVICES[@]}"; do
    echo "-----------------------------------------------------------------"
    echo "Building ${SVC}..."
    echo "-----------------------------------------------------------------"
    docker build -t ${ECR_REGISTRY}/${SVC}:${TAG} -t ${ECR_REGISTRY}/${SVC}:latest backend/services/${SVC}
    echo "Pushing ${SVC} to ECR..."
    docker push ${ECR_REGISTRY}/${SVC}:${TAG}
    docker push ${ECR_REGISTRY}/${SVC}:latest
done

echo "-----------------------------------------------------------------"
echo "Building Frontend..."
echo "-----------------------------------------------------------------"
docker build -t ${ECR_REGISTRY}/frontend:${TAG} -t ${ECR_REGISTRY}/frontend:latest frontend
echo "Pushing Frontend to ECR..."
docker push ${ECR_REGISTRY}/frontend:${TAG}
docker push ${ECR_REGISTRY}/frontend:latest

echo "================================================================="
echo "HealthShield: All 10 container images successfully pushed to ECR!"
echo "================================================================="
