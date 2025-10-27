# 🚀 AWS Deployment Plan - Hotel Onboarding System

**Date**: 2025-10-23  
**Current Status**: Deployed on Heroku (Backend) + Vercel (Frontend) + Supabase (Database)  
**Target**: Full AWS deployment with production-grade infrastructure

---

## 📋 Executive Summary

### Current Architecture
- **Backend**: Heroku (ordermanagement app)
- **Frontend**: Vercel (hotel-onboarding-frontend)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (documents, QR codes)

### Target AWS Architecture
- **Backend**: ECS Fargate (containerized FastAPI)
- **Frontend**: S3 + CloudFront (static React app)
- **Database**: RDS PostgreSQL (or continue with Supabase)
- **Storage**: S3 (documents, QR codes)
- **Load Balancer**: Application Load Balancer (ALB)
- **CDN**: CloudFront
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch + Container Insights
- **CI/CD**: GitHub Actions

### Estimated Monthly Cost
- **Option A (Full AWS)**: ~$150-200/month
  - RDS PostgreSQL: $30-50
  - ECS Fargate: $40-60
  - ALB: $20-25
  - S3 + CloudFront: $10-20
  - Data Transfer: $20-30
  - Secrets Manager: $5-10

- **Option B (Hybrid - Keep Supabase)**: ~$100-130/month
  - Supabase Pro: $25
  - ECS Fargate: $40-60
  - ALB: $20-25
  - S3 + CloudFront: $10-20
  - Data Transfer: $10-20

---

## 🎯 Deployment Strategy

### Phase 1: Infrastructure Setup (Week 1)
**Goal**: Provision all AWS resources using Terraform

**Tasks**:
1. ✅ Review existing Terraform configuration
2. ✅ Set up AWS account and IAM users
3. ✅ Configure Terraform backend (S3 + DynamoDB for state)
4. ✅ Provision VPC, subnets, security groups
5. ✅ Create ECR repositories
6. ✅ Set up RDS PostgreSQL (or configure Supabase connection)
7. ✅ Create S3 buckets for storage
8. ✅ Configure Secrets Manager
9. ✅ Set up CloudWatch log groups

**Deliverables**:
- Terraform state in S3
- All infrastructure provisioned
- Network diagram
- Security group rules documented

---

### Phase 2: Database Migration (Week 1-2)
**Goal**: Migrate from Supabase to RDS (or configure hybrid setup)

**Option A: Full Migration to RDS**
1. Export Supabase schema and data
2. Create RDS instance with PostgreSQL 15
3. Apply schema migrations
4. Migrate data (employees, applications, documents metadata)
5. Update RLS policies to PostgreSQL RLS
6. Test database connectivity

**Option B: Keep Supabase (Recommended for faster deployment)**
1. Configure VPC peering or public access
2. Update security groups to allow Supabase connection
3. Test connectivity from ECS tasks
4. No data migration needed

**Recommendation**: Start with Option B (keep Supabase) for faster deployment, migrate to RDS later if needed.

---

### Phase 3: Container Preparation (Week 2)
**Goal**: Build and test production Docker images

**Backend Container**:
1. ✅ Review existing `backend/Dockerfile`
2. ✅ Build multi-stage image
3. ✅ Test locally with docker-compose
4. ✅ Optimize image size (currently ~600MB)
5. ✅ Add health check endpoint
6. ✅ Configure environment variables
7. ✅ Test with production-like settings

**Frontend Container**:
1. ✅ Review existing `frontend/Dockerfile`
2. ✅ Build Nginx-based static serving
3. ✅ Configure environment variable injection
4. ✅ Test locally
5. ✅ Optimize bundle size
6. ✅ Configure caching headers

**Commands**:
```bash
# Build backend
cd backend
docker build -t hotel-onboarding-backend:latest .

# Build frontend
cd frontend/hotel-onboarding-frontend
docker build -t hotel-onboarding-frontend:latest .

# Test locally
docker-compose -f deployment/docker/docker-compose.yml up
```

---

### Phase 4: ECR Setup & Image Push (Week 2)
**Goal**: Push Docker images to AWS ECR

**Steps**:
1. Create ECR repositories (via Terraform)
2. Authenticate Docker to ECR
3. Tag images with version numbers
4. Push images to ECR
5. Enable image scanning
6. Set up lifecycle policies

