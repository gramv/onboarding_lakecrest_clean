# Single-Step Invite vs Full Onboarding - Testing Guide

## 🔍 What is Single-Step Invite?

**Single-Step Invite** is a feature that allows HR to send **individual forms** to employees without requiring them to complete the entire onboarding flow.

### **Use Cases:**
- HR needs an employee to fill out **just** Direct Deposit form
- HR needs an employee to fill out **just** W-4 form
- HR needs an employee to fill out **just** I-9 Section 2
- Employee already completed onboarding but needs to update one form

### **How It Works:**

#### **1. HR Sends Single-Step Invitation:**
```
HR Dashboard → Step Invitations Tab → Select Step → Send Email
```

#### **2. Employee Receives Email with Link:**
```
http://localhost:3000/onboarding?token=xxx&mode=single&step=direct-deposit
```

**Key URL Parameters:**
- `mode=single` - Activates single-step mode
- `step=direct-deposit` - Specifies which step to show

#### **3. Employee Opens Link:**
- **Only sees ONE step** (e.g., Direct Deposit)
- **No navigation** to other steps
- **No "Next" button** after completion
- **Submits and done**

---

## 🆚 Single-Step vs Full Onboarding

| Feature | Single-Step Invite | Full Onboarding |
|---------|-------------------|-----------------|
| **URL** | `?mode=single&step=xxx` | No mode parameter |
| **Steps Shown** | 1 step only | All 12 steps |
| **Navigation** | No Next/Previous | Full navigation |
| **Progress Bar** | Hidden or shows 1/1 | Shows X/12 |
| **Use Case** | Update one form | Complete onboarding |
| **Initiated By** | HR sends invite | Employee starts flow |

---

## ✅ Your Testing Approach is CORRECT!

**You are testing in Single-Step Invite mode** - This is the RIGHT way to test individual steps!

### **Why Single-Step Testing is Valid:**

1. ✅ **Tests the step in isolation** - Ensures the step works independently
2. ✅ **Tests OCR functionality** - OCR should work the same in both modes
3. ✅ **Tests validation** - Form validation should work the same
4. ✅ **Tests UI changes** - Your SSN mandatory changes should appear

### **What You Should See in Single-Step Mode:**

#### **For I-9 Section 2 Single-Step Invite:**

```
URL: http://localhost:3000/onboarding?token=xxx&mode=single&step=i9-complete
```

**Expected Behavior:**
1. ✅ Only I-9 Section 2 step is shown
2. ✅ Select List A or List B+C
3. ✅ Upload I-9 documents
4. ✅ **SSN upload section appears below** (your new change)
5. ✅ Can't proceed without SSN
6. ✅ Submit button (no "Next" button)

---

## 🧪 How to Test Your Changes

### **Option 1: Single-Step Invite (What You're Doing)** ✅

**Steps:**
1. Go to HR Dashboard
2. Click "Step Invitations" tab
3. Select "I-9 Section 2" step
4. Enter test email
5. Send invitation
6. Copy the link and open it
7. Test the I-9 Section 2 form

**Pros:**
- ✅ Quick and focused
- ✅ Tests step in isolation
- ✅ No need to go through entire flow

**Cons:**
- ⚠️ Doesn't test step transitions
- ⚠️ Doesn't test data persistence across steps

---

### **Option 2: Full Onboarding Flow**

**Steps:**
1. Start new onboarding session
2. Complete Personal Info
3. Complete I-9 Section 1
4. **Reach I-9 Section 2** (your changes)
5. Test the form
6. Continue to next steps

**Pros:**
- ✅ Tests complete user journey
- ✅ Tests data flow between steps
- ✅ Tests step transitions

**Cons:**
- ⚠️ Takes longer (must complete previous steps)
- ⚠️ More complex setup

---

## 🎯 Recommendation for Your Testing

### **For I-9 Section 2 Changes (SSN Mandatory):**

