# 🔧 AWS Command Reference Guide

Quick reference for common AWS deployment and management commands.

---

## Setup & Configuration

### AWS CLI Setup
```bash
# Install AWS CLI (macOS)
brew install awscli

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)

# Verify configuration
aws sts get-caller-identity

# Get account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $AWS_ACCOUNT_ID
```

### Docker Setup
```bash
# Install Docker (macOS)
brew install docker

# Verify installation
docker --version

# Start Docker Desktop
open -a Docker
```

### Terraform Setup
```bash
# Install Terraform (macOS)
brew install terraform

# Verify installation
terraform --version
```

---

## Docker Commands

### Local Development
```bash
# Build backend image
cd backend
docker build -t hotel-onboarding-backend:latest .

# Build frontend image
cd frontend/hotel-onboarding-frontend
docker build -t hotel-onboarding-frontend:latest .

# Start all services with docker-compose
cd ../..
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

### Image Management
```bash
# List images
docker images

# Remove image
docker rmi hotel-onboarding-backend:latest

# Remove all unused images
docker image prune -a

# Check image size
docker images hotel-onboarding-backend:latest
```

---

## ECR (Elastic Container Registry)

### Repository Management
```bash
# Create repository
aws ecr create-repository \
  --repository-name hotel-onboarding-backend \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# List repositories
aws ecr describe-repositories

# Delete repository
aws ecr delete-repository \
  --repository-name hotel-onboarding-backend \
  --force
```

### Image Operations
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag hotel-onboarding-backend:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest

# Push image
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest

# List images in repository
aws ecr list-images --repository-name hotel-onboarding-backend

# Pull image
docker pull ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest
```

---

## ECS (Elastic Container Service)

### Cluster Management
```bash
# Create cluster
aws ecs create-cluster --cluster-name hotel-onboarding-prod

# List clusters
aws ecs list-clusters

# Describe cluster
aws ecs describe-clusters --clusters hotel-onboarding-prod

# Delete cluster
aws ecs delete-cluster --cluster hotel-onboarding-prod
```

### Service Management
```bash
# List services
aws ecs list-services --cluster hotel-onboarding-prod

# Describe service
aws ecs describe-services \
  --cluster hotel-onboarding-prod \
  --services hotel-onboarding-backend

# Update service (force new deployment)
aws ecs update-service \
  --cluster hotel-onboarding-prod \
  --service hotel-onboarding-backend \
  --force-new-deployment

# Scale service
aws ecs update-service \
  --cluster hotel-onboarding-prod \
  --service hotel-onboarding-backend \
  --desired-count 4

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster hotel-onboarding-prod \
  --services hotel-onboarding-backend
```

### Task Management
```bash
# List tasks
aws ecs list-tasks --cluster hotel-onboarding-prod

# Describe task
aws ecs describe-tasks \
  --cluster hotel-onboarding-prod \
  --tasks TASK_ARN

# Stop task
aws ecs stop-task \
  --cluster hotel-onboarding-prod \
  --task TASK_ARN

# Run one-off task
aws ecs run-task \
  --cluster hotel-onboarding-prod \
  --task-definition hotel-onboarding-backend \
  --count 1
```

---

## RDS (Relational Database Service)

### Database Management
```bash
# List databases
aws rds describe-db-instances

# Describe specific database
aws rds describe-db-instances \
  --db-instance-identifier hotel-onboarding-prod

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier hotel-onboarding-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier hotel-onboarding-prod \
  --db-snapshot-identifier hotel-onboarding-backup-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier hotel-onboarding-prod

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier hotel-onboarding-restored \
  --db-snapshot-identifier SNAPSHOT_ID
```

---

## S3 (Simple Storage Service)

### Bucket Management
```bash
# Create bucket
aws s3 mb s3://hotel-onboarding-documents-prod

# List buckets
aws s3 ls

# List bucket contents
aws s3 ls s3://hotel-onboarding-documents-prod/

# Delete bucket (must be empty)
aws s3 rb s3://hotel-onboarding-documents-prod
```

### File Operations
```bash
# Upload file
aws s3 cp file.pdf s3://hotel-onboarding-documents-prod/

# Upload directory
aws s3 sync ./dist s3://hotel-onboarding-frontend-prod/

# Download file
aws s3 cp s3://hotel-onboarding-documents-prod/file.pdf ./

# Delete file
aws s3 rm s3://hotel-onboarding-documents-prod/file.pdf

# Delete all files in bucket
aws s3 rm s3://hotel-onboarding-documents-prod/ --recursive
```

### Bucket Configuration
```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hotel-onboarding-documents-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket hotel-onboarding-documents-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket hotel-onboarding-documents-prod \
  --lifecycle-configuration file://lifecycle.json
```

