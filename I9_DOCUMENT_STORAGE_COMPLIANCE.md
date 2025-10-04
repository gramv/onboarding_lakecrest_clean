# I-9 Document Storage Compliance Guide

**Last Updated:** October 3, 2025  
**Source:** USCIS Handbook for Employers M-274

---

## ✅ **YES - YOU CAN STORE EMPLOYEE DOCUMENTS**

### **Federal Law Allows Document Copies**

According to USCIS regulations (8 CFR 274a.2(b)(3)):

> **"If you choose to copy or scan documents an employee presents when completing Form I-9, you must retain the copies (or electronic images) with their Form I-9 or their employee record."**

**Key Points:**
- ✅ **Employers MAY store copies** of List A, B, and C documents
- ✅ **Storing copies is OPTIONAL**, not required (except for E-Verify users with remote verification)
- ✅ **Copies can be paper or electronic** (scanned images)
- ⚠️ **If you copy documents, you must do so for ALL employees** (anti-discrimination requirement)

---

## 📋 **WHAT DOCUMENTS CAN BE STORED?**

### **List A Documents (Identity + Employment Authorization)**
- U.S. Passport or Passport Card
- Permanent Resident Card (Green Card)
- Employment Authorization Document (EAD)
- Foreign passport with I-551 stamp
- Foreign passport with I-94 showing employment authorization

### **List B Documents (Identity Only)**
- Driver's License or State ID
- School ID with photograph
- Voter registration card
- U.S. Military card
- U.S. Coast Guard Merchant Mariner card

### **List C Documents (Employment Authorization Only)**
- Social Security Card (unrestricted)
- Birth Certificate
- Native American tribal document
- U.S. Citizen ID Card (Form I-197)

**All of these can be stored as copies/scans with the employee's I-9 form.**

---

## ⏰ **HOW LONG TO RETAIN DOCUMENTS**

### **Retention Period Formula**

**You must retain I-9 forms (and any document copies) for whichever is LATER:**

1. **3 years after the date of hire**, OR
2. **1 year after employment ends**

### **Examples:**

**Example 1: Long-term Employee**
- Hire Date: January 1, 2020
- Termination Date: December 31, 2025
- Retention Until: **December 31, 2026** (1 year after termination)

**Example 2: Short-term Employee**
- Hire Date: January 1, 2025
- Termination Date: March 1, 2025
- Retention Until: **January 1, 2028** (3 years after hire)

**Example 3: Current Employee**
- Hire Date: January 1, 2023
- Still Employed: Yes
- Retention Until: **At least January 1, 2026** (3 years after hire, but keep until 1 year after they leave)

### **Retention Calculator**

```
IF (termination_date + 1 year) > (hire_date + 3 years):
    retain_until = termination_date + 1 year
ELSE:
    retain_until = hire_date + 3 years
```

---

## 🔒 **STORAGE REQUIREMENTS**

### **1. Anti-Discrimination Rule**

⚠️ **CRITICAL:** If you choose to copy documents, you **MUST** do so for **ALL employees**.

**Why?** To avoid discrimination based on:
- National origin
- Citizenship status
- Immigration status

**Example of Violation:**
- ❌ Copying documents only for foreign-looking employees
- ❌ Copying documents only for employees with accents
- ❌ Copying documents only for certain positions

**Correct Approach:**
- ✅ Copy documents for ALL employees, or
- ✅ Copy documents for NONE

---

### **2. Storage Format Options**

You can store I-9 forms and document copies in any of these formats:

#### **Option A: Paper Storage**
- Keep original signed I-9 forms in filing cabinets
- Attach photocopies of documents to each I-9
- Store securely on-site or at off-site storage facility

**Pros:** Simple, no technology required  
**Cons:** Takes physical space, harder to search, fire/flood risk

---

#### **Option B: Electronic Storage**
- Scan I-9 forms and documents to PDF
- Store in secure database or cloud storage
- Must meet electronic storage requirements (see below)

**Pros:** Easy to search, backup, no physical space  
**Cons:** Requires technology, must meet security standards