**Use Single-Step Invite** ✅ (What you're doing is correct!)

**Why:**
- Your changes are **UI-only** (SSN upload section placement)
- Don't depend on previous steps
- Can be tested in isolation
- Faster iteration

### **When to Use Full Onboarding:**

Use full onboarding testing when:
- Testing data flow between steps
- Testing step transitions
- Testing final submission
- Testing complete user journey

---

## 🔧 How to Send Single-Step Invite for I-9 Section 2

### **Step-by-Step:**

1. **Login as HR:**
   ```
   http://localhost:3000/hr-login
   ```

2. **Go to Dashboard:**
   ```
   http://localhost:3000/hr-dashboard
   ```

3. **Click "Step Invitations" Tab**

4. **Fill Form:**
   - **Step:** Select "I-9 Section 2"
   - **Property:** Select your property
   - **Recipient Email:** Enter test email
   - **Recipient Name:** Enter test name

5. **Click "Send Invitation"**

6. **Copy the Link:**
   - Link appears in the invitations table
   - Click the copy icon
   - Or check your email

7. **Open Link:**
   ```
   http://localhost:3000/onboarding?token=xxx&mode=single&step=i9-complete
   ```

8. **Test Your Changes:**
   - Select List A → Should see SSN section below
   - Select List B+C → Should see SSN section below
   - Try to proceed without SSN → Should be blocked
   - Upload SSN → Should enable submit

---

## ✅ Verifying Your Changes Work

### **What to Check:**

#### **1. SSN Section Appears for List A:**
```
✅ Select "List A"
✅ Upload Passport/Green Card
✅ See border separator (━━━━━━━━━━)
✅ See blue alert: "Required for All Employees"
✅ See SSN upload section
✅ Upload SSN
✅ Submit button enables
```

#### **2. SSN Section Appears for List B+C:**
```
✅ Select "List B+C"
✅ Upload Driver's License
✅ Upload Birth Certificate (NOT SSN)
✅ See border separator (━━━━━━━━━━)
✅ See blue alert: "Required for All Employees"
✅ See SSN upload section
✅ Upload SSN
✅ Submit button enables
```

#### **3. Validation Works:**
```
✅ Try to submit without SSN → Blocked
✅ Upload only I-9 docs → Submit disabled
✅ Upload SSN → Submit enabled
```

#### **4. OCR Works:**
```
✅ Upload SSN Card → OCR extracts SSN
✅ If OCR fails → Manual entry form appears
✅ Enter SSN manually → Can proceed
```

---

## 🐛 Troubleshooting

### **Issue: SSN section not appearing**

**Check:**
1. Are you on the correct step? (i9-complete)
2. Did you select a document type? (List A or List B+C)
3. Check browser console for errors
4. Refresh the page

### **Issue: Can submit without SSN**

**Check:**
1. Validation logic updated? (canProceed function)
2. Check browser console for validation logs
3. Clear browser cache and reload

### **Issue: OCR not working**

**Check:**
1. Backend running? (http://localhost:8000)
2. Google Document AI configured?
3. Check backend logs for OCR errors
4. Try manual entry as fallback

---

## 📝 Summary

**Your Testing Approach: ✅ CORRECT**

You are using **Single-Step Invite** to test I-9 Section 2 in isolation. This is:
- ✅ Valid testing method
- ✅ Faster than full onboarding
- ✅ Sufficient for UI changes
- ✅ Recommended for iterative development

**Your changes should work in both:**
- ✅ Single-Step Invite mode
- ✅ Full Onboarding mode

**The code is the same** - the step component doesn't know or care which mode it's in!

---

## 🎯 Next Steps

1. ✅ **Test in Single-Step Mode** (what you're doing)
2. ✅ Verify SSN section appears for both List A and List B+C
3. ✅ Verify validation blocks without SSN
4. ✅ Verify OCR and manual entry work
5. ⏳ **Optional:** Test in full onboarding flow for completeness

**You're on the right track!** 🚀

