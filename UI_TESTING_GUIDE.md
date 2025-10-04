# 🎨 UI Testing Guide - Sequential Document Approval

**How to test the new document approval workflow UI**

---

## ✅ **What's Ready**

### **Backend:**
- ✅ All endpoints working
- ✅ Database migration applied
- ✅ Sequential enforcement active

### **Frontend:**
- ✅ DocumentWorkflowStepper component
- ✅ DocumentPDFViewer component
- ✅ DocumentReviewModal component
- ✅ ManagerReviewInterface updated
- ✅ Session persistence working

---

## 🧪 **Test Flow**

### **Step 1: Login as Manager**

```
1. Go to http://localhost:3000
2. Login with manager credentials
3. Navigate to "Pending Reviews" tab
4. Find an employee who completed onboarding
5. Click "Review & Complete I-9"
```

---

### **Step 2: OTP Verification**

```
1. OTP modal should appear
2. Click "Verify Identity"
3. Check email for 6-digit code
4. Enter code
5. Click "Verify"
6. ✅ Session created (30 minutes)
7. ✅ Session saved to localStorage
```

---

### **Step 3: View Document Workflow**

**Expected UI:**

```
┌─────────────────────────────────────────────────┐
│  Document Approval Workflow                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Overall Progress                                │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0 / 5     │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ 1  Company Policies Acknowledgment     │  │
│  │      👉 Click to review this document    │  │
│  │                          [Ready to Review]│  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔒 2  I-9 Employment Eligibility         │  │
│  │      🔒 Complete previous step to unlock │  │
│  │                                  [Locked] │  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔒 3  W-4 Federal Tax Withholding        │  │
│  │      🔒 Complete previous step to unlock │  │
│  │                                  [Locked] │  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔒 4  Direct Deposit Authorization       │  │
│  │      🔒 Complete previous step to unlock │  │
│  │                                  [Locked] │  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔒 5  Health Insurance Enrollment        │  │
│  │      🔒 Complete previous step to unlock │  │
│  │                                  [Locked] │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Verify:**
- ✅ Progress bar shows 0%
- ✅ Step 1 is unlocked (green circle or "Ready to Review")
- ✅ Steps 2-5 are locked (lock icon)
- ✅ Can click on Step 1
- ✅ Cannot click on Steps 2-5

---

### **Step 4: Review Company Policies**

```
1. Click on "Company Policies Acknowledgment"
2. Full-screen modal should open
3. PDF should load in iframe
4. Should see:
   - PDF viewer on left
   - "Notes" textarea
   - "Reject" button (red)
   - "Approve" button (green)
```

**Verify:**
- ✅ PDF loads correctly
- ✅ Can scroll through PDF
- ✅ Download button works
- ✅ Can add notes
- ✅ Approve/Reject buttons enabled

**Actions:**
```
1. Review the PDF
2. Add note: "Signature verified"
3. Click "Approve"
4. Modal should close
5. Workflow should refresh
```

---

### **Step 5: Verify Step 2 Unlocked**

**Expected UI:**

```
┌─────────────────────────────────────────────────┐
│  Overall Progress                                │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░  1 / 5      │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ ✅ 1  Company Policies Acknowledgment    │  │
│  │      ✅ Approved on 10/4/2025 at 2:30 PM │  │
│  │                              [Approved]   │  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ ○ 2  I-9 Employment Eligibility          │  │
│  │      👉 Click to review this document    │  │
│  │                          [Ready to Review]│  │
│  └──────────────────────────────────────────┘  │
│  │                                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔒 3  W-4 Federal Tax Withholding        │  │
│  │      🔒 Complete previous step to unlock │  │
│  │                                  [Locked] │  │
│  └──────────────────────────────────────────┘  │
```

**Verify:**
- ✅ Progress bar shows 20% (1/5)
- ✅ Step 1 shows green checkmark
- ✅ Step 1 shows "Approved" badge
- ✅ Step 1 shows approval timestamp
- ✅ Step 2 is now unlocked
- ✅ Steps 3-5 still locked

---

### **Step 6: Review I-9 (Side-by-Side View)**

```
1. Click on "I-9 Employment Eligibility Verification"
2. Full-screen modal should open
3. Should see SPLIT VIEW:
   - Left: I-9 Section 1 PDF
   - Right: Uploaded verification documents
