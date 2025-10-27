# Migration Rollback Procedures
## Safe Rollback Strategy for RDS Migration

**Created:** 2025-10-26  
**Purpose:** Define rollback procedures if migration issues occur

---

## 🎯 ROLLBACK PHILOSOPHY

### Key Principles
1. **Always Have a Way Back** - Every migration step is reversible
2. **Feature Flags Enable Instant Rollback** - No code deployment needed
3. **Keep Supabase Active** - Don't delete until migration proven stable
4. **Test Rollback Before Migration** - Verify rollback works

---

## 🚨 WHEN TO ROLLBACK

### Immediate Rollback Triggers (Stop Everything)
- ❌ **Data Loss Detected** - Any missing or corrupted data
- ❌ **Federal Compliance Broken** - I-9 deadlines wrong, signatures missing
- ❌ **Authentication Broken** - Users can't log in
- ❌ **Critical Errors** - Error rate > 5%
- ❌ **Database Connection Failure** - Can't connect to RDS

### Gradual Rollback Triggers (Investigate First)
- ⚠️ **Performance Degradation** - Response time > 2x baseline
- ⚠️ **Intermittent Errors** - Error rate 1-5%
- ⚠️ **Data Inconsistency** - RDS vs Supabase mismatch
- ⚠️ **User Complaints** - Multiple reports of issues

---

## 🔄 ROLLBACK METHODS

### Method 1: Feature Flag Rollback (INSTANT - 30 seconds)
**When:** During gradual migration, RDS issues detected  
**How:** Toggle feature flag to disable RDS, re-enable Supabase

**Steps:**
```bash
# 1. SSH into ECS container or update environment variable
export USE_DIRECT_POSTGRES=false

# 2. Restart application (if needed)
aws ecs update-service \
  --cluster onboarding-production-cluster \
  --service onboarding-production-backend \
  --force-new-deployment \
  --region us-east-1

# 3. Verify Supabase is active
curl https://api.example.com/health | grep "database.*supabase"
```

**Verification:**
- Check logs show "Using Supabase client"
- Test critical endpoints work
- Verify no errors in logs

**Downtime:** None (instant switch)

---

### Method 2: Code Rollback (FAST - 5 minutes)
**When:** Feature flag doesn't work, need to revert code  
**How:** Deploy previous Docker image

**Steps:**
```bash
# 1. Find previous working image
aws ecr describe-images \
  --repository-name onboarding-production-backend \
  --region us-east-1 \
  --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageTags[0]'

# 2. Update ECS task definition to use previous image
PREVIOUS_IMAGE="587728159462.dkr.ecr.us-east-1.amazonaws.com/onboarding-production-backend:PREVIOUS_TAG"

aws ecs register-task-definition \
  --family onboarding-production-backend \
  --container-definitions "[{
    \"name\": \"backend\",
    \"image\": \"$PREVIOUS_IMAGE\",
    ...
  }]"

# 3. Update service to use previous task definition
aws ecs update-service \
  --cluster onboarding-production-cluster \
  --service onboarding-production-backend \
  --task-definition onboarding-production-backend:PREVIOUS_REVISION \
  --region us-east-1

# 4. Wait for deployment
aws ecs wait services-stable \
  --cluster onboarding-production-cluster \
  --services onboarding-production-backend \
  --region us-east-1
```

**Verification:**
- Check ECS service shows previous image
- Test critical endpoints work
- Verify no errors in logs

**Downtime:** ~2 minutes (during container restart)

---

### Method 3: Database Rollback (SLOW - 30 minutes)
**When:** Data corruption in RDS, need to restore from backup  
**How:** Restore RDS from snapshot

**Steps:**
```bash
# 1. Find latest good snapshot
aws rds describe-db-snapshots \
  --db-instance-identifier onboarding-production-db \
  --region us-east-1 \
  --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0].DBSnapshotIdentifier'

# 2. Restore from snapshot to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier onboarding-production-db-restored \
  --db-snapshot-identifier SNAPSHOT_ID \
  --region us-east-1

# 3. Wait for restore to complete (15-20 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier onboarding-production-db-restored \
  --region us-east-1

# 4. Update DATABASE_URL to point to restored instance
# (Update in AWS Secrets Manager and restart ECS service)

# 5. Verify data integrity
python3 scripts/verify_data_integrity.py
```

**Verification:**
- Check all tables present
- Verify row counts match expected
- Test critical queries work
- Verify federal compliance data intact

**Downtime:** ~30 minutes (during restore and verification)

---

## 📋 ROLLBACK CHECKLIST

### Pre-Rollback
- [ ] Identify root cause of issue
- [ ] Determine rollback method needed
- [ ] Notify team of rollback
- [ ] Take snapshot of current state (if not already done)
- [ ] Prepare rollback commands

### During Rollback
- [ ] Execute rollback steps
- [ ] Monitor logs for errors
- [ ] Test critical endpoints
- [ ] Verify data integrity
- [ ] Check federal compliance

### Post-Rollback
- [ ] Verify all systems operational
- [ ] Document what went wrong
- [ ] Update migration plan
- [ ] Fix root cause before retry
- [ ] Test fix in staging
- [ ] Schedule retry (if applicable)

---

## 🔍 GROUP-SPECIFIC ROLLBACK NOTES

### Group 2: Property Management
**Rollback Risk:** LOW  
**Rollback Method:** Feature flag  
**Data at Risk:** Property records, manager assignments

