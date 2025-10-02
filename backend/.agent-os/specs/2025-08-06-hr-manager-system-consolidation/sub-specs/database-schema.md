# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-06-hr-manager-system-consolidation/spec.md

> Created: 2025-08-06
> Version: 1.0.0

## Schema Changes

### New Tables for Enhanced Features

**Audit Log Table**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(20), -- 'hr', 'manager', 'system'
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'approve', 'reject'
  entity_type VARCHAR(50) NOT NULL, -- 'application', 'employee', 'property', 'manager'
  entity_id UUID,
  property_id UUID REFERENCES properties(id), -- for property-scoped actions
  details JSONB, -- before/after data, additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_property_id ON audit_logs(property_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**Notifications Table**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(20) NOT NULL, -- 'hr', 'manager'
  type VARCHAR(50) NOT NULL, -- 'new_application', 'deadline_reminder', 'system_alert'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB, -- additional notification data
  channels JSONB, -- ['in_app', 'email', 'sms']
  property_id UUID REFERENCES properties(id),
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_property_id ON notifications(property_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**User Preferences Table**
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'hr', 'manager'
  preferences JSONB NOT NULL DEFAULT '{}', -- notification settings, dashboard config, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, user_type)
);

-- Index for user preferences
CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences(user_id, user_type);
```

**Analytics Cache Table**
```sql
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) NOT NULL,
  property_id UUID REFERENCES properties(id),
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cache_key, property_id)
);

-- Indexes for analytics cache
CREATE UNIQUE INDEX idx_analytics_cache_key ON analytics_cache(cache_key, property_id);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
```

### Enhanced Existing Tables

**Add Performance Tracking to Job Applications**
```sql
-- Add performance tracking columns to job_applications
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hr_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS time_to_approval INTEGER, -- minutes from application to approval
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Index for performance queries
CREATE INDEX idx_job_applications_performance ON job_applications(status, created_at, manager_reviewed_at);
```

**Enhance Properties Table for Better Management**
```sql
-- Add property management fields
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}', -- property-specific settings
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

-- Update index for property queries
CREATE INDEX idx_properties_active_activity ON properties(is_active, last_activity_at);
```

**Add Bulk Operation Tracking**
```sql
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'bulk_approve', 'bulk_reject', 'bulk_email'
  entity_type VARCHAR(50) NOT NULL, -- 'applications', 'employees'
  entity_ids UUID[] NOT NULL,
  property_id UUID REFERENCES properties(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- percentage complete
  total_items INTEGER NOT NULL,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  results JSONB, -- detailed results for each item
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for bulk operations
CREATE INDEX idx_bulk_operations_user ON bulk_operations(user_id, user_type);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status, created_at);
```

## Migrations

### Migration 1: Create Enhanced Tables
```sql
-- Migration script for creating new tables
-- File: migrations/001_create_enhanced_tables.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(20),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  property_id UUID REFERENCES properties(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_property_id ON audit_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  channels JSONB,
  property_id UUID REFERENCES properties(id),
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create other tables...
-- (Include other table creation statements here)
```

### Migration 2: Enhance Existing Tables
```sql
-- Migration script for enhancing existing tables
-- File: migrations/002_enhance_existing_tables.sql

-- Add performance tracking to job_applications
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hr_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS time_to_approval INTEGER,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add property enhancements
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_performance ON job_applications(status, created_at, manager_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_properties_active_activity ON properties(is_active, last_activity_at);
```

### Migration 3: Optimize Performance Indexes
```sql
-- Migration script for performance optimization
-- File: migrations/003_performance_indexes.sql

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_job_applications_property_status ON job_applications(property_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_employees_property_status ON employees(property_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status_progress ON onboarding_sessions(status, progress_percentage, created_at);

-- Add composite indexes for manager dashboard queries
CREATE INDEX IF NOT EXISTS idx_applications_manager_pending ON job_applications(property_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_onboarding_manager_review ON onboarding_sessions(property_id, status) WHERE status = 'employee_completed';

-- Add full-text search indexes
CREATE INDEX IF NOT EXISTS idx_employees_search ON employees USING GIN(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
CREATE INDEX IF NOT EXISTS idx_applications_search ON job_applications USING GIN(to_tsvector('english', applicant_data::text));
```

### Migration 4: Row Level Security (RLS) Fixes
```sql
-- Migration script for fixing RLS policies
-- File: migrations/004_fix_rls_policies.sql

-- Enable RLS on all tables if not already enabled
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "properties_policy" ON properties;
DROP POLICY IF EXISTS "managers_policy" ON managers;
DROP POLICY IF EXISTS "job_applications_policy" ON job_applications;
DROP POLICY IF EXISTS "employees_policy" ON employees;
DROP POLICY IF EXISTS "onboarding_sessions_policy" ON onboarding_sessions;

-- Create improved RLS policies
-- Properties: HR sees all, managers see only assigned
CREATE POLICY "properties_policy" ON properties FOR ALL USING (
  auth.jwt() ->> 'user_type' = 'hr' OR
  (auth.jwt() ->> 'user_type' = 'manager' AND id = (auth.jwt() ->> 'property_id')::uuid)
);

-- Job Applications: HR sees all, managers see only their property
CREATE POLICY "job_applications_policy" ON job_applications FOR ALL USING (
  auth.jwt() ->> 'user_type' = 'hr' OR
  (auth.jwt() ->> 'user_type' = 'manager' AND property_id = (auth.jwt() ->> 'property_id')::uuid)
);

-- Similar policies for other tables...
```

## Performance Optimizations

### Database Configuration Recommendations
```sql
-- Recommended PostgreSQL configuration for production
-- Add these to postgresql.conf

-- Connection settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

-- Query optimization
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

-- Logging for monitoring
log_statement = 'all'
log_min_duration_statement = 1000
log_checkpoints = on
```

### Cleanup Procedures
```sql
-- Automated cleanup procedures
-- File: procedures/cleanup_old_data.sql

-- Procedure to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '6 months' 
  AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup jobs (to be run via cron or task scheduler)
```