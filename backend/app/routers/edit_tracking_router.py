"""
Edit Tracking Router
Tracks manager edits for continuous OCR improvement
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
import logging
from datetime import datetime, timezone

from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manager/edits", tags=["edit-tracking"])

# Get supabase service
supabase_service = get_enhanced_supabase_service()


# =====================================================
# REQUEST/RESPONSE MODELS
# =====================================================

class TrackEditRequest(BaseModel):
    """Track a field edit"""
    employee_id: str
    form_type: str  # 'i9_section_2', 'w4', 'health_insurance'
    form_id: Optional[str] = None
    field_name: str
    field_label: Optional[str] = None
    original_value: Optional[str] = None
    edited_value: str
    ocr_confidence: Optional[float] = None
    document_quality: Optional[str] = None
    edit_reason: str  # 'ocr_error', 'ocr_missed_char', 'format_issue', etc.
    edit_notes: Optional[str] = None


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def categorize_error(original: Optional[str], edited: str) -> str:
    """Categorize the type of OCR error"""
    if not original or not edited:
        return "unknown"
    
    original = str(original)
    edited = str(edited)
    
    # Character confusion (0/O, 1/I, etc.)
    if len(original) == len(edited):
        diff_count = sum(1 for a, b in zip(original, edited) if a != b)
        if diff_count == 1:
            return "character_confusion"
        elif diff_count > 1:
            return "multiple_character_errors"
    
    # Missing character
    elif len(edited) > len(original):
        return "missing_character"
    
    # Extra character
    elif len(edited) < len(original):
        return "extra_character"
    
    # Format issue (spacing, hyphens)
    elif original.replace(" ", "").replace("-", "") == edited.replace(" ", "").replace("-", ""):
        return "format_issue"
    
    return "other"


# =====================================================
# ENDPOINTS
# =====================================================

@router.post("/track")
async def track_field_edit(
    edit_data: TrackEditRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Track when manager edits a field"""
    try:
        # Verify user is a manager
        if current_user.get('role') not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can track edits"
            )
        
        manager_id = current_user['id']
        
        # Determine if this is an OCR error
        is_ocr_error = edit_data.edit_reason in [
            'ocr_error',
            'ocr_missed_char',
            'ocr_added_char',
            'character_confusion'
        ]
        
        # Categorize the error
        error_category = categorize_error(
            edit_data.original_value,
            edit_data.edited_value
        )
        
        # Create edit record
        edit_record = {
            "employee_id": edit_data.employee_id,
            "manager_id": manager_id,
            "form_type": edit_data.form_type,
            "form_id": edit_data.form_id,
            "field_name": edit_data.field_name,
            "field_label": edit_data.field_label,
            "original_value": edit_data.original_value,
            "edited_value": edit_data.edited_value,
            "ocr_confidence": edit_data.ocr_confidence,
            "ocr_engine": "google_document_ai",
            "document_quality": edit_data.document_quality,
            "edit_reason": edit_data.edit_reason,
            "edit_notes": edit_data.edit_notes,
            "is_ocr_error": is_ocr_error,
            "error_category": error_category,
            "edited_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get('user-agent')
        }
        
        # Save to database
        result = supabase_service.client.table("form_field_edits")\
            .insert(edit_record)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to track edit"
            )
        
        logger.info(f"Edit tracked: {edit_data.form_type}.{edit_data.field_name} by manager {manager_id}")
        
        return {
            "success": True,
            "edit_id": result.data[0]['id'],
            "error_category": error_category,
            "is_ocr_error": is_ocr_error,
            "message": "Edit tracked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking edit: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to track edit: {str(e)}"
        )


