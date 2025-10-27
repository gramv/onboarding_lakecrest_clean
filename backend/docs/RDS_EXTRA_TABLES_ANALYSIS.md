# RDS Extra Tables Analysis
## 6 Tables in RDS That Don't Exist in Supabase

**Created:** 2025-10-26  
**Discovery:** RDS has 50 tables vs Supabase's 44 tables

---

## 📊 SUMMARY

RDS has **6 additional tables/views** that were created during AWS deployment but don't exist in Supabase:

| # | Table Name | Type | Purpose | Created When |
|---|------------|------|---------|--------------|
| 1 | `daily_analytics_summary` | VIEW | Analytics aggregation | Migration to RDS |
| 2 | `employees_pending_manager_review` | VIEW | Manager review queue | Manager review feature |
| 3 | `i9_section2_compliance_status` | VIEW | I-9 compliance tracking | Federal compliance feature |
| 4 | `property_notification_recipients` | VIEW | Email recipient aggregation | Notification system |
| 5 | `schema_migrations` | TABLE | Migration tracking | RDS migration framework |
| 6 | `user_engagement_metrics` | VIEW | User analytics | Analytics feature |

---

## 🔍 DETAILED ANALYSIS

### 1. `daily_analytics_summary` (VIEW)

**Type:** Materialized View / Regular View  
**Purpose:** Pre-aggregated daily analytics for performance

**Definition:**
```sql
CREATE OR REPLACE VIEW daily_analytics_summary AS
SELECT 
    DATE(created_at) as analytics_date,
    property_id,
    event_category,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(timing_value) as avg_timing
FROM analytics_events
WHERE is_valid = true
AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), property_id, event_category;
```

**Columns:**
- `analytics_date` (date) - Date of analytics
- `property_id` (uuid) - Property ID
- `event_category` (varchar) - Event category
- `total_events` (bigint) - Total event count
- `unique_users` (bigint) - Unique user count
- `unique_sessions` (bigint) - Unique session count
- `avg_timing` (numeric) - Average timing value

**Why It Exists:**
- Performance optimization for analytics dashboard
- Avoids expensive aggregations on large `analytics_events` table
- Created during RDS migration for better query performance

**Impact on Migration:**
- ✅ **No impact** - This is a VIEW, not a table
- ✅ Data comes from `analytics_events` table (exists in both)
- ✅ Can be recreated in Supabase if needed

---

### 2. `employees_pending_manager_review` (VIEW)

**Type:** View  
**Purpose:** Show employees awaiting manager review with I-9 urgency

**Definition:**
```sql
CREATE OR REPLACE VIEW employees_pending_manager_review AS
SELECT 
    e.id,
    COALESCE(e.personal_info->>'first_name', e.personal_info->>'firstName') as first_name,
    COALESCE(e.personal_info->>'last_name', e.personal_info->>'lastName') as last_name,
    COALESCE(e.personal_info->>'email', e.email) as email,
    COALESCE(e.personal_info->>'job_title', e.position) as position,
    e.property_id,
    e.manager_id,
    COALESCE(e.start_date, e.onboarding_completed_at::DATE) as start_date,
    e.onboarding_completed_at,
    e.manager_review_status,
    e.i9_section2_status,
    e.i9_section2_deadline,
    get_i9_deadline_days_remaining(e.i9_section2_deadline) as days_until_i9_deadline,
    CASE 
        WHEN e.i9_section2_deadline IS NULL THEN 'no_deadline'
        WHEN e.i9_section2_deadline::DATE < CURRENT_DATE THEN 'overdue'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 1 THEN 'urgent'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 2 THEN 'warning'
        ELSE 'normal'
    END as i9_urgency_level,
    p.name as property_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id
WHERE e.onboarding_status = 'completed'
AND e.onboarding_completed_at IS NOT NULL
AND COALESCE(e.manager_review_status, 'pending_review') IN ('pending_review', 'manager_reviewing');
```

