data "aws_caller_identity" "current" {}

# ==============================================================================
# 1. KAFKA EVENT STORE S3 BUCKET (S3 Sink Connector Destination)
# ==============================================================================
resource "aws_s3_bucket" "kafka_events" {
  bucket        = "${var.project_name}-kafka-events-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-kafka-events"
    Environment = var.environment
    Purpose     = "Kafka Long-Term Event Archive and Analytics Lakehouse"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "kafka_events" {
  bucket = aws_s3_bucket.kafka_events.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kafka_events" {
  bucket = aws_s3_bucket.kafka_events.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "kafka_events" {
  bucket = aws_s3_bucket.kafka_events.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "kafka_events" {
  bucket = aws_s3_bucket.kafka_events.id

  rule {
    id     = "archive-older-events"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }
  }
}

# ==============================================================================
# 2. HEALTHCARE DOCUMENTS VAULT S3 BUCKET (Encrypted Medical Vault)
# ==============================================================================
resource "aws_s3_bucket" "documents" {
  bucket        = "${var.project_name}-documents-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-medical-documents"
    Environment = var.environment
    Purpose     = "Encrypted Medical Records Bills Prescriptions Policy PDFs"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
