# Single-Step Mode - Document Storage Behavior

## 🎯 **Your Question**

> "What happens in single step mode?"

## ✅ **Answer: Documents ARE Saved in Single-Step Mode!**

---

## 📊 **How Single-Step Mode Works**

### **Flow:**
```
1. HR sends single-step invitation
   ↓
2. Employee clicks link with token
   ↓
3. Frontend fetches: GET /api/onboarding/single-step/{token}
   ↓
4. Backend returns:
   - employee data (with employee.id)
   - property data
   - session data
   ↓
5. Employee uploads document
   ↓
6. Frontend sends: POST /api/documents/process
   FormData:
   - file: document.jpg
   - document_type: "social_security_card"
   - employee_id: employee.id ✅
   ↓
7. Backend saves to Supabase Storage ✅
   ↓
8. Backend processes with OCR
   ↓
9. Returns extracted data
```

---

## ✅ **Employee ID in Single-Step Mode**

### **How Employee ID is Obtained:**

#### **1. HR Sends Invitation:**
```typescript
// HR Dashboard
POST /api/hr/send-step-invitation
{
  "step_id": "i9-complete",
  "recipient_email": "employee@example.com",
  "recipient_name": "John Doe",
  "property_id": "property-123"
}
```

#### **2. Backend Creates/Finds Employee:**
```python
# Backend creates employee record if doesn't exist
employee = {
  "id": "employee-abc-123",  # ✅ Real employee ID
  "email": "employee@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "property_id": "property-123",
  "status": "invited"
}
```

#### **3. Frontend Fetches Employee Data:**
```typescript
// OnboardingFlowPortal.tsx (line 136)
const response = await fetch(`${apiBase}/onboarding/single-step/${token}`)
const data = await response.json()

// data.employee contains:
{
  "id": "employee-abc-123",  // ✅ Real employee ID
  "email": "employee@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### **4. Employee Prop Passed to DocumentUploadEnhanced:**
```typescript
// I9CompleteStep.tsx
<DocumentUploadEnhanced
  employee={session.employee}  // ✅ Has employee.id
  onComplete={handleComplete}
/>
```

#### **5. Document Upload Uses Employee ID:**
```typescript
// DocumentUploadEnhanced.tsx (line 357)
formData.append('employee_id', employee?.id || '')
// employee.id = "employee-abc-123" ✅
```

---

## ✅ **Storage Behavior in Single-Step Mode**

### **Scenario 1: Normal Single-Step Invitation** ✅
```
HR sends invitation
  ↓
Backend creates employee record
  employee_id = "employee-abc-123" ✅ (REAL ID)
  ↓
Employee uploads document
  ↓
Backend receives:
  - file: ssn_card.jpg
  - document_type: "social_security_card"
  - employee_id: "employee-abc-123" ✅
  ↓
✅ SAVED to Supabase Storage!
  Path: "property_123/employee-abc-123/social_security_card/ssn_20250108.jpg"
  ↓
OCR processed
  ↓
Data returned
```

**Result:** ✅ **Document IS saved to Supabase!**

---

### **Scenario 2: New Employee (No Prior Record)** ✅
```
HR sends invitation to new employee
  ↓
Backend creates NEW employee record
  employee_id = "employee-xyz-789" ✅ (NEW REAL ID)
  ↓
Employee may need to provide personal info first
  (if needs_personal_info flag is true)
  ↓
Employee uploads document
  ↓
✅ SAVED to Supabase Storage!
  Path: "property_123/employee-xyz-789/social_security_card/ssn_20250108.jpg"
```

**Result:** ✅ **Document IS saved to Supabase!**

---

### **Scenario 3: Existing Employee** ✅
```
HR sends invitation to existing employee
  ↓
Backend finds existing employee record
  employee_id = "employee-existing-456" ✅ (EXISTING REAL ID)
  ↓
Employee uploads document
  ↓
✅ SAVED to Supabase Storage!
  Path: "property_123/employee-existing-456/social_security_card/ssn_20250108.jpg"
