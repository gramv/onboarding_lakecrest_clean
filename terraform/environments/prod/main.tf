# Production Environment Configuration
# Hotel Employee Onboarding System - AWS Infrastructure

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "hotel-onboarding-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.app_name
      ManagedBy   = "terraform"
      CostCenter  = "hotel-onboarding"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 3)
  
  common_tags = {
    Environment = var.environment
    Project     = var.app_name
    ManagedBy   = "terraform"
  }
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  environment         = var.environment
  app_name           = var.app_name
  vpc_cidr           = var.vpc_cidr
  availability_zones = local.azs
  
  tags = local.common_tags
}

# RDS Database Module
module "rds" {
  source = "../../modules/rds"

  environment          = var.environment
  app_name            = var.app_name
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  db_instance_class   = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  multi_az            = var.db_multi_az
  backup_retention    = var.db_backup_retention
  
  allowed_security_group_ids = [module.ecs.ecs_tasks_security_group_id]
  
  tags = local.common_tags
}

# S3 Storage Module
module "s3" {
  source = "../../modules/s3"

  environment = var.environment
  app_name   = var.app_name
  
  enable_versioning = true
  enable_encryption = true
  
  lifecycle_rules = {
    documents = {
      enabled = true
      transitions = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 180
          storage_class = "GLACIER"
        }
      ]
    }
  }
  
  tags = local.common_tags
}

# ElastiCache Redis Module
module "elasticache" {
  source = "../../modules/elasticache"

  environment        = var.environment
  app_name          = var.app_name
  vpc_id            = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  node_type         = var.redis_node_type
  num_cache_nodes   = var.redis_num_nodes
  
  allowed_security_group_ids = [module.ecs.ecs_tasks_security_group_id]
  
  tags = local.common_tags
}

# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name                 = "${var.app_name}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.app_name}-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

# ECR Lifecycle Policies
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ECS Cluster Module
module "ecs" {
  source = "../../modules/ecs"

  environment = var.environment
  app_name   = var.app_name
  
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  public_subnet_ids  = module.networking.public_subnet_ids
  
  # Backend service configuration
  backend_image      = "${aws_ecr_repository.backend.repository_url}:latest"
  backend_cpu        = var.ecs_task_cpu
  backend_memory     = var.ecs_task_memory
  backend_port       = 8000
  desired_count      = var.ecs_desired_count
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  
  # Environment variables for backend
  backend_environment = {
    ENVIRONMENT      = var.environment
    DATABASE_URL     = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/${var.db_name}"
    REDIS_URL        = "redis://${module.elasticache.redis_endpoint}:6379/0"
    FRONTEND_URL     = var.frontend_url
  }
  
  # Secrets from AWS Secrets Manager
  backend_secrets = {
    JWT_SECRET       = aws_secretsmanager_secret.jwt_secret.arn
    SMTP_USERNAME    = aws_secretsmanager_secret.smtp_username.arn
    SMTP_PASSWORD    = aws_secretsmanager_secret.smtp_password.arn
  }
  
  # Health check configuration
  health_check_path = "/api/healthz"
  
  # SSL certificate ARN (create in ACM first)
  certificate_arn = var.certificate_arn
  
  tags = local.common_tags
}

# CloudFront Distribution for Frontend
module "cloudfront" {
  source = "../../modules/cloudfront"

  environment = var.environment
  app_name   = var.app_name
  
  s3_bucket_id           = module.s3.frontend_bucket_id
  s3_bucket_domain_name  = module.s3.frontend_bucket_domain_name
  domain_name            = var.domain_name
  certificate_arn        = var.certificate_arn
  
  # Backend API origin
  backend_domain_name = module.ecs.alb_dns_name
  
  tags = local.common_tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.app_name}-${var.environment}-jwt-secret"
  description = "JWT secret for authentication"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "smtp_username" {
  name        = "${var.app_name}-${var.environment}-smtp-username"
  description = "SMTP username for email service"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "smtp_username" {
  secret_id     = aws_secretsmanager_secret.smtp_username.id
  secret_string = var.smtp_username
}

resource "aws_secretsmanager_secret" "smtp_password" {
  name        = "${var.app_name}-${var.environment}-smtp-password"
  description = "SMTP password for email service"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "smtp_password" {
  secret_id     = aws_secretsmanager_secret.smtp_password.id
  secret_string = var.smtp_password
}

# CloudWatch Monitoring
module "monitoring" {
  source = "../../modules/monitoring"

  environment = var.environment
  app_name   = var.app_name
  
  # Resources to monitor
  ecs_cluster_name   = module.ecs.cluster_name
  ecs_service_name   = module.ecs.backend_service_name
  alb_arn_suffix     = module.ecs.alb_arn_suffix
  target_group_arn_suffix = module.ecs.target_group_arn_suffix
  rds_instance_id    = module.rds.db_instance_id
  
  # Alarm configuration
  alarm_email = var.alarm_email
  
  tags = local.common_tags
}

