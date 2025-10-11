# 🚀 AWS Deployment Plan - Hotel Employee Onboarding System

## Executive Summary

This plan outlines the complete packaging and deployment strategy for migrating the Hotel Employee Onboarding System to AWS, transforming it from a Heroku/Vercel deployment to a production-ready, scalable AWS infrastructure.

**Key Benefits:**
- ✅ **Scalability**: Auto-scaling with ECS Fargate
- ✅ **Cost Optimization**: Pay-per-use with reserved instances option
- ✅ **High Availability**: Multi-AZ deployment
- ✅ **Security**: VPC isolation, WAF, encryption at rest/transit
- ✅ **Compliance**: Federal compliance (I-9, W-4) with audit trails
- ✅ **Performance**: CloudFront CDN, RDS read replicas
- ✅ **Monitoring**: CloudWatch, X-Ray, automated alerts

---

## Architecture Overview

### Current State (Heroku/Vercel)
```
Frontend (Vercel) → Backend (Heroku) → Supabase (PostgreSQL + Storage)
```

### Target AWS Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Route 53 (DNS)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                          │
│  - Frontend (S3 Static Hosting)                              │
│  - API Cache                                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                 │
│  - SSL/TLS Termination                                       │
│  - WAF Integration                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    ECS Fargate Cluster                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Backend API  │  │ Backend API  │  │ Backend API  │      │
│  │  Container   │  │  Container   │  │  Container   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         (Auto-scaling 2-10 instances)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────┬───────────────┐
│   RDS PostgreSQL     │      S3 Buckets      │  ElastiCache  │
│   - Multi-AZ         │  - Documents         │  - Redis      │
│   - Encrypted        │  - Backups           │  - Sessions   │
│   - Auto Backup      │  - Encrypted         │               │
└──────────────────────┴──────────────────────┴───────────────┘
```

---

## Deployment Strategy

### Phase 1: Containerization (Week 1)
**Goal**: Package application into Docker containers

#### 1.1 Backend Docker Configuration
- Multi-stage Dockerfile for optimized image size
- Python 3.12 base image
- Production-ready Gunicorn/Uvicorn setup
- Health check endpoints
- Non-root user for security

#### 1.2 Frontend Docker Configuration
- Node 20 for build stage
- Nginx for serving static files
- Optimized build with Vite
- Environment variable injection at runtime

#### 1.3 Local Development Setup
- Docker Compose for full stack
- Hot reload for development
- Shared volumes for code changes
- Local PostgreSQL and Redis

**Deliverables:**
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `.dockerignore` files

---

### Phase 2: Infrastructure as Code (Week 2)
**Goal**: Define AWS infrastructure using Terraform

#### 2.1 Network Layer
```hcl
- VPC with public/private subnets across 3 AZs
- NAT Gateways for private subnet internet access
- Security Groups with least privilege
- Network ACLs for additional security
```

#### 2.2 Compute Layer
```hcl
- ECS Fargate cluster
- Task definitions for backend
- Auto-scaling policies (CPU/Memory based)
- Application Load Balancer
- Target groups with health checks
```

#### 2.3 Data Layer
```hcl
- RDS PostgreSQL 15 (Multi-AZ)
- Automated backups (7-day retention)
- Read replicas for reporting
- Parameter groups optimized for workload
```

#### 2.4 Storage Layer
```hcl
- S3 buckets:
  - documents-production (encrypted, versioned)
  - documents-staging
  - backups (lifecycle policies)
  - frontend-assets
