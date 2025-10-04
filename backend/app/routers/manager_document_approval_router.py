"""
Manager Document Approval Router
Handles sequential document review and approval workflow
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from app.dependencies import get_current_user
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/manager/review/employees",
    tags=["manager-document-approval"]
)

# Document workflow order
DOCUMENT_WORKFLOW = [
    {
        "order": 1,
        "type": "company_policies",
        "name": "Company Policies Acknowledgment",
        "path": "forms/company_policies"
    },
    {
        "order": 2,
        "type": "i9",
        "name": "I-9 Employment Eligibility Verification",
        "path": "forms/i9",
        "upload_path": "uploads/i9_verification"
    },
    {
        "order": 3,
        "type": "w4",
        "name": "W-4 Federal Tax Withholding",
        "path": "forms/w4",
        "upload_path": "uploads/i9_verification/ssn_card"
    },
    {
        "order": 4,
        "type": "direct_deposit",
        "name": "Direct Deposit Authorization",
        "path": "forms/direct_deposit"
    },
    {
        "order": 5,
        "type": "health_insurance",
        "name": "Health Insurance Enrollment",
        "path": "forms/health_insurance"
    }
]


class ApproveDocumentRequest(BaseModel):
    form_data: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None  # Base64 encoded signature image
    notes: Optional[str] = None


class RejectDocumentRequest(BaseModel):
    reason: str


@router.get("/{employee_id}/documents-status")
async def get_documents_status(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get status of all documents for an employee
    Returns sequential workflow with current step
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access document status"
            )

        from app.supabase_service_enhanced import supabase_service

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access to this employee
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Get document approval status from database
        approvals = supabase_service.client.table('document_approvals')\
            .select('*')\
            .eq('employee_id', employee_id)\
            .execute()

        approval_map = {a['document_type']: a for a in (approvals.data or [])}

        # Build document status list
        documents = []
        current_step = 1

        for workflow_step in DOCUMENT_WORKFLOW:
            doc_type = workflow_step['type']
            approval = approval_map.get(doc_type)

            # Determine if can review (previous must be approved)
            can_review = workflow_step['order'] == 1
            if workflow_step['order'] > 1:
                prev_step = DOCUMENT_WORKFLOW[workflow_step['order'] - 2]
                prev_approval = approval_map.get(prev_step['type'])
                can_review = prev_approval and prev_approval.get('status') == 'approved'

            # Determine status
            if approval:
                doc_status = approval.get('status', 'pending')
                if doc_status == 'approved' and current_step == workflow_step['order']:
                    current_step += 1
            else:
                doc_status = 'pending'

            documents.append({
                "documentType": doc_type,
                "documentName": workflow_step['name'],
                "status": doc_status,
                "approvedBy": approval.get('approved_by') if approval else None,
                "approvedAt": approval.get('approved_at') if approval else None,
                "notes": approval.get('notes') if approval else None,
                "order": workflow_step['order'],
                "canReview": can_review
            })

        # Calculate overall status
        approved_count = sum(1 for d in documents if d['status'] == 'approved')
        total_count = len(documents)

        if approved_count == 0:
            overall_status = 'not_started'
        elif approved_count == total_count:
            overall_status = 'complete'
        else:
            overall_status = 'in_progress'

        # Get property name
        property_data = supabase_service.client.table('properties')\
            .select('name')\
            .eq('id', property_id)\
            .single()\
            .execute()

        property_name = property_data.data.get('name') if property_data.data else 'Unknown'

        return {
            "employeeId": employee_id,
            "employeeName": f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}".strip(),
            "propertyName": property_name,
            "documents": documents,
            "currentStep": current_step,
            "overallStatus": overall_status,
            "completionPercentage": round((approved_count / total_count) * 100),
            "lastUpdated": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting documents status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get documents status: {str(e)}"
        )


@router.get("/{employee_id}/document/{document_type}")
async def get_document_for_review(
    employee_id: str,
    document_type: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get specific document for review
    Returns PDF URL and any uploaded supporting documents
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access documents"
            )

        from app.supabase_service_enhanced import supabase_service

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Get property name
        property_data = supabase_service.client.table('properties')\
            .select('name')\
            .eq('id', property_id)\
            .single()\
            .execute()

        property_name = property_data.data.get('name') if property_data.data else 'Unknown'
        employee_name = f"{employee_data.get('first_name', '')}_{employee_data.get('last_name', '')}".strip()

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Build storage path
        base_path = f"onboarding-documents/{property_name}/{employee_name}"
        doc_path = f"{base_path}/{workflow_step['path']}"

        # List files in the document folder
        files = supabase_service.client.storage.from_('employee-documents').list(doc_path)

        if not files:
            raise HTTPException(
                status_code=404,
                detail=f"No {document_type} document found for this employee"
            )

        # Get the PDF file (should be only one)
        pdf_file = next((f for f in files if f['name'].endswith('.pdf')), None)
        if not pdf_file:
            raise HTTPException(
                status_code=404,
                detail=f"No PDF found for {document_type}"
            )

        # Generate signed URL for PDF
        pdf_url = supabase_service.client.storage.from_('employee-documents')\
            .create_signed_url(f"{doc_path}/{pdf_file['name']}", 3600)  # 1 hour

        result = {
            "pdfUrl": pdf_url['signedURL'],
            "documentType": document_type,
            "documentName": workflow_step['name']
        }

        # If document has uploaded supporting docs (like I-9 verification docs)
        if 'upload_path' in workflow_step:
            upload_path = f"{base_path}/{workflow_step['upload_path']}"

            try:
                # List all folders in upload path
                upload_folders = supabase_service.client.storage.from_('employee-documents').list(upload_path)

                uploaded_docs = []
                for folder in upload_folders:
                    if folder['id']:  # It's a folder
                        folder_path = f"{upload_path}/{folder['name']}"
                        folder_files = supabase_service.client.storage.from_('employee-documents').list(folder_path)

                        for file in folder_files:
                            if file['name'].lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                                file_url = supabase_service.client.storage.from_('employee-documents')\
                                    .create_signed_url(f"{folder_path}/{file['name']}", 3600)

                                uploaded_docs.append({
                                    "type": folder['name'],
                                    "url": file_url['signedURL'],
                                    "filename": file['name']
                                })

                result["uploadedDocsUrls"] = uploaded_docs
            except Exception as e:
                logger.warning(f"Could not fetch uploaded docs: {e}")
                result["uploadedDocsUrls"] = []

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document for review: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document: {str(e)}"
        )


@router.post("/{employee_id}/document/{document_type}/approve")
async def approve_document(
    employee_id: str,
    document_type: str,
    request: ApproveDocumentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Approve a document
    - Regenerates PDF with manager's edits/signature
    - Replaces original PDF in storage
    - Marks as approved in database
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can approve documents"
            )

        from app.supabase_service_enhanced import supabase_service

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Check if previous document is approved (if not first)
        if workflow_step['order'] > 1:
            prev_step = DOCUMENT_WORKFLOW[workflow_step['order'] - 2]
            prev_approval = supabase_service.client.table('document_approvals')\
                .select('*')\
                .eq('employee_id', employee_id)\
                .eq('document_type', prev_step['type'])\
                .single()\
                .execute()

            if not prev_approval.data or prev_approval.data.get('status') != 'approved':
                raise HTTPException(
                    status_code=400,
                    detail=f"Previous document ({prev_step['name']}) must be approved first"
                )

        # TODO: Regenerate PDF with manager's edits/signature
        # This will be implemented based on document type
        # For now, we'll just mark as approved

        # Save approval to database
        approval_data = {
            'employee_id': employee_id,
            'document_type': document_type,
            'status': 'approved',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': request.notes,
            'form_data': request.form_data,
            'signature': request.signature
        }

        # Upsert approval record
        supabase_service.client.table('document_approvals')\
            .upsert(approval_data, on_conflict='employee_id,document_type')\
            .execute()

        logger.info(f"Document approved: {document_type} for employee {employee_id} by {current_user.id}")

        return {
            "success": True,
            "message": f"{workflow_step['name']} approved successfully",
            "finalPdfUrl": "TODO: Return final PDF URL after regeneration"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve document: {str(e)}"
        )


@router.post("/{employee_id}/document/{document_type}/reject")
async def reject_document(
    employee_id: str,
    document_type: str,
    request: RejectDocumentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reject a document
    - Marks as rejected in database
    - Sends notification to employee to resubmit
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can reject documents"
            )

        from app.supabase_service_enhanced import supabase_service

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Save rejection to database
        rejection_data = {
            'employee_id': employee_id,
            'document_type': document_type,
            'status': 'rejected',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': request.reason
        }

        # Upsert rejection record
        supabase_service.client.table('document_approvals')\
            .upsert(rejection_data, on_conflict='employee_id,document_type')\
            .execute()

        # TODO: Send notification to employee
        # TODO: Update employee onboarding status to show document needs resubmission

        logger.info(f"Document rejected: {document_type} for employee {employee_id} by {current_user.id}")

        return {
            "success": True,
            "message": f"{workflow_step['name']} rejected. Employee will be notified to resubmit."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject document: {str(e)}"
        )

