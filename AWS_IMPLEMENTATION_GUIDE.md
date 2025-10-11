# 🛠️ AWS Implementation Guide - Step-by-Step

This guide provides detailed, actionable steps to package and deploy your Hotel Employee Onboarding System to AWS.

---

## Quick Start Options

### Option 1: Full AWS Migration (Recommended)
**Best for**: Production deployment, scalability, full control
**Timeline**: 3-4 weeks
**Cost**: ~$350/month
**Complexity**: Medium-High

### Option 2: AWS ECS + Keep Supabase
**Best for**: Faster migration, lower complexity
**Timeline**: 1-2 weeks
**Cost**: ~$150/month + Supabase
**Complexity**: Medium

### Option 3: AWS Lightsail (Simplified)
**Best for**: Small deployments, budget-conscious
**Timeline**: 1 week
**Cost**: ~$40-80/month
**Complexity**: Low

---

## PHASE 1: Containerization

### Step 1.1: Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# Multi-stage build for optimized image size
FROM python:3.12-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.12-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appuser ./app ./app

# Set environment variables
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/healthz || exit 1

# Run application with Gunicorn
CMD ["gunicorn", "app.main_enhanced:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

### Step 1.2: Create Frontend Dockerfile

Create `frontend/hotel-onboarding-frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment variable injection script
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Step 1.3: Create Nginx Configuration

Create `frontend/hotel-onboarding-frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional, if backend on same domain)
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 1.4: Create Environment Variable Injection Script

Create `frontend/hotel-onboarding-frontend/env.sh`:

```bash
#!/bin/sh
# Replace environment variables in JavaScript files at runtime

# Create runtime config
cat <<EOF > /usr/share/nginx/html/config.js
window.ENV = {
  VITE_API_URL: "${VITE_API_URL}",
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}"
};
EOF

echo "Environment variables injected successfully"
```

### Step 1.5: Create Docker Compose for Local Development

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: hotel-onboarding-db
    environment:
      POSTGRES_DB: hotel_onboarding
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: hotel-onboarding-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hotel-onboarding-backend
    ports:
      - "8000:8000"
    environment:
      # Database
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/hotel_onboarding
      
      # Redis
      REDIS_URL: redis://redis:6379/0
      
      # JWT
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
      
      # Email (use your credentials)
      SMTP_HOST: smtp.gmail.com
      SMTP_PORT: 465
      SMTP_USERNAME: ${SMTP_USERNAME}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM_EMAIL: ${SMTP_FROM_EMAIL}
      
      # Frontend URL
      FRONTEND_URL: http://localhost:3000
      
      # Environment
      ENVIRONMENT: development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/app:/app/app
      - ./backend/document_storage:/app/document_storage
    command: uvicorn app.main_enhanced:app --host 0.0.0.0 --port 8000 --reload

  # Frontend
  frontend:
    build:
      context: ./frontend/hotel-onboarding-frontend
      dockerfile: Dockerfile
    container_name: hotel-onboarding-frontend
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: http://localhost:8000/api
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Step 1.6: Create .dockerignore Files

Create `backend/.dockerignore`:

```
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.env
.env.local
*.log
test_*.py
*_test.py
tests/
.pytest_cache/
.coverage
htmlcov/
.vscode/
.idea/
*.swp
.DS_Store
saved_documents/
document_storage/test_*
*.db
*.sqlite
```

Create `frontend/hotel-onboarding-frontend/.dockerignore`:

```
node_modules/
.pnp
.pnp.js
dist/
build/
.env
.env.local
.env.production
*.log
coverage/
.vscode/
.idea/
.DS_Store
*.swp
.vercel
src/__tests__/
```

### Step 1.7: Update Backend Requirements

Add Gunicorn to `backend/requirements.txt`:

```
gunicorn==21.2.0
```

### Step 1.8: Test Docker Build

```bash
# Build backend
cd backend
docker build -t hotel-onboarding-backend:latest .

# Build frontend
cd ../frontend/hotel-onboarding-frontend
docker build -t hotel-onboarding-frontend:latest .

# Test with docker-compose
cd ../..
docker-compose up -d

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost:8000/api/healthz
curl http://localhost:3000

# Stop containers
docker-compose down
```

---

## PHASE 2: AWS Infrastructure Setup

### Step 2.1: Install Required Tools

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install Terraform
brew install terraform

# Verify installations
aws --version
terraform --version
```

### Step 2.2: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json

# Test connection
aws sts get-caller-identity
```

### Step 2.3: Create Terraform Directory Structure

```bash
mkdir -p terraform/{modules,environments/{dev,staging,prod}}
```

Directory structure:
```
terraform/
├── modules/
│   ├── networking/
│   ├── ecs/
│   ├── rds/
│   ├── s3/
│   └── monitoring/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── backend.tf
```

---

## PHASE 3: Quick Deploy with AWS ECS (Simplified)

For a faster deployment, use this simplified approach:

### Step 3.1: Create ECR Repositories

```bash
# Create repositories for Docker images
aws ecr create-repository --repository-name hotel-onboarding-backend
aws ecr create-repository --repository-name hotel-onboarding-frontend

# Get login command
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  [YOUR-ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com
```

### Step 3.2: Push Docker Images

```bash
# Tag images
docker tag hotel-onboarding-backend:latest \
  [YOUR-ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest

docker tag hotel-onboarding-frontend:latest \
  [YOUR-ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-frontend:latest

# Push images
docker push [YOUR-ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-backend:latest
docker push [YOUR-ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/hotel-onboarding-frontend:latest
```

---

## Next Steps

Continue with the detailed Terraform configurations in the next document...

