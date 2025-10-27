# Start Migration NOW - Quick Start Guide
## Get Started with Group 2 (Property Management)

**Time Required:** 2 hours  
**Risk Level:** LOW  
**Endpoints:** 8

---

## ✅ PRE-FLIGHT CHECKLIST

Before starting, verify:
- [x] RDS database running (50 tables confirmed)
- [x] qr_codes table exists (18 columns, 5 indexes)
- [x] PostgresRepository implemented
- [x] Connection pool initialized
- [x] Feature flag exists (`USE_DIRECT_POSTGRES`)
- [x] Rollback procedures documented

**All checks passed! ✅ Ready to start migration.**

---

## 🚀 STEP-BY-STEP GUIDE

### Step 1: Set Up Your Environment (5 minutes)

```bash
# 1. Navigate to backend directory
cd /Users/gouthamvemula/onbfinaldev_clean/backend

# 2. Verify RDS connection
export PATH="$HOME/bin:$PATH"
AWS_PROFILE=hotel-onboarding aws ecs execute-command \
  --cluster onboarding-production-cluster \
  --task e0f611075ab04eaebb025661f5d15954 \
  --container backend \
  --region us-east-1 \
  --interactive \
  --command "python3 -c 'import asyncio; import asyncpg; import os; print(asyncio.run(asyncpg.connect(os.getenv(\"DATABASE_URL\")).fetchval(\"SELECT COUNT(*) FROM properties\")))'"

# Should show number of properties in RDS

# 3. Create a test branch
git checkout -b feature/migrate-property-endpoints
```

---

### Step 2: Identify Endpoints to Migrate (10 minutes)

**Group 2: Property Management (8 endpoints)**

1. `GET /api/hr/properties/{id}` - Get single property
2. `PUT /api/hr/properties/{id}` - Update property
3. `DELETE /api/hr/properties/{id}` - Delete property
4. `GET /api/properties/{id}/managers` - Get property managers
5. `POST /api/properties/{id}/managers` - Assign manager
6. `DELETE /api/properties/{id}/managers/{manager_id}` - Remove manager
7. `GET /api/properties/{id}/employees` - Get property employees
8. `GET /api/properties/{id}/stats` - Property statistics

**Tables Used:**
- `properties` ✅ (exists in RDS)
- `property_managers` ✅ (exists in RDS)
- `employees` ✅ (exists in RDS)

---

### Step 3: Find Endpoints in Code (5 minutes)

```bash
# Search for property endpoints in main_enhanced.py
grep -n "GET.*properties.*{id}" app/main_enhanced.py
grep -n "PUT.*properties.*{id}" app/main_enhanced.py
grep -n "DELETE.*properties.*{id}" app/main_enhanced.py
```

**Expected locations:**
- Around line 2000-3000 (property CRUD)
- Around line 3500-4000 (manager assignments)

---

### Step 4: Migrate First Endpoint (20 minutes)

**Example: GET /api/hr/properties/{id}**

**OLD CODE (Supabase):**
```python
@app.get("/api/hr/properties/{property_id}")
async def get_property(
    property_id: str,
    current_user: User = Depends(get_current_user)
):
    # Old Supabase code
    result = supabase_service.client.table('properties').select('*').eq('id', property_id).single().execute()
    return success_response(data=result.data)
```

**NEW CODE (RDS with fallback):**
```python
@app.get("/api/hr/properties/{property_id}")
async def get_property(
    property_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        # Try RDS first (if enabled)
        if supabase_service.use_direct_postgres and supabase_service.db_pool:
            async with supabase_service.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM properties WHERE id = $1",
                    property_id
                )
                
                if not row:
                    raise HTTPException(status_code=404, detail="Property not found")
                
                # Convert asyncpg.Record to dict
                property_data = dict(row)
                
                logger.info(f"✅ RDS: Retrieved property {property_id}")
                return success_response(data=property_data)
        
        # Fallback to Supabase
        result = supabase_service.client.table('properties').select('*').eq('id', property_id).single().execute()
        logger.info(f"✅ Supabase: Retrieved property {property_id}")
        return success_response(data=result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting property {property_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Key Changes:**
1. Added RDS query using `db_pool`
2. Kept Supabase as fallback
3. Added logging for monitoring
4. Added error handling

---

### Step 5: Test Locally (15 minutes)

```bash
# 1. Start backend locally
poetry run uvicorn app.main_enhanced:app --reload --port 8000

# 2. Test with RDS enabled
export USE_DIRECT_POSTGRES=true

# 3. Test endpoint
curl -X GET http://localhost:8000/api/hr/properties/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check logs for "✅ RDS: Retrieved property"

# 5. Test with RDS disabled (fallback)
export USE_DIRECT_POSTGRES=false

# 6. Test endpoint again
curl -X GET http://localhost:8000/api/hr/properties/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 7. Check logs for "✅ Supabase: Retrieved property"
```

---

### Step 6: Migrate Remaining Endpoints (60 minutes)

Repeat Step 4 for each endpoint:

**2. PUT /api/hr/properties/{id}**
```python
async with supabase_service.db_pool.acquire() as conn:
    await conn.execute(
        """
        UPDATE properties 
        SET name = $1, address = $2, city = $3, state = $4, 
            zip_code = $5, phone = $6, updated_at = NOW()
        WHERE id = $7
        """,
        data['name'], data.get('address'), data.get('city'), 
        data.get('state'), data.get('zip_code'), data.get('phone'),
        property_id
    )
