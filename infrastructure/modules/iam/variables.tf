variable "kafka_bucket_arn" {
  description = "ARN of the Kafka events S3 bucket"
  type        = string
}

variable "documents_bucket_arn" {
  description = "ARN of the medical documents S3 bucket"
  type        = string
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "healthshield"
}
