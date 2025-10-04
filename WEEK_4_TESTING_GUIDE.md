# 🧪 Week 4: Testing Guide

**Status:** Ready for Testing  
**Date:** October 4, 2025

---

## 📋 **TESTING CHECKLIST**

### **Backend Testing**

- [ ] All migrations run successfully
- [ ] All API endpoints respond
- [ ] OTP generation works
- [ ] Email sending works
- [ ] Database queries work
- [ ] RLS policies enforced
- [ ] Error handling works

### **Frontend Testing**

- [ ] All routes load
- [ ] Components render
- [ ] Forms validate
- [ ] API calls work
- [ ] Error states display
- [ ] Loading states work
- [ ] Navigation works

### **Integration Testing**

- [ ] End-to-end OTP flow
- [ ] Employer profile setup
- [ ] Manager review flow
- [ ] Edit tracking works
- [ ] Session management
- [ ] Analytics display

---

## 🚀 **QUICK START TESTING**

### **1. Start Backend**

```bash
cd backend
uvicorn app.main_enhanced:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
✅ Manager document access router loaded successfully
✅ Manager review data router loaded successfully
✅ Manager employer profile router loaded successfully
✅ Edit tracking router loaded successfully
```

### **2. Start Frontend**

```bash
cd frontend/hotel-onboarding-frontend
npm run dev
```

**Expected Output:**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### **3. Open Browser**

Navigate to: `http://localhost:3000`

---

## 🧪 **BACKEND API TESTING**

### **Test 1: Health Check**

```bash
curl http://localhost:8000/
```

**Expected:** 200 OK

### **Test 2: API Documentation**

Open in browser: `http://localhost:8000/docs`

**Expected:** Swagger UI with all endpoints

### **Test 3: Request OTP**

```bash
curl -X POST http://localhost:8000/api/manager/document-access/request-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": "test-employee-id"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification code sent to manager@hotel.com",
  "expires_at": "2025-10-04T11:00:00Z"
}
```

### **Test 4: Get Employer Profile**

```bash
curl http://localhost:8000/api/manager/employer-profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "profile": null,
  "exists": false
}
```

### **Test 5: Get Pending Reviews**

```bash
curl http://localhost:8000/api/manager/review/employees/pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "employees": [],
  "count": 0
}
```

---

## 🎨 **FRONTEND TESTING**

### **Test 1: Employer Profile Setup**

**URL:** `http://localhost:3000/manager/employer-profile-setup`

**Steps:**
1. Navigate to URL
2. Fill in Step 1 (Company Info)
3. Click "Next"
4. Fill in Step 2 (Contact Details)
5. Click "Next"
6. Fill in Step 3 (Tax Info)
7. Click "Next"
8. Fill in Step 4 (Form Settings)
9. Click "Next"
10. Review all information
11. Click "Save Profile"

**Expected:**
- All steps navigate correctly
- Validation works on each step
- Auto-fill works in Step 4
- Review shows all data
- Save redirects to dashboard

### **Test 2: OTP Verification Modal**

**URL:** `http://localhost:3000/manager/review-new/test-employee-id`

**Steps:**
1. Navigate to URL
2. Click "Verify Identity"
3. OTP modal opens
4. Check email for code
5. Enter 6-digit code
6. Code verifies
7. Modal closes
8. Employee data loads

**Expected:**
- Modal opens smoothly
- Email received within 1-2 minutes
- Code input works (auto-advance)
- Paste works
- Timer counts down
- Verification succeeds
- Session created

### **Test 3: Manager Review Interface**

**URL:** `http://localhost:3000/manager/review-new/test-employee-id`

**Steps:**
1. Complete OTP verification
2. View employee data
3. Switch between tabs (I-9, W-4, Insurance)
4. Edit a field
5. Save changes
6. Check session timer

**Expected:**
- Data loads after OTP
- Tabs switch correctly
- Fields are editable
- Edits are tracked
- Save works
- Timer shows remaining time

---

## 🔗 **INTEGRATION TESTING**

### **Test 1: Complete OTP Flow**

**Scenario:** Manager requests access to employee documents

**Steps:**
1. Manager navigates to review page
2. System shows OTP gate
3. Manager clicks "Verify Identity"
4. System sends OTP email
5. Manager receives email
6. Manager enters code
7. System verifies code
8. System creates 30-minute session
9. Manager sees employee data

