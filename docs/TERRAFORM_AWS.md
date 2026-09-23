# HealthShield: AWS Terraform Infrastructure Guide

This guide explains the Terraform infrastructure modules, what cloud resources they provision on AWS, and how to safely deploy them when ready.

---

## 1. Cloud Resources Created by Terraform

The Terraform codebase in `infrastructure/` creates the following AWS resources:

### A. S3 Storage Module (`infrastructure/modules/s3/`)
1. **Kafka Long-Term Event Store**:
   - Bucket Name: `healthshield-kafka-events-794558722040`
   - Purpose: Destination for Kafka Connect S3 Sink Connector (archives `payment.events`, `claim.events`, `policy.events`).
   - Features: Bucket versioning, AES-256 server-side encryption, public access block enabled, and 90-day Standard-IA / 180-day Glacier lifecycle transitions to minimize AWS costs.
2. **Medical Documents Vault**:
   - Bucket Name: `healthshield-documents-794558722040`
   - Purpose: Secure client-side encrypted repository for hospital bills, diagnostic scans, discharge summaries, and policy certificates.
   - Features: Bucket versioning, AES-256 encryption, strict public access block.

### B. IAM Module (`infrastructure/modules/iam/`)
1. **IAM Service Account**: `healthshield-s3-connector-user`
2. **Scoped Policy**: `healthshield-s3-sink-connector-policy`
   - Allows only `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`, and `s3:AbortMultipartUpload` scoped strictly to the two HealthShield S3 buckets.
3. **Access Keys**: Generates `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to be passed as an OpenShift Secret into Kafka Connect.

### C. ECR Module (`infrastructure/modules/ecr/`)
- Provisions 11 container repositories in AWS ECR for the microservices and autonomous agents:
  - `frontend`, `gateway`, `auth`, `policy-service`, `claim-service`, `member-service`, `hospital-service`, `billing-service`, `document-service`, `support-service`, `aiops-assistant`.

---

## 2. Step-by-Step Terraform Deployment

When you are ready to apply the infrastructure on AWS, run:

```bash
cd infrastructure

# 1. Initialize providers and modules
terraform init

# 2. Validate syntax and configuration
terraform validate

# 3. Preview plan (23 resources to add, 0 to destroy)
terraform plan

# 4. Apply changes to AWS
terraform apply
```

### Retrieving Connector Secrets after Apply:
To view the generated access key and secret for your OpenShift Secret:

```bash
# Get Access Key ID
terraform output kafka_s3_connector_access_key_id

# Get Secret Access Key
terraform output -raw kafka_s3_connector_secret_key
```

---

## 3. Cost Management Best Practices
* **Compute is on OpenShift**: By running application compute on Red Hat OpenShift rather than AWS EKS, you eliminate the \$73/month EKS control plane fee and NAT Gateway fees.
* **S3 Lifecycle Rules**: Kafka events automatically transition to lower-cost storage tiers (`STANDARD_IA` at 90 days, `GLACIER` at 180 days).

---

## 4. Complete Teardown & $0 AWS Cost Verification

To cleanly tear down all AWS resources and guarantee zero ongoing cloud expenditure:

```bash
cd infrastructure

# 1. Preview resources marked for deletion
terraform plan -destroy

# 2. Destroy all AWS resources
terraform destroy -auto-approve

# 3. Verify zero lingering resources via AWS CLI
aws s3 ls
aws ecr describe-repositories --region us-east-1
aws iam list-users --query 'Users[?contains(UserName, `healthshield`)].UserName'
terraform show
```

For the master command reference, see [docs/COMMANDS_USED_TODAY.md](./COMMANDS_USED_TODAY.md).

