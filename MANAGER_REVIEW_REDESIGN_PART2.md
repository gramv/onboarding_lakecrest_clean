# 🎯 Manager Review & Approval Flow - Part 2: Detailed Specifications

**Continuation of:** `MANAGER_REVIEW_REDESIGN_PLAN.md`

---

## 🎨 **UX WIREFRAMES & USER FLOWS**

### **Flow 1: First-Time Manager Setup**

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome to Manager Dashboard                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👋 Hi Jane! Let's set up your employer profile             │
│                                                              │
│  This one-time setup will save you hours of repetitive      │
│  data entry. Your company information will automatically    │
│  fill in all employee forms (I-9, W-4, health insurance).   │
│                                                              │
│  ⏱️  Takes 5-7 minutes                                       │
│  💾 Saves 5 minutes per employee                            │
│  🔒 Secure & compliant                                      │
│                                                              │
│  [Get Started] [Skip for Now]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Get Started"

┌─────────────────────────────────────────────────────────────┐
│ Employer Profile Setup (Step 1 of 4)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Company Information                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Legal Business Name *                                       │
│  [Marriott International, Inc.                            ] │
│                                                              │
│  DBA Name (if different)                                     │
│  [Marriott Downtown San Francisco                         ] │
│                                                              │
│  Employer Identification Number (EIN) *                      │
│  [XX-XXXXXXX                                              ] │
│  ℹ️  Format: XX-XXXXXXX (9 digits)                          │
│                                                              │
│  State Tax ID (if applicable)                                │
│  [                                                        ] │
│                                                              │
│  [Back] [Next: Address Information →]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Next"

