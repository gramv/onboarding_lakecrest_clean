# Database Migration Framework

## Overview

We've implemented an **industry-standard database migration framework** for the Hotel Onboarding System. This framework follows best practices used by companies like Stripe, Airbnb, and GitHub for managing database schema changes.

## Why We Built This

### The Problem
- Manual SQL execution is error-prone and not auditable
- No version control for database changes
- No rollback capability
- No tracking of what migrations have been applied
- Difficult to coordinate changes across environments

### The Solution
A professional migration framework with:
- ✅ **Version Control** - Sequential migration files with timestamps
- ✅ **Migration Tracking** - Database table tracks applied migrations
- ✅ **Rollback Support** - Each migration has up/down scripts
- ✅ **Audit Trail** - Tracks who ran migrations and when
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Secure** - Runs from within AWS VPC via API endpoint
- ✅ **Automated** - Integrated into deployment pipeline

## Architecture

### Components

1. **Migration Files** (`backend/migrations/*.sql`)
   - Timestamped SQL files with up/down migrations
   - Version controlled in git
   - Follow naming convention: `YYYYMMDD_HHMMSS_description.sql`

2. **Migration Service** (`backend/app/services/migration_service.py`)
   - Core migration engine
   - Discovers and applies migrations
   - Tracks migration history
   - Handles errors and rollbacks

3. **Migration API** (`backend/app/routers/migrations.py`)
   - RESTful API for migration management
   - Secured with admin/HR role requirements
   - Provides status, history, and execution endpoints

4. **Migration Tracking Table** (`schema_migrations`)
   - Stores applied migration metadata
   - Tracks execution time, status, and who applied it
   - Enables idempotent execution

### Data Flow

```
1. Developer creates migration file
   ↓
2. Commits to git
   ↓
3. Deploys backend
   ↓
4. Startup event runs pending migrations automatically
   ↓
5. Migration service discovers new migrations
   ↓
6. Applies them in order
   ↓
7. Records results in schema_migrations table
   ↓
8. Logs success/failure
```

## How to Use

### Creating a New Migration

```bash
cd backend/migrations
./create_migration.sh "add_employee_index"
```

This creates: `20241026_143000_add_employee_index.sql`

Edit the file:

```sql
-- Migration: 20241026_143000_add_employee_index
-- Description: Add index on employees.email for faster lookups
-- Author: Your Name
-- Date: 2024-10-26

-- ============================================
-- UP Migration
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_email 
ON public.employees(email);

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

-- DROP INDEX IF EXISTS idx_employees_email;
```

### Applying Migrations

**Option 1: Automatic (Recommended)**

Migrations run automatically on backend startup:

```bash
./QUICK_DEPLOY.sh
```

The startup event will:
1. Check for pending migrations
2. Apply them in order
3. Log results

**Option 2: Manual via API**

```bash
# Get migration status
curl https://your-backend/api/migrations/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Apply all pending migrations
curl -X POST https://your-backend/api/migrations/apply \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Apply specific migration
curl -X POST https://your-backend/api/migrations/apply/20241026_120000_add_qr_codes_table \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Viewing Migration Status

```bash
# Get overall status
GET /api/migrations/status

# Get migration history
GET /api/migrations/history

# Get pending migrations
GET /api/migrations/pending

# Health check
GET /api/migrations/health
```

## Migration File Structure

### Naming Convention

```
YYYYMMDD_HHMMSS_description.sql
```

- `YYYYMMDD` - Date (e.g., 20241026)
- `HHMMSS` - Time (e.g., 120000)
- `description` - Snake_case description (e.g., add_qr_codes_table)

### File Template

```sql
-- Migration: YYYYMMDD_HHMMSS_description
-- Description: What this migration does
-- Author: Your Name
-- Date: YYYY-MM-DD

-- ============================================
-- UP Migration
-- ============================================

-- Your schema changes here
CREATE TABLE IF NOT EXISTS ...;
CREATE INDEX IF NOT EXISTS ...;

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

