"""
Database Migrations API

Industry-standard database migration framework with:
- Version control
- Migration tracking  
- Rollback support
- Audit trail
- Idempotent execution
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List
from app.services.migration_service import MigrationService
from app.auth import get_current_user, User
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/migrations", tags=["migrations"])


def get_migration_service() -> MigrationService:
    """Get migration service instance"""
    db_url = os.getenv('RDS_DATABASE_URL')
    if not db_url:
        raise HTTPException(
            status_code=500,
            detail="RDS_DATABASE_URL not configured"
        )
    
    migrations_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "migrations"
    )
    
    return MigrationService(db_url, migrations_dir)


@router.get("/status")
async def get_migration_status(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get migration status
    
    Returns:
    - Total migrations available
    - Applied migrations count
    - Pending migrations count
    - Last applied migration
    - List of pending migration versions
    """
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can view migration status"
        )
    
    service = get_migration_service()
    
    try:
        await service.initialize()
        status = await service.get_migration_status()
        await service.close()
        
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        logger.error(f"Failed to get migration status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_migration_history(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get migration history
    
    Returns list of all applied migrations with:
    - Version
    - Description
    - Applied at timestamp
    - Applied by user
    - Execution time
    - Status
    """
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can view migration history"
        )
    
    service = get_migration_service()
    
    try:
        await service.initialize()
        history = await service.get_applied_migrations()
        await service.close()
        
        return {
            "success": True,
            "count": len(history),
            "migrations": history
        }
    except Exception as e:
        logger.error(f"Failed to get migration history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_migrations(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get pending migrations
    
    Returns list of migrations that haven't been applied yet
    """
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can view pending migrations"
        )
    
    service = get_migration_service()
    
    try:
        await service.initialize()
        pending = await service.get_pending_migrations()
        await service.close()
        
        return {
            "success": True,
            "count": len(pending),
            "migrations": [
                {
                    "version": m.version,
                    "description": m.description,
                    "filename": m.filename,
                    "checksum": m.checksum
                }
                for m in pending
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get pending migrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply")
async def apply_migrations(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Apply all pending migrations
    
    This endpoint:
    1. Discovers all migration files
    2. Checks which ones haven't been applied
    3. Applies them in order
    4. Records results in schema_migrations table
    
    Migrations are idempotent - safe to run multiple times.
    """
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can apply migrations"
        )
    
    service = get_migration_service()
    
    try:
        await service.initialize()
        
        # Get pending migrations first
        pending = await service.get_pending_migrations()
        
        if not pending:
            await service.close()
            return {
                "success": True,
                "message": "No pending migrations",
                "applied_count": 0,
                "migrations": []
            }
        
        logger.info(f"🚀 Applying {len(pending)} pending migration(s) by {current_user.email}")
        
        # Apply all pending migrations
        result = await service.apply_all_pending(applied_by=current_user.email)
        
        await service.close()
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to apply migrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply/{version}")
async def apply_specific_migration(
    version: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Apply a specific migration by version
    
    Use this to apply a single migration instead of all pending ones.
    """
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can apply migrations"
        )
    
    service = get_migration_service()
    
    try:
        await service.initialize()
        
        # Find the migration
        pending = await service.get_pending_migrations()
        migration = next((m for m in pending if m.version == version), None)
        
        if not migration:
            await service.close()
            raise HTTPException(
                status_code=404,
                detail=f"Migration {version} not found or already applied"
            )
        
        logger.info(f"🚀 Applying migration {version} by {current_user.email}")
        
        # Apply the migration
        result = await service.apply_migration(migration, applied_by=current_user.email)
        
        await service.close()
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to apply migration {version}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def migration_health_check() -> Dict[str, Any]:
    """
    Health check for migration system
    
    Verifies:
    - Database connection
    - Migrations table exists
    - Migrations directory exists
    """
    service = get_migration_service()
    
    try:
        await service.initialize()
        
        # Check if migrations table exists
        async with service.pool.acquire() as conn:
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'schema_migrations'
                );
            """)
        
        # Check migrations directory
        migrations_exist = service.migrations_dir.exists()
        migration_count = len(service._discover_migrations())
        
        await service.close()
        
        return {
            "success": True,
            "database_connected": True,
            "migrations_table_exists": table_exists,
            "migrations_directory_exists": migrations_exist,
            "total_migrations": migration_count
        }
        
    except Exception as e:
        logger.error(f"Migration health check failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