**Columns:**
- `id` (uuid) - Employee ID
- `first_name` (text) - First name
- `last_name` (text) - Last name
- `email` (text) - Email
- `position` (varchar) - Job title
- `property_id` (uuid) - Property ID
- `manager_id` (uuid) - Manager ID
- `start_date` (date) - Start date
- `onboarding_completed_at` (timestamp) - Completion time
- `manager_review_status` (varchar) - Review status
- `i9_section2_status` (varchar) - I-9 Section 2 status
- `i9_section2_deadline` (timestamp) - I-9 deadline
- `days_until_i9_deadline` (integer) - Days remaining
- `i9_urgency_level` (text) - Urgency level
- `property_name` (varchar) - Property name

**Why It Exists:**
- Created for manager review dashboard
- Shows employees pending review with I-9 urgency indicators
- Simplifies complex queries for manager UI

**Impact on Migration:**
- ✅ **No impact** - This is a VIEW
- ✅ Data comes from `employees` and `properties` tables (exist in both)
- ⚠️ **Should be created in Supabase** for feature parity

---

### 3. `i9_section2_compliance_status` (VIEW)

**Type:** View  
**Purpose:** Track I-9 Section 2 compliance status for all employees

**Definition:**
```sql
CREATE VIEW i9_section2_compliance_status AS
SELECT 
    e.id,
    e.personal_info->>'firstName' as first_name,
    e.personal_info->>'lastName' as last_name,
    e.property_id,
    e.start_date,
    e.i9_section2_status,
    e.i9_section2_deadline,
    e.i9_section2_completed_at,
    get_i9_deadline_days_remaining(e.i9_section2_deadline) as days_remaining,
    CASE
        WHEN e.i9_section2_status = 'completed' THEN 'compliant'
        WHEN e.i9_section2_deadline IS NULL THEN 'no_deadline'
        WHEN e.i9_section2_deadline::DATE < CURRENT_DATE THEN 'non_compliant'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 1 THEN 'at_risk'
        ELSE 'pending'
    END as compliance_status,
    p.name as property_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id;
```

**Columns:**
- `id` (uuid) - Employee ID
- `first_name` (text) - First name
- `last_name` (text) - Last name
- `property_id` (uuid) - Property ID
- `start_date` (date) - Start date
- `i9_section2_status` (varchar) - I-9 status
- `i9_section2_deadline` (timestamp) - Deadline
- `i9_section2_completed_at` (timestamp) - Completion time
- `days_remaining` (integer) - Days until deadline
- `compliance_status` (text) - Compliance status
- `property_name` (varchar) - Property name

**Why It Exists:**
- **CRITICAL** for federal compliance tracking
- Shows which employees are compliant, at risk, or non-compliant
- Used by HR dashboard for compliance reporting

**Impact on Migration:**
- ✅ **No impact** - This is a VIEW
- ✅ Data comes from `employees` and `properties` tables
- ⚠️ **MUST be created in Supabase** for federal compliance

---

### 4. `property_notification_recipients` (VIEW)

**Type:** View  
**Purpose:** Aggregate all email recipients for a property (managers + custom recipients)

**Definition:**
```sql
CREATE VIEW property_notification_recipients AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'email', COALESCE(per.email, u.email),
                'name', COALESCE(per.name, CONCAT(u.first_name, ' ', u.last_name)),
                'type', CASE 
                    WHEN per.email IS NOT NULL THEN 'recipient'
                    ELSE 'manager'
                END,
                'receives_applications', CASE 
                    WHEN per.email IS NOT NULL THEN per.receives_applications
                    ELSE (u.email_preferences->>'applications')::boolean
                END
            )
        ) FILTER (
            WHERE (per.email IS NOT NULL AND per.is_active = true) 
               OR (u.email IS NOT NULL AND u.role = 'manager')
        ),
        '[]'::jsonb
    ) as recipients
FROM properties p
LEFT JOIN property_email_recipients per ON per.property_id = p.id
LEFT JOIN property_managers pm ON pm.property_id = p.id
LEFT JOIN users u ON u.id = pm.manager_id
GROUP BY p.id, p.name;
```

**Columns:**
- `property_id` (uuid) - Property ID
- `property_name` (varchar) - Property name
- `recipients` (jsonb) - Array of recipient objects

**Why It Exists:**
- Simplifies email notification logic
- Combines custom recipients + managers in one query
- Used by notification system

**Impact on Migration:**
- ✅ **No impact** - This is a VIEW
- ✅ Data comes from `properties`, `property_email_recipients`, `property_managers`, `users`
- ⚠️ **Should be created in Supabase** for notification feature