-- Rollback instructions (commented out)
-- DROP TABLE IF EXISTS ...;
-- DROP INDEX IF EXISTS ...;
```

## Best Practices

### DO ✅

1. **Always use IF EXISTS/IF NOT EXISTS** for idempotency
2. **Write rollback scripts** even if you don't plan to use them
3. **Test migrations locally** before deploying
4. **Keep migrations small** - one logical change per migration
5. **Add comments** explaining complex changes
6. **Use transactions** for data migrations
7. **Backup before major migrations**
8. **Document breaking changes** in migration description

### DON'T ❌

1. **Don't modify existing migration files** after they're applied
2. **Don't delete migration files** from version control
3. **Don't skip version numbers**
4. **Don't run migrations manually** in production (use the framework)
5. **Don't mix schema and data changes** in the same migration
6. **Don't use DROP TABLE** without careful consideration

## Security

### Access Control

- All migration endpoints require **admin or HR role**
- API endpoints are authenticated via JWT
- Audit trail tracks who ran what migration

### Secrets Management

- Database credentials stored in AWS Secrets Manager
- Never commit credentials to git
- Use environment variables

### Network Security

- Migrations run from within AWS VPC
- RDS is in private subnet (not publicly accessible)
- No direct database access from internet

## Monitoring & Logging

### CloudWatch Logs

All migrations are logged to:
```
/ecs/onboarding-production/backend
```

### Database Audit Trail

The `schema_migrations` table stores:
- Version
- Description
- Applied at timestamp
- Applied by user
- Execution time (ms)
- Status (success/failed)
- Error message (if failed)

### Example Log Output

```
🔄 Found 1 pending migration(s) - applying automatically...
📝 Applying migration: 20241026_120000_add_qr_codes_table - Add Qr Codes Table
✅ Migration applied: 20241026_120000_add_qr_codes_table (1234ms)
✅ Applied 1 migration(s) successfully
```

## Troubleshooting

### Migration Failed

1. Check CloudWatch logs
2. Check `schema_migrations` table for error message
3. Fix the issue in the migration file
4. Re-deploy (framework will retry failed migrations)

### Migration Stuck

If a migration is stuck in "running" status:

```sql
-- Check status
SELECT * FROM schema_migrations WHERE status = 'running';

-- Mark as failed (if truly stuck)
UPDATE schema_migrations 
SET status = 'failed', error_message = 'Manually marked as failed'
WHERE version = 'YYYYMMDD_HHMMSS_description';
```

### Migration Already Applied

The framework is idempotent - it will skip already-applied migrations automatically.

## Comparison with Other Tools

| Feature | Our Framework | Alembic | Flyway |
|---------|--------------|---------|--------|
| Version Control | ✅ | ✅ | ✅ |
| Rollback Support | ✅ | ✅ | ✅ |
| Audit Trail | ✅ | ❌ | ✅ |
| Auto-run on Startup | ✅ | ❌ | ✅ |
| API Endpoints | ✅ | ❌ | ❌ |
| Python Native | ✅ | ✅ | ❌ |
| No External Dependencies | ✅ | ❌ | ❌ |
| Custom for Our Needs | ✅ | ❌ | ❌ |

## Future Enhancements

Potential improvements:

1. **Dry-run mode** - Preview migrations without applying
2. **Migration dependencies** - Specify migration order explicitly
3. **Data validation** - Verify data integrity after migrations
4. **Performance metrics** - Track migration execution time trends
5. **Slack notifications** - Alert team when migrations run
6. **Migration locking** - Prevent concurrent migrations

## Examples

See `backend/migrations/` for examples:
- `20241026_120000_add_qr_codes_table.sql` - Table creation with indexes and triggers

## Support

For questions or issues:
1. Check this documentation
2. Review existing migrations
3. Check CloudWatch logs
4. Contact the development team

---

**Last Updated**: 2024-10-26  
**Version**: 1.0.0  
**Status**: Production Ready ✅

