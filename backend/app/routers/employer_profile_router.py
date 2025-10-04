"""
Employer Profile Router
Manages employer information for auto-filling forms
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging
from datetime import datetime, timezone

from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manager/employer-profile", tags=["employer-profile"])

# Get supabase service
supabase_service = get_enhanced_supabase_service()


# =====================================================
# REQUEST/RESPONSE MODELS
# =====================================================

class EmployerProfileCreate(BaseModel):
    """Create employer profile"""
    # Company Info
    business_legal_name: str
    dba_name: Optional[str] = None
    
    # Address
    street_address: str
    suite_apt: Optional[str] = None
    city: str
    state: str
    zip_code: str
    
    # Contact
    phone: str
    fax: Optional[str] = None
    email: EmailStr
    website: Optional[str] = None
    
    # Tax Info
    ein: str
    state_tax_id: Optional[str] = None
    
    # I-9 Specific
    i9_employer_name: str
    i9_employer_title: str
    i9_business_name: str
    i9_business_address: str
    
    # W-4 Specific
    w4_employer_name_address: str
    
    # Health Insurance
    health_insurance_provider: Optional[str] = None
    health_insurance_group_number: Optional[str] = None
    health_insurance_contact: Optional[str] = None


class EmployerProfileUpdate(BaseModel):
    """Update employer profile"""
    # All fields optional for partial updates
    business_legal_name: Optional[str] = None
    dba_name: Optional[str] = None
    street_address: Optional[str] = None
    suite_apt: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    ein: Optional[str] = None
    state_tax_id: Optional[str] = None
    i9_employer_name: Optional[str] = None
    i9_employer_title: Optional[str] = None
    i9_business_name: Optional[str] = None
    i9_business_address: Optional[str] = None
    w4_employer_name_address: Optional[str] = None
    health_insurance_provider: Optional[str] = None
    health_insurance_group_number: Optional[str] = None
    health_insurance_contact: Optional[str] = None


# =====================================================
# ENDPOINTS
# =====================================================

@router.get("")
async def get_employer_profile(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get employer profile for current property"""
    try:
        property_id = current_user.get('property_id')
        if not property_id:
            raise HTTPException(
                status_code=400,
                detail="Property ID not found"
            )
        
        # Get active employer profile
        result = supabase_service.client.table("employer_profiles")\
            .select("*")\
            .eq("property_id", property_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not result.data:
            return {
                "success": True,
                "profile": None,
                "exists": False
            }
        
        return {
            "success": True,
            "profile": result.data,
            "exists": True
        }
        
    except Exception as e:
        if "No rows found" in str(e) or "PGRST116" in str(e):
            return {
                "success": True,
                "profile": None,
                "exists": False
            }
        logger.error(f"Error getting employer profile: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get employer profile"
        )


@router.post("")
async def create_employer_profile(
    profile_data: EmployerProfileCreate,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Create employer profile"""
    try:
        # Verify user is manager/admin
        if current_user.get('role') not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can create employer profiles"
            )
        
        property_id = current_user.get('property_id')
        if not property_id:
            raise HTTPException(
                status_code=400,
                detail="Property ID not found"
            )
        
        # Check if profile already exists
        existing = supabase_service.client.table("employer_profiles")\
            .select("id")\
            .eq("property_id", property_id)\
            .eq("is_active", True)\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Employer profile already exists for this property"
            )
        
        # Create profile
        profile_dict = profile_data.dict()
        profile_dict['property_id'] = property_id
        profile_dict['created_by'] = current_user['id']
        profile_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        profile_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        profile_dict['is_active'] = True
        profile_dict['version'] = 1
        
        result = supabase_service.client.table("employer_profiles")\
            .insert(profile_dict)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to create employer profile"
            )
        
        logger.info(f"Employer profile created for property {property_id}")
        
        return {
            "success": True,
            "profile": result.data[0],
            "message": "Employer profile created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employer profile: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create employer profile: {str(e)}"
        )


@router.put("/{profile_id}")
async def update_employer_profile(
    profile_id: str,
    profile_data: EmployerProfileUpdate,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Update employer profile"""
    try:
        # Verify user is manager/admin
        if current_user.get('role') not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can update employer profiles"
            )
        
        property_id = current_user.get('property_id')
        
        # Get existing profile
        existing = supabase_service.client.table("employer_profiles")\
            .select("*")\
            .eq("id", profile_id)\
            .eq("property_id", property_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail="Employer profile not found"
            )
        
        # Build update dict (only include provided fields)
        update_dict = {k: v for k, v in profile_data.dict().items() if v is not None}
        
        if not update_dict:
            raise HTTPException(
                status_code=400,
                detail="No fields to update"
            )
        
        # Track changes for history
        changed_fields = {}
        for key, new_value in update_dict.items():
            old_value = existing.data.get(key)
            if old_value != new_value:
                changed_fields[key] = {
                    "old": old_value,
                    "new": new_value
                }
        
        # Update profile
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        update_dict['version'] = existing.data.get('version', 1) + 1
        
        result = supabase_service.client.table("employer_profiles")\
            .update(update_dict)\
            .eq("id", profile_id)\
            .execute()
        
        # Create history record
        if changed_fields:
            history_record = {
                "profile_id": profile_id,
                "version": update_dict['version'],
                "changed_fields": changed_fields,
                "changed_by": current_user['id'],
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "reason": "Profile update"
            }
            
            supabase_service.client.table("employer_profile_history")\
                .insert(history_record)\
                .execute()
        
        logger.info(f"Employer profile {profile_id} updated")
        
        return {
            "success": True,
            "profile": result.data[0] if result.data else None,
            "changes": changed_fields,
            "message": "Employer profile updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employer profile: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update employer profile: {str(e)}"
        )


@router.get("/{profile_id}/history")
async def get_profile_history(
    profile_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get employer profile change history"""
    try:
        property_id = current_user.get('property_id')
        
        # Verify profile belongs to property
        profile = supabase_service.client.table("employer_profiles")\
            .select("id")\
            .eq("id", profile_id)\
            .eq("property_id", property_id)\
            .single()\
            .execute()
        
        if not profile.data:
            raise HTTPException(
                status_code=404,
                detail="Employer profile not found"
            )
        
        # Get history
        history = supabase_service.client.table("employer_profile_history")\
            .select("*")\
            .eq("profile_id", profile_id)\
            .order("changed_at", desc=True)\
            .execute()
        
        return {
            "success": True,
            "history": history.data or [],
            "count": len(history.data or [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile history: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get profile history"
        )

