# Outputs for Production Environment

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "alb_url" {
  description = "Application Load Balancer URL"
  value       = "https://${module.ecs.alb_dns_name}"
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.cloudfront_domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${module.cloudfront.cloudfront_domain_name}"
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "rds_connection_string" {
  description = "RDS connection string"
  value       = "postgresql://${var.db_username}:****@${module.rds.db_endpoint}/${var.db_name}"
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.redis_endpoint
}

output "s3_documents_bucket" {
  description = "S3 bucket for documents"
  value       = module.s3.documents_bucket_name
}

output "s3_frontend_bucket" {
  description = "S3 bucket for frontend assets"
  value       = module.s3.frontend_bucket_name
}

output "ecr_backend_repository_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.backend_service_name
}

# Deployment instructions
output "deployment_instructions" {
  description = "Next steps for deployment"
  value = <<-EOT
  
  ========================================
  DEPLOYMENT SUCCESSFUL!
  ========================================
  
  Next Steps:
  
  1. Update DNS records:
     - Point ${var.domain_name} to CloudFront: ${module.cloudfront.cloudfront_domain_name}
     - Point api.${var.domain_name} to ALB: ${module.ecs.alb_dns_name}
  
  2. Build and push Docker images:
     aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.backend.repository_url}
     docker build -t ${aws_ecr_repository.backend.repository_url}:latest ./backend
     docker push ${aws_ecr_repository.backend.repository_url}:latest
  
  3. Deploy backend to ECS:
     aws ecs update-service --cluster ${module.ecs.cluster_name} --service ${module.ecs.backend_service_name} --force-new-deployment
  
  4. Upload frontend to S3:
     cd frontend/hotel-onboarding-frontend
     npm run build
     aws s3 sync dist/ s3://${module.s3.frontend_bucket_name}/
     aws cloudfront create-invalidation --distribution-id ${module.cloudfront.cloudfront_distribution_id} --paths "/*"
  
  5. Test endpoints:
     Backend API: https://${module.ecs.alb_dns_name}/api/healthz
     Frontend: https://${module.cloudfront.cloudfront_domain_name}
  
  6. Monitor logs:
     aws logs tail /ecs/${var.app_name}-backend --follow
  
  ========================================
  EOT
}

