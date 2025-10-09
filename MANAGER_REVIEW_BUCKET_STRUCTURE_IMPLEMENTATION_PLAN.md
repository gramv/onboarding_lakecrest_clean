# Manager Review & Bucket Structure Implementation Plan

## 📋 **Executive Summary**

This plan addresses the corrected bucket structure implementation and ensures the complete manager review workflow functions properly with email notifications and employee activation.

**Current Status:**
- ✅ Complete review backend endpoint exists
- ✅ Complete review frontend modal exists  
- ✅ Email service implemented
- ✅ Employee tab exists
- ⚠️ **CRITICAL:** Document retrieval doesn't use correct `_completed` folders
- ⚠️ **CRITICAL:** Manager review endpoints need bucket structure updates

---

## 🎯 **Phase 1: Document Storage Service Implementation (HIGH PRIORITY)**

### **Problem Statement**
The current system doesn't properly retrieve documents from the correct `_completed` folders:
- I-9 should use `i9_form_completed/` (not `i9_form/`)
- W-4 should use `w4_form_completed/` (not `w4_form/`)  
- Health Insurance should use `health_insurance_completed/` (not `health_insurance/`)

### **Task 1.1: Create Document Storage Service**

**File:** `backend/app/services/document_storage_service.py` (NEW)

**Purpose:** Centralized service for retrieving documents from Supabase Storage using correct folder structure

**Implementation:**

```python
from typing import Optional, List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DocumentStorageService:
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service
        
    # Folder mapping for completed documents
    FOLDER_MAP = {
        'company_policies': 'company_policies',
        'i9': 'i9_form_completed',           # ✅ FINAL I-9
        'w4': 'w4_form_completed',           # ✅ FINAL W-4
        'direct_deposit': 'direct_deposit',
        'health_insurance': 'health_insurance_completed'  # ✅ FINAL Health Insurance
    }
    
    def get_latest_document(self, property_name: str, employee_folder: str, doc_type: str) -> Optional[str]:
        """
        Get the latest version of a completed document
        
        Args:
            property_name: e.g., "m6"
            employee_folder: e.g., "christopher_thomas_3"
            doc_type: "company_policies", "i9", "w4", "direct_deposit", "health_insurance"
        
        Returns:
            Signed URL to the latest document PDF (1 hour expiry)
        """
        try:
            folder = self.FOLDER_MAP.get(doc_type, doc_type)
            path = f"{property_name}/{employee_folder}/forms/{folder}"
            
            # List files in folder
            files = self.supabase_service.admin_client.storage.from_('onboarding-documents').list(path)
            
            # Filter for signed PDFs
            signed_pdfs = [
                f for f in files 
                if f.get('name', '').endswith('.pdf') and 'signed' in f.get('name', '')
            ]
            
            if not signed_pdfs:
                logger.warning(f"No signed PDFs found in {path}")
                return None
            
            # Sort by filename (timestamp is in filename) - most recent first
            signed_pdfs.sort(key=lambda x: x.get('name', ''), reverse=True)
            
            # Get the latest
            latest = signed_pdfs[0]
            full_path = f"{path}/{latest['name']}"
            
            # Create signed URL (valid for 1 hour)
            url_response = self.supabase_service.admin_client.storage.from_('onboarding-documents').create_signed_url(full_path, 3600)
            
            if isinstance(url_response, dict):
                return url_response.get('signedURL')
            
            return url_response
            
        except Exception as e:
            logger.error(f"Error getting latest document {doc_type} for {property_name}/{employee_folder}: {e}")
            return None
    
    def get_i9_verification_documents(self, property_name: str, employee_folder: str) -> List[Dict]:
        """
        Get all I-9 verification documents (uploaded images)
        
        Returns:
            List of verification documents with type, filename, and URL
        """
        try:
            base_path = f"{property_name}/{employee_folder}/uploads/i9_verification"
            
            # List document type folders (drivers_license, social_security_card, passport, etc.)
            doc_types = self.supabase_service.admin_client.storage.from_('onboarding-documents').list(base_path)
            
            verification_docs = []
            
            for doc_type_item in doc_types:
                doc_type_name = doc_type_item.get('name', '')
                
                # Skip if it's a file (we want folders)
                if doc_type_item.get('id') is not None:
                    continue
                
                # List files in this document type folder
                type_path = f"{base_path}/{doc_type_name}"
                files = self.supabase_service.admin_client.storage.from_('onboarding-documents').list(type_path)
                
                for file_item in files:
                    file_name = file_item.get('name', '')
                    
                    # Skip folders
                    if file_item.get('id') is None:
                        continue
                    
                    # Create signed URL
                    file_path = f"{type_path}/{file_name}"
                    url_response = self.supabase_service.admin_client.storage.from_('onboarding-documents').create_signed_url(file_path, 3600)
                    
                    url = url_response.get('signedURL') if isinstance(url_response, dict) else url_response
                    
                    verification_docs.append({
                        'type': doc_type_name,
                        'filename': file_name,
                        'url': url
                    })
            
            return verification_docs
            
        except Exception as e:
            logger.error(f"Error getting I-9 verification documents for {property_name}/{employee_folder}: {e}")
            return []
    
    def get_direct_deposit_voided_check(self, property_name: str, employee_folder: str) -> Optional[str]:
        """
        Get voided check for direct deposit (if exists)
        
        Returns:
            Signed URL to voided check image
        """
        try:
            base_path = f"{property_name}/{employee_folder}/uploads/direct_deposit"
            
            # List files in direct deposit folder
            files = self.supabase_service.admin_client.storage.from_('onboarding-documents').list(base_path)
            
            # Look for voided check images
            for file_item in files:
                file_name = file_item.get('name', '').lower()
                if 'voided' in file_name or 'check' in file_name:
                    file_path = f"{base_path}/{file_item.get('name')}"
                    url_response = self.supabase_service.admin_client.storage.from_('onboarding-documents').create_signed_url(file_path, 3600)
                    
                    return url_response.get('signedURL') if isinstance(url_response, dict) else url_response
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting voided check for {property_name}/{employee_folder}: {e}")
            return None
    
    def list_all_employee_documents(self, property_name: str, employee_folder: str) -> Dict:
        """
        Get all documents for an employee
        
        Returns:
            Dictionary with all document types and their URLs
        """
        documents = {}
        
        # Get all document types
        for doc_type in self.FOLDER_MAP.keys():
            url = self.get_latest_document(property_name, employee_folder, doc_type)
            if url:
                documents[doc_type] = {
                    'url': url,
                    'type': doc_type,
                    'folder': self.FOLDER_MAP[doc_type]
                }
        
        # Get I-9 verification documents
        verification_docs = self.get_i9_verification_documents(property_name, employee_folder)
        if verification_docs:
            documents['i9_verification'] = verification_docs
        
        # Get voided check
        voided_check_url = self.get_direct_deposit_voided_check(property_name, employee_folder)
        if voided_check_url:
            documents['voided_check'] = {
                'url': voided_check_url,
                'type': 'voided_check'
            }
        
        return documents
```

