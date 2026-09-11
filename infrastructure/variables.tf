variable "region" {
  description = "The AWS region for Health Insurance infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "vpc_name" {
  description = "VPC name for Health Insurance cluster"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "subnets" {
  description = "List of public subnets across availability zones"
  type = list(object({
    name              = string
    cidr_block        = string
    availability_zone = string
  }))
}

variable "cluster_name" {
  description = "The name of the Kubernetes EKS Cluster"
  type        = string
}

variable "node_group_name" {
  type        = string
  description = "EKS node group name"
}

variable "instance_types" {
  type        = list(string)
  description = "Instance types for worker nodes (e.g. m7i-flex.large, t3.large)"
}

variable "capacity_type" {
  type        = string
  description = "ON_DEMAND or SPOT"
  default     = "ON_DEMAND"
}

variable "desired_size" {
  type        = number
  description = "Desired number of worker nodes"
  default     = 1
}

variable "min_size" {
  type        = number
  description = "Minimum number of worker nodes"
  default     = 1
}

variable "max_size" {
  type        = number
  description = "Maximum number of worker nodes"
  default     = 2
}

variable "disk_size" {
  type        = number
  description = "EBS Disk size in GiB for worker nodes"
  default     = 30
}

variable "repositories" {
  type        = list(string)
  description = "List of ECR repositories for Health Insurance microservices"
}
