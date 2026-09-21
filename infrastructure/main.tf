# ==============================================================================
# 1. AWS S3 STORAGE MODULE (Kafka Event Store & Encrypted Document Vault)
# ==============================================================================
module "s3" {
  source       = "./modules/s3"
  project_name = "healthshield"
  environment  = "dev"
}

# ==============================================================================
# 2. IAM MODULE (Scoped Access for Kafka S3 Sink Connector & Microservices)
# ==============================================================================
module "iam" {
  source               = "./modules/iam"
  project_name         = "healthshield"
  kafka_bucket_arn     = module.s3.kafka_events_bucket_arn
  documents_bucket_arn = module.s3.documents_bucket_arn
}

# ==============================================================================
# 3. AWS ECR CONTAINER REGISTRIES (All Microservices & Frontend)
# ==============================================================================
module "ecr" {
  source       = "./modules/ecr"
  repositories = var.repositories
}

# Note: EKS, VPC and ArgoCD on AWS have been deactivated to ensure $0 compute costs
# on AWS, as application compute and GitOps are orchestrated on Red Hat OpenShift (OCP).