---

### **Task 1.2: Update Manager Review Endpoints**

**File:** `backend/app/routers/manager_document_approval_router.py`

**Updates needed:**

1. **Import the new service:**
```python
from ..services.document_storage_service import DocumentStorageService
```

2. **Update document retrieval endpoints to use the service:**

```python
# Update existing endpoints to use DocumentStorageService
@router.get("/employees/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all employee documents using correct bucket structure"""
    try:
        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee = employee_response.data
        property_name = employee.get('property_name', '').lower().replace(' ', '_')
        employee_folder = f"{employee.get('first_name', '').lower()}_{employee.get('last_name', '').lower()}_{employee.get('id', '')[:8]}"
        
        # Use DocumentStorageService
        doc_service = DocumentStorageService(supabase_service)
        documents = doc_service.list_all_employee_documents(property_name, employee_folder)
        
        return {
            "success": True,
            "documents": documents,
            "employee": {
                "id": employee_id,
                "name": f"{employee.get('first_name')} {employee.get('last_name')}",
                "property_name": property_name,
                "employee_folder": employee_folder
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting employee documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get documents")

@router.get("/employees/{employee_id}/documents/{doc_type}")
async def get_specific_document(
    employee_id: str,
    doc_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get specific document using correct bucket structure"""
    try:
        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee = employee_response.data
        property_name = employee.get('property_name', '').lower().replace(' ', '_')
        employee_folder = f"{employee.get('first_name', '').lower()}_{employee.get('last_name', '').lower()}_{employee.get('id', '')[:8]}"
        
        # Use DocumentStorageService
        doc_service = DocumentStorageService(supabase_service)
        document_url = doc_service.get_latest_document(property_name, employee_folder, doc_type)
        
        if not document_url:
            raise HTTPException(status_code=404, detail=f"Document {doc_type} not found")
        
        return {
            "success": True,
            "document_url": document_url,
            "document_type": doc_type,
            "folder": doc_service.FOLDER_MAP.get(doc_type, doc_type)
        }
        
    except Exception as e:
        logger.error(f"Error getting document {doc_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document")
```