---

### 5. `schema_migrations` (TABLE) ⚠️ ONLY REAL TABLE

**Type:** Table  
**Purpose:** Track applied database migrations

**Definition:**
```sql
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true
);
```

**Columns:**
- `id` (serial) - Auto-increment ID
- `version` (varchar) - Migration version (e.g., "001", "002")
- `name` (varchar) - Migration name
- `applied_at` (timestamp) - When applied
- `applied_by` (varchar) - Who applied it
- `checksum` (varchar) - File checksum
- `execution_time_ms` (integer) - Execution time
- `success` (boolean) - Success flag

**Why It Exists:**
- **RDS-specific** migration tracking
- Created by migration framework (`backend/app/services/migration_service.py`)
- Prevents re-running migrations

**Impact on Migration:**
- ✅ **No impact on Supabase** - This is RDS-only
- ✅ Supabase uses its own migration system
- ✅ This table is for RDS migration management only

---

### 6. `user_engagement_metrics` (VIEW)

**Type:** View  
**Purpose:** User engagement analytics

**Definition:**
```sql
CREATE VIEW user_engagement_metrics AS
SELECT 
    user_id,
    user_type,
    property_id,
    activity_date,
    COUNT(*) as total_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as session_duration_minutes
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id, user_type, property_id, DATE(created_at);
```

**Columns:**
- `user_id` (uuid) - User ID
- `user_type` (varchar) - User type
- `property_id` (uuid) - Property ID
- `activity_date` (date) - Activity date
- `total_events` (bigint) - Total events
- `unique_event_types` (bigint) - Unique event types
- `first_event` (timestamp) - First event time
- `last_event` (timestamp) - Last event time
- `session_duration_minutes` (numeric) - Session duration

**Why It Exists:**
- User engagement analytics
- Performance optimization for analytics queries
- Created during RDS migration

**Impact on Migration:**
- ✅ **No impact** - This is a VIEW
- ✅ Data comes from `analytics_events` table
- ✅ Can be recreated in Supabase if needed

---

## 🎯 IMPACT ON MIGRATION

### Summary

| Table | Type | Impact | Action Needed |
|-------|------|--------|---------------|
| `daily_analytics_summary` | VIEW | None | Optional: Create in Supabase |
| `employees_pending_manager_review` | VIEW | Medium | **Should create in Supabase** |
| `i9_section2_compliance_status` | VIEW | **HIGH** | **MUST create in Supabase** |
| `property_notification_recipients` | VIEW | Medium | **Should create in Supabase** |
| `schema_migrations` | TABLE | None | RDS-only, ignore |
| `user_engagement_metrics` | VIEW | Low | Optional: Create in Supabase |

### Key Findings

1. **Only 1 Real Table:** `schema_migrations` (RDS migration tracking only)
2. **5 Views:** All are derived from existing tables
3. **No Schema Conflicts:** All views use tables that exist in both databases
4. **Federal Compliance:** `i9_section2_compliance_status` is critical for compliance

### Recommendations

**For Supabase:**
1. ✅ Create `i9_section2_compliance_status` view (federal compliance)
2. ✅ Create `employees_pending_manager_review` view (manager dashboard)
3. ✅ Create `property_notification_recipients` view (notifications)
4. ⏳ Optional: Create analytics views if needed

**For RDS Migration:**
1. ✅ **No action needed** - All views will work automatically
2. ✅ Views use existing tables (already migrated)
3. ✅ `schema_migrations` table already exists in RDS

---

## ✅ CONCLUSION

**RDS is AHEAD of Supabase, not behind!**

- RDS: **50 tables** (44 tables + 5 views + 1 migration table)
- Supabase: **44 tables**
- Missing in Supabase: **5 performance/convenience views + 1 RDS-specific table**

**Migration Status:**
- ✅ All core tables exist in both databases
- ✅ RDS has additional optimization views
- ✅ No blocking issues for migration
- ✅ Safe to proceed with endpoint migration

**Next Steps:**
1. Optionally create missing views in Supabase (for feature parity)
2. Continue with endpoint migration (Group 2: Property Management)
3. No schema changes needed in RDS

---

**Last Updated:** 2025-10-26

