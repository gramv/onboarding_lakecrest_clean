# Group 2 & 3 Migration - Deployment & Testing Guide

**Created:** 2025-10-26  
**Status:** Ready to Deploy  
**Endpoints Migrated:** 7 endpoints across 2 groups  
**Estimated Testing Time:** 30 minutes

---

## 📊 WHAT WAS MIGRATED

### ✅ Group 2: Property Management (5 endpoints)
1. `PUT /api/hr/properties/{id}` - Update property
2. `GET /api/hr/properties/{property_id}/stats` - Property statistics (optimized with single query)
3. `GET /api/hr/properties/{id}/managers` - Get property managers (optimized JOIN)
4. `POST /api/hr/properties/{id}/managers` - Assign manager to property
5. `DELETE /api/hr/properties/{id}/managers/{manager_id}` - Remove manager from property

### ✅ Group 3: User Management (2 endpoints - PARTIAL)
1. `GET /api/hr/users` - List all users (optimized with property JOIN)
2. `POST /api/auth/request-password-reset` - Request password reset

**Total Progress:** 11 endpoints migrated (6.9% of 160 total)

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Verify Changes
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend

# Check what files were modified
git status

# Review the changes
git diff app/main_enhanced.py | head -100
git diff app/routers/auth_router.py
```

### Step 2: Deploy to Production
```bash
# Make sure you're in the backend directory
cd /Users/gouthamvemula/onbfinaldev_clean/backend

# Run the quick deploy script
./QUICK_DEPLOY.sh
```

**What QUICK_DEPLOY.sh does:**
1. Builds new Docker image with timestamp tag
2. Pushes to AWS ECR
3. Updates ECS task definition
4. Deploys to ECS cluster
5. Waits for deployment to stabilize

**Expected Duration:** 5-7 minutes

### Step 3: Verify Deployment
```bash
# Check ECS service status
AWS_PROFILE=hotel-onboarding aws ecs describe-services \
  --cluster hotel-onboarding-cluster \
  --services hotel-onboarding-service \
  --region us-east-1 \
  --query 'services[0].deployments[*].[status,runningCount,desiredCount]'

# Check CloudWatch logs for startup
AWS_PROFILE=hotel-onboarding aws logs tail /ecs/hotel-onboarding-backend \
  --follow \
  --region us-east-1
```

**Look for these log messages:**
- ✅ `"✅ RDS: Updated property {id}"`
- ✅ `"✅ RDS: Retrieved {N} managers for property {id}"`
- ✅ `"✅ RDS: Retrieved {N} users"`
- ✅ `"✅ RDS: Created password reset token"`

---

## 🧪 TESTING INSTRUCTIONS

### Test Environment Setup
1. **Frontend URL:** https://hotel-onboarding-frontend-p2t3abx6l-gramvs-projects.vercel.app
2. **Backend API:** https://hotel-onboarding-backend-1234567890.us-east-1.elb.amazonaws.com
3. **Test Credentials:**
   - HR User: (use your existing HR account)
   - Manager User: (use your existing manager account)

### Test 1: Property Management (5 minutes)

#### 1.1 Update Property
```bash
# Login as HR user first, then:
curl -X PUT "https://YOUR_BACKEND_URL/api/hr/properties/{property_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Updated Hotel Name" \
  -F "address=123 Main St" \
  -F "city=New York" \
  -F "state=NY" \
  -F "zip_code=10001" \
  -F "phone=555-1234"

# Expected: 200 OK with updated property data
# Check logs for: "✅ RDS: Updated property {id}"
```

**Frontend Test:**
1. Login as HR user
2. Go to Properties page
3. Click "Edit" on any property
4. Change the name and save
5. Verify the change persists

#### 1.2 Property Statistics
```bash
curl -X GET "https://YOUR_BACKEND_URL/api/hr/properties/{property_id}/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON with stats:
# {
#   "total_applications": N,
#   "pending_applications": N,
#   "approved_applications": N,
#   "total_employees": N,
#   "active_employees": N
# }
```

**Frontend Test:**
1. Login as HR user
2. Go to Properties page
3. View property details
4. Verify statistics are displayed correctly

#### 1.3 Manager Assignment
```bash
# Get property managers
curl -X GET "https://YOUR_BACKEND_URL/api/hr/properties/{property_id}/managers" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Assign a manager
curl -X POST "https://YOUR_BACKEND_URL/api/hr/properties/{property_id}/managers" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"manager_id": "MANAGER_UUID"}'

# Remove a manager
curl -X DELETE "https://YOUR_BACKEND_URL/api/hr/properties/{property_id}/managers/{manager_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Frontend Test:**
1. Login as HR user
2. Go to Properties page
3. Click on a property
4. Go to "Managers" tab
5. Assign a new manager
6. Verify manager appears in list
7. Remove the manager
8. Verify manager is removed

### Test 2: User Management (5 minutes)

#### 2.1 List Users
```bash
# Get all users
curl -X GET "https://YOUR_BACKEND_URL/api/hr/users" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by role
curl -X GET "https://YOUR_BACKEND_URL/api/hr/users?role=manager" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search users
curl -X GET "https://YOUR_BACKEND_URL/api/hr/users?search=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Frontend Test:**
1. Login as HR user
2. Go to Users page
3. Verify all users are listed
4. Use the role filter (Manager/HR/Employee)
5. Use the search box
6. Verify filtering works correctly

#### 2.2 Password Reset
```bash
# Request password reset
curl -X POST "https://YOUR_BACKEND_URL/api/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@example.com"}'

