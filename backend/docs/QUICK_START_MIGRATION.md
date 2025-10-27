# Quick Start: Safe Migration Guide

**⏱️ Time Required:** 15 minutes to get started  
**🎯 Goal:** Safely migrate endpoints without breaking schema

---

## 🚀 Quick Start (3 Commands)

```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend

# 1. Discover actual database schema (2 min)
python3 scripts/discover_rds_schema.py

# 2. Validate repository code (1 min)
python3 scripts/validate_repository_schema.py

# 3. Deploy (if validation passes) (5 min)
./QUICK_DEPLOY.sh
```

That's it! The deployment script now includes automatic schema validation.

---

## 📋 What Each Script Does

### **1. Schema Discovery** (`discover_rds_schema.py`)

**What it does:**
- Connects to your RDS database
- Extracts the ACTUAL schema (tables, columns, types, constraints)
- Generates documentation

**Output files:**
- `backend/docs/RDS_SCHEMA.json` - Machine-readable schema
- `backend/docs/RDS_SCHEMA.md` - Human-readable docs
- `backend/app/schema_reference.py` - Python type hints

**When to run:**
- Before starting migration
- After any database schema changes
- When you're unsure about table structure

**Example output:**
```
✅ Connected to RDS database
🔍 Discovering database schema...

Found 25 tables

📋 Analyzing table: properties
   ✓ 12 columns, 1 PK, 3 indexes
📋 Analyzing table: users
   ✓ 15 columns, 1 PK, 5 indexes
...

✅ Saved JSON schema to: backend/docs/RDS_SCHEMA.json
✅ Saved Markdown docs to: backend/docs/RDS_SCHEMA.md
✅ SCHEMA DISCOVERY COMPLETE!
```

---

### **2. Schema Validation** (`validate_repository_schema.py`)

**What it does:**
- Compares repository code with actual database schema
- Detects mismatches (wrong column names, missing columns, etc.)
- Prevents deploying broken code

**Checks:**
- ✅ INSERT statements use valid columns
- ✅ SELECT statements use valid columns
- ✅ `_row_to_*` methods access valid columns
- ✅ All table references are correct

**When to run:**
- Before EVERY deployment
- After modifying repository code
- After schema changes

**Example output (PASS):**
```
📖 Loading schema from: backend/docs/RDS_SCHEMA.json
✅ Loaded schema with 25 tables

🔍 Validating repository code against schema...

Checking table: properties
  ✅ No errors
Checking table: users
  ✅ No errors
...

✅ VALIDATION PASSED - SAFE TO DEPLOY
```

**Example output (FAIL):**
```
Checking table: properties
  ❌ 1 error(s) found

❌ ERRORS (1):

  ❌ INSERT #1 into 'properties' uses non-existent columns: {'email'}

❌ VALIDATION FAILED - DO NOT DEPLOY

💡 Fix suggestions saved to: backend/docs/SCHEMA_FIX_SUGGESTIONS.md
```

---

### **3. Safe Deployment** (`QUICK_DEPLOY.sh`)

**What it does:**
- Runs schema validation FIRST
- Only deploys if validation passes
- Builds and pushes Docker image
- Updates ECS service
- Waits for deployment to complete

**New safety feature:**
```bash
# Step 0.5: Schema Validation (CRITICAL!)
if validation fails:
    ❌ DEPLOYMENT ABORTED
    Show errors
    Exit
else:
    ✅ Continue with deployment
```

---

## 🔧 Common Workflows

### **Workflow 1: First Time Setup**

```bash
# Discover schema
python3 scripts/discover_rds_schema.py

# Review the schema
cat docs/RDS_SCHEMA.md | less

# Validate current code
python3 scripts/validate_repository_schema.py

# Fix any errors found
# ... edit backend/app/repositories/postgres_repository.py ...

# Re-validate
python3 scripts/validate_repository_schema.py

# Deploy when clean
./QUICK_DEPLOY.sh
```

---

### **Workflow 2: Adding New Endpoint**

```bash
# 1. Check schema for the table you need
cat docs/RDS_SCHEMA.md | grep -A 20 "Table: my_table"

# 2. Write repository method using EXACT column names

# 3. Validate before deploying
python3 scripts/validate_repository_schema.py

# 4. Deploy
./QUICK_DEPLOY.sh
```

