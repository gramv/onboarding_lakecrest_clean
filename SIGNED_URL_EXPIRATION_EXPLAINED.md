# Signed URL Expiration - How It Fits in Your System

**Date:** October 3, 2025  
**Context:** User asked "How does this fit in the current process?"

---

## 🔍 **CURRENT DOCUMENT FLOW**

### **Step 1: Employee Completes Form**
```
Employee fills out I-9, W-4, Direct Deposit, etc.
↓
Employee signs the form
↓
Frontend generates PDF (base64)
```

### **Step 2: PDF Saved to Supabase**
```
Frontend sends PDF to backend
↓
Backend uploads to Supabase Storage
  - Bucket: "onboarding-documents"
  - Path: property_name/employee_name/forms/i9_form/i9_signed_20251003.pdf
↓
Backend generates SIGNED URL ← THIS IS WHERE EXPIRATION HAPPENS
↓
Backend returns signed URL to frontend
```

### **Step 3: Frontend Displays PDF**
```
Frontend receives signed URL
↓
PDFViewer component displays it
  <PDFViewer pdfUrl={remotePdfUrl} />
↓
Employee sees their signed document
```

### **Step 4: Manager/HR Reviews (FUTURE)**
```
Manager logs in
↓
Manager requests employee documents
↓
Backend generates NEW signed URL ← EXPIRATION APPLIES HERE TOO
↓
Manager views documents
```

---

## 📍 **WHERE SIGNED URLs ARE GENERATED**

### **Location 1: After Employee Signs Document**

**File:** `backend/app/supabase_service_enhanced.py`  
**Line:** ~3432

```python
# Upload new active PDF
self.admin_client.storage.from_(bucket_name).upload(
    active_path,
    pdf_bytes,
    file_options={"content-type": "application/pdf", "upsert": "true"}
)

# Create signed URL for controlled access
signed = self.admin_client.storage.from_(bucket_name).create_signed_url(
    active_path,
    signed_url_expires_in_seconds  # ← CURRENTLY UNDEFINED/DEFAULT
)
```

**Current Problem:**
- `signed_url_expires_in_seconds` is a variable but not set
- Defaults to Supabase default (probably 3600 seconds = 1 hour)
- No control over expiration time

---

### **Location 2: Manager Requests Employee Documents**

**File:** `backend/app/manager_review_api.py`  
**Line:** ~180

```python
# Get all documents for this employee
documents = await supabase_service.get_employee_documents(employee_id)

# Format response with friendly names and metadata
formatted_documents = []

for doc in documents:
    # Generate signed URL for manager to view
    signed_url = supabase.storage.from_('onboarding-documents').create_signed_url(
        doc['file_path']
        # ← NO EXPIRATION SET - uses default
    )
    
    formatted_documents.append({
        'type': doc['type'],
        'url': signed_url,  # Manager gets this URL
        'created_at': doc['created_at']
    })
```

**Current Problem:**
- No expiration specified
- Manager gets URL that lasts for default time
- If manager shares URL, it stays valid

---

## 🎯 **WHAT SIGNED URL EXPIRATION DOES**

### **Without Expiration Control (Current):**

```python
# Backend generates URL
signed_url = storage.create_signed_url(path)
# Returns: https://storage.supabase.co/.../i9.pdf?token=abc123

# URL is valid for ??? time (default, probably 1 hour)
```

**Problems:**
1. Don't know how long URL is valid
2. Can't control different times for different documents
3. If URL is shared, it works for unknown duration

---

### **With Expiration Control (Proposed):**

```python
# Backend generates URL with explicit expiration
EXPIRATION_TIMES = {
    'i9': 900,              # 15 minutes for I-9 (has SSN)
    'w4': 900,              # 15 minutes for W-4 (has SSN)
    'direct-deposit': 900,  # 15 minutes for bank info
    'company-policies': 3600,  # 1 hour for policies
}

signed_url = storage.create_signed_url(
    path,
    expires_in=EXPIRATION_TIMES['i9']  # 15 minutes
)
# Returns: https://storage.supabase.co/.../i9.pdf?token=abc123&expires=900
```

**Benefits:**
1. Know exactly how long URL is valid (15 minutes)
2. Different times for different sensitivity levels
3. If URL is shared, it expires quickly

---

## 🔄 **COMPLETE FLOW WITH EXPIRATION**

### **Scenario 1: Employee Views Their Own Document**

```
1. Employee completes I-9 form
2. Frontend sends to backend
3. Backend uploads PDF to Supabase Storage
4. Backend generates signed URL (expires in 15 minutes)
5. Backend returns URL to frontend
6. Frontend displays PDF using <PDFViewer pdfUrl={url} />
7. Employee views PDF for 15 minutes
8. After 15 minutes, URL expires
9. If employee refreshes page, frontend requests NEW URL
10. Backend generates NEW signed URL (another 15 minutes)
```

**Key Point:** Employee can ALWAYS view their document, they just need to request a new URL after expiration.

---

### **Scenario 2: Manager Reviews Employee Documents**

```
1. Manager clicks "Review Employee"
2. Frontend calls: GET /api/manager/employees/{id}/documents
3. Backend retrieves document paths from database
4. Backend generates signed URLs (expires in 30 minutes for manager review)
5. Backend returns URLs to frontend
6. Manager views all documents
7. After 30 minutes, URLs expire
8. If manager needs to view again, requests new URLs
```