---

#### **Option C: Microfilm/Microfiche**
- Convert paper I-9s to microfilm
- Requires reader-printer for inspections
- Must maintain high legibility

**Pros:** Long-term archival, space-efficient  
**Cons:** Outdated technology, requires special equipment

---

#### **Option D: Hybrid (Combination)**
- Some I-9s on paper, some electronic
- Must be able to produce all forms within 3 business days

**Pros:** Flexibility during transition  
**Cons:** More complex to manage

---

### **3. Electronic Storage Requirements**

If you store I-9s electronically, your system **MUST** have:

#### **A. Integrity Controls**
- Prevent unauthorized creation, alteration, or deletion
- Detect accidental changes or deterioration
- Ensure accuracy and reliability

#### **B. Audit Trail**
- Track all changes since creation
- Record who made changes and when
- Government agencies must be able to access audit logs

#### **C. Quality Assurance**
- Regular evaluation of storage system
- Periodic checks of stored forms
- Verify electronic signatures (if used)

#### **D. Indexing & Retrieval**
- Detailed index of all data
- Immediate access to any specific record
- Search by employee name, date, etc.

#### **E. Legibility**
- High-quality display on screen
- High-quality reproduction on paper
- No degradation over time

#### **F. Security**
- Protect against unauthorized access
- Encrypt sensitive data (SSN, document numbers)
- Backup and disaster recovery

---

### **4. Inspection Requirements**

Government agencies can request to inspect I-9 forms:

**Who Can Inspect:**
- Department of Homeland Security (DHS/ICE)
- Department of Justice (DOJ/IER)
- Department of Labor (DOL)

**Notice Period:**
- Typically 3 business days advance notice
- Must produce ALL I-9 forms within 3 days

**What to Provide:**
- Completed I-9 forms
- Any document copies you made
- Electronic or paper format (your choice)
- If electronic, must provide computer/printer access

---

## 🚨 **WHAT YOU CANNOT DO**

### **Prohibited Actions:**

❌ **Mail I-9 forms to USCIS or ICE** - Never send forms unless specifically requested during an inspection

❌ **Require specific documents** - Cannot tell employee which List A, B, or C documents to present

❌ **Reject valid documents** - Cannot refuse documents that appear genuine

❌ **Copy documents selectively** - Must copy for all employees or none

❌ **Store documents insecurely** - Must protect employee personal information

❌ **Destroy forms too early** - Must retain for full retention period

❌ **Alter completed forms** - Changes must be documented in audit trail

---

## 💡 **BEST PRACTICES FOR YOUR SYSTEM**

### **Recommended Approach:**

1. ✅ **Store ALL document copies electronically**
   - Scan List A, B, or C documents to PDF
   - Store in Supabase Storage with encryption
   - Link to employee's I-9 record in database

2. ✅ **Implement automatic retention tracking**
   - Calculate retention expiration date on hire
   - Update when employee terminates
   - Auto-archive after retention period expires

3. ✅ **Maintain audit trail**
   - Log all document uploads
   - Track who accessed documents and when
   - Record any changes or deletions

4. ✅ **Secure storage**
   - Encrypt documents at rest and in transit
   - Role-based access control (only HR/managers)
   - Regular backups to prevent data loss

5. ✅ **Easy retrieval**
   - Index by employee name, ID, hire date
   - Search functionality for inspections
   - Export capability for government requests

---

## 📊 **IMPLEMENTATION FOR YOUR SYSTEM**

### **Database Schema**

```sql
-- I-9 Documents Table
CREATE TABLE i9_documents (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  document_type VARCHAR(50), -- 'list_a', 'list_b', 'list_c'
  document_name VARCHAR(255), -- 'U.S. Passport', 'Driver License', etc.
  document_number VARCHAR(255) ENCRYPTED,
  issuing_authority VARCHAR(255),
  expiration_date DATE,
  file_url TEXT, -- Supabase Storage URL
  uploaded_at TIMESTAMP,
  uploaded_by UUID,
  verified_by UUID,
  verified_at TIMESTAMP,
  retention_until DATE, -- Auto-calculated
  archived BOOLEAN DEFAULT FALSE
);

-- Audit Log Table
CREATE TABLE i9_document_audit (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES i9_documents(id),
  action VARCHAR(50), -- 'upload', 'view', 'download', 'delete'
  performed_by UUID,
  performed_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

### **Retention Calculation**

```python
from datetime import datetime, timedelta

