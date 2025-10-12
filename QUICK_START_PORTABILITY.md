# Quick Start: Making the Application Portable

## Phase 1: Database Schema Export (Start Here!)

### Step 1: Export Complete Schema from Supabase

```bash
# Create schema directory
mkdir -p schema

# Export schema (you'll need Supabase credentials)
# Option A: Using pg_dump (if you have direct database access)
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  -h db.kzommszdhapvqpekpvnt.supabase.co \
  -U postgres \
  -d postgres \
  > schema/complete_schema.sql

# Option B: Using Supabase CLI (recommended)
supabase db dump --schema public > schema/complete_schema.sql
```

### Step 2: Export Seed Data

```bash
# Export essential data (roles, default settings, etc.)
pg_dump \
  --data-only \
  --no-owner \
  --no-privileges \
  -h db.kzommszdhapvqpekpvnt.supabase.co \
  -U postgres \
  -d postgres \
  --table=properties \
  --table=users \
  > schema/seed_data.sql
```

### Step 3: Consolidate Migrations

```bash
# Create migrations directory
mkdir -p migrations

# Copy and organize all SQL files
# From: backend/supabase/migrations/, backend/migrations/, root SQL files
# To: migrations/ with sequential numbering

# Example structure:
migrations/
├── 001_initial_schema.sql          # Base schema from export
├── 002_audit_logs.sql              # From 003_create_audit_logs_table.sql
├── 003_notifications.sql           # From 004_create_notifications_table.sql
├── 004_analytics.sql               # From 005_create_analytics_events_table.sql
├── 005_manager_review.sql          # From 007_manager_review_system.sql
└── 006_emergency_contacts.sql      # From 018_extract_emergency_contacts.sql
```

---

## Phase 2: Docker Setup (Quick Win!)

### Step 1: Create Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main_enhanced:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 2: Create Frontend Dockerfile

```dockerfile
# frontend/hotel-onboarding-frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create nginx.conf

```nginx
# frontend/hotel-onboarding-frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Create docker-compose.yml

```yaml
# docker-compose.yml (in root directory)
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: onboarding_db
    environment:
      POSTGRES_DB: onboarding
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - ./schema/complete_schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./schema/seed_data.sql:/docker-entrypoint-initdb.d/02-seed.sql
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d onboarding"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: onboarding_backend
    environment:
      # Database
      DATABASE_URL: postgresql://admin:${DB_PASSWORD:-changeme}@postgres:5432/onboarding
      
      # Storage (use local for now)
      STORAGE_PROVIDER: local
      STORAGE_PATH: /app/storage
      
      # Auth
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-in-production}
      JWT_EXPIRATION: 86400
      
      # Email
      SMTP_HOST: ${SMTP_HOST:-smtp.gmail.com}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      
      # Application
      ENVIRONMENT: ${ENVIRONMENT:-development}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      CORS_ORIGINS: http://localhost:3000
    volumes:
      - ./backend:/app
      - storage_data:/app/storage
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend/hotel-onboarding-frontend
      dockerfile: Dockerfile
    container_name: onboarding_frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "3000:80"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  storage_data:

networks:
  default:
    name: onboarding_network
```

### Step 5: Create .env.example

```bash
# .env.example
# Copy this to .env and fill in your values

# Database
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Email (optional for local development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Environment
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

### Step 6: Deploy Locally

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f

# 6. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Step 7: Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U admin -d onboarding

# Database backup
docker-compose exec postgres pg_dump -U admin onboarding > backup.sql

# Database restore
docker-compose exec -T postgres psql -U admin onboarding < backup.sql
```

---

## Phase 3: Storage Abstraction (Next Step)

### Create Storage Interface

```python
# backend/storage/storage_interface.py
from abc import ABC, abstractmethod
from typing import Optional

class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    async def upload_file(
        self,
        bucket: str,
        path: str,
        file_data: bytes,
        content_type: Optional[str] = None
    ) -> str:
        """Upload a file and return its URL"""
        pass
    
    @abstractmethod
    async def download_file(self, bucket: str, path: str) -> bytes:
        """Download a file"""
        pass
    
    @abstractmethod
    async def delete_file(self, bucket: str, path: str) -> bool:
        """Delete a file"""
        pass
    
    @abstractmethod
    async def get_signed_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """Get a signed URL for temporary access"""
        pass
    
    @abstractmethod
    async def list_files(self, bucket: str, prefix: str = "") -> list[str]:
        """List files in a bucket"""
        pass
```