---

### **Workflow 3: Schema Changed in Database**

```bash
# 1. Re-discover schema
python3 scripts/discover_rds_schema.py

# 2. Validate (will likely fail)
python3 scripts/validate_repository_schema.py

# 3. Fix repository code to match new schema

# 4. Re-validate
python3 scripts/validate_repository_schema.py

# 5. Deploy
./QUICK_DEPLOY.sh
```

---

### **Workflow 4: Deployment Failed**

```bash
# Check logs
AWS_PROFILE=hotel-onboarding aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1

# If schema error, rollback immediately
# Edit backend/app/main_enhanced.py:
use_direct_postgres = False  # Switch back to Supabase

# Redeploy
./QUICK_DEPLOY.sh

# Fix the issue
# ... fix repository code ...

# Re-validate
python3 scripts/validate_repository_schema.py

# Deploy again
use_direct_postgres = True
./QUICK_DEPLOY.sh
```

---

## 📊 Understanding Validation Errors

### **Error: "uses non-existent columns"**

**Example:**
```
❌ INSERT #1 into 'properties' uses non-existent columns: {'email'}
```

**Meaning:** Your code tries to insert into a column that doesn't exist in the database.

**Fix:**
1. Check actual schema: `cat docs/RDS_SCHEMA.md | grep -A 20 "Table: properties"`
2. Remove the column from your INSERT statement
3. Or add the column to the database (if intentional)

---

### **Error: "Table not found in schema"**

**Example:**
```
⚠️  Table 'my_new_table' not found in schema
```

**Meaning:** You're trying to use a table that doesn't exist.

**Fix:**
1. Re-run schema discovery: `python3 scripts/discover_rds_schema.py`
2. Check if table exists in database
3. Create table if needed

---

## 🎯 Best Practices

### **DO:**
- ✅ Run schema discovery before starting work
- ✅ Validate before EVERY deployment
- ✅ Review schema docs when writing new code
- ✅ Keep schema docs up to date
- ✅ Use exact column names from schema

### **DON'T:**
- ❌ Skip validation "just this once"
- ❌ Assume column names
- ❌ Deploy without testing
- ❌ Ignore validation warnings
- ❌ Edit schema docs manually

---

## 🚨 Emergency Procedures

### **Production is Down!**

```bash
# 1. Immediate rollback
# Edit backend/app/main_enhanced.py
use_direct_postgres = False

# 2. Redeploy ASAP
./QUICK_DEPLOY.sh

# 3. Check logs
AWS_PROFILE=hotel-onboarding aws logs tail /ecs/onboarding-production/backend --since 5m --region us-east-1

# 4. Investigate and fix offline
```

---

### **Schema Validation Won't Pass**

```bash
# 1. Re-discover schema (maybe it changed)
python3 scripts/discover_rds_schema.py

# 2. Review errors carefully
python3 scripts/validate_repository_schema.py > validation_errors.txt
cat validation_errors.txt

# 3. Fix one error at a time

# 4. Re-validate after each fix
python3 scripts/validate_repository_schema.py
```

---

## 📈 Progress Tracking

Check your migration progress:

```bash
# Count migrated endpoints
grep -r "use_direct_postgres" backend/app/main_enhanced.py | wc -l

# Check which tables are validated
python3 scripts/validate_repository_schema.py | grep "Checking table"

# View schema coverage
cat docs/RDS_SCHEMA.md | grep "^## Table:" | wc -l
```

---

## 🔗 Related Documentation

- **Full Migration Plan:** `backend/docs/SAFE_MIGRATION_PLAN.md`
- **Schema Reference:** `backend/docs/RDS_SCHEMA.md`
- **Deployment Guide:** `backend/DEPLOYMENT_GUIDE.md`

---

## ✅ Checklist for Each Migration

Before migrating an endpoint:
- [ ] Schema discovered and up to date
- [ ] Table schema reviewed
- [ ] Repository method written
- [ ] Validation passes
- [ ] Local testing complete
- [ ] Deployment successful
- [ ] Production testing complete
- [ ] Logs checked for errors

---

**Ready to start? Run the 3 commands at the top!** 🚀