---

## CloudFront

### Distribution Management
```bash
# List distributions
aws cloudfront list-distributions

# Get distribution details
aws cloudfront get-distribution --id DISTRIBUTION_ID

# Create invalidation (clear cache)
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"

# List invalidations
aws cloudfront list-invalidations --distribution-id DISTRIBUTION_ID
```

---

## CloudWatch

### Logs
```bash
# List log groups
aws logs describe-log-groups

# Tail logs (follow)
aws logs tail /ecs/hotel-onboarding-backend --follow

# Get logs for specific time range
aws logs filter-log-events \
  --log-group-name /ecs/hotel-onboarding-backend \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Create log group
aws logs create-log-group --log-group-name /ecs/hotel-onboarding-backend

# Delete log group
aws logs delete-log-group --log-group-name /ecs/hotel-onboarding-backend
```

### Metrics
```bash
# Get CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=hotel-onboarding-backend \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# List metrics
aws cloudwatch list-metrics --namespace AWS/ECS
```

### Alarms
```bash
# List alarms
aws cloudwatch describe-alarms

# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# Delete alarm
aws cloudwatch delete-alarms --alarm-names high-cpu
```

---

## Terraform

### Basic Commands
```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt

# Plan changes
terraform plan

# Plan and save to file
terraform plan -out=tfplan

# Apply changes
terraform apply

# Apply saved plan
terraform apply tfplan

# Destroy all resources
terraform destroy

# Show current state
terraform show

# List resources
terraform state list
```

### Workspace Management
```bash
# List workspaces
terraform workspace list

# Create workspace
terraform workspace new staging

# Switch workspace
terraform workspace select prod

# Delete workspace
terraform workspace delete staging
```

### Output & Variables
```bash
# Show outputs
terraform output

# Show specific output
terraform output alb_dns_name

# Set variable via command line
terraform apply -var="db_password=mypassword"

# Set variable via environment
export TF_VAR_db_password="mypassword"
terraform apply
```

---

## Deployment Script

### Quick Deploy
```bash
# Make script executable
chmod +x scripts/deploy-to-aws.sh

# Deploy to production
./scripts/deploy-to-aws.sh prod

# Deploy to staging
./scripts/deploy-to-aws.sh staging

# Deploy to development
./scripts/deploy-to-aws.sh dev
```

---

## Monitoring & Debugging

### Check Service Health
```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, 'hotel-onboarding')].DNSName" \
  --output text)

# Test health endpoint
curl http://$ALB_DNS/api/healthz

# Test with verbose output
curl -v http://$ALB_DNS/api/healthz
```

### Debug ECS Tasks
```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster hotel-onboarding-prod \
  --service-name hotel-onboarding-backend \
  --query 'taskArns[0]' \
  --output text)

# Describe task
aws ecs describe-tasks \
  --cluster hotel-onboarding-prod \
  --tasks $TASK_ARN

# Get task logs
aws logs tail /ecs/hotel-onboarding-backend --follow
```

### Check Costs
```bash
# Get cost for last 7 days
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '7 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Get current month cost
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Useful One-Liners

```bash
# Get all running ECS tasks
aws ecs list-tasks --cluster hotel-onboarding-prod --desired-status RUNNING

# Get RDS endpoint
aws rds describe-db-instances --query 'DBInstances[0].Endpoint.Address' --output text

# Get CloudFront distribution domain
aws cloudfront list-distributions --query 'DistributionList.Items[0].DomainName' --output text

# Count objects in S3 bucket
aws s3 ls s3://hotel-onboarding-documents-prod --recursive | wc -l

# Get latest ECR image tag
aws ecr describe-images --repository-name hotel-onboarding-backend \
  --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]' --output text

# Check if service is stable
aws ecs describe-services --cluster hotel-onboarding-prod \
  --services hotel-onboarding-backend \
  --query 'services[0].deployments[0].rolloutState' --output text
```

---

## Emergency Commands

### Rollback Deployment
```bash
# Get previous task definition
PREVIOUS_TASK=$(aws ecs describe-services \
  --cluster hotel-onboarding-prod \
  --services hotel-onboarding-backend \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

# Rollback to previous version
aws ecs update-service \
  --cluster hotel-onboarding-prod \
  --service hotel-onboarding-backend \
  --task-definition $PREVIOUS_TASK \
  --force-new-deployment
```

### Scale Down (Emergency)
```bash
# Scale to 0 (stop all tasks)
aws ecs update-service \
  --cluster hotel-onboarding-prod \
  --service hotel-onboarding-backend \
  --desired-count 0
```

### Clear CloudFront Cache
```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

---

**Tip**: Save commonly used commands as shell aliases in your `~/.zshrc` or `~/.bashrc`!