@router.get("/employee/{employee_id}")
async def get_employee_edits(
    employee_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get all edits for an employee"""
    try:
        # Get edits
        edits = supabase_service.client.table("form_field_edits")\
            .select("*")\
            .eq("employee_id", employee_id)\
            .order("edited_at", desc=True)\
            .execute()
        
        return {
            "success": True,
            "edits": edits.data or [],
            "count": len(edits.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error getting employee edits: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get edits"
        )


@router.get("/form/{form_type}/{employee_id}")
async def get_form_edits(
    form_type: str,
    employee_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get edits for a specific form"""
    try:
        edits = supabase_service.client.table("form_field_edits")\
            .select("*")\
            .eq("employee_id", employee_id)\
            .eq("form_type", form_type)\
            .order("edited_at", desc=True)\
            .execute()
        
        return {
            "success": True,
            "form_type": form_type,
            "edits": edits.data or [],
            "count": len(edits.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error getting form edits: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get form edits"
        )


@router.get("/analytics/ocr-accuracy")
async def get_ocr_accuracy_analytics(
    request: Request,
    form_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get OCR accuracy analytics (admin only)"""
    try:
        # Verify user is admin
        if current_user.get('role') not in ['admin', 'hr']:
            raise HTTPException(
                status_code=403,
                detail="Only admins can view analytics"
            )
        
        # Refresh materialized view
        try:
            supabase_service.client.rpc('refresh_ocr_analytics').execute()
        except Exception as e:
            logger.warning(f"Could not refresh analytics view: {e}")
        
        # Get analytics
        query = supabase_service.client.table("ocr_accuracy_analytics").select("*")
        
        if form_type:
            query = query.eq("form_type", form_type)
        
        analytics = query.order("error_rate_percent", desc=True).limit(50).execute()
        
        # Get summary stats
        total_edits = sum(row.get('total_edits', 0) for row in analytics.data or [])
        total_errors = sum(row.get('ocr_errors', 0) for row in analytics.data or [])
        overall_accuracy = 100 - (total_errors / total_edits * 100) if total_edits > 0 else 100
        
        # Get trending errors (last 7 days)
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        
        trending = supabase_service.client.table("form_field_edits")\
            .select("field_name, error_category")\
            .eq("is_ocr_error", True)\
            .gte("edited_at", cutoff)\
            .execute()
        
        # Count trending errors
        trending_counts = {}
        for edit in trending.data or []:
            key = f"{edit['field_name']}:{edit['error_category']}"
            trending_counts[key] = trending_counts.get(key, 0) + 1
        
        trending_errors = [
            {
                "field_name": key.split(':')[0],
                "error_category": key.split(':')[1],
                "count": count
            }
            for key, count in sorted(trending_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        return {
            "success": True,
            "summary": {
                "total_edits": total_edits,
                "total_errors": total_errors,
                "overall_accuracy": round(overall_accuracy, 2)
            },
            "field_accuracy": analytics.data or [],
            "trending_errors": trending_errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(e)}"
        )


@router.get("/analytics/recommendations")
async def get_improvement_recommendations(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get improvement recommendations based on edit patterns"""
    try:
        # Verify user is admin
        if current_user.get('role') not in ['admin', 'hr']:
            raise HTTPException(
                status_code=403,
                detail="Only admins can view recommendations"
            )
        
        # Get analytics
        analytics = supabase_service.client.table("ocr_accuracy_analytics")\
            .select("*")\
            .order("error_rate_percent", desc=True)\
            .limit(20)\
            .execute()
        
        recommendations = []
        
        for field in analytics.data or []:
            error_rate = field.get('error_rate_percent', 0)
            
            if error_rate > 20:
                recommendations.append({
                    "priority": "HIGH",
                    "field": f"{field['form_type']}.{field['field_name']}",
                    "issue": f"{error_rate}% error rate",
                    "action": "Review OCR field mapping configuration",
                    "impact": f"Affects {field['total_edits']} forms in last 30 days",
                    "common_error": field.get('most_common_error')
                })
            elif error_rate > 10:
                recommendations.append({
                    "priority": "MEDIUM",
                    "field": f"{field['form_type']}.{field['field_name']}",
                    "issue": f"{error_rate}% error rate",
                    "action": "Consider improving document quality requirements",
                    "impact": f"Affects {field['total_edits']} forms in last 30 days",
                    "common_error": field.get('most_common_error')
                })
        
        return {
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get recommendations"
        )