┌─────────────────────────────────────────────────────────────┐
│ Employer Profile Setup (Step 2 of 4)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Business Address                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Street Address *                                            │
│  [123 Market Street                                       ] │
│                                                              │
│  Suite/Apt/Floor                                             │
│  [Suite 500                                               ] │
│                                                              │
│  City *                    State *      ZIP Code *           │
│  [San Francisco         ] [CA ▼]       [94103            ]  │
│                                                              │
│  Phone *                   Fax                               │
│  [(415) 555-0100        ] [(415) 555-0101               ]  │
│                                                              │
│  Email *                                                     │
│  [hr@marriott-sf.com                                      ] │
│                                                              │
│  Website                                                     │
│  [https://marriott-sf.com                                 ] │
│                                                              │
│  [← Back] [Next: I-9 Information →]                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Next"

┌─────────────────────────────────────────────────────────────┐
│ Employer Profile Setup (Step 3 of 4)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  I-9 Employer Information                                    │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ℹ️  This information will appear on all I-9 Section 2 forms│
│                                                              │
│  Your Name (as employer representative) *                    │
│  [Jane Smith                                              ] │
│                                                              │
│  Your Title *                                                │
│  [General Manager                                         ] │
│                                                              │
│  Business Name for I-9 *                                     │
│  [Marriott Downtown San Francisco                         ] │
│  ℹ️  This is the official business name that appears on I-9 │
│                                                              │
│  Business Address for I-9 *                                  │
│  [123 Market Street, Suite 500, San Francisco, CA 94103   ] │
│  ✅ Auto-filled from Step 2 [Edit]                          │
│                                                              │
│  [← Back] [Next: Health Insurance →]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Next"

┌─────────────────────────────────────────────────────────────┐
│ Employer Profile Setup (Step 4 of 4)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Health Insurance Information (Optional)                     │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Insurance Provider                                          │
│  [Blue Cross Blue Shield                                  ] │
│                                                              │
│  Group Number                                                │
│  [GRP-123456                                              ] │
│                                                              │
│  HR Contact for Benefits                                     │
│  [benefits@marriott-sf.com                                ] │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Review & Confirm                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ✅ Company: Marriott Downtown San Francisco                │
│  ✅ EIN: XX-XXXXXXX                                         │
│  ✅ Address: 123 Market St, Suite 500, SF, CA 94103         │
│  ✅ I-9 Representative: Jane Smith, General Manager          │
│                                                              │
│  [← Back] [Save Profile & Continue]                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Save Profile"

┌─────────────────────────────────────────────────────────────┐
│ ✅ Profile Saved Successfully!                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your employer profile is now set up and will automatically │
│  fill in all employee forms.                                │
│                                                              │
│  What happens next:                                          │
│  • I-9 forms will auto-fill with your company info          │
│  • W-4 forms will include your EIN and address              │
│  • Health insurance forms will have provider details         │
│  • You'll save 5+ minutes per employee                       │
│                                                              │
│  You can update this profile anytime in Settings.           │
│                                                              │
│  [Go to Dashboard]                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 2: Manager Reviews Employee (with OTP)**

```
┌─────────────────────────────────────────────────────────────┐
│ Manager Dashboard - Pending Reviews                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Employees Awaiting Review (3)                               │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 URGENT: I-9 Deadline in 2 days                     │  │
│  │                                                        │  │
│  │ John Doe                                               │  │
│  │ Position: Front Desk Agent                            │  │
│  │ Start Date: Oct 7, 2025                               │  │
│  │                                                        │  │
│  │ Completed:                                             │  │
│  │ ✅ Personal Info  ✅ I-9 Section 1  ✅ W-4            │  │
│  │ ✅ Direct Deposit ✅ Health Insurance                 │  │
│  │ ✅ Company Policies                                    │  │
│  │                                                        │  │
│  │ Pending:                                               │  │
│  │ ⏳ I-9 Section 2 (You must complete)                  │  │
│  │ ⏳ Manager Approval                                    │  │
│  │                                                        │  │
│  │ [Start Review]                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Start Review"

┌─────────────────────────────────────────────────────────────┐
│ Review: John Doe - Front Desk Agent                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: Step 1 of 3                                       │
│  [●──────────] Review Documents                              │
│  [○──────────] Complete I-9 Section 2                        │
│  [○──────────] Final Approval                                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Step 1: Review Employee Documents                           │
│                                                              │
│  Before completing I-9 Section 2, you must verify the        │
│  employee's identity and employment authorization documents. │
│                                                              │
│  Documents Submitted:                                        │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  📄 I-9 Section 1 (Employee Attestation)                     │
│     Completed: Oct 1, 2025                                   │
│     [View Document]                                          │
│                                                              │
│  🔒 I-9 Supporting Documents (List A)                        │
│     • U.S. Passport                                          │
│     • Document #: 123456789                                  │
│     • Expires: May 15, 2030                                  │
│     • Uploaded: Oct 1, 2025                                  │
│                                                              │
│     [🔐 View Secure Documents]  ← Requires OTP               │
│                                                              │
│  📄 W-4 (Tax Withholding)                                    │
│     Completed: Oct 1, 2025                                   │
│     [View Document]                                          │
│                                                              │
│  [Continue to I-9 Section 2 →]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "View Secure Documents"

┌─────────────────────────────────────────────────────────────┐
│ 🔐 Secure Document Access Required                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You're about to view sensitive employee documents           │
│  containing personally identifiable information (PII).       │
│                                                              │
│  Employee: John Doe                                          │
│  Documents: U.S. Passport (List A)                           │
│                                                              │
│  For security and compliance, we need to verify your         │
│  identity before granting access.                            │
│                                                              │
│  A 6-digit verification code will be sent to:                │
│  jane.smith@marriott-sf.com                                  │
│                                                              │
│  This access will be logged for audit purposes.              │
│                                                              │
│  [Send Verification Code] [Cancel]                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Send Verification Code"

┌─────────────────────────────────────────────────────────────┐
│ 📧 Verification Code Sent                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  A 6-digit code has been sent to:                            │
│  jane.smith@marriott-sf.com                                  │
│                                                              │
│  Enter the code below:                                       │
│                                                              │
│  ┌───┬───┬───┬───┬───┬───┐                                 │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │                                 │
│  └───┴───┴───┴───┴───┴───┘                                 │
│                                                              │
│  Code expires in: 09:45                                      │
│                                                              │
│  Didn't receive it? [Resend Code]                            │
│                                                              │
│  [Verify & Access Documents]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Enter code and click "Verify"

┌─────────────────────────────────────────────────────────────┐
│ ✅ Verified - Document Vault Unlocked                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔓 Secure session active for 30 minutes                     │
│  Time remaining: 29:58                                       │
│                                                              │
│  I-9 Documents for John Doe                                  │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  List A Document: U.S. Passport                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  [PASSPORT IMAGE PREVIEW]                              │  │
│  │                                                        │  │
│  │  Document Details:                                     │  │
│  │  • Type: U.S. Passport                                 │  │
│  │  • Number: 123456789                                   │  │
│  │  • Issued: May 15, 2020                                │  │
│  │  • Expires: May 15, 2030                               │  │
│  │  • Issuing Authority: U.S. Department of State         │  │
│  │                                                        │  │
│  │  [View Full Size] [Download] [Print]                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Document Verification Checklist:                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  □ Photo matches employee (compare with application photo)   │
│  □ Document appears genuine (no signs of tampering)          │
│  □ All security features present                             │
│  □ Expiration date is valid                                  │
│  □ Name matches employee records                             │
│  □ Document is an acceptable List A document                 │
│                                                              │
│  Notes (optional):                                           │
│  [                                                        ]  │
│  [                                                        ]  │
│                                                              │
│  [✓ Documents Verified - Continue to I-9 Section 2]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Continue to I-9 Section 2"

┌─────────────────────────────────────────────────────────────┐
│ Complete I-9 Section 2 - Employer Review & Verification     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: Step 2 of 3                                       │
│  [●──────────] Review Documents ✅                           │
│  [●──────────] Complete I-9 Section 2                        │
│  [○──────────] Final Approval                                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Federal Requirement: Complete within 3 business days        │
│  Employee Start Date: Oct 7, 2025                            │
│  Deadline: Oct 10, 2025 (2 days remaining) 🔴               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Employee's First Day of Employment *                        │
│  [Oct 7, 2025                                             ] │
│                                                              │
│  Document Verification                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  List A Document (Identity + Employment Authorization)       │
│                                                              │
│  Document Title *                                            │
│  [U.S. Passport                                           ] │
│  ✅ Auto-filled from uploaded document                       │
│                                                              │
│  Issuing Authority *                                         │
│  [U.S. Department of State                                ] │
│  ✅ Auto-filled                                              │
│                                                              │
│  Document Number *                                           │
│  [123456789                                               ] │
│  ✅ Auto-filled from OCR                                     │
│                                                              │
│  Expiration Date (if any)                                    │
│  [May 15, 2030                                            ] │
│  ✅ Auto-filled                                              │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Employer Information                                        │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Business Name *                                             │
│  [Marriott Downtown San Francisco                         ] │
│  ✅ From your employer profile                               │
│                                                              │
│  Business Address *                                          │
│  [123 Market Street, Suite 500                            ] │
│  [San Francisco, CA 94103                                 ] │
│  ✅ From your employer profile                               │
│                                                              │
│  Your Name (Employer Representative) *                       │
│  [Jane Smith                                              ] │
│  ✅ From your profile                                        │
│                                                              │
│  Your Title *                                                │
│  [General Manager                                         ] │
│  ✅ From your profile                                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Employer Attestation                                        │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ☑️ I attest, under penalty of perjury, that:                │
│     • I have examined the document(s) presented by the       │
│       employee                                               │
│     • The document(s) reasonably appear to be genuine and    │
│       relate to the person presenting them                   │
│     • To the best of my knowledge, the employee is           │
│       authorized to work in the United States                │
│                                                              │
│  Digital Signature *                                         │
│  [Click to Sign]                                             │
│                                                              │
│  Today's Date: Oct 5, 2025                                   │
│                                                              │
│  [Save Draft] [Complete I-9 Section 2]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Complete I-9 Section 2"

┌─────────────────────────────────────────────────────────────┐
│ Final Review & Approval                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: Step 3 of 3                                       │
│  [●──────────] Review Documents ✅                           │
│  [●──────────] Complete I-9 Section 2 ✅                     │
│  [●──────────] Final Approval                                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Review Complete Onboarding for John Doe                     │
│                                                              │
│  All Required Forms Completed:                               │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ✅ Personal Information                                     │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ✅ I-9 Section 1 (Employee)                                 │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ✅ I-9 Section 2 (You)                                      │
│     Completed: Oct 5, 2025 (Just now)                        │
│     [View]                                                   │
│                                                              │
│  ✅ W-4 Tax Withholding                                      │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ✅ Direct Deposit Authorization                             │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ✅ Health Insurance Election                                │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ✅ Company Policies Acknowledgment                          │
│     Completed: Oct 1, 2025                                   │
│     [View]                                                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Compliance Status:                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ✅ I-9 completed within 3-day deadline (Day 1 of 3)         │
│  ✅ All required signatures present                          │
│  ✅ All documents verified and stored                        │
│  ✅ Audit trail complete                                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Final Approval Comments (optional):                         │
│  [All documents verified. Employee ready to start.        ]  │
│  [                                                        ]  │
│                                                              │
│  [Save as Draft] [Approve & Complete Onboarding]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

↓ Click "Approve & Complete Onboarding"

┌─────────────────────────────────────────────────────────────┐
│ ✅ Onboarding Approved!                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  John Doe's onboarding is now complete and approved.         │
│                                                              │
│  What happens next:                                          │
│  • Employee will be notified via email                       │
│  • HR will receive notification for final processing         │
│  • All documents are securely stored                         │
│  • Employee can start work on Oct 7, 2025                    │
│                                                              │
│  Actions:                                                    │
│  [View Complete Employee File]                               │
│  [Download All Documents (PDF)]                              │
│  [Return to Dashboard]                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 **SECURITY THREAT MODEL**

### **Threat 1: OTP Interception**

**Attack Vector:**
- Attacker intercepts email containing OTP
- Uses OTP to access sensitive documents

**Mitigation:**
1. **Short Expiration:** OTP expires in 10 minutes
2. **Single Use:** OTP can only be used once
3. **IP Binding:** OTP tied to requesting IP address
4. **Rate Limiting:** Max 3 OTP requests per hour
5. **Audit Logging:** All OTP requests logged with IP, timestamp
6. **Email Security:** Use TLS for email transmission

**Risk Level:** MEDIUM → LOW (after mitigation)

---

### **Threat 2: Session Hijacking**

**Attack Vector:**
- Attacker steals session token
- Accesses documents without OTP

**Mitigation:**
1. **Short Session:** 30-minute timeout
2. **Token Rotation:** New token every 15 minutes
3. **IP Validation:** Session tied to IP address
4. **User Agent Check:** Validate browser fingerprint
5. **Logout on Inactivity:** Auto-logout after 5 min idle
6. **Secure Cookies:** HttpOnly, Secure, SameSite flags

**Risk Level:** HIGH → MEDIUM (after mitigation)

---

### **Threat 3: Unauthorized Profile Changes**

**Attack Vector:**
- Malicious manager changes employer profile
- Affects all past/future employee forms

**Mitigation:**
1. **Version Control:** All changes tracked in history table
2. **Approval Required:** Major changes require HR approval
3. **Audit Trail:** Who, what, when logged for every change
4. **Rollback Capability:** Can revert to previous version
5. **Notification:** HR notified of all profile changes
6. **Re-signature:** Past forms require re-signature if updated

**Risk Level:** MEDIUM → LOW (after mitigation)

---

## ✅ **FEDERAL COMPLIANCE CHECKLIST**

### **I-9 Compliance**

- [ ] **Section 1:** Employee completes before/on first day
- [ ] **Section 2:** Employer completes within 3 business days
- [ ] **Document Verification:** Examine original documents (or acceptable alternative)
- [ ] **List A OR List B+C:** Valid document combination
- [ ] **Employer Attestation:** Signed under penalty of perjury
- [ ] **Retention:** 3 years after hire OR 1 year after termination
- [ ] **Audit Trail:** All access logged
- [ ] **Privacy:** Documents stored securely
- [ ] **No Discrimination:** Same process for all employees

### **W-4 Compliance**

- [ ] **Employee Signature:** Required
- [ ] **Employer Info:** Name, address, EIN
- [ ] **Retention:** Keep with payroll records
- [ ] **Updates:** Allow employee to update anytime
- [ ] **Privacy:** Secure storage

### **Health Insurance Compliance (ACA)**

- [ ] **Offer of Coverage:** Documented
- [ ] **Employer Contribution:** Clearly stated
- [ ] **Dependent Coverage:** Option provided
- [ ] **Waiver:** If declined, reason documented
- [ ] **Effective Date:** Within eligibility period

---

**This comprehensive plan ensures security, efficiency, and full federal compliance!** 🎯🔒✅

