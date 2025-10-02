"""
Phase 1: Document Management API Endpoints

This module provides API endpoints for:
1. Individual document CRUD operations
2. PDF generation and preview endpoints
3. Auto-fill service with compliance rules
4. Document status and approval tracking
5. Digital signature management
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid
import base64
import json

# Import models and services
from .models import (
    User, UserRole, DocumentCategory, DocumentMetadata, DocumentProcessingStatus,
    I9Section1Data, I9Section2Data, W4FormData, I9SupplementAData, I9SupplementBData,
    DirectDepositAuthorizationData, EmployeeNewHireFormData,
    DigitalSignature, SignatureType
)
from .document_service import document_service
from .federal_validation import FederalValidationService

# Security
security = HTTPBearer()

# Create router
document_router = APIRouter(prefix="/api/documents", tags=["Document Management"])

# Mock database (would be replaced with real database)
document_database = {
    "documents": {},
    "document_metadata": {},
    "document_processing": {},
    "digital_signatures": {},
    "users": {}  # User database reference
}

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from token"""
    token = credentials.credentials
    if token not in document_database["users"]:
        raise HTTPException(status_code=401, detail="Invalid token")
    return document_database["users"][token]

def validate_document_access(document_id: str, current_user: User, metadata: DocumentMetadata) -> bool:
    """Validate user access to document based on role and ownership"""
    # HR has access to all documents
    if current_user.role == UserRole.HR:
        return True
    
    # Manager has access to documents in their property
    if current_user.role == UserRole.MANAGER:
        # Would check property ownership here
        return True
    
    # Employee can only access their own documents
    if current_user.role == UserRole.EMPLOYEE:
        return metadata.created_by == current_user.id
    
    return False

# =====================================
# DOCUMENT CREATION AND MANAGEMENT
# =====================================

@document_router.post("/create")
async def create_document(
    document_category: DocumentCategory,
    employee_id: str,
    initial_form_data: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """Create a new document with proper metadata and compliance tracking"""
    try:
        # Create document metadata
        metadata = document_service.create_document_metadata(
            document_category=document_category,
            created_by=current_user.id
        )
        
        # Create processing status
        processing_status = document_service.create_processing_status(
            document_id=metadata.document_id,
            document_category=document_category
        )
        
        # Store in database
        document_database["document_metadata"][metadata.document_id] = metadata
        document_database["document_processing"][metadata.document_id] = processing_status
        
        # Initialize document data
        document_data = {
            "id": metadata.document_id,
            "employee_id": employee_id,
            "category": document_category,
            "form_data": initial_form_data or {},
            "created_at": datetime.now(),
            "created_by": current_user.id,
            "version": 1
        }
        document_database["documents"][metadata.document_id] = document_data
        
        return {
            "document_id": metadata.document_id,
            "metadata": metadata,
            "processing_status": processing_status,
            "message": "Document created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document creation failed: {str(e)}")

@document_router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Retrieve document data and metadata"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    processing_status = document_database["document_processing"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "document": document,
        "metadata": metadata,
        "processing_status": processing_status,
        "auto_fill_restrictions": document_service.auto_fill_engine.get_restricted_fields(document["category"]) if document else []
    }

@document_router.put("/{document_id}")
async def update_document(
    document_id: str,
    form_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update document form data with compliance validation"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate auto-fill compliance
    auto_filled_fields = []  # This would be tracked from the frontend
    is_compliant, violations = document_service.auto_fill_engine.validate_auto_fill_compliance(
        document["category"], form_data, auto_filled_fields
    )
    
    if not is_compliant:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Auto-fill compliance violations detected",
                "violations": violations
            }
        )
    
    # Update document
    document["form_data"] = form_data
    document["version"] += 1
    document["last_modified"] = datetime.now()
    document["modified_by"] = current_user.id
    
    # Update metadata
    if metadata:
        metadata.last_modified = datetime.now()
        metadata.modified_by = current_user.id
        metadata.audit_trail.append({
            "action": "document_updated",
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
            "version": document["version"]
        })
    
    return {
        "message": "Document updated successfully",
        "document": document,
        "compliance_status": "compliant"
    }

# =====================================
# PDF GENERATION AND PREVIEW
# =====================================

@document_router.post("/{document_id}/generate-pdf")
async def generate_pdf(
    document_id: str,
    employee_data: Optional[Dict[str, Any]] = None,
    preview_mode: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Generate PDF from document data with auto-fill compliance"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Generate PDF with auto-fill compliance
        pdf_bytes, warnings, errors = document_service.generate_pdf_with_auto_fill(
            document_category=document["category"],
            form_data=document["form_data"],
            employee_data=employee_data or {},
            user_role=current_user.role
        )
        
        if errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "PDF generation failed due to compliance violations",
                    "errors": errors,
                    "warnings": warnings
                }
            )
        
        # Update processing status
        processing_status = document_database["document_processing"].get(document_id)
        if processing_status:
            processing_status.processing_stage = "pdf_generated"
            processing_status.processing_started_at = datetime.now()
        
        # Return PDF as base64 for preview or as file download
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        if preview_mode:
            return {
                "pdf_data": pdf_base64,
                "warnings": warnings,
                "document_category": document["category"],
                "generated_at": datetime.now().isoformat()
            }
        else:
            # Return as downloadable file
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={document['category'].value}_{document_id}.pdf"
                }
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