---

### **Task 1.3: Update Employee Document Access**

**File:** `backend/app/main_enhanced.py` (or create new router)

**Add endpoints for employee document access:**

```python
from ..services.document_storage_service import DocumentStorageService

@app.get("/api/onboarding/{employee_id}/documents")
async def get_employee_documents_for_employee(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all completed documents for employee access"""
    try:
        # Verify employee access
        if current_user.role not in ['employee', 'manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get employee data
        employee_response = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee = employee_response.data
        
        # Verify access (employee can only see their own docs, managers can see their property's docs)
        if current_user.role == 'employee' and current_user.id != employee.get('user_id'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        property_name = employee.get('property_name', '').lower().replace(' ', '_')
        employee_folder = f"{employee.get('first_name', '').lower()}_{employee.get('last_name', '').lower()}_{employee.get('id', '')[:8]}"
        
        # Use DocumentStorageService
        doc_service = DocumentStorageService(supabase_service)
        documents = doc_service.list_all_employee_documents(property_name, employee_folder)
        
        return {
            "success": True,
            "documents": documents,
            "employee": {
                "id": employee_id,
                "name": f"{employee.get('first_name')} {employee.get('last_name')}",
                "status": employee.get('employment_status'),
                "onboarding_status": employee.get('onboarding_status')
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting employee documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get documents")

@app.get("/api/onboarding/{employee_id}/documents/{doc_type}")
async def get_employee_specific_document(
    employee_id: str,
    doc_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get specific completed document for employee download"""
    try:
        # Verify employee access
        if current_user.role not in ['employee', 'manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get employee data
        employee_response = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee = employee_response.data
        
        # Verify access
        if current_user.role == 'employee' and current_user.id != employee.get('user_id'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        property_name = employee.get('property_name', '').lower().replace(' ', '_')
        employee_folder = f"{employee.get('first_name', '').lower()}_{employee.get('last_name', '').lower()}_{employee.get('id', '')[:8]}"
        
        # Use DocumentStorageService
        doc_service = DocumentStorageService(supabase_service)
        document_url = doc_service.get_latest_document(property_name, employee_folder, doc_type)
        
        if not document_url:
            raise HTTPException(status_code=404, detail=f"Document {doc_type} not found")
        
        return {
            "success": True,
            "document_url": document_url,
            "document_type": doc_type,
            "folder": doc_service.FOLDER_MAP.get(doc_type, doc_type)
        }
        
    except Exception as e:
        logger.error(f"Error getting document {doc_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document")
```

---

## 🎯 **Phase 2: Complete Review Workflow Verification (MEDIUM PRIORITY)**

### **Task 2.1: Verify Complete Review Endpoint**

**File:** `backend/app/routers/manager_document_approval_router.py`

**Status:** ✅ Already implemented (lines 1806-1944)

**Verify the endpoint works correctly:**
- [ ] Endpoint exists: `POST /api/manager/review/employees/{employee_id}/complete-review`
- [ ] Request model: `CompleteReviewRequest`
- [ ] Updates employee status to "active"
- [ ] Sends completion email
- [ ] Uses correct document retrieval

### **Task 2.2: Verify Email Service**

**File:** `backend/app/email_service.py`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Method exists: `send_onboarding_completion_email()`
- [ ] Beautiful HTML template
- [ ] Plain text fallback
- [ ] CC to manager
- [ ] Includes all employee details (start date, time, employee number, etc.)

### **Task 2.3: Verify Frontend Components**

**Files to verify:**

1. **`frontend/src/components/manager/CompleteReviewModal.tsx`**
   - [ ] Component exists
   - [ ] Auto-generates employee number
   - [ ] Date/time pickers
   - [ ] Form validation
   - [ ] Calls backend endpoint