**Commands**:
```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push backend
docker tag hotel-onboarding-backend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/onboarding-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/onboarding-backend:latest

# Tag and push frontend
docker tag hotel-onboarding-frontend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/onboarding-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/onboarding-frontend:latest
```

---

### Phase 5: Secrets Management (Week 2)
**Goal**: Migrate all secrets to AWS Secrets Manager

**Secrets to Migrate**:
1. Database credentials (if using RDS)
2. Supabase URL and keys (if keeping Supabase)
3. JWT secret
4. Encryption keys (ENCRYPTION_KEY, DOCUMENT_ENCRYPTION_KEY)
5. SMTP credentials
6. Google OCR credentials
7. Groq API key
8. OpenAI API key (if used)

**Script**:
```bash
# Use existing script
cd deployment/scripts
python generate_keys.py  # Generate new production keys
./upload_secrets.sh production
```

**Secrets Structure**:
```json
{
  "onboarding/database/credentials": {
    "url": "postgresql://...",
    "host": "...",
    "port": "5432",
    "database": "onboarding",
    "username": "postgres",
    "password": "..."
  },
  "onboarding/encryption/keys": {
    "encryption_key": "...",
    "jwt_secret": "...",
    "document_encryption_key": "..."
  },
  "onboarding/smtp/credentials": {
    "host": "smtp.gmail.com",
    "port": "465",
    "username": "...",
    "password": "..."
  }
}
```

---

### Phase 6: ECS Deployment (Week 3)
**Goal**: Deploy backend and frontend to ECS Fargate

**Backend Service**:
- Task Definition: 512 CPU, 1024 MB memory
- Desired Count: 2 (for high availability)
- Health Check: `/api/health`
- Auto-scaling: 1-10 tasks based on CPU/memory

**Frontend Service**:
- Task Definition: 256 CPU, 512 MB memory
- Desired Count: 2
- Health Check: `/health`
- Auto-scaling: 1-5 tasks

**Deployment Steps**:
1. Create task definitions (via Terraform)
2. Create ECS services
3. Configure ALB target groups
4. Set up health checks
5. Configure auto-scaling policies
6. Test service deployment

---

### Phase 7: Load Balancer & DNS (Week 3)
**Goal**: Configure ALB and domain routing

**ALB Configuration**:
- Listener: HTTP (80) → HTTPS (443) redirect
- Listener: HTTPS (443) → Target groups
- Rules:
  - `/api/*` → Backend target group
  - `/*` → Frontend target group

**SSL Certificate**:
1. Request certificate in ACM
2. Validate domain ownership
3. Attach to ALB HTTPS listener

**DNS Configuration**:
1. Create Route 53 hosted zone (or use existing)
2. Point domain to ALB
3. Configure health checks

---

### Phase 8: S3 & CloudFront (Week 3)
**Goal**: Set up S3 for document storage and CloudFront for CDN

**S3 Buckets**:
1. `onboarding-documents-prod` (private)
2. `onboarding-qr-codes-prod` (public-read)
3. `onboarding-frontend-prod` (optional, for static hosting)

**CloudFront Distribution**:
- Origin: ALB (for dynamic content)
- Origin: S3 (for static assets)
- Cache behaviors configured
- SSL certificate attached
- Geo-restrictions if needed

---

### Phase 9: Monitoring & Logging (Week 4)
**Goal**: Set up comprehensive monitoring

**CloudWatch**:
1. Container Insights enabled
2. Custom metrics for:
   - API response times
   - Error rates
   - Document uploads
   - Email delivery
3. Alarms for:
   - High CPU/memory
   - Error rate spikes
   - Health check failures

**Log Aggregation**:
- Backend logs → CloudWatch Logs
- Frontend logs → CloudWatch Logs
- Retention: 30 days
- Log insights queries for debugging

---

### Phase 10: CI/CD Pipeline (Week 4)
**Goal**: Automate deployments with GitHub Actions

**Workflow**:
1. Code push to `main` branch
2. Run tests (backend + frontend)
3. Build Docker images
4. Push to ECR
5. Update ECS task definitions
6. Deploy to ECS
7. Run smoke tests
8. Notify on Slack/email