@document_router.get("/{document_id}/preview")
async def preview_document(
    document_id: str,
    employee_data: Optional[str] = None,  # JSON string
    current_user: User = Depends(get_current_user)
):
    """Generate PDF preview with current form data"""
    employee_dict = {}
    if employee_data:
        try:
            employee_dict = json.loads(employee_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid employee data JSON")
    
    return await generate_pdf(
        document_id=document_id,
        employee_data=employee_dict,
        preview_mode=True,
        current_user=current_user
    )

# =====================================
# DOCUMENT VALIDATION AND COMPLIANCE
# =====================================

@document_router.post("/{document_id}/validate")
async def validate_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Validate document for federal compliance"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    validation_results = {}
    form_data = document["form_data"]
    
    try:
        # Validate based on document category
        if document["category"] == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            i9_data = I9Section1Data(**form_data)
            validation_result = FederalValidationService.validate_i9_section1(i9_data)
            validation_results["i9_section1"] = validation_result
            
        elif document["category"] == DocumentCategory.W4_TAX_WITHHOLDING:
            w4_data = W4FormData(**form_data)
            validation_result = FederalValidationService.validate_w4_form(w4_data)
            validation_results["w4_form"] = validation_result
            
        elif document["category"] == DocumentCategory.I9_SUPPLEMENT_A:
            # Special validation for Supplement A
            supplement_a_data = I9SupplementAData(**form_data)
            validation_results["supplement_a"] = {
                "is_valid": True,
                "errors": [],
                "warnings": ["This form must be completed manually by preparer/translator"],
                "compliance_notes": ["Federal law prohibits auto-filling this form"]
            }
        
        # Update processing status
        processing_status = document_database["document_processing"].get(document_id)
        if processing_status:
            processing_status.validation_completed_at = datetime.now()
            all_valid = all(result.get("is_valid", True) if isinstance(result, dict) else result.is_valid for result in validation_results.values())
            processing_status.validation_passed = all_valid
            if not all_valid:
                for result in validation_results.values():
                    if isinstance(result, dict):
                        processing_status.validation_errors.extend(result.get("errors", []))
                    else:
                        processing_status.validation_errors.extend([err.message for err in result.errors])
        
        return {
            "document_id": document_id,
            "validation_results": validation_results,
            "overall_valid": all(result.get("is_valid", True) if isinstance(result, dict) else result.is_valid for result in validation_results.values()),
            "processing_status": processing_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")

# =====================================
# AUTO-FILL MANAGEMENT
# =====================================

@document_router.get("/{document_id}/auto-fill-config")
async def get_auto_fill_config(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get auto-fill configuration and restrictions for a document"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    document_category = document["category"]
    
    # Get auto-fill permissions for each field
    auto_fill_config = {}
    metadata = document_database["document_metadata"].get(document_id)
    
    if metadata and metadata.auto_fill_fields:
        for field_mapping in metadata.auto_fill_fields:
            auto_fill_config[field_mapping.field_name] = {
                "permission": field_mapping.auto_fill_permission,
                "data_source": field_mapping.data_source,
                "legal_requirement": field_mapping.legal_requirement
            }
    
    restricted_fields = document_service.auto_fill_engine.get_restricted_fields(document_category)
    
    # Special handling for I-9 Supplement A
    if document_category == DocumentCategory.I9_SUPPLEMENT_A:
        return {
            "document_id": document_id,
            "document_category": document_category,
            "auto_fill_allowed": False,
            "restricted_fields": list(auto_fill_config.keys()),
            "compliance_warning": "FEDERAL LAW: I-9 Supplement A must be completed manually by preparer/translator. Auto-fill is prohibited.",
            "legal_reference": "Immigration and Nationality Act Section 274A"
        }
    
    return {
        "document_id": document_id,
        "document_category": document_category,
        "auto_fill_config": auto_fill_config,
        "restricted_fields": restricted_fields,
        "auto_fill_allowed": len(restricted_fields) < len(auto_fill_config)
    }

@document_router.post("/{document_id}/auto-fill")
async def apply_auto_fill(
    document_id: str,
    employee_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Apply auto-fill data to document with compliance validation"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    document_category = document["category"]
    
    # Check if auto-fill is allowed for this document type
    if document_category == DocumentCategory.I9_SUPPLEMENT_A:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "FEDERAL COMPLIANCE VIOLATION: Auto-fill prohibited for I-9 Supplement A",
                "legal_reference": "Immigration and Nationality Act Section 274A"
            }
        )
    
    try:
        # Generate auto-fill data
        current_form_data = document["form_data"]
        
        if document_category == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            auto_fill_data = document_service._get_i9_auto_fill_data(employee_data)
        elif document_category == DocumentCategory.W4_TAX_WITHHOLDING:
            auto_fill_data = document_service._get_w4_auto_fill_data(employee_data)
        else:
            auto_fill_data = {}
        
        # Apply auto-fill data (only for empty fields)
        auto_filled_fields = []
        for field_name, value in auto_fill_data.items():
            if field_name not in current_form_data or not current_form_data[field_name]:
                current_form_data[field_name] = value
                auto_filled_fields.append(field_name)
        
        # Validate compliance
        is_compliant, violations = document_service.auto_fill_engine.validate_auto_fill_compliance(
            document_category, current_form_data, auto_filled_fields
        )
        
        if not is_compliant:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Auto-fill compliance violations",
                    "violations": violations
                }
            )
        
        # Update document
        document["form_data"] = current_form_data
        document["version"] += 1
        document["last_modified"] = datetime.now()
        
        # Add audit trail entry
        if metadata:
            metadata.audit_trail.append({
                "action": "auto_fill_applied",
                "timestamp": datetime.now().isoformat(),
                "user_id": current_user.id,
                "auto_filled_fields": auto_filled_fields
            })
        
        return {
            "message": "Auto-fill applied successfully",
            "auto_filled_fields": auto_filled_fields,
            "document": document,
            "compliance_status": "compliant"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-fill error: {str(e)}")

# =====================================
# DIGITAL SIGNATURES
# =====================================

@document_router.post("/{document_id}/sign")
async def add_digital_signature(
    document_id: str,
    signature_data: str = Form(...),
    signature_type: SignatureType = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Add digital signature to document"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Create digital signature record
        signature_id = str(uuid.uuid4())
        digital_signature = DigitalSignature(
            id=signature_id,
            session_id=document_id,  # Using document_id as session_id
            employee_id=document["employee_id"],
            document_id=document_id,
            signature_type=signature_type,
            signature_data=signature_data,
            signature_hash=f"hash_{signature_id}",  # Would use actual hash
            signed_by=current_user.id,
            signed_by_name=f"{current_user.email}",
            signed_by_role=current_user.role,
            timestamp=datetime.now(),
            is_verified=True
        )
        
        # Store signature
        document_database["digital_signatures"][signature_id] = digital_signature
        
        # Update document with signature reference
        if "signatures" not in document:
            document["signatures"] = []
        document["signatures"].append(signature_id)
        
        # Update processing status
        processing_status = document_database["document_processing"].get(document_id)
        if processing_status:
            processing_status.processing_stage = "signed"
        
        return {
            "message": "Digital signature added successfully",
            "signature_id": signature_id,
            "signature": digital_signature,
            "document_status": processing_status.processing_stage if processing_status else "unknown"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signature error: {str(e)}")

@document_router.get("/{document_id}/signatures")
async def get_document_signatures(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all signatures for a document"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    signature_ids = document.get("signatures", [])
    signatures = []
    
    for sig_id in signature_ids:
        if sig_id in document_database["digital_signatures"]:
            signatures.append(document_database["digital_signatures"][sig_id])
    
    return {
        "document_id": document_id,
        "signatures": signatures,
        "signature_count": len(signatures)
    }

# =====================================
# COMPLIANCE MONITORING
# =====================================

@document_router.get("/{document_id}/compliance-status")
async def get_compliance_status(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get compliance status for a document"""
    if document_id not in document_database["documents"]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = document_database["documents"][document_id]
    metadata = document_database["document_metadata"].get(document_id)
    processing_status = document_database["document_processing"].get(document_id)
    
    # Validate access
    if metadata and not validate_document_access(document_id, current_user, metadata):
        raise HTTPException(status_code=403, detail="Access denied")
    
    compliance_status = {
        "document_id": document_id,
        "document_category": document["category"],
        "federal_compliance_required": metadata.federal_compliance_required if metadata else True,
        "validation_status": "not_validated",
        "signature_status": "not_signed",
        "approval_status": "pending",
        "overall_compliant": False
    }
    
    # Check validation status
    if processing_status:
        if processing_status.validation_passed is not None:
            compliance_status["validation_status"] = "passed" if processing_status.validation_passed else "failed"
            compliance_status["validation_errors"] = processing_status.validation_errors
        
        # Check signature status
        signature_ids = document.get("signatures", [])
        if signature_ids:
            compliance_status["signature_status"] = "signed"
            compliance_status["signature_count"] = len(signature_ids)
        
        # Check approval status
        compliance_status["approval_status"] = processing_status.approval_status
        
        # Overall compliance
        compliance_status["overall_compliant"] = (
            processing_status.validation_passed and
            len(signature_ids) > 0 and
            processing_status.approval_status == "approved"
        )
        
        # I-9 specific compliance checks
        if document["category"] == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            if processing_status.i9_three_day_deadline:
                is_compliant, deadline, warnings = document_service.validate_i9_three_day_rule(
                    hire_date=date.today(),  # Would get actual hire date
                    section2_completion_date=processing_status.approval_completed_at.date() if processing_status.approval_completed_at else None
                )
                compliance_status["i9_three_day_compliance"] = {
                    "compliant": is_compliant,
                    "deadline": deadline.isoformat() if deadline else None,
                    "warnings": warnings
                }
    
    return compliance_status

# Export the router
__all__ = ["document_router"]