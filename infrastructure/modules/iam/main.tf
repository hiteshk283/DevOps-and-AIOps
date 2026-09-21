# ==============================================================================
# IAM USER & CREDENTIALS FOR KAFKA S3 SINK CONNECTOR & APPS
# ==============================================================================

resource "aws_iam_user" "s3_connector_user" {
  name = "${var.project_name}-s3-connector-user"

  tags = {
    Name      = "${var.project_name}-s3-connector-user"
    Purpose   = "Service account for Kafka S3 Sink Connector and Document Service"
    ManagedBy = "Terraform"
  }
}

resource "aws_iam_access_key" "s3_connector_key" {
  user = aws_iam_user.s3_connector_user.name
}

resource "aws_iam_policy" "s3_connector_policy" {
  name        = "${var.project_name}-s3-sink-connector-policy"
  description = "Scoped S3 access policy for Kafka S3 Sink Connector and HealthShield Document Vault"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucketPermissions"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          var.kafka_bucket_arn,
          var.documents_bucket_arn
        ]
      },
      {
        Sid    = "ObjectAccessPermissions"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = [
          "${var.kafka_bucket_arn}/*",
          "${var.documents_bucket_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "s3_connector_attach" {
  user       = aws_iam_user.s3_connector_user.name
  policy_arn = aws_iam_policy.s3_connector_policy.arn
}
