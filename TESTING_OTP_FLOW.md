# 🧪 Testing the OTP Flow - Quick Guide

**Issue Fixed:** Manager review now requires OTP verification!

---

## 🔧 **What Was Fixed**

**Before:**
- Clicking "Review" → Went to `/manager/review/:employeeId`
- No OTP verification
- Direct access to employee data

**After:**
- Clicking "Review & Complete I-9" → Goes to `/manager/review-new/:employeeId`
- OTP verification required
- Secure access with email verification

---

## 🚀 **How to Test**

### **Step 1: Start the Application**

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main_enhanced:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend/hotel-onboarding-frontend
npm run dev
```

### **Step 2: Login as Manager**

1. Open browser: `http://localhost:3000`
2. Login with manager credentials
3. Navigate to Manager Dashboard

### **Step 3: Click Review Button**

1. Go to "Pending Reviews" tab
2. Find an employee
3. Click "Review & Complete I-9" button

### **Step 4: Verify OTP Flow**

**What you should see:**

1. **OTP Verification Gate**
   - Page loads with "Secure Document Access" message
   - "Verify Identity" button displayed
   - NO employee data visible yet

2. **Click "Verify Identity"**
   - OTP modal opens
   - Shows "Sending verification code to: [your-email]"
   - Loading spinner

3. **Check Your Email**
   - Subject: "🔒 Document Access Verification Code"
   - 6-digit code displayed prominently
   - Expiration warning (10 minutes)

4. **Enter the Code**
   - Type the 6-digit code
   - OR paste the entire code
   - Auto-submits when all 6 digits entered

5. **Verification Success**
   - Green checkmark appears
   - "Verified Successfully!" message
   - Modal closes after 1.5 seconds

6. **Employee Data Loads**
   - Session timer appears (30:00)
   - Employee information displayed
   - Tabs available (I-9, W-4, Insurance)
   - Fields are editable

---

## ✅ **Expected Behavior**

### **OTP Modal:**
```
┌─────────────────────────────────────┐
│ 🔒 Verify Your Identity             │
├─────────────────────────────────────┤
│                                      │
│ We sent a 6-digit code to:          │
│ manager@hotel.com                    │
│                                      │
│ To access documents for John Doe     │
│                                      │
│ ┌───┬───┬───┬───┬───┬───┐          │
│ │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │          │
│ └───┴───┴───┴───┴───┴───┘          │
│                                      │
│ ⏱️ Code expires in 9:45             │
│                                      │
│ [Verify Code]  [Resend Code]        │
│                                      │
└─────────────────────────────────────┘
```

### **After Verification:**
```
┌─────────────────────────────────────┐
│ Review: John Doe                     │
│ Employee ID: abc123...               │
│                                      │
│ ⏱️ Session: 29:45                   │
│ [Save Changes (0)]                   │
├─────────────────────────────────────┤
│ [I-9 Section 2] [W-4] [Insurance]   │
├─────────────────────────────────────┤
│                                      │
│ Employee First Day: [2025-10-15]    │
│ Source: Employee ✓                   │
│                                      │
│ Document Title: [Passport]           │
│ Source: OCR (85% confidence)         │
│ [Edit]                               │
│                                      │
└─────────────────────────────────────┘
```

---

## 🐛 **Troubleshooting**

### **Issue 1: Still seeing old review page (no OTP)**

**Solution:**
```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Or restart frontend
cd frontend/hotel-onboarding-frontend
npm run dev
```

### **Issue 2: OTP email not received**

**Check:**
1. Spam folder
2. Backend logs for email errors
3. SMTP configuration in `.env`

**Test email service:**
```bash
cd backend
python3 test_custom_otp.py
```

### **Issue 3: "Employee Not Found" error**

**Reason:** No employee ID in URL

**Solution:**
- Make sure you clicked from the dashboard
- URL should be: `/manager/review-new/[employee-id]`

### **Issue 4: Modal doesn't open**

**Check browser console for errors:**
```javascript
// Open browser console (F12)
// Look for errors
```

**Common fixes:**
- Refresh page
- Check if component is imported correctly
- Verify route is configured

---

## 📋 **Testing Checklist**

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can login as manager
- [ ] Can see pending reviews
- [ ] Click "Review & Complete I-9" button
- [ ] See OTP verification gate (NOT employee data)
- [ ] Click "Verify Identity"
- [ ] OTP modal opens
- [ ] Email received within 2 minutes
- [ ] Can enter 6-digit code
- [ ] Code verifies successfully
- [ ] Modal closes
- [ ] Employee data loads
- [ ] Session timer shows 30:00
- [ ] Can switch tabs
- [ ] Can edit fields
- [ ] Session timer counts down

---

## 🎯 **Success Criteria**

**✅ OTP Flow Working If:**
1. Clicking "Review" shows OTP gate (not employee data)
2. OTP modal opens when clicking "Verify Identity"
3. Email is received with 6-digit code
4. Code can be entered and verified
5. Employee data loads AFTER verification
6. Session timer is visible and counting down

**❌ OTP Flow NOT Working If:**
1. Employee data shows immediately (no OTP gate)
2. Can access data without entering code
3. No email received
4. Code verification fails
5. Modal doesn't open

---

## 🔍 **What to Look For**

### **In Browser:**
- URL changes to `/manager/review-new/:employeeId`
- OTP verification gate appears first
- Modal opens smoothly
- Code input works (auto-advance)
- Paste works
- Timer counts down
- Success animation plays

### **In Email:**
- Professional HTML template
- 6-digit code clearly visible
- Expiration warning
- Security instructions
- Hotel branding

### **After Verification:**
- Employee data loads
- Session timer appears
- All tabs work
- Fields are editable
- Save button appears when editing

---

## 📸 **Screenshots to Take**

1. **OTP Gate** - Before verification
2. **OTP Modal** - With code input
3. **Email** - Verification code email
4. **Success** - After verification
5. **Review Interface** - With session timer

---

## 🎊 **Next Steps After Testing**

**If OTP flow works:**
- ✅ Test employer profile setup
- ✅ Test edit tracking
- ✅ Test session expiration
- ✅ Test multiple employees

**If issues found:**
- Document the issue
- Check browser console
- Check backend logs
- Let me know the error

---

**Ready to test! The OTP flow should now work correctly.** 🔒✅

**Current Status:**
- ✅ Route updated to use OTP
- ✅ Button text updated
- ✅ All components ready
- ✅ Backend tested
- ✅ Frontend compiled

**Just refresh your browser and try clicking "Review & Complete I-9"!** 🚀