**Rollback Steps:**
1. Set `USE_DIRECT_POSTGRES=false`
2. Verify properties load from Supabase
3. Check manager assignments intact

**Verification:**
```bash
# Test property list
curl -X GET https://api.example.com/api/hr/properties \
  -H "Authorization: Bearer $HR_TOKEN"

# Should return all properties
```

---

### Group 3: User Management
**Rollback Risk:** MEDIUM  
**Rollback Method:** Code rollback (authentication critical)  
**Data at Risk:** User accounts, password hashes, roles

**Rollback Steps:**
1. Deploy previous Docker image
2. Verify login works
3. Test password reset flow
4. Check role-based access

**Verification:**
```bash
# Test login
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should return JWT token
```

---

### Group 7: Federal Forms (CRITICAL)
**Rollback Risk:** CRITICAL  
**Rollback Method:** Immediate feature flag + data verification  
**Data at Risk:** I-9 forms, W-4 forms, signatures, deadlines

**Rollback Steps:**
1. IMMEDIATELY set `USE_DIRECT_POSTGRES=false`
2. Verify all I-9 deadlines correct
3. Verify all signatures present
4. Check PDF generation works
5. Run federal compliance audit

**Verification:**
```python
# Run compliance check
python3 scripts/verify_federal_compliance.py

# Should show:
# ✅ All I-9 Section 1 deadlines correct
# ✅ All I-9 Section 2 deadlines correct
# ✅ All signatures captured
# ✅ All PDFs generated correctly
```

**If Data Corrupted:**
1. Restore RDS from snapshot (before migration)
2. Re-sync from Supabase
3. Verify all federal data intact
4. Do NOT retry migration until root cause fixed

---

## 🛡️ PREVENTING ROLLBACK NEEDS

### Before Migration
1. ✅ Test thoroughly in staging
2. ✅ Verify schema matches
3. ✅ Run comparison tests
4. ✅ Check all tables exist
5. ✅ Verify column names match

### During Migration
1. ✅ Use feature flags
2. ✅ Gradual rollout (10% → 50% → 100%)
3. ✅ Monitor logs continuously
4. ✅ Run comparison tests
5. ✅ Keep Supabase active

### After Migration
1. ✅ Monitor for 24 hours before removing Supabase
2. ✅ Run daily integrity checks
3. ✅ Keep RDS snapshots for 30 days
4. ✅ Document any issues
5. ✅ Update runbooks

---

## 📊 ROLLBACK DECISION MATRIX

| Issue | Severity | Rollback Method | Downtime | Data Loss Risk |
|-------|----------|-----------------|----------|----------------|
| High error rate (>5%) | CRITICAL | Feature flag | None | None |
| Authentication broken | CRITICAL | Code rollback | 2 min | None |
| Data corruption | CRITICAL | DB restore | 30 min | Possible |
| Slow queries | HIGH | Feature flag | None | None |
| Intermittent errors | MEDIUM | Investigate first | None | None |
| UI issues | LOW | Code rollback | 2 min | None |

---

## 🔄 ROLLBACK TESTING

### Test Rollback Before Migration
```bash
# 1. Enable RDS
export USE_DIRECT_POSTGRES=true

# 2. Test endpoints work
curl https://api.example.com/api/hr/properties

# 3. Disable RDS (simulate rollback)
export USE_DIRECT_POSTGRES=false

# 4. Test endpoints still work (using Supabase)
curl https://api.example.com/api/hr/properties

# 5. Verify same results
```

### Automated Rollback Test
```python
async def test_rollback():
    # Enable RDS
    os.environ['USE_DIRECT_POSTGRES'] = 'true'
    rds_result = await get_properties()
    
    # Disable RDS (rollback)
    os.environ['USE_DIRECT_POSTGRES'] = 'false'
    supabase_result = await get_properties()
    
    # Verify same data
    assert len(rds_result) == len(supabase_result)
    assert rds_result[0].id == supabase_result[0].id
```

---

## 📞 EMERGENCY CONTACTS

### Rollback Authority
- **Primary:** Goutham (Developer)
- **Backup:** HR Manager
- **Escalation:** CTO

### Communication Plan
1. Notify team in Slack: #engineering
2. Update status page
3. Email affected users (if needed)
4. Post-mortem within 24 hours

---

## 📝 ROLLBACK LOG TEMPLATE

```markdown
# Rollback Log - [Date]

## Issue
- **Time Detected:** [timestamp]
- **Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
- **Description:** [what went wrong]
- **Affected Endpoints:** [list]

## Rollback
- **Method Used:** [Feature Flag/Code/Database]
- **Time Started:** [timestamp]
- **Time Completed:** [timestamp]
- **Downtime:** [duration]

## Verification
- [ ] Critical endpoints tested
- [ ] Data integrity verified
- [ ] Federal compliance checked
- [ ] No errors in logs

## Root Cause
[What caused the issue]

## Prevention
[How to prevent in future]

## Next Steps
[What to do before retry]
```

---

## ✅ ROLLBACK SUCCESS CRITERIA

After rollback, verify:
- [ ] All critical endpoints work
- [ ] Authentication works
- [ ] Federal compliance intact
- [ ] No data loss
- [ ] Error rate < 0.1%
- [ ] Response times normal
- [ ] Users can complete workflows

---

**Remember:** It's better to rollback and fix than to push forward with issues!

