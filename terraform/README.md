# Terraform Infrastructure for Hotel Onboarding System

This directory contains Infrastructure as Code (IaC) for deploying the Hotel Employee Onboarding System to AWS.

## Directory Structure

```
terraform/
├── modules/                    # Reusable Terraform modules
│   ├── networking/            # VPC, subnets, security groups
│   ├── ecs/                   # ECS cluster, services, tasks
│   ├── rds/                   # PostgreSQL database
│   ├── s3/                    # S3 buckets for storage
│   ├── cloudfront/            # CDN for frontend
│   └── monitoring/            # CloudWatch, alarms
├── environments/              # Environment-specific configs
│   ├── dev/                   # Development environment
│   ├── staging/               # Staging environment
│   └── prod/                  # Production environment
└── backend.tf                 # Terraform state backend config
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.5.0 installed
3. **AWS CLI** configured with credentials
4. **S3 bucket** for Terraform state (create manually first)

## Quick Start

### 1. Initialize Terraform State Backend

First, create an S3 bucket for Terraform state:

```bash
aws s3 mb s3://hotel-onboarding-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket hotel-onboarding-terraform-state \
  --versioning-configuration Status=Enabled
```

### 2. Deploy Development Environment

```bash
cd environments/dev
terraform init
terraform plan
terraform apply
```

### 3. Deploy Production Environment

```bash
cd environments/prod
terraform init
terraform plan
terraform apply
```

## Environment Variables

Each environment requires these variables (set in `terraform.tfvars`):

```hcl
# AWS Configuration
aws_region = "us-east-1"
environment = "prod"

# Application Configuration
app_name = "hotel-onboarding"
domain_name = "yourdomain.com"

# Database Configuration
db_instance_class = "db.t4g.small"
db_allocated_storage = 20
db_name = "hotel_onboarding"
db_username = "admin"
# db_password set via environment variable: TF_VAR_db_password

# ECS Configuration
ecs_task_cpu = "512"
ecs_task_memory = "1024"
ecs_desired_count = 2
ecs_min_capacity = 2
ecs_max_capacity = 10

# Secrets (set via environment variables)
# TF_VAR_jwt_secret
# TF_VAR_smtp_username
# TF_VAR_smtp_password
# TF_VAR_supabase_url (if keeping Supabase)
# TF_VAR_supabase_key (if keeping Supabase)
```

## Deployment Steps

### Step 1: Set Environment Variables

```bash
export TF_VAR_db_password="your-secure-db-password"
export TF_VAR_jwt_secret="your-super-secret-jwt-key-min-32-chars"
export TF_VAR_smtp_username="your-email@gmail.com"
export TF_VAR_smtp_password="your-gmail-app-password"
```

### Step 2: Initialize Terraform

```bash
cd environments/prod
terraform init
```

### Step 3: Review Plan

```bash
terraform plan -out=tfplan
```

### Step 4: Apply Infrastructure

```bash
terraform apply tfplan
```

### Step 5: Get Outputs

```bash
terraform output
```

This will show:
- Load balancer DNS name
- RDS endpoint
- S3 bucket names
- CloudFront distribution URL

## Module Documentation

### Networking Module

Creates:
- VPC with CIDR 10.0.0.0/16
- 3 public subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
- 3 private subnets (10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24)
- Internet Gateway
- NAT Gateways (one per AZ)
- Route tables
- Security groups

### ECS Module

Creates:
- ECS Fargate cluster
- Task definitions for backend
- ECS services with auto-scaling
- Application Load Balancer
- Target groups
- CloudWatch log groups

### RDS Module

Creates:
- RDS PostgreSQL instance (Multi-AZ)
- DB subnet group
- DB parameter group
- Security group
- Automated backups
- CloudWatch alarms

### S3 Module

Creates:
- Document storage bucket (encrypted)
- Backup bucket (with lifecycle policies)
- Frontend assets bucket
- Bucket policies
- CORS configuration

### CloudFront Module

Creates:
- CloudFront distribution for frontend
- Origin access identity
- Cache behaviors
- SSL certificate (ACM)

### Monitoring Module

Creates:
- CloudWatch dashboards
- Alarms for critical metrics
- SNS topics for notifications
- Log groups and metric filters

## Cost Estimation

Run cost estimation before applying:

```bash
terraform plan -out=tfplan
terraform show -json tfplan | infracost breakdown --path -
```

## Disaster Recovery

### Backup Strategy

1. **Database**: Automated daily backups (7-day retention)
2. **Documents**: S3 versioning enabled
3. **Infrastructure**: Terraform state in S3 with versioning

### Restore Procedure

```bash
# Restore database from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier hotel-onboarding-restored \
  --db-snapshot-identifier snapshot-name

# Restore S3 objects
aws s3api restore-object \
  --bucket hotel-onboarding-documents \
  --key path/to/file \
  --restore-request Days=7
```

## Troubleshooting

### Common Issues

**Issue**: Terraform state lock
```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

**Issue**: ECS tasks failing to start
```bash
# Check logs
aws logs tail /ecs/hotel-onboarding-backend --follow
```

**Issue**: Database connection timeout
```bash
# Verify security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

## Maintenance

### Update Infrastructure

```bash
# Pull latest changes
git pull

# Review changes
terraform plan

# Apply updates
terraform apply
```

### Scale Services

Update `terraform.tfvars`:
```hcl
ecs_desired_count = 4  # Increase from 2
```

Then apply:
```bash
terraform apply
```

### Destroy Environment

⚠️ **WARNING**: This will delete all resources!

```bash
terraform destroy
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use AWS Secrets Manager** for sensitive data
3. **Enable MFA** on AWS account
4. **Rotate credentials** regularly
5. **Review IAM policies** for least privilege
6. **Enable CloudTrail** for audit logging
7. **Use VPC endpoints** to avoid internet traffic
8. **Encrypt all data** at rest and in transit

## Support

For issues or questions:
1. Check Terraform logs: `terraform apply -debug`
2. Review AWS CloudWatch logs
3. Check AWS Service Health Dashboard
4. Consult AWS documentation

## References

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