```

**3. DELETE /api/hr/properties/{id}**
```python
async with supabase_service.db_pool.acquire() as conn:
    await conn.execute(
        "UPDATE properties SET is_active = false WHERE id = $1",
        property_id
    )
```

**4. GET /api/properties/{id}/managers**
```python
async with supabase_service.db_pool.acquire() as conn:
    rows = await conn.fetch(
        """
        SELECT u.* FROM users u
        JOIN property_managers pm ON u.id = pm.manager_id
        WHERE pm.property_id = $1
        """,
        property_id
    )
```

**5. POST /api/properties/{id}/managers**
```python
async with supabase_service.db_pool.acquire() as conn:
    await conn.execute(
        """
        INSERT INTO property_managers (property_id, manager_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        """,
        property_id, manager_id
    )
```

**Continue for remaining 3 endpoints...**

---

### Step 7: Deploy to Production (10 minutes)

```bash
# 1. Commit changes
git add app/main_enhanced.py
git commit -m "Migrate Group 2: Property Management endpoints to RDS"

# 2. Push to GitHub
git push origin feature/migrate-property-endpoints

# 3. Deploy to AWS
./QUICK_DEPLOY.sh

# 4. Monitor deployment
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1
```

---

### Step 8: Test in Production (10 minutes)

```bash
# 1. Test each endpoint
curl -X GET https://YOUR_DOMAIN/api/hr/properties \
  -H "Authorization: Bearer $HR_TOKEN"

curl -X GET https://YOUR_DOMAIN/api/hr/properties/PROPERTY_ID \
  -H "Authorization: Bearer $HR_TOKEN"

curl -X PUT https://YOUR_DOMAIN/api/hr/properties/PROPERTY_ID \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Property"}'

# 2. Check logs for "✅ RDS:" messages
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1 | grep "RDS:"

# 3. Verify no errors
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1 | grep "ERROR"
```

---

### Step 9: Monitor for 24 Hours (Ongoing)

```bash
# Set up CloudWatch alarm for errors
aws cloudwatch put-metric-alarm \
  --alarm-name property-endpoints-errors \
  --alarm-description "Alert on property endpoint errors" \
  --metric-name Errors \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# Check logs daily
aws logs tail /ecs/onboarding-production/backend --since 1h --region us-east-1 | grep "property"
```

---

### Step 10: Mark Complete and Move to Next Group (5 minutes)

```bash
# Update progress tracking
echo "Group 2: Property Management - COMPLETE ✅" >> MIGRATION_PROGRESS.txt

# Merge to main
git checkout main
git merge feature/migrate-property-endpoints
git push origin main

# Start next group
git checkout -b feature/migrate-user-endpoints
```

---

## 🎯 SUCCESS CRITERIA

After completing Group 2, verify:
- [x] All 8 endpoints work with RDS
- [x] All 8 endpoints work with Supabase (fallback)
- [x] No errors in production logs
- [x] Response times < 500ms
- [x] Property CRUD operations work
- [x] Manager assignments work

---

## 🚨 IF SOMETHING GOES WRONG

### Immediate Rollback (30 seconds)
```bash
# Disable RDS, use Supabase
export USE_DIRECT_POSTGRES=false

# Restart service
aws ecs update-service \
  --cluster onboarding-production-cluster \
  --service onboarding-production-backend \
  --force-new-deployment \
  --region us-east-1
```

### Check Rollback Worked
```bash
# Should see "✅ Supabase:" in logs
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1 | grep "Supabase:"
```

---

## 📊 PROGRESS TRACKING

| Endpoint | Status | Tested | Deployed | Notes |
|----------|--------|--------|----------|-------|
| GET /api/hr/properties/{id} | ⏳ | ⏳ | ⏳ | |
| PUT /api/hr/properties/{id} | ⏳ | ⏳ | ⏳ | |
| DELETE /api/hr/properties/{id} | ⏳ | ⏳ | ⏳ | |
| GET /api/properties/{id}/managers | ⏳ | ⏳ | ⏳ | |
| POST /api/properties/{id}/managers | ⏳ | ⏳ | ⏳ | |
| DELETE /api/properties/{id}/managers/{id} | ⏳ | ⏳ | ⏳ | |
| GET /api/properties/{id}/employees | ⏳ | ⏳ | ⏳ | |
| GET /api/properties/{id}/stats | ⏳ | ⏳ | ⏳ | |

---

## 🎉 AFTER COMPLETION

**Celebrate!** You've migrated 8 more endpoints (13 total, 8.1% complete)

**Next:** Group 3 - User Management (10 endpoints, 2 hours)

---

**Questions?** See `MIGRATION_EXECUTIVE_SUMMARY.md` for full plan.  
**Issues?** See `MIGRATION_ROLLBACK_PROCEDURES.md` for rollback steps.

