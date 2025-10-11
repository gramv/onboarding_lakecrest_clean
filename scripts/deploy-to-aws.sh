#!/bin/bash

# Hotel Employee Onboarding System - AWS Deployment Script
# This script automates the deployment process to AWS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}
APP_NAME="hotel-onboarding"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Hotel Onboarding System - AWS Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Prerequisites Check
echo -e "\n${BLUE}Step 1: Checking Prerequisites${NC}"

if ! command_exists aws; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi
print_success "AWS CLI installed"

if ! command_exists docker; then
    print_error "Docker not found. Please install it first."
    exit 1
fi
print_success "Docker installed"

if ! command_exists terraform; then
    print_warning "Terraform not found. Skipping infrastructure deployment."
    SKIP_TERRAFORM=true
else
    print_success "Terraform installed"
fi

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
print_success "AWS credentials configured"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_info "AWS Account ID: $ACCOUNT_ID"

# Step 2: Build Docker Images
echo -e "\n${BLUE}Step 2: Building Docker Images${NC}"

# Build backend
print_info "Building backend image..."
cd backend
docker build -t ${APP_NAME}-backend:latest .
print_success "Backend image built"

# Build frontend
print_info "Building frontend image..."
cd ../frontend/hotel-onboarding-frontend
docker build -t ${APP_NAME}-frontend:latest .
print_success "Frontend image built"

cd ../..

# Step 3: Push to ECR
echo -e "\n${BLUE}Step 3: Pushing Images to ECR${NC}"

# Login to ECR
print_info "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
print_success "Logged in to ECR"

# Create ECR repositories if they don't exist
for repo in backend frontend; do
    if ! aws ecr describe-repositories --repository-names ${APP_NAME}-${repo} >/dev/null 2>&1; then
        print_info "Creating ECR repository: ${APP_NAME}-${repo}"
        aws ecr create-repository \
            --repository-name ${APP_NAME}-${repo} \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            --region $AWS_REGION
        print_success "Repository created"
    else
        print_info "Repository ${APP_NAME}-${repo} already exists"
    fi
done

# Tag and push backend
print_info "Pushing backend image..."
docker tag ${APP_NAME}-backend:latest \
    ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:latest
docker tag ${APP_NAME}-backend:latest \
    ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:$(git rev-parse --short HEAD)
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:$(git rev-parse --short HEAD)
print_success "Backend image pushed"

# Tag and push frontend
print_info "Pushing frontend image..."
docker tag ${APP_NAME}-frontend:latest \
    ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:latest
docker tag ${APP_NAME}-frontend:latest \
    ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:$(git rev-parse --short HEAD)
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:$(git rev-parse --short HEAD)
print_success "Frontend image pushed"

# Step 4: Deploy Infrastructure with Terraform
if [ "$SKIP_TERRAFORM" != "true" ]; then
    echo -e "\n${BLUE}Step 4: Deploying Infrastructure with Terraform${NC}"
    
    cd terraform/environments/${ENVIRONMENT}
    
    # Check if terraform.tfvars exists
    if [ ! -f terraform.tfvars ]; then
        print_error "terraform.tfvars not found. Please create it from terraform.tfvars.example"
        exit 1
    fi
    
    # Initialize Terraform
    print_info "Initializing Terraform..."
    terraform init
    print_success "Terraform initialized"
    
    # Plan
    print_info "Planning infrastructure changes..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    read -p "Do you want to apply these changes? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    # Apply
    print_info "Applying infrastructure changes..."
    terraform apply tfplan
    print_success "Infrastructure deployed"
    
    # Get outputs
    echo -e "\n${GREEN}Deployment Outputs:${NC}"
    terraform output
    
    cd ../../..
else
    print_warning "Skipping Terraform deployment"
fi

# Step 5: Update ECS Service
echo -e "\n${BLUE}Step 5: Updating ECS Service${NC}"

ECS_CLUSTER="${APP_NAME}-${ENVIRONMENT}"
ECS_SERVICE="${APP_NAME}-backend"

if aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE >/dev/null 2>&1; then
    print_info "Updating ECS service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --force-new-deployment \
        --region $AWS_REGION
    print_success "ECS service updated"
    
    print_info "Waiting for service to stabilize..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE \
        --region $AWS_REGION
    print_success "Service is stable"
else
    print_warning "ECS service not found. Please deploy infrastructure first."
fi

# Step 6: Deploy Frontend to S3
echo -e "\n${BLUE}Step 6: Deploying Frontend to S3${NC}"

S3_BUCKET="${APP_NAME}-frontend-${ENVIRONMENT}"

if aws s3 ls s3://$S3_BUCKET >/dev/null 2>&1; then
    print_info "Building frontend..."
    cd frontend/hotel-onboarding-frontend
    npm install
    npm run build
    
    print_info "Uploading to S3..."
    aws s3 sync dist/ s3://$S3_BUCKET/ \
        --delete \
        --cache-control "public,max-age=31536000,immutable" \
        --exclude "index.html" \
        --exclude "*.html"
    
    aws s3 sync dist/ s3://$S3_BUCKET/ \
        --exclude "*" \
        --include "*.html" \
        --cache-control "public,max-age=0,must-revalidate"
    
    print_success "Frontend deployed to S3"
    
    # Invalidate CloudFront cache
    CLOUDFRONT_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Origins.Items[?DomainName=='${S3_BUCKET}.s3.amazonaws.com']].Id" \
        --output text)
    
    if [ -n "$CLOUDFRONT_ID" ]; then
        print_info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_ID \
            --paths "/*"
        print_success "CloudFront cache invalidated"
    fi
    
    cd ../..
else
    print_warning "S3 bucket not found. Please deploy infrastructure first."
fi

# Step 7: Run Health Checks
echo -e "\n${BLUE}Step 7: Running Health Checks${NC}"

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, '${APP_NAME}')].DNSName" \
    --output text \
    --region $AWS_REGION)

if [ -n "$ALB_DNS" ]; then
    print_info "Testing backend health endpoint..."
    sleep 10  # Wait for deployment
    
    if curl -f -s "http://${ALB_DNS}/api/healthz" >/dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
else
    print_warning "ALB not found"
fi

# Final Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

if [ -n "$ALB_DNS" ]; then
    echo -e "Backend API: ${BLUE}http://${ALB_DNS}/api${NC}"
fi

if aws s3 ls s3://$S3_BUCKET >/dev/null 2>&1; then
    echo -e "Frontend S3: ${BLUE}http://${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com${NC}"
fi

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update DNS records to point to CloudFront/ALB"
echo "2. Configure SSL certificates in ACM"
echo "3. Run integration tests"
echo "4. Monitor CloudWatch logs and metrics"
echo "5. Set up CloudWatch alarms"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo "View logs: aws logs tail /ecs/${APP_NAME}-backend --follow"
echo "Check ECS tasks: aws ecs list-tasks --cluster ${ECS_CLUSTER}"
echo "View metrics: aws cloudwatch get-metric-statistics --namespace AWS/ECS"

