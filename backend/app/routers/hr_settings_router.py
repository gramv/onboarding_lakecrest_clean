"""
HR Settings Router
Manages system-wide configuration settings for HR users
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from ..auth import get_current_user, require_hr_role
from ..supabase_service_enhanced import get_supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hr/settings", tags=["hr-settings"])


# =====================================================
# MODELS
# =====================================================

class TrainingVideoSettings(BaseModel):
    """Model for training video configuration"""
    video_id_en: str = Field(..., min_length=11, max_length=11, description="YouTube video ID for English training")
    video_id_es: str = Field(..., min_length=11, max_length=11, description="YouTube video ID for Spanish training")
    
    @validator('video_id_en', 'video_id_es')
    def validate_video_id(cls, v):
        """Validate YouTube video ID format"""
        if not v or len(v) != 11:
            raise ValueError('YouTube video ID must be exactly 11 characters')
        # YouTube IDs can contain alphanumeric characters, hyphens, and underscores
        if not all(c.isalnum() or c in '-_' for c in v):
            raise ValueError('Invalid YouTube video ID format')
        return v


class SettingsResponse(BaseModel):
    """Standard response model for settings endpoints"""
    success: bool
    data: Dict[str, Any]
    message: Optional[str] = None


class SettingUpdate(BaseModel):
    """Model for updating a setting"""
    setting_key: str
    setting_value: Dict[str, Any]
    setting_type: str


# =====================================================
# ENDPOINTS
# =====================================================

@router.get("/training-videos", response_model=SettingsResponse)
async def get_training_video_settings(
    current_user: dict = Depends(get_current_user),
    _role_check: bool = Depends(require_hr_role)
):
    """
    Get current training video settings
    
    Requires HR role authentication.
    Returns the YouTube video IDs for English and Spanish human trafficking training videos.
    """
    try:
        supabase_service = get_supabase_service()

        # Use direct PostgreSQL query if available
        if supabase_service.use_direct_postgres and supabase_service.db_pool:
            async with supabase_service.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT setting_value FROM hr_settings WHERE setting_key = $1",
                    "human_trafficking_training_videos"
                )

                if not row:
                    logger.warning("Training video settings not found in database, returning defaults")
                    return SettingsResponse(
                        success=True,
                        data={"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"},
                        message="Using default video settings"
                    )

                return SettingsResponse(
                    success=True,
                    data=row["setting_value"]  # asyncpg returns JSONB as dict
                )
        else:
            # Fallback to Supabase client
            # Use admin_client to bypass RLS for HR settings operations
            supabase = supabase_service.admin_client

            result = supabase.table("hr_settings")\
                .select("setting_value")\
                .eq("setting_key", "human_trafficking_training_videos")\
                .single()\
                .execute()

            if not result.data:
                logger.warning("Training video settings not found in database, returning defaults")
                return SettingsResponse(
                    success=True,
                    data={"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"},
                    message="Using default video settings"
                )

            return SettingsResponse(
                success=True,
                data=result.data["setting_value"]
            )

    except Exception as e:
        logger.error(f"Error fetching training video settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve training video settings: {str(e)}"
        )


@router.put("/training-videos", response_model=SettingsResponse)
async def update_training_video_settings(
    settings: TrainingVideoSettings,
    current_user: dict = Depends(get_current_user),
    _role_check: bool = Depends(require_hr_role)
):
    """
    Update training video settings
    
    Requires HR role authentication.
    Updates the YouTube video IDs for human trafficking awareness training.
    
    Args:
        settings: TrainingVideoSettings object with video_id_en and video_id_es
        
    Returns:
        SettingsResponse with updated settings
    """
    try:
        supabase_service = get_supabase_service()
        # Use admin_client to bypass RLS for HR settings operations
        supabase = supabase_service.admin_client
        
        # Convert settings to dict
        settings_dict = settings.dict()
        
        user_id = getattr(current_user, 'id', 'unknown') if current_user else 'unknown'
        logger.info(f"HR user {user_id} updating training video settings")
        logger.info(f"New settings: EN={settings.video_id_en}, ES={settings.video_id_es}")
        
        # Update the settings in database
        result = supabase.table("hr_settings")\
            .update({
                "setting_value": settings_dict,
                "updated_by": str(user_id),
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq("setting_key", "human_trafficking_training_videos")\
            .execute()
        
        if not result.data:
            # If no rows were updated, the setting might not exist, so insert it
            logger.info("Setting not found, creating new record")
            result = supabase.table("hr_settings")\
                .insert({
                    "setting_key": "human_trafficking_training_videos",
                    "setting_value": settings_dict,
                    "setting_type": "training",
                    "description": "YouTube video IDs for human trafficking awareness training by language",
                    "updated_by": str(user_id)
                })\
                .execute()
        
        logger.info("Training video settings updated successfully")
        
        return SettingsResponse(
            success=True,
            data=settings_dict,
            message="Training videos updated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error updating training video settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update training video settings: {str(e)}"
        )


@router.get("/training-videos/public", response_model=SettingsResponse)
async def get_training_video_settings_public():
    """
    Get training video settings for onboarding users
    
    This endpoint is public (no authentication required) so that
    employees going through onboarding can fetch the current training videos.
    """
    try:
        supabase_service = get_supabase_service()

        # Use direct PostgreSQL query if available
        if supabase_service.use_direct_postgres and supabase_service.db_pool:
            async with supabase_service.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT setting_value FROM hr_settings WHERE setting_key = $1",
                    "human_trafficking_training_videos"
                )

                if not row:
                    logger.info("Training video settings not found, returning defaults")
                    return SettingsResponse(
                        success=True,
                        data={"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"}
                    )

                return SettingsResponse(
                    success=True,
                    data=row["setting_value"]  # asyncpg returns JSONB as dict
                )
        else:
            # Fallback to Supabase client
            # Use admin_client to bypass RLS for HR settings operations
            supabase = supabase_service.admin_client

            result = supabase.table("hr_settings")\
                .select("setting_value")\
                .eq("setting_key", "human_trafficking_training_videos")\
                .single()\
                .execute()

            if not result.data:
                logger.info("Training video settings not found, returning defaults")
                return SettingsResponse(
                    success=True,
                    data={"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"}
                )

            return SettingsResponse(
                success=True,
                data=result.data["setting_value"]
            )

    except Exception as e:
        logger.error(f"Error fetching training video settings (public): {str(e)}")
        # Return defaults on error to avoid breaking onboarding
        logger.warning("Returning default video settings due to error")
        return SettingsResponse(
            success=True,
            data={"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"},
            message="Using default settings"
        )


@router.get("/all", response_model=SettingsResponse)
async def get_all_settings(
    current_user: dict = Depends(get_current_user),
    _role_check: bool = Depends(require_hr_role),
    setting_type: Optional[str] = None
):
    """
    Get all settings or filter by type
    
    Requires HR role authentication.
    
    Args:
        setting_type: Optional filter by setting type (training, notification, system, compliance)
        
    Returns:
        SettingsResponse with all settings
    """
    try:
        supabase_service = get_supabase_service()
        # Use admin_client to bypass RLS for HR settings operations
        supabase = supabase_service.admin_client
        
        query = supabase.table("hr_settings").select("*")
        
        if setting_type:
            query = query.eq("setting_type", setting_type)
        
        result = query.order("setting_key").execute()
        
        return SettingsResponse(
            success=True,
            data={"settings": result.data or []}
        )
        
    except Exception as e:
        logger.error(f"Error fetching all settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve settings: {str(e)}"
        )


# =====================================================
# HEALTH CHECK
# =====================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for HR settings service"""
    return {"status": "healthy", "service": "hr-settings"}