**Files**:
- `.github/workflows/deploy-backend.yml` (already exists)
- `.github/workflows/deploy-frontend.yml` (already exists)

**Enhancements Needed**:
- Update ECR repository names
- Update ECS cluster/service names
- Add rollback on failure
- Add deployment approval for production

---

## 📊 Detailed Task Breakdown

### Pre-Deployment Checklist

#### AWS Account Setup
- [ ] Create AWS account (or use existing)
- [ ] Set up billing alerts
- [ ] Create IAM admin user
- [ ] Configure MFA
- [ ] Create deployment IAM role
- [ ] Install and configure AWS CLI

#### Local Development Setup
- [ ] Install Terraform (>= 1.5.0)
- [ ] Install Docker Desktop
- [ ] Install AWS CLI v2
- [ ] Configure AWS credentials
- [ ] Clone repository
- [ ] Review existing infrastructure code

#### Environment Preparation
- [ ] Generate new production encryption keys
- [ ] Prepare SMTP credentials
- [ ] Prepare OCR API keys (Google/Groq)
- [ ] Document all environment variables
- [ ] Create `.env.production` template

---

### Infrastructure Deployment (Terraform)

#### Step 1: Initialize Terraform Backend
```bash
cd deployment/infrastructure

# Create S3 bucket for state
aws s3 mb s3://onboarding-terraform-state-<account-id>

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Initialize Terraform
terraform init
```

#### Step 2: Review and Customize Variables
```bash
# Edit terraform.tfvars
cat > terraform.tfvars <<EOF
project_name = "onboarding"
environment = "production"
aws_region = "us-east-1"

# VPC
vpc_cidr = "10.0.0.0/16"
enable_nat_gateway = true
single_nat_gateway = true

# RDS (if using)
db_instance_class = "db.t3.small"
db_allocated_storage = 20
db_multi_az = false

# ECS
ecs_backend_cpu = 512
ecs_backend_memory = 1024
ecs_backend_desired_count = 2

ecs_frontend_cpu = 256
ecs_frontend_memory = 512
ecs_frontend_desired_count = 2

# Domain (optional)
domain_name = "onboarding.yourdomain.com"
EOF
```

#### Step 3: Plan and Apply
```bash
# Plan
terraform plan -out=tfplan

# Review plan carefully
# Apply
terraform apply tfplan

# Save outputs
terraform output > ../outputs.txt
```

---

## 🔧 Configuration Updates Needed

### Backend Configuration

#### Update `backend/app/main_enhanced.py`
- Add AWS S3 client initialization
- Update document storage to use S3 instead of Supabase Storage
- Configure CloudWatch logging
- Add health check improvements

#### Update Environment Loading
- Ensure Secrets Manager integration
- Add fallback for local development
- Document all required environment variables

### Frontend Configuration

#### Update `frontend/hotel-onboarding-frontend/src/config/api.ts`
- Update API URL to ALB endpoint
- Configure CloudFront URL for assets
- Update Supabase URL (if keeping Supabase)

#### Update Build Configuration
- Optimize Vite build for production
- Configure environment variable injection
- Update nginx configuration for CloudFront

---

## 🧪 Testing Strategy

### Pre-Deployment Testing
1. **Local Docker Testing**
   ```bash
   cd deployment/docker
   docker-compose up
   # Test all features locally
   ```

2. **Integration Testing**
   - Test database connectivity
   - Test S3 uploads
   - Test email sending
   - Test OCR functionality

### Post-Deployment Testing
1. **Smoke Tests**
   - Health endpoints
   - Login functionality
   - Document upload
   - PDF generation

2. **Load Testing**
   - Use existing test scripts
   - Simulate 100 concurrent users
   - Monitor CloudWatch metrics

3. **Security Testing**
   - SSL certificate validation
   - Security group rules
   - IAM permissions
   - Encryption at rest/transit

---

## 🚨 Rollback Plan

### Immediate Rollback (< 5 minutes)
```bash
# Rollback ECS service to previous task definition
aws ecs update-service \
  --cluster onboarding-production-cluster \
  --service onboarding-backend \
  --task-definition onboarding-backend:PREVIOUS_VERSION

# Or use script
cd deployment/scripts
./rollback.sh production backend
```