### Implement Local Storage Provider

```python
# backend/storage/providers/local_storage.py
import os
import aiofiles
from pathlib import Path
from ..storage_interface import StorageProvider

class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider"""
    
    def __init__(self, base_path: str = "./storage"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(
        self,
        bucket: str,
        path: str,
        file_data: bytes,
        content_type: Optional[str] = None
    ) -> str:
        """Upload file to local filesystem"""
        file_path = self.base_path / bucket / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_data)
        
        return f"/storage/{bucket}/{path}"
    
    async def download_file(self, bucket: str, path: str) -> bytes:
        """Download file from local filesystem"""
        file_path = self.base_path / bucket / path
        
        async with aiofiles.open(file_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, bucket: str, path: str) -> bool:
        """Delete file from local filesystem"""
        file_path = self.base_path / bucket / path
        
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    async def get_signed_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """Return local file path (no signing needed)"""
        return f"/storage/{bucket}/{path}"
    
    async def list_files(self, bucket: str, prefix: str = "") -> list[str]:
        """List files in bucket"""
        bucket_path = self.base_path / bucket
        if not bucket_path.exists():
            return []
        
        files = []
        for file_path in bucket_path.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(bucket_path)
                if str(relative_path).startswith(prefix):
                    files.append(str(relative_path))
        
        return files
```

### Storage Factory

```python
# backend/storage/storage_factory.py
import os
from .storage_interface import StorageProvider
from .providers.local_storage import LocalStorageProvider
# from .providers.s3_storage import S3StorageProvider  # Future
# from .providers.supabase_storage import SupabaseStorageProvider  # Current

def get_storage_provider() -> StorageProvider:
    """Get storage provider based on environment configuration"""
    provider = os.getenv('STORAGE_PROVIDER', 'local')
    
    if provider == 'local':
        return LocalStorageProvider(
            base_path=os.getenv('STORAGE_PATH', './storage')
        )
    elif provider == 'supabase':
        # Keep existing Supabase implementation for backward compatibility
        from .providers.supabase_storage import SupabaseStorageProvider
        return SupabaseStorageProvider()
    elif provider == 's3':
        from .providers.s3_storage import S3StorageProvider
        return S3StorageProvider(
            bucket=os.getenv('AWS_S3_BUCKET'),
            region=os.getenv('AWS_REGION', 'us-east-1')
        )
    else:
        raise ValueError(f"Unknown storage provider: {provider}")
```

---

## Testing the Setup

### 1. Test Database Connection

```bash
# Connect to database
docker-compose exec postgres psql -U admin -d onboarding

# List tables
\dt

# Check a table
SELECT * FROM users LIMIT 5;

# Exit
\q
```

### 2. Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

### 3. Test Frontend

```bash
# Open in browser
open http://localhost:3000
```

---

## Next Steps

1. ✅ **Complete Phase 1** - Export schema and consolidate migrations
2. ✅ **Complete Phase 2** - Docker setup working locally
3. ⏳ **Start Phase 3** - Implement storage abstraction
4. ⏳ **Phase 4** - Implement auth abstraction
5. ⏳ **Phase 5** - Replace Supabase client with SQLAlchemy
6. ⏳ **Phase 6** - Create Terraform modules for cloud deployment

---

## Troubleshooting

### Database won't start
```bash
# Check logs
docker-compose logs postgres

# Remove volume and restart
docker-compose down -v
docker-compose up -d
```

### Backend can't connect to database
```bash
# Check if postgres is healthy
docker-compose ps

# Check environment variables
docker-compose exec backend env | grep DATABASE
```

### Frontend can't reach backend
```bash
# Check CORS settings in backend
# Check VITE_API_URL in frontend environment
```

---

## Summary

This quick start guide gets you:
- ✅ Complete database schema exported
- ✅ Docker-based local development
- ✅ Foundation for cloud deployment
- ✅ No Supabase dependency for local dev

**Time to complete:** 2-4 hours

**Next:** Implement storage and auth abstractions to fully decouple from Supabase.