2. **`frontend/src/components/manager/ManagerReviewInterface.tsx`**
   - [ ] Shows "Complete Review" button when all documents approved
   - [ ] Green sticky footer at bottom
   - [ ] Opens CompleteReviewModal on click
   - [ ] Reloads after completion

3. **`frontend/src/services/managerReviewService.ts`**
   - [ ] Method exists: `completeReview()`
   - [ ] Calls backend endpoint
   - [ ] Returns response

---

## 🎯 **Phase 3: Employee Tab Integration (LOW PRIORITY)**

### **Task 3.1: Verify Employee Tab Updates**

**File:** `frontend/src/components/dashboard/EmployeesTab.tsx`

**Status:** ✅ Already implemented (lines 1-901)

**Verify:**
- [ ] Shows active employees
- [ ] Updates when employee status changes to "active"
- [ ] Displays employee number
- [ ] Shows start date
- [ ] Shows employment status
- [ ] Auto-refreshes every 60 seconds

### **Task 3.2: Verify Employee Document Access**

**Create employee document access page:**

**File:** `frontend/src/pages/EmployeeDocuments.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Eye } from 'lucide-react';
import { api } from '@/services/api';

interface Document {
  url: string;
  type: string;
  folder: string;
}

interface EmployeeDocumentsResponse {
  success: boolean;
  documents: Record<string, Document>;
  employee: {
    id: string;
    name: string;
    status: string;
    onboarding_status: string;
  };
}

export default function EmployeeDocuments() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [documents, setDocuments] = useState<Record<string, Document>>({});
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) {
      loadDocuments();
    }
  }, [employeeId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/${employeeId}/documents`);
      const data: EmployeeDocumentsResponse = response.data;
      
      if (data.success) {
        setDocuments(data.documents);
        setEmployee(data.employee);
      } else {
        setError('Failed to load documents');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentName = (type: string) => {
    const names: Record<string, string> = {
      'company_policies': 'Company Policies',
      'i9': 'I-9 Form',
      'w4': 'W-4 Form',
      'direct_deposit': 'Direct Deposit',
      'health_insurance': 'Health Insurance'
    };
    return names[type] || type;
  };

  const handleDownload = (url: string, type: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Documents
        </h1>
        <p className="text-gray-600">
          View and download your completed onboarding documents
        </p>
      </div>

      {employee && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">{employee.name}</h2>
          <div className="flex gap-4 text-sm text-blue-800">
            <span>Status: <Badge variant="outline">{employee.status}</Badge></span>
            <span>Onboarding: <Badge variant="outline">{employee.onboarding_status}</Badge></span>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {Object.entries(documents).map(([type, doc]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {getDocumentName(type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>Folder: {doc.folder}</p>
                  <p>Type: {doc.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.url, type)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(doc.url, type)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(documents).length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            Your onboarding documents will appear here once they are completed.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 **Implementation Checklist**

### **Phase 1: Document Storage Service (HIGH PRIORITY)**

- [ ] **Task 1.1:** Create `DocumentStorageService`
  - [ ] Implement `get_latest_document()`
  - [ ] Implement `get_i9_verification_documents()`
  - [ ] Implement `get_direct_deposit_voided_check()`
  - [ ] Implement `list_all_employee_documents()`
  - [ ] Add proper error handling and logging

- [ ] **Task 1.2:** Update Manager Review Endpoints
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/documents`
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/documents/{doc_type}`
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/i9-verification`
  - [ ] Test all endpoints with correct bucket structure

- [ ] **Task 1.3:** Update Employee Document Access
  - [ ] Update GET `/api/onboarding/{employee_id}/documents`
  - [ ] Update GET `/api/onboarding/{employee_id}/documents/{doc_type}`
  - [ ] Test employee document access

### **Phase 2: Complete Review Verification (MEDIUM PRIORITY)**

- [ ] **Task 2.1:** Verify Backend Endpoint
  - [ ] Check if endpoint exists and works
  - [ ] Verify request/response models
  - [ ] Test endpoint functionality
  - [ ] Ensure it uses correct document retrieval

- [ ] **Task 2.2:** Verify Email Service
  - [ ] Check if method exists
  - [ ] Verify email template
  - [ ] Test email sending
  - [ ] Verify all employee details included

- [ ] **Task 2.3:** Verify Frontend Components
  - [ ] Check if modal exists
  - [ ] Verify form fields
  - [ ] Test modal functionality
  - [ ] Verify service integration

### **Phase 3: Employee Tab Integration (LOW PRIORITY)**

- [ ] **Task 3.1:** Verify Employee Tab
  - [ ] Check if shows active employees
  - [ ] Verify auto-refresh
  - [ ] Test status updates

- [ ] **Task 3.2:** Create Employee Document Access
  - [ ] Create `EmployeeDocuments.tsx` page
  - [ ] Add routing
  - [ ] Test document access

---

## 🧪 **Testing Plan**

### **Phase 1 Testing:**

1. **Document Retrieval:**
   - [ ] Test getting latest I-9 (should use `i9_form_completed`)
   - [ ] Test getting latest W-4 (should use `w4_form_completed`)
   - [ ] Test getting latest Health Insurance (should use `health_insurance_completed`)
   - [ ] Test getting I-9 verification documents
   - [ ] Test getting all employee documents

2. **Manager Review:**
   - [ ] Test viewing employee documents
   - [ ] Test viewing specific document
   - [ ] Test viewing I-9 verification documents

3. **Employee Access:**
   - [ ] Test employee viewing their documents
   - [ ] Test employee downloading documents

### **Phase 2 Testing:**

1. **Complete Review Workflow:**
   - [ ] Approve all 5 documents
   - [ ] Verify "Complete Review" button appears
   - [ ] Click button and verify modal opens
   - [ ] Fill in modal and submit
   - [ ] Verify employee status updated to "active"
   - [ ] Verify email sent to employee
   - [ ] Verify manager receives CC
   - [ ] Verify success message shown

2. **Email Testing:**
   - [ ] Check email on desktop client
   - [ ] Check email on mobile client
   - [ ] Check email on web (Gmail, Outlook)
   - [ ] Verify all information is correct
   - [ ] Verify formatting is correct

### **Phase 3 Testing:**

1. **Employee Tab:**
   - [ ] Verify active employees appear
   - [ ] Verify employee details correct
   - [ ] Verify auto-refresh works

2. **Employee Document Access:**
   - [ ] Test employee viewing documents
   - [ ] Test document download
   - [ ] Verify access controls

---

## 🚀 **Deployment Plan**

### **Step 1: Deploy Phase 1 (Document Storage Service)**
1. Create `DocumentStorageService`
2. Update backend endpoints
3. Test thoroughly
4. Deploy to production
5. Monitor for issues

### **Step 2: Deploy Phase 2 (Complete Review Verification)**
1. Verify/implement backend endpoint
2. Verify/implement email service
3. Verify/implement frontend components
4. Test complete workflow
5. Deploy to production
6. Monitor for issues

### **Step 3: Deploy Phase 3 (Employee Tab Integration)**
1. Verify employee tab functionality
2. Create employee document access page
3. Test integration
4. Deploy to production
5. Monitor for issues

---

## 📝 **Notes**

- **Phase 1 is HIGH PRIORITY** - fixes critical document retrieval issues
- **Phase 2 is MEDIUM PRIORITY** - may already be implemented
- **Phase 3 is LOW PRIORITY** - employee tab already exists
- Test thoroughly before deploying to production
- Monitor email delivery and document access after deployment
- Keep documentation updated as implementation progresses

---

## ✅ **Success Criteria**

### **Phase 1:**
- ✅ All documents retrieved from correct folders
- ✅ I-9 uses `i9_form_completed` folder
- ✅ W-4 uses `w4_form_completed` folder
- ✅ Health Insurance uses `health_insurance_completed` folder
- ✅ Verification documents accessible
- ✅ No broken document links

### **Phase 2:**
- ✅ Manager can complete review
- ✅ Employee receives beautiful email
- ✅ Employee status updated to "active"
- ✅ Employee number assigned
- ✅ Onboarding status "completed"
- ✅ Manager receives CC of email

### **Phase 3:**
- ✅ Employee appears in manager's employee tab
- ✅ Employee can access their documents
- ✅ All documents available for download
- ✅ Employee tab auto-refreshes

---

## 🎯 **Key Implementation Points**

1. **Document Storage Service** - Centralized service using correct `_completed` folders
2. **Manager Review Endpoints** - Updated to use new service
3. **Employee Document Access** - New endpoints for employee self-service
4. **Complete Review Workflow** - Verify existing implementation
5. **Email Notifications** - Verify beautiful email with all details
6. **Employee Tab Integration** - Verify employee appears after activation

**Ready to implement!** 🎉