```

**Expected UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  Review: I-9 Employment Eligibility Verification      [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┬──────────────────────────────┐   │
│  │  I-9 Section 1 PDF   │  Verification Documents      │   │
│  │                      │                              │   │
│  │  [PDF Viewer]        │  [Drivers License] [Passport]│   │
│  │                      │                              │   │
│  │  Employee info...    │  ┌────────────────────────┐ │   │
│  │  Name: John Doe      │  │                        │ │   │
│  │  DOB: 01/01/1990     │  │   [DL Image]           │ │   │
│  │  SSN: ***-**-1234    │  │                        │ │   │
│  │  Address: ...        │  │   Name: John Doe       │ │   │
│  │                      │  │   DOB: 01/01/1990      │ │   │
│  │                      │  │   DL#: D1234567        │ │   │
│  │                      │  │                        │ │   │
│  │                      │  └────────────────────────┘ │   │
│  │                      │                              │   │
│  └──────────────────────┴──────────────────────────────┘   │
│                                                              │
│  Notes: _______________________________________________     │
│                                                              │
│  [Reject]                                    [Approve]      │
└─────────────────────────────────────────────────────────────┘
```

**Verify:**
- ✅ PDF on left side
- ✅ Uploaded docs on right side
- ✅ Can switch between DL/Passport/SSN tabs
- ✅ Can click "Enlarge" to zoom image
- ✅ Can compare information side-by-side

**Actions:**
```
1. Compare PDF info with DL image
2. Verify name matches
3. Verify DOB matches
4. Verify address matches
5. Add note: "Documents verified, information matches"
6. Click "Approve"
```

---

### **Step 7: Continue Through All Steps**

```
Repeat for each document:

Step 3: W-4
  - PDF on left
  - SSN card on right
  - Compare SSN
  - Approve

Step 4: Direct Deposit
  - PDF contains form + voided check
  - Verify routing/account numbers
  - Approve

Step 5: Health Insurance
  - Review enrollment
  - Approve
```

---

### **Step 8: Verify Completion**

**Expected UI:**

```
┌─────────────────────────────────────────────────┐
│  Overall Progress                                │
│  ████████████████████████████████████  5 / 5    │
│                                                  │
│  ✅ All documents approved!                     │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ ✅ 1  Company Policies - Approved        │  │
│  │ ✅ 2  I-9 Form - Approved                │  │
│  │ ✅ 3  W-4 Form - Approved                │  │
│  │ ✅ 4  Direct Deposit - Approved          │  │
│  │ ✅ 5  Health Insurance - Approved        │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Complete Onboarding]                          │
└─────────────────────────────────────────────────┘
```

**Verify:**
- ✅ Progress bar shows 100%
- ✅ All steps show green checkmarks
- ✅ All steps show "Approved" badges
- ✅ Success message displayed

---

## 🧪 **Test Rejection Flow**

### **Test Rejecting a Document:**

```
1. Click on any unlocked document
2. Click "Reject" button
3. Rejection form should appear
4. Enter reason: "Signature missing on page 3"
5. Click "Confirm Rejection"
6. Modal should close
7. Workflow should update
```

**Expected Result:**
- ✅ Document shows red X icon
- ✅ Document shows "Rejected" badge
- ✅ Document shows rejection reason
- ✅ Next steps remain locked
- ✅ Employee should be notified (TODO)

---

## 🧪 **Test Session Persistence**

### **Test Page Refresh:**

```
1. Complete OTP verification
2. Approve Step 1
3. Refresh the page (Cmd+R)
4. ✅ Should NOT show OTP modal again
5. ✅ Should restore session
6. ✅ Should show workflow with Step 1 approved
7. ✅ Should show Step 2 unlocked
```

### **Test Session Expiry:**

```
1. Complete OTP verification
2. Wait 30 minutes (or change system time)
3. Try to click on a document
4. ✅ Should show "Session expired" message
5. ✅ Should require re-verification
```

---

## 🐛 **Common Issues & Fixes**

### **Issue: PDF not loading**
```
Check:
- Backend is running (port 8000)
- Employee has completed onboarding
- PDFs exist in Supabase storage
- Signed URLs are valid (not expired)
```

### **Issue: Uploaded docs not showing**
```
Check:
- Employee uploaded verification docs
- Files exist in uploads/i9_verification/
- File paths are correct
- Signed URLs are valid
```

### **Issue: Can't approve document**
```
Check:
- Previous document is approved
- Session is still valid
- Backend endpoint is working
- Check browser console for errors
```

### **Issue: Workflow not updating**
```
Check:
- loadDocumentsStatus() is called after approve/reject
- Backend is returning updated status
- React state is updating correctly
```

---

## ✅ **Success Criteria**

**All tests pass if:**

1. ✅ OTP verification works
2. ✅ Session persists on refresh
3. ✅ Workflow displays correctly
4. ✅ Only unlocked steps are clickable
5. ✅ PDF viewer loads documents
6. ✅ Side-by-side view works for I-9/W-4
7. ✅ Can approve documents
8. ✅ Can reject documents
9. ✅ Workflow updates after actions
10. ✅ Progress bar updates correctly
11. ✅ All 5 steps can be completed
12. ✅ Session expires after 30 minutes

---

**Ready to test! Start with Step 1 and work through the flow!** 🧪✅

