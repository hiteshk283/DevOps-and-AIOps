output "cluster_name" {
  description = "EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API Server Endpoint"
  value       = module.eks.cluster_endpoint
}

output "ecr_urls" {
  description = "ECR Repository URLs for Health Insurance services"
  value       = module.ecr.repository_urls
}