### Full Rollback (< 30 minutes)
1. Point DNS back to Heroku/Vercel
2. Restore database from snapshot (if migrated)
3. Notify users of temporary issues
4. Investigate and fix issues
5. Re-deploy when ready

---

## 📈 Success Metrics

### Deployment Success Criteria
- [ ] All services healthy in ECS
- [ ] ALB health checks passing
- [ ] Frontend accessible via domain
- [ ] Backend API responding
- [ ] Database connectivity working
- [ ] S3 uploads working
- [ ] Email sending working
- [ ] OCR processing working
- [ ] No errors in CloudWatch logs
- [ ] Response times < 500ms (p95)

### Performance Targets
- API response time: < 200ms (p50), < 500ms (p95)
- Frontend load time: < 2s
- Document upload: < 5s for 10MB file
- PDF generation: < 3s
- Email delivery: < 10s
- Uptime: 99.9%

---

## 📝 Documentation Requirements

### Post-Deployment Documentation
1. **Architecture Diagram**
   - VPC layout
   - Service dependencies
   - Data flow

2. **Runbook**
   - Common operations
   - Troubleshooting guide
   - Scaling procedures

3. **Disaster Recovery**
   - Backup procedures
   - Restore procedures
   - RTO/RPO targets

4. **Cost Optimization**
   - Resource utilization
   - Optimization opportunities
   - Reserved instance recommendations

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. Review this deployment plan
2. Confirm AWS account access
3. Review and update Terraform configuration
4. Test Docker images locally
5. Generate production secrets

### Week 1 Tasks
1. Provision infrastructure with Terraform
2. Set up ECR and push images
3. Configure Secrets Manager
4. Test database connectivity

### Week 2 Tasks
1. Deploy to ECS (staging environment first)
2. Configure ALB and SSL
3. Set up monitoring
4. Run integration tests

### Week 3 Tasks
1. Deploy to production
2. Configure CI/CD
3. Monitor and optimize
4. Document everything

### Week 4 Tasks
1. Performance tuning
2. Cost optimization
3. Security hardening
4. Team training

---

## ⚠️ Risks and Mitigation

### Risk 1: Database Migration Issues
**Impact**: High  
**Probability**: Medium  
**Mitigation**: 
- Start with Supabase (no migration)
- Migrate to RDS later if needed
- Test migration in staging first
- Have rollback plan ready

### Risk 2: Downtime During Migration
**Impact**: High  
**Probability**: Low  
**Mitigation**:
- Blue-green deployment
- DNS cutover strategy
- Parallel running of old and new systems
- Gradual traffic shift

### Risk 3: Cost Overruns
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- Set up billing alerts
- Use cost calculator
- Start with minimal resources
- Scale up as needed
- Monitor daily costs

### Risk 4: Security Vulnerabilities
**Impact**: High  
**Probability**: Low  
**Mitigation**:
- Security group review
- IAM least privilege
- Encryption everywhere
- Regular security audits
- Penetration testing

---

## 💡 Recommendations

### Recommended Approach: Hybrid Deployment
1. **Keep Supabase for Database** (initially)
   - Proven and working
   - No migration risk
   - Can migrate to RDS later

2. **Deploy Backend to ECS**
   - Better control
   - Cost-effective
   - Scalable

3. **Deploy Frontend to S3 + CloudFront**
   - Faster than Vercel
   - More cost-effective
   - Better caching

4. **Use S3 for Document Storage**
   - More control
   - Better integration
   - Cost-effective

### Timeline: 3-4 Weeks
- Week 1: Infrastructure + Testing
- Week 2: Staging Deployment
- Week 3: Production Deployment
- Week 4: Optimization + Documentation

### Budget: $150-200/month
- Lower than current Heroku + Vercel costs
- More scalable
- Better performance

---

## 📞 Support and Resources

### AWS Resources
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

### Internal Resources
- Existing Terraform code: `deployment/infrastructure/`
- Deployment scripts: `deployment/scripts/`
- Docker configurations: `deployment/docker/`
- GitHub Actions: `.github/workflows/`

### Team Training
- AWS Console navigation
- ECS service management
- CloudWatch monitoring
- Terraform basics
- Rollback procedures

---

**Status**: ✅ READY FOR REVIEW  
**Next Action**: Review plan and confirm approach  
**Owner**: DevOps Team  
**Timeline**: 3-4 weeks from approval

