variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "healthshield"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}
