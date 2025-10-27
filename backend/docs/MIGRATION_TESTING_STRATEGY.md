# Migration Testing Strategy
## Ensuring Safe RDS Migration Without Breaking Production

**Created:** 2025-10-26  
**Purpose:** Define testing approach for each migration group

---

## 🎯 TESTING PRINCIPLES

### 1. Test Before Deploy
- Every endpoint tested locally or in staging
- No untested code reaches production
- Automated tests run before deployment

### 2. Test After Deploy
- Smoke tests immediately after deployment
- Monitor logs for 30 minutes
- Verify critical paths work

### 3. Test Data Integrity
- Compare RDS vs Supabase results
- Verify no data loss
- Check federal compliance data (I-9 deadlines, signatures)

---

## 🧪 TESTING LEVELS

### Level 1: Unit Tests (Local)
**What:** Test individual database queries  
**When:** During development  
**How:** pytest with test database

```python
# Example unit test
async def test_get_property_by_id():
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM properties WHERE id = $1",
            test_property_id
        )
        assert row is not None
        assert row['name'] == 'Test Property'
```

### Level 2: Integration Tests (Local/Staging)
**What:** Test complete endpoint flows  
**When:** Before deployment  
**How:** FastAPI TestClient

```python
# Example integration test
def test_create_property_endpoint():
    response = client.post(
        "/api/hr/properties",
        json={"name": "New Property", "city": "LA"},
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert response.status_code == 200
    assert response.json()['success'] == True
```

### Level 3: Smoke Tests (Production)
**What:** Test critical paths after deployment  
**When:** Immediately after deploy  
**How:** Manual or automated curl commands

```bash
# Example smoke test
curl -X GET https://api.example.com/api/hr/properties \
  -H "Authorization: Bearer $HR_TOKEN"
```

### Level 4: Comparison Tests (Production)
**What:** Compare RDS vs Supabase results  
**When:** During dual-write period  
**How:** Custom comparison scripts

```python
# Example comparison test
async def compare_results():
    # Get from RDS
    rds_result = await get_properties_from_rds()
    
    # Get from Supabase
    supabase_result = await get_properties_from_supabase()
    
    # Compare
    assert len(rds_result) == len(supabase_result)
    assert rds_result[0].id == supabase_result[0].id
```

---

## 📋 TESTING CHECKLIST PER GROUP

### Before Migration
- [ ] Identify all tables used by endpoints
- [ ] Verify tables exist in RDS
- [ ] Check column names match
- [ ] Write unit tests for new queries
- [ ] Write integration tests for endpoints
- [ ] Test locally with test data

### During Migration
- [ ] Deploy with feature flag OFF (Supabase still active)
- [ ] Run smoke tests
- [ ] Enable feature flag for 10% of traffic
- [ ] Monitor error logs
- [ ] Compare RDS vs Supabase results
- [ ] Gradually increase to 100%

### After Migration
- [ ] Run full integration test suite
- [ ] Check production logs for errors
- [ ] Verify data integrity
- [ ] Monitor performance metrics
- [ ] Test rollback procedure
- [ ] Update documentation

---

## 🔍 GROUP-SPECIFIC TESTS

### Group 2: Property Management
**Critical Paths:**
1. Create property → Verify in database
2. Update property → Verify changes saved
3. Delete property → Verify soft delete
4. Assign manager → Verify in property_managers table
5. List properties → Verify all properties returned

**Test Data:**
- Create 5 test properties
- Assign 3 managers
- Update 2 properties
- Delete 1 property

**Success Criteria:**
- All CRUD operations work
- Manager assignments persist
- No orphaned records

---

### Group 3: User Management
**Critical Paths:**
1. Create user → Verify password hash stored
2. Login → Verify JWT token generated
3. Password reset → Verify token created and email sent
4. Update role → Verify role changed
5. Delete user → Verify soft delete

**Test Data:**
- Create 3 users (HR, Manager, Employee)
- Test login for each role
- Test password reset flow
- Test role updates

**Success Criteria:**
- Authentication still works
- Password reset emails sent
- Role-based access control works
- No security vulnerabilities

---

### Group 4: QR Code Management
**Critical Paths:**
1. Generate QR code → Verify unique code created
2. Scan QR code → Verify access tracked
3. Get QR stats → Verify counts accurate

**Test Data:**
- Generate QR codes for 3 properties
- Simulate 10 scans per code
- Check access tracking

**Success Criteria:**
- QR codes unique per property
- Access tracking works
- Statistics accurate

---

### Group 7: Federal Forms (CRITICAL)
**Critical Paths:**
1. Save I-9 Section 1 → Verify deadline set correctly
2. Save I-9 Section 2 → Verify within 3 business days
3. Sign I-9 → Verify signature timestamp and IP captured
4. Generate I-9 PDF → Verify signature coordinates correct
5. Save W-4 → Verify tax withholding calculated
6. Sign W-4 → Verify signature captured