# Expected: Success message (even if email doesn't exist - security)
```

**Frontend Test:**
1. Logout
2. Click "Forgot Password?"
3. Enter a manager or HR email
4. Submit
5. Check email for reset link
6. Click the link
7. Enter new password
8. Verify you can login with new password

### Test 3: Verify RDS is Being Used (2 minutes)

```bash
# Check CloudWatch logs for RDS usage
AWS_PROFILE=hotel-onboarding aws logs filter-log-events \
  --log-group-name /ecs/hotel-onboarding-backend \
  --filter-pattern "✅ RDS:" \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --region us-east-1 \
  --query 'events[*].message' \
  --output text

# You should see messages like:
# ✅ RDS: Updated property abc-123
# ✅ RDS: Retrieved 3 managers for property abc-123
# ✅ RDS: Retrieved 15 users
# ✅ RDS: Created password reset token for user xyz-456
```

### Test 4: Verify Supabase Fallback Works (Optional)

```bash
# Temporarily disable RDS by setting environment variable
AWS_PROFILE=hotel-onboarding aws ecs update-service \
  --cluster hotel-onboarding-cluster \
  --service hotel-onboarding-service \
  --task-definition hotel-onboarding-backend:LATEST \
  --force-new-deployment \
  --region us-east-1 \
  --environment-overrides name=USE_DIRECT_POSTGRES,value=false

# Wait 2 minutes for deployment

# Repeat Test 1 and Test 2
# Check logs for: "✅ Supabase:" messages

# Re-enable RDS
AWS_PROFILE=hotel-onboarding aws ecs update-service \
  --cluster hotel-onboarding-cluster \
  --service hotel-onboarding-service \
  --task-definition hotel-onboarding-backend:LATEST \
  --force-new-deployment \
  --region us-east-1 \
  --environment-overrides name=USE_DIRECT_POSTGRES,value=true
```

---

## ✅ SUCCESS CRITERIA

### All Tests Must Pass:
- [ ] Property update works (frontend + API)
- [ ] Property statistics display correctly
- [ ] Manager assignment/removal works
- [ ] User list displays with filters
- [ ] Password reset email is sent
- [ ] CloudWatch logs show "✅ RDS:" messages
- [ ] No errors in CloudWatch logs
- [ ] Response times < 500ms
- [ ] All existing functionality still works

### Performance Metrics:
- **Response Time:** < 500ms for all endpoints
- **Error Rate:** < 0.1%
- **Database Connections:** < 5 concurrent (check RDS metrics)

---

## 🚨 ROLLBACK PROCEDURE

If any test fails:

### Method 1: Feature Flag Rollback (30 seconds)
```bash
# Disable RDS, use Supabase only
AWS_PROFILE=hotel-onboarding aws ecs update-service \
  --cluster hotel-onboarding-cluster \
  --service hotel-onboarding-service \
  --force-new-deployment \
  --region us-east-1 \
  --environment-overrides name=USE_DIRECT_POSTGRES,value=false
```

### Method 2: Code Rollback (5 minutes)
```bash
# Find previous working image
AWS_PROFILE=hotel-onboarding aws ecr describe-images \
  --repository-name hotel-onboarding-backend \
  --region us-east-1 \
  --query 'sort_by(imageDetails,& imagePushedAt)[-5:].[imageTags[0],imagePushedAt]'

# Deploy previous image
./QUICK_DEPLOY.sh --image-tag PREVIOUS_TAG
```

---

## 📈 MONITORING

### CloudWatch Dashboards
- **ECS Service:** Monitor running tasks, CPU, memory
- **RDS Database:** Monitor connections, CPU, storage
- **Application Logs:** Filter for errors and RDS usage

### Key Metrics to Watch (First 24 Hours):
1. **Error Rate:** Should be < 0.1%
2. **Response Time:** Should be < 500ms (p95)
3. **RDS Connections:** Should be < 5 concurrent
4. **Database CPU:** Should be < 50%

---

## 📝 NEXT STEPS

After successful deployment and 24-hour monitoring:

1. **Complete Group 3** - Migrate remaining 8 user management endpoints
2. **Group 4: QR Codes** - 5 endpoints (qr_codes table confirmed exists)
3. **Group 5: Applications** - 15 endpoints
4. **Continue through Groups 6-11** - 128 remaining endpoints

**Estimated Timeline:**
- Groups 2-3: ✅ COMPLETE (7 endpoints)
- Groups 4-11: 6 weeks (153 endpoints remaining)

---

## 🎯 SUMMARY

**What Changed:**
- 7 endpoints now use RDS with Supabase fallback
- Optimized queries with JOINs (better performance)
- Dual-path pattern ensures zero downtime

**What to Test:**
- Property management (update, stats, managers)
- User listing and filtering
- Password reset flow

**Where to Test:**
- Frontend: https://hotel-onboarding-frontend-p2t3abx6l-gramvs-projects.vercel.app
- API: Check CloudWatch logs for "✅ RDS:" messages

**How Long:**
- Deployment: 5-7 minutes
- Testing: 30 minutes
- Monitoring: 24 hours

**Rollback:**
- Feature flag: 30 seconds
- Code rollback: 5 minutes

