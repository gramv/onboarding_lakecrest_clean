# 🚀 AWS Quick Start Guide

Get your Hotel Employee Onboarding System running on AWS in under 2 hours!

## Prerequisites (15 minutes)

### 1. AWS Account Setup
```bash
# Create AWS account at https://aws.amazon.com
# Enable billing alerts
# Create IAM user with AdministratorAccess
# Download access keys
```

### 2. Install Required Tools
```bash
# macOS
brew install awscli terraform docker

# Verify installations
aws --version        # Should be 2.x
terraform --version  # Should be 1.5+
docker --version     # Should be 20+
```

### 3. Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Default output format: json

# Test connection
aws sts get-caller-identity
```

---

## Option 1: Simplified Deployment (Fastest - 1 hour)

This option uses AWS Lightsail for a simple, cost-effective deployment.

### Step 1: Create Lightsail Container Service

```bash
# Create container service
aws lightsail create-container-service \
  --service-name hotel-onboarding \
  --power small \
  --scale 1

# Wait for service to be ready (takes ~5 minutes)
aws lightsail get-container-services \
  --service-name hotel-onboarding
```

### Step 2: Build and Push Containers

```bash
# Build images
cd backend
docker build -t hotel-onboarding-backend:latest .

cd ../frontend/hotel-onboarding-frontend
docker build -t hotel-onboarding-frontend:latest .

# Push to Lightsail
aws lightsail push-container-image \
  --service-name hotel-onboarding \
  --label backend \
  --image hotel-onboarding-backend:latest

aws lightsail push-container-image \
  --service-name hotel-onboarding \
  --label frontend \
  --image hotel-onboarding-frontend:latest
```

### Step 3: Deploy

Create `lightsail-deployment.json`:
```json
{
  "containers": {
    "backend": {
      "image": ":hotel-onboarding.backend.latest",
      "ports": {
        "8000": "HTTP"
      },
      "environment": {
        "ENVIRONMENT": "production",
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_KEY": "your-supabase-key",
        "JWT_SECRET": "your-jwt-secret"
      }
    },
    "frontend": {
      "image": ":hotel-onboarding.frontend.latest",
      "ports": {
        "80": "HTTP"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "frontend",
    "containerPort": 80,
    "healthCheck": {
      "path": "/"
    }
  }
}
```

Deploy:
```bash
aws lightsail create-container-service-deployment \
  --service-name hotel-onboarding \
  --cli-input-json file://lightsail-deployment.json
```

**Cost**: ~$40/month
**Pros**: Simple, fast setup
**Cons**: Limited scalability, no auto-scaling

---

## Option 2: Full AWS Deployment (Recommended - 2 hours)

Complete production-ready deployment with auto-scaling and high availability.

### Step 1: Prepare Environment Variables

```bash
# Create .env file for secrets
cat > terraform/environments/prod/.env << 'EOF'
export TF_VAR_db_password="$(openssl rand -base64 32)"
export TF_VAR_jwt_secret="$(openssl rand -base64 32)"
export TF_VAR_smtp_username="your-email@gmail.com"
export TF_VAR_smtp_password="your-gmail-app-password"
EOF

# Load environment variables
source terraform/environments/prod/.env
```

### Step 2: Create SSL Certificate

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1

# Note the certificate ARN
# Add DNS validation records to your domain
# Wait for validation (can take 5-30 minutes)
```

### Step 3: Configure Terraform

```bash
cd terraform/environments/prod

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars
nano terraform.tfvars
```

Update these values:
```hcl
domain_name     = "yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:xxx:certificate/xxx"
alarm_email     = "alerts@yourdomain.com"
```

### Step 4: Create Terraform State Bucket

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://hotel-onboarding-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hotel-onboarding-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket hotel-onboarding-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Step 5: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply (this takes ~15-20 minutes)
terraform apply

# Save outputs
terraform output > deployment-info.txt
```

### Step 6: Build and Deploy Application

```bash
# Make deploy script executable
chmod +x ../../scripts/deploy-to-aws.sh

# Run deployment
../../scripts/deploy-to-aws.sh prod
```

### Step 7: Update DNS

```bash
# Get CloudFront domain from Terraform output
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
ALB_DOMAIN=$(terraform output -raw alb_dns_name)

# Add these DNS records to your domain:
# yourdomain.com        CNAME  $CLOUDFRONT_DOMAIN
# api.yourdomain.com    CNAME  $ALB_DOMAIN
```

### Step 8: Verify Deployment

```bash
# Test backend
curl https://api.yourdomain.com/api/healthz

# Test frontend
curl https://yourdomain.com

# Check logs
aws logs tail /ecs/hotel-onboarding-backend --follow
```

**Cost**: ~$350/month
**Pros**: Production-ready, auto-scaling, high availability
**Cons**: More complex, higher cost

---

## Option 3: Hybrid Approach (Balanced - 1.5 hours)

Use AWS for compute, keep Supabase for database and storage.

### Step 1: Deploy Backend to ECS

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name hotel-onboarding

# Create ECR repository
aws ecr create-repository --repository-name hotel-onboarding-backend

# Build and push
cd backend
docker build -t hotel-onboarding-backend:latest .

# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Tag and push
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker tag hotel-onboarding-backend:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest
```

### Step 2: Create Task Definition

Create `task-definition.json`:
```json
{
  "family": "hotel-onboarding-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "backend",
    "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest",
    "portMappings": [{
      "containerPort": 8000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "ENVIRONMENT", "value": "production"},
      {"name": "SUPABASE_URL", "value": "your-supabase-url"},
      {"name": "SUPABASE_KEY", "value": "your-supabase-key"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/hotel-onboarding-backend",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

Register task:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 3: Deploy Frontend to Vercel

```bash
cd frontend/hotel-onboarding-frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-alb-url.amazonaws.com/api
```

**Cost**: ~$150/month + Supabase
**Pros**: Faster migration, simpler database management
**Cons**: Split infrastructure

---

## Post-Deployment Checklist

- [ ] SSL certificates configured and validated
- [ ] DNS records updated and propagated
- [ ] Environment variables set correctly
- [ ] Database migrations run successfully
- [ ] Health checks passing
- [ ] Monitoring dashboards configured
- [ ] Alarms set up and tested
- [ ] Backup strategy implemented
- [ ] Security groups reviewed
- [ ] IAM roles follow least privilege
- [ ] Cost alerts configured
- [ ] Documentation updated

---

## Troubleshooting

### Issue: ECS tasks keep restarting
```bash
# Check logs
aws logs tail /ecs/hotel-onboarding-backend --follow

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
```

### Issue: Cannot connect to database
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Verify RDS endpoint
aws rds describe-db-instances --db-instance-identifier hotel-onboarding
```

### Issue: High costs
```bash
# Check cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-10 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Common cost optimizations:
# - Use Reserved Instances for RDS
# - Enable S3 lifecycle policies
# - Right-size ECS tasks
# - Use CloudFront caching
```

---

## Next Steps

1. **Set up monitoring**: Configure CloudWatch dashboards
2. **Enable backups**: Automate database and document backups
3. **Load testing**: Test with expected traffic
4. **Security audit**: Run AWS Trusted Advisor
5. **Documentation**: Update team documentation
6. **Training**: Train team on AWS console

---

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com
- **Terraform Registry**: https://registry.terraform.io
- **AWS Support**: Consider Business tier for production
- **Community**: AWS re:Post forums

---

**Estimated Total Time**: 1-2 hours depending on option chosen
**Estimated Monthly Cost**: $40-$350 depending on option chosen

