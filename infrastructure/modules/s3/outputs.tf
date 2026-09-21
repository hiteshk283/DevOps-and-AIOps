output "kafka_events_bucket_name" {
  description = "Name of the S3 bucket used for Kafka Event Store"
  value       = aws_s3_bucket.kafka_events.id
}

output "kafka_events_bucket_arn" {
  description = "ARN of the S3 bucket used for Kafka Event Store"
  value       = aws_s3_bucket.kafka_events.arn
}

output "documents_bucket_name" {
  description = "Name of the S3 bucket used for encrypted medical documents"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "ARN of the S3 bucket used for encrypted medical documents"
  value       = aws_s3_bucket.documents.arn
}
