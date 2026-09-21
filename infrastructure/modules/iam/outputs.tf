output "connector_iam_user_name" {
  description = "IAM user name for S3 Sink Connector"
  value       = aws_iam_user.s3_connector_user.name
}

output "connector_iam_user_arn" {
  description = "IAM user ARN for S3 Sink Connector"
  value       = aws_iam_user.s3_connector_user.arn
}

output "connector_access_key_id" {
  description = "Access key ID for S3 Sink Connector (Inject into OpenShift Secret)"
  value       = aws_iam_access_key.s3_connector_key.id
}

output "connector_secret_access_key" {
  description = "Secret access key for S3 Sink Connector (Inject into OpenShift Secret)"
  value       = aws_iam_access_key.s3_connector_key.secret
  sensitive   = true
}
