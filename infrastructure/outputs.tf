output "kafka_events_s3_bucket" {
  description = "AWS S3 bucket destination for Kafka S3 Sink Connector"
  value       = module.s3.kafka_events_bucket_name
}

output "documents_vault_s3_bucket" {
  description = "AWS S3 bucket for encrypted healthcare documents (bills, prescriptions, reports)"
  value       = module.s3.documents_bucket_name
}

output "kafka_s3_connector_access_key_id" {
  description = "AWS Access Key ID for Kafka S3 Sink Connector (Configure in OpenShift Secret)"
  value       = module.iam.connector_access_key_id
}

output "kafka_s3_connector_secret_key" {
  description = "AWS Secret Access Key for Kafka S3 Sink Connector (Configure in OpenShift Secret)"
  value       = module.iam.connector_secret_access_key
  sensitive   = true
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs for HealthShield microservices"
  value       = module.ecr.repository_urls
}