def calculate_i9_retention_date(hire_date, termination_date=None):
    """
    Calculate I-9 retention expiration date.
    
    Rule: Retain for whichever is LATER:
    - 3 years after hire date, OR
    - 1 year after termination date
    """
    three_years_after_hire = hire_date + timedelta(days=3*365)
    
    if termination_date:
        one_year_after_termination = termination_date + timedelta(days=365)
        return max(three_years_after_hire, one_year_after_termination)
    else:
        # Employee still working, minimum is 3 years after hire
        return three_years_after_hire

# Examples:
hire = datetime(2020, 1, 1)
term = datetime(2025, 12, 31)
retention = calculate_i9_retention_date(hire, term)
print(retention)  # 2026-12-31 (1 year after termination)
```

### **Storage Service**

```python
async def store_i9_document(
    employee_id: str,
    document_type: str,  # 'list_a', 'list_b', 'list_c'
    document_file: bytes,
    document_metadata: dict
):
    """
    Store I-9 document in Supabase Storage with proper security.
    """
    # 1. Upload to Supabase Storage
    file_path = f"i9-documents/{employee_id}/{document_type}_{uuid4()}.pdf"
    storage_url = await supabase.storage.from_('onboarding-documents').upload(
        file_path,
        document_file,
        file_options={"content-type": "application/pdf"}
    )
    
    # 2. Save metadata to database
    await supabase.table('i9_documents').insert({
        'employee_id': employee_id,
        'document_type': document_type,
        'document_name': document_metadata['name'],
        'document_number': encrypt(document_metadata['number']),
        'file_url': storage_url,
        'uploaded_at': datetime.now(),
        'retention_until': calculate_i9_retention_date(
            employee.hire_date,
            employee.termination_date
        )
    })
    
    # 3. Log audit trail
    await log_audit('upload', employee_id, document_type)
```

---

## ⚖️ **LEGAL COMPLIANCE SUMMARY**

### **What the Law Requires:**

✅ **MUST retain I-9 forms** for 3 years after hire OR 1 year after termination (whichever is later)

✅ **MUST make I-9s available** for government inspection within 3 business days

✅ **MUST NOT discriminate** when copying documents (all or none)

✅ **MUST protect employee privacy** when storing personal information

### **What the Law Allows:**

✅ **MAY copy employee documents** (List A, B, C) and store with I-9

✅ **MAY store electronically** if system meets security requirements

✅ **MAY store on-site or off-site** in any secure location

✅ **MAY use paper, electronic, or microfilm** storage

---

## 🎯 **RECOMMENDATION FOR YOUR SYSTEM**

**YES - Implement document storage with these features:**

1. ✅ **Capture document images** during I-9 Section 2 (manager verification)
2. ✅ **Store in Supabase Storage** with encryption
3. ✅ **Link to I-9 record** in database
4. ✅ **Auto-calculate retention dates** based on hire/termination
5. ✅ **Maintain audit trail** of all access
6. ✅ **Implement for ALL employees** (no discrimination)
7. ✅ **Provide manager access** for verification
8. ✅ **Enable HR export** for government inspections

**Benefits:**
- Easier compliance during inspections
- Better record-keeping
- Reduced risk of lost documents
- Faster retrieval for audits
- Complete audit trail

**Risks Mitigated:**
- Lost paper documents
- Incomplete I-9 forms
- Discrimination claims
- Inspection failures

---

**Bottom Line:** You can and should store employee document copies electronically for the same retention period as I-9 forms (3 years after hire OR 1 year after termination, whichever is later).