**Key Point:** Manager gets fresh URLs each time they open the review page.

---

## 💡 **WHY THIS MATTERS FOR YOUR SYSTEM**

### **Current Situation:**

**Employee completes I-9:**
```
✅ PDF uploaded to Supabase Storage (secure)
✅ Signed URL generated (secure)
❓ URL valid for ??? time (unknown)
❌ If employee shares URL, works for unknown duration
```

**Manager reviews documents:**
```
✅ Manager authenticated (secure)
✅ Manager gets signed URLs (secure)
❓ URLs valid for ??? time (unknown)
❌ If manager shares URL, works for unknown duration
```

---

### **With Expiration Control:**

**Employee completes I-9:**
```
✅ PDF uploaded to Supabase Storage (secure)
✅ Signed URL generated with 15-minute expiration (secure)
✅ URL valid for exactly 15 minutes (known)
✅ If employee shares URL, expires in 15 minutes (limited risk)
```

**Manager reviews documents:**
```
✅ Manager authenticated (secure)
✅ Manager gets signed URLs with 30-minute expiration (secure)
✅ URLs valid for exactly 30 minutes (known)
✅ If manager shares URL, expires in 30 minutes (limited risk)
✅ Each audit log entry shows URL generation (tracked)
```

---

## 🔧 **IMPLEMENTATION IN YOUR CODE**

### **Change 1: Set Expiration When Employee Signs**

**File:** `backend/app/supabase_service_enhanced.py`  
**Line:** ~3432

**Before:**
```python
signed = self.admin_client.storage.from_(bucket_name).create_signed_url(
    active_path,
    signed_url_expires_in_seconds  # Undefined variable
)
```

**After:**
```python
# Define expiration based on document type
EXPIRATION_TIMES = {
    'i9': 900,              # 15 minutes
    'w4': 900,              # 15 minutes
    'direct-deposit': 900,  # 15 minutes
    'company-policies': 3600,  # 1 hour
    'default': 1800         # 30 minutes
}

# Get expiration time for this form type
expiration = EXPIRATION_TIMES.get(form_type, EXPIRATION_TIMES['default'])

# Generate signed URL with expiration
signed = self.admin_client.storage.from_(bucket_name).create_signed_url(
    active_path,
    expiration  # Now explicitly set
)
```

---

### **Change 2: Set Expiration When Manager Requests Documents**

**File:** `backend/app/manager_review_api.py`  
**Line:** ~180

**Before:**
```python
# Generate signed URL (no expiration)
signed_url = supabase.storage.from_('onboarding-documents').create_signed_url(
    doc['file_path']
)
```

**After:**
```python
# Manager gets longer expiration for review (30 minutes)
MANAGER_REVIEW_EXPIRATION = 1800  # 30 minutes

# Generate signed URL with expiration
signed_url = supabase.storage.from_('onboarding-documents').create_signed_url(
    doc['file_path'],
    expires_in=MANAGER_REVIEW_EXPIRATION
)
```

---

## 📊 **IMPACT ON USER EXPERIENCE**

### **For Employees:**

**Before:**
- Complete form → View PDF → URL works for ??? time
- No indication of expiration
- If they share link, it works indefinitely

**After:**
- Complete form → View PDF → URL works for 15 minutes
- (Optional) Show message: "This preview will expire in 15 minutes"
- If they need to view again, just refresh page (gets new URL)
- If they share link, it expires in 15 minutes

**Impact:** ✅ **ZERO NEGATIVE IMPACT** - They can still view their documents anytime

---

### **For Managers:**

**Before:**
- Open employee review → View documents → URLs work for ??? time
- No indication of expiration
- If they share links, they work indefinitely

**After:**
- Open employee review → View documents → URLs work for 30 minutes
- (Optional) Show message: "Document links expire in 30 minutes"
- If they need to review again, just refresh page (gets new URLs)
- If they share links, they expire in 30 minutes

**Impact:** ✅ **ZERO NEGATIVE IMPACT** - They can still review documents anytime

---

## ✅ **BOTTOM LINE**

### **What Changes:**
- ✅ Backend explicitly sets expiration times when generating signed URLs
- ✅ Different expiration times for different document types
- ✅ (Optional) Frontend shows expiration warning to users

### **What Stays the Same:**
- ✅ Documents still stored in Supabase Storage
- ✅ Employees can still view their documents
- ✅ Managers can still review employee documents
- ✅ Same PDFViewer component displays documents
- ✅ Same authentication and access control

### **What Improves:**
- ✅ Better security (URLs expire quickly)
- ✅ Reduced risk if URLs are shared
- ✅ Audit trail shows each URL generation
- ✅ Compliance with data protection best practices

---

## 🎯 **RECOMMENDATION**

**Since users (employees) don't have access to saved docs anyway**, the signed URL expiration is **PRIMARILY for Manager/HR access**.

**Implementation Priority:**

1. **High Priority:** Set expiration for Manager/HR document review
   - Managers get 30-minute URLs
   - HR gets 1-hour URLs
   - Reduces risk if manager shares link

2. **Medium Priority:** Set expiration for employee preview after signing
   - Employees get 15-minute URLs
   - Only affects immediate preview after signing
   - Low impact since they don't access later

3. **Low Priority:** Show expiration warnings in UI
   - Nice to have, not critical
   - Can add later

---

**Does this make sense now?** It's just setting an explicit expiration time when generating the temporary access URLs, instead of using the default unknown time.