**Expected Results:**
- ✅ OTP sent within 10 seconds
- ✅ Email received within 2 minutes
- ✅ Code verification succeeds
- ✅ Session token returned
- ✅ Employee data loads
- ✅ Session timer starts

### **Test 2: Employer Profile Flow**

**Scenario:** Manager sets up employer profile for first time

**Steps:**
1. Manager navigates to setup page
2. Completes all 5 steps
3. Reviews information
4. Saves profile
5. System creates profile
6. Future forms auto-fill

**Expected Results:**
- ✅ All steps validate correctly
- ✅ Auto-fill works in Step 4
- ✅ Profile saves successfully
- ✅ Redirects to dashboard
- ✅ Profile exists in database

### **Test 3: Edit Tracking Flow**

**Scenario:** Manager edits a field during review

**Steps:**
1. Manager opens review interface
2. Verifies with OTP
3. Edits a field value
4. Saves changes
5. System tracks edit
6. Admin views analytics

**Expected Results:**
- ✅ Edit captured
- ✅ Original value stored
- ✅ New value stored
- ✅ Error categorized
- ✅ Analytics updated
- ✅ Recommendations generated

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: OTP Email Not Received**

**Symptoms:**
- OTP modal shows "Code sent"
- No email received after 5 minutes

**Checks:**
1. Check spam folder
2. Verify SMTP configuration in `.env`
3. Check backend logs for email errors
4. Test email service separately

**Fix:**
```bash
# Test email service
cd backend
python3 test_custom_otp.py
```

### **Issue 2: API 401 Unauthorized**

**Symptoms:**
- API calls return 401
- "Unauthorized" error

**Checks:**
1. Check if token exists in localStorage
2. Verify token is valid
3. Check token expiration

**Fix:**
```javascript
// In browser console
console.log(localStorage.getItem('token'))
// Should show JWT token
```

### **Issue 3: CORS Errors**

**Symptoms:**
- Browser console shows CORS error
- API calls blocked

**Checks:**
1. Verify backend CORS settings
2. Check API_BASE_URL in frontend

**Fix:**
```python
# In backend/app/main_enhanced.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Issue 4: Database Connection Error**

**Symptoms:**
- API returns 500 error
- "Database connection failed"

**Checks:**
1. Verify Supabase credentials in `.env`
2. Check internet connection
3. Verify Supabase project is active

**Fix:**
```bash
# Test database connection
cd backend
python3 -c "from app.supabase_service_enhanced import get_enhanced_supabase_service; print('✅ Connected')"
```

---

## 📊 **TEST RESULTS TEMPLATE**

### **Backend Tests**

| Test | Status | Notes |
|------|--------|-------|
| Server starts | ⏳ | |
| API docs load | ⏳ | |
| Request OTP | ⏳ | |
| Verify OTP | ⏳ | |
| Get profile | ⏳ | |
| Create profile | ⏳ | |
| Track edit | ⏳ | |
| Get analytics | ⏳ | |

### **Frontend Tests**

| Test | Status | Notes |
|------|--------|-------|
| App loads | ⏳ | |
| Routes work | ⏳ | |
| OTP modal | ⏳ | |
| Profile setup | ⏳ | |
| Review interface | ⏳ | |
| Edit tracking | ⏳ | |
| Session timer | ⏳ | |

### **Integration Tests**

| Test | Status | Notes |
|------|--------|-------|
| Complete OTP flow | ⏳ | |
| Profile setup flow | ⏳ | |
| Review flow | ⏳ | |
| Edit tracking flow | ⏳ | |
| Analytics flow | ⏳ | |

**Legend:**
- ⏳ Not tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial

---

## 🎯 **SUCCESS CRITERIA**

### **Must Pass:**
- ✅ Backend starts without errors
- ✅ Frontend loads successfully
- ✅ OTP email sends and verifies
- ✅ Employer profile saves
- ✅ Manager can review employee
- ✅ Edits are tracked

### **Should Pass:**
- ✅ All API endpoints respond
- ✅ All routes load
- ✅ All forms validate
- ✅ Session management works
- ✅ Analytics display

### **Nice to Have:**
- ✅ Performance is good (<2s load)
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Accessibility works

---

**Ready to start testing!** 🧪✅🚀

