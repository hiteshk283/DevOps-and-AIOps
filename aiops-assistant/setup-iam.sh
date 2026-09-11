#!/usr/bin/env bash
# =============================================================================
# HealthShield AIOps Assistant — IAM Setup Script
# =============================================================================

set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "============================================="
echo " HealthShield AIOps — IAM Setup"
echo " Account : $ACCOUNT_ID"
echo " Region  : $REGION"
echo "============================================="
echo ""

# 1. Lambda Role
LAMBDA_ROLE_NAME="healthshield-aiops-lambda-role"
echo "[1/2] Creating IAM role: $LAMBDA_ROLE_NAME"

LAMBDA_TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$LAMBDA_ROLE_NAME" &>/dev/null; then
  echo "  ✓ Role already exists: $LAMBDA_ROLE_NAME"
else
  aws iam create-role \
    --role-name "$LAMBDA_ROLE_NAME" \
    --assume-role-policy-document "$LAMBDA_TRUST_POLICY" \
    --description "Role for HealthShield AIOps Lambda functions" \
    --query 'Role.RoleName' --output text
  echo "  ✓ Created: $LAMBDA_ROLE_NAME"
fi

aws iam attach-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

LAMBDA_INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EKSAccess",
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:DescribeNodegroup",
        "eks:ListNodegroups"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetricsAccess",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)

aws iam put-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-name "healthshield-aiops-lambda-inline-policy" \
  --policy-document "$LAMBDA_INLINE_POLICY"
echo "  ✓ Policy attached to $LAMBDA_ROLE_NAME"

# 2. Bedrock Agent Role
BEDROCK_ROLE_NAME="healthshield-aiops-bedrock-role"
echo ""
echo "[2/2] Creating IAM role: $BEDROCK_ROLE_NAME"

BEDROCK_TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$BEDROCK_ROLE_NAME" &>/dev/null; then
  echo "  ✓ Role already exists: $BEDROCK_ROLE_NAME"
else
  aws iam create-role \
    --role-name "$BEDROCK_ROLE_NAME" \
    --assume-role-policy-document "$BEDROCK_TRUST_POLICY" \
    --description "Role for Bedrock Agent Kira (HealthShield)" \
    --query 'Role.RoleName' --output text
  echo "  ✓ Created: $BEDROCK_ROLE_NAME"
fi

BEDROCK_INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeModelAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    },
    {
      "Sid": "InvokeLambdaFunctions",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:healthshield-aiops-*"
    }
  ]
}
EOF
)

aws iam put-role-policy \
  --role-name "$BEDROCK_ROLE_NAME" \
  --policy-name "healthshield-aiops-bedrock-inline-policy" \
  --policy-document "$BEDROCK_INLINE_POLICY"
echo "  ✓ Policy attached to $BEDROCK_ROLE_NAME"

echo ""
echo "============================================="
echo " IAM Setup Complete for HealthShield AIOps!"
echo "============================================="