**Test Data:**
- Create employee with start date = today
- Complete I-9 Section 1 (should set deadline = today)
- Complete I-9 Section 2 (should set deadline = today + 3 business days)
- Sign both forms
- Generate PDFs

**Success Criteria:**
- I-9 Section 1 deadline = first day of work
- I-9 Section 2 deadline = 3 business days after hire
- Signatures captured with timestamp, IP, user agent
- PDFs match frontend signature coordinates
- Federal compliance maintained

**Compliance Checks:**
```python
async def test_i9_compliance():
    # Create employee starting today
    employee = await create_employee(start_date=datetime.now().date())
    
    # Save I-9 Section 1
    await save_i9_section1(employee.id, data)
    
    # Verify deadline
    employee = await get_employee(employee.id)
    assert employee.i9_section1_deadline == employee.start_date
    
    # Save I-9 Section 2
    await save_i9_section2(employee.id, data)
    
    # Verify deadline (3 business days)
    employee = await get_employee(employee.id)
    expected_deadline = calculate_business_days(employee.start_date, 3)
    assert employee.i9_section2_deadline == expected_deadline
```

---

### Group 8: Manager Review
**Critical Paths:**
1. Get pending reviews → Verify queue populated
2. Approve employee → Verify status updated
3. Reject employee → Verify rejection reason saved
4. Track edits → Verify edit patterns recorded
5. Request OTP → Verify OTP sent and expires

**Test Data:**
- Create 5 employees pending review
- Approve 2, reject 1, request changes for 2
- Track 10 manager edits
- Request 3 OTPs

**Success Criteria:**
- Review queue accurate
- Approval/rejection workflow works
- Edit tracking captures all changes
- OTP expires after 10 minutes

---

## 🚨 ERROR DETECTION

### What to Monitor

**1. Application Logs**
```bash
# Watch for errors
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1 | grep ERROR
```

**2. Database Connection Errors**
```python
# Look for these patterns
"asyncpg.exceptions.ConnectionDoesNotExistError"
"asyncpg.exceptions.TooManyConnectionsError"
"asyncpg.exceptions.PostgresError"
```

**3. Data Integrity Errors**
```python
# Look for these patterns
"IntegrityError: duplicate key"
"IntegrityError: foreign key constraint"
"IntegrityError: not null constraint"
```

**4. Performance Issues**
```python
# Look for slow queries
"Query took longer than 1000ms"
"Connection pool exhausted"
```

### Automated Monitoring

```python
# Add to each migrated endpoint
import time
import logging

logger = logging.getLogger(__name__)

async def get_properties_with_monitoring():
    start_time = time.time()
    
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM properties")
            
        duration = (time.time() - start_time) * 1000
        
        if duration > 1000:
            logger.warning(f"Slow query: get_properties took {duration}ms")
        
        logger.info(f"✅ get_properties: {len(rows)} rows in {duration}ms")
        return rows
        
    except Exception as e:
        logger.error(f"❌ get_properties failed: {e}")
        raise
```

---

## 📊 SUCCESS METRICS

### Per Migration Group

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Error Rate | < 0.1% | CloudWatch logs |
| Response Time | < 500ms | Application logs |
| Data Integrity | 100% | Comparison tests |
| Test Coverage | > 80% | pytest --cov |
| Uptime | 99.9% | Health checks |

### Overall Migration

| Metric | Target | Status |
|--------|--------|--------|
| Endpoints Migrated | 155/155 | 5/155 (3.1%) |
| Tests Passing | 100% | TBD |
| Production Errors | 0 | TBD |
| Federal Compliance | 100% | TBD |
| Performance | No degradation | TBD |

---

## 🔄 CONTINUOUS TESTING

### Daily Checks (During Migration)
- [ ] Run integration test suite
- [ ] Check error logs
- [ ] Verify federal compliance
- [ ] Monitor performance metrics
- [ ] Review comparison test results

### Weekly Checks
- [ ] Full end-to-end testing
- [ ] Security audit
- [ ] Performance benchmarking
- [ ] Data integrity verification
- [ ] Backup and restore test

---

## 🎯 FINAL ACCEPTANCE TESTS

Before declaring migration complete:

1. **Full Onboarding Flow**
   - Employee applies via QR code
   - HR reviews and approves
   - Employee completes all forms
   - Manager reviews and approves
   - I-9 Section 2 completed
   - All PDFs generated correctly

2. **Federal Compliance Audit**
   - All I-9 deadlines correct
   - All signatures captured
   - All timestamps recorded
   - All PDFs match requirements

3. **Performance Benchmark**
   - Dashboard loads < 2 seconds
   - Form saves < 500ms
   - PDF generation < 3 seconds
   - No connection pool exhaustion

4. **Security Audit**
   - No SQL injection vulnerabilities
   - No exposed credentials
   - Proper RLS enforcement
   - Audit logs complete

5. **Data Integrity Verification**
   - All Supabase data migrated
   - No orphaned records
   - All foreign keys valid
   - All indexes working

---

**Next Step:** Implement testing framework before starting Group 2 migration