- CloudFront distributions
```

#### 2.5 Caching Layer
```hcl
- ElastiCache Redis cluster
- Session storage
- API response caching
- Real-time WebSocket state
```

**Deliverables:**
- `terraform/` directory structure
- `terraform/modules/` for reusable components
- `terraform/environments/` for dev/staging/prod
- State management with S3 backend

---

### Phase 3: CI/CD Pipeline (Week 2-3)
**Goal**: Automated testing, building, and deployment

#### 3.1 GitHub Actions Workflows

**Backend Pipeline:**
```yaml
1. Code checkout
2. Run linting (flake8, black)
3. Run unit tests (pytest)
4. Run integration tests
5. Build Docker image
6. Push to ECR
7. Update ECS task definition
8. Deploy to ECS (blue/green)
9. Run smoke tests
10. Notify team
```

**Frontend Pipeline:**
```yaml
1. Code checkout
2. Run linting (ESLint)
3. Run type checking (TypeScript)
4. Run unit tests (Jest)
5. Build production bundle
6. Upload to S3
7. Invalidate CloudFront cache
8. Run E2E tests (Playwright)
9. Notify team
```

**Deliverables:**
- `.github/workflows/backend-deploy.yml`
- `.github/workflows/frontend-deploy.yml`
- `.github/workflows/test.yml`
- `.github/workflows/security-scan.yml`

---

### Phase 4: Data Migration (Week 3)
**Goal**: Migrate from Supabase to AWS

#### 4.1 Database Migration
```bash
1. Export Supabase schema
2. Create RDS instance
3. Apply schema to RDS
4. Test data migration with subset
5. Schedule maintenance window
6. Full data migration
7. Verify data integrity
8. Update connection strings
9. Monitor for issues
```

#### 4.2 Storage Migration
```bash
1. Create S3 buckets with proper structure
2. Copy documents from Supabase Storage to S3
3. Update document URLs in database
4. Implement S3 presigned URLs
5. Test document access
6. Verify encryption
```

**Deliverables:**
- `scripts/migrate-database.py`
- `scripts/migrate-storage.py`
- `scripts/verify-migration.py`
- Migration runbook

---

### Phase 5: Security & Compliance (Week 4)
**Goal**: Implement security best practices

#### 5.1 IAM Configuration
- Service roles for ECS tasks
- Least privilege policies
- Cross-account access (if needed)
- MFA enforcement for console access

#### 5.2 Encryption
- RDS encryption at rest (KMS)
- S3 bucket encryption (SSE-S3 or KMS)
- SSL/TLS for all traffic
- Secrets Manager for credentials

#### 5.3 Network Security
- WAF rules for common attacks
- DDoS protection with Shield
- VPC Flow Logs
- Security group auditing

#### 5.4 Compliance
- CloudTrail for audit logs
- Config for compliance monitoring
- Backup policies for I-9 retention (3 years)
- Data residency controls

**Deliverables:**
- IAM policies and roles
- KMS key configurations
- WAF rule sets
- Compliance documentation

---

### Phase 6: Monitoring & Observability (Week 4)
**Goal**: Full visibility into system health

#### 6.1 CloudWatch Setup
```
- Application logs (ECS → CloudWatch Logs)
- Metrics (CPU, Memory, Request count, Latency)
- Alarms (Error rate, Response time, Resource usage)
- Dashboards (Real-time system overview)
```

#### 6.2 AWS X-Ray
```
- Distributed tracing
- Service map visualization
- Performance bottleneck identification
- Error analysis
```

#### 6.3 Alerting
```
- PagerDuty/Slack integration
- Critical: Database down, API errors >5%
- Warning: High latency, Resource usage >80%
- Info: Deployment notifications
```

**Deliverables:**
- CloudWatch dashboard templates
- Alarm configurations
- X-Ray instrumentation
- Runbook for common issues

---

## Cost Estimation

### Monthly AWS Costs (Production)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 2-4 tasks (0.5 vCPU, 1GB RAM) | $30-60 |
| **RDS PostgreSQL** | db.t4g.small (Multi-AZ) | $60 |
| **ElastiCache Redis** | cache.t4g.micro | $15 |
| **S3 Storage** | 100GB + requests | $10 |
| **CloudFront** | 1TB transfer | $85 |
| **ALB** | Standard load balancer | $20 |
| **NAT Gateway** | 2 AZs | $65 |
| **Route 53** | Hosted zone + queries | $5 |
| **CloudWatch** | Logs + metrics | $20 |
| **Backups** | RDS + S3 snapshots | $15 |
| **Data Transfer** | Outbound | $20 |
| **Total** | | **~$345-375/month** |

**Cost Optimization Tips:**
- Use Reserved Instances for RDS (save 40%)
- Implement S3 lifecycle policies
- Use CloudFront caching aggressively
- Right-size ECS tasks based on metrics
- Use Spot instances for non-critical workloads

---

## Deployment Checklist

### Pre-Deployment
- [ ] AWS account setup with billing alerts
- [ ] Domain name registered/transferred to Route 53
- [ ] SSL certificate requested in ACM
- [ ] GitHub repository access configured
- [ ] Secrets documented and secured
- [ ] Team trained on AWS console

### Infrastructure Setup
- [ ] Terraform state bucket created
- [ ] VPC and networking deployed
- [ ] RDS instance provisioned
- [ ] S3 buckets created
- [ ] ECR repositories created
- [ ] ECS cluster configured

### Application Deployment
- [ ] Docker images built and pushed
- [ ] Database migrated and verified
- [ ] Storage migrated and verified
- [ ] Environment variables configured
- [ ] Backend deployed to ECS
- [ ] Frontend deployed to S3/CloudFront

### Post-Deployment
- [ ] DNS records updated
- [ ] SSL certificates validated
- [ ] Monitoring dashboards configured
- [ ] Alarms tested
- [ ] Backup/restore tested
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated

---

## Next Steps

1. **Review this plan** with your team
2. **Choose deployment approach**:
   - Option A: Full AWS migration (recommended for scale)
   - Option B: Hybrid (keep Supabase, use AWS for compute)
   - Option C: Gradual migration (staging first)
3. **Set up AWS account** and billing
4. **Start with Phase 1** (Containerization)
5. **Schedule migration window** for production

---

## Support & Resources

- **AWS Well-Architected Framework**: Best practices
- **AWS Support Plan**: Consider Business tier for production
- **Terraform Registry**: Pre-built modules
- **AWS Cost Explorer**: Monitor spending
- **AWS Trusted Advisor**: Optimization recommendations