```

**Result:** ✅ **Document IS saved to Supabase!**

---

## ❌ **When Documents Would NOT Be Saved**

### **Only These Cases:**

#### **1. Demo/Test Mode:**
```
employee_id = "demo-employee-123" ❌
employee_id = "test-employee-456" ❌
employee_id = "temp_192.168.1.1" ❌
→ Storage skipped (to avoid cluttering database)
```

#### **2. Missing Employee Context:**
```
employee = null or undefined ❌
employee.id = null or undefined ❌
→ Storage skipped (no employee to associate with)
```

**But in normal single-step mode:** Employee always exists! ✅

---

## 🗂️ **Storage Structure in Single-Step Mode**

### **Same as Full Onboarding:**
```
Supabase Bucket: "employee-documents"

employee-documents/
├─ property_123/
│  ├─ employee_abc/  ← Single-step employee
│  │  ├─ social_security_card/
│  │  │  └─ ssn_card_20250108_143022.jpg ✅
│  │  ├─ drivers_license/
│  │  │  └─ dl_20250108_143045.jpg ✅
│  │  └─ us_passport/
│  │     └─ passport_20250108_143102.jpg ✅
```

**No difference between single-step and full onboarding storage!**

---

## 🔄 **Complete Single-Step Flow Example**

### **Step-by-Step:**

```
1️⃣ HR Dashboard:
   - Select "I-9 Section 2" step
   - Enter employee email: john@example.com
   - Click "Send Invitation"

2️⃣ Backend:
   - Creates/finds employee record
   - employee_id = "employee-abc-123" ✅
   - Generates secure token
   - Sends email with link

3️⃣ Employee:
   - Clicks link in email
   - Opens: /onboarding?token=xxx&mode=single&step=i9-complete

4️⃣ Frontend:
   - Fetches: GET /api/onboarding/single-step/{token}
   - Receives employee data with employee.id ✅
   - Loads I-9 Section 2 step only

5️⃣ Employee Uploads SSN Card:
   - Selects file
   - Frontend sends: POST /api/documents/process
     FormData:
     - file: ssn_card.jpg
     - document_type: "social_security_card"
     - employee_id: "employee-abc-123" ✅

6️⃣ Backend:
   - Receives file with employee_id ✅
   - ✅ SAVES to Supabase Storage FIRST
     Path: "property_123/employee-abc-123/social_security_card/ssn_20250108.jpg"
   - Processes with Google Document AI (OCR)
   - Extracts SSN: "123-45-6789"

7️⃣ Backend Returns:
   {
     "success": true,
     "data": {
       "ssn": "123-45-6789",
       "storage_url": "https://supabase.co/storage/...",
       "extracted_data": {...}
     }
   }

8️⃣ Employee Submits:
   - Form data saved to database
   - Step marked complete
   - Done! ✅
```

---

## 📊 **Comparison: Single-Step vs Full Onboarding**

| Feature | Single-Step Mode | Full Onboarding |
|---------|-----------------|-----------------|
| **Employee ID** | ✅ Real ID from invitation | ✅ Real ID from signup |
| **Storage** | ✅ Saved to Supabase | ✅ Saved to Supabase |
| **Storage Path** | Same structure | Same structure |
| **OCR Processing** | ✅ Same | ✅ Same |
| **Document Access** | ✅ Same | ✅ Same |

**No difference in storage behavior!** ✅

---

## 🎯 **Summary**

### **Your Question:**
> "What happens in single step mode?"

### **Answer:**

**Documents ARE saved to Supabase Storage in single-step mode!** ✅

**Why:**
1. ✅ HR invitation creates/finds employee record with **real employee ID**
2. ✅ Frontend fetches employee data including **employee.id**
3. ✅ Document upload includes **employee_id** in request
4. ✅ Backend saves to Supabase Storage **before** OCR
5. ✅ Same storage structure as full onboarding

**Key Points:**
- ✅ Single-step mode uses **real employee IDs** (not demo/test)
- ✅ Storage happens **before** OCR (so saved even if OCR fails)
- ✅ Same storage path structure as full onboarding
- ✅ Documents accessible via public URL
- ✅ Metadata tracked in database

**Exception:** Only demo/test employee IDs skip storage (rare, only for testing)

---

## 🚀 **Conclusion**

**YES!** In single-step mode:
- ✅ Documents are saved to Supabase Storage
- ✅ Same behavior as full onboarding
- ✅ Real employee ID is always available
- ✅ Storage happens before OCR
- ✅ Files are safe and accessible

**Your documents are saved!** 🎉

