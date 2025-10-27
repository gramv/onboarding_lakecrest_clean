"""
Migration Tools Router
Provides endpoints to run database migrations from within AWS VPC
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging
from app.repositories.postgres_repository import PostgresRepository
from app.auth import get_current_user, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/migration-tools", tags=["migration-tools"])

# RDS-compatible QR codes table migration SQL
QR_CODES_MIGRATION_SQL = """
-- ============================================
-- QR Codes Table Migration - RDS Compatible
-- ============================================

-- Create QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- QR Code Data
    qr_code_data TEXT NOT NULL,
    qr_code_url TEXT NOT NULL,
    application_url TEXT NOT NULL,
    
    -- Storage
    storage_path TEXT,
    public_url TEXT,
    
    -- Metadata
    format VARCHAR(10) DEFAULT 'PNG',
    size_width INTEGER,
    size_height INTEGER,
    version INTEGER DEFAULT 1,
    error_correction VARCHAR(1) DEFAULT 'L',
    
    -- Tracking
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one QR code per property
    CONSTRAINT unique_property_qr_code UNIQUE(property_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_property_id ON public.qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON public.qr_codes(created_at);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER trigger_update_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_codes_updated_at();

-- Create access count function
CREATE OR REPLACE FUNCTION increment_qr_access_count(qr_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.qr_codes
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql;
"""


@router.post("/apply-qr-codes-migration")
async def apply_qr_codes_migration(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Apply the QR codes table migration to RDS
    This endpoint runs inside AWS VPC and can access RDS
    
    ⚠️ ADMIN ONLY - Requires HR/Admin role
    """
    try:
        # Verify user is admin/HR
        if current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only HR/Admin users can run migrations"
            )
        
        logger.info(f"🚀 Starting QR codes migration (requested by {current_user.email})")
        
        # Initialize repository
        repo = PostgresRepository()
        await repo.initialize()
        
        # Check if table already exists
        check_query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'qr_codes'
        );
        """
        
        conn = await repo.pool.acquire()
        try:
            table_exists = await conn.fetchval(check_query)
            
            if table_exists:
                logger.warning("⚠️  Table 'qr_codes' already exists")
                return {
                    "success": True,
                    "message": "Table 'qr_codes' already exists - no migration needed",
                    "table_exists": True,
                    "migration_applied": False
                }
            
            # Apply migration
            logger.info("📝 Applying QR codes migration...")
            await conn.execute(QR_CODES_MIGRATION_SQL)
            
            # Verify migration
            table_exists_after = await conn.fetchval(check_query)
            
            if not table_exists_after:
                raise Exception("Migration executed but table not found")
            
            # Get column count
            column_count_query = """
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'qr_codes';
            """
            column_count = await conn.fetchval(column_count_query)
            
            # Get index count
            index_count_query = """
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'qr_codes';
            """
            index_count = await conn.fetchval(index_count_query)
            
            logger.info(f"✅ Migration successful - {column_count} columns, {index_count} indexes")
            
            return {
                "success": True,
                "message": "QR codes table migration applied successfully",
                "table_exists": True,
                "migration_applied": True,
                "columns": column_count,
                "indexes": index_count,
                "applied_by": current_user.email
            }
            
        finally:
            await repo.pool.release(conn)
            
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/verify-qr-codes-table")
async def verify_qr_codes_table(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Verify that the QR codes table exists and has the correct structure
    """
    try:
        # Verify user is admin/HR
        if current_user.role not in ['hr', 'admin', 'manager']:
            raise HTTPException(
                status_code=403,
                detail="Only HR/Admin/Manager users can verify migrations"
            )
        
        repo = PostgresRepository()
        await repo.initialize()
        
        conn = await repo.pool.acquire()
        try:
            # Check if table exists
            table_exists_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'qr_codes'
            );
            """
            table_exists = await conn.fetchval(table_exists_query)
            
            if not table_exists:
                return {
                    "success": True,
                    "table_exists": False,
                    "message": "Table 'qr_codes' does not exist - migration needed"
                }
            
            # Get columns
            columns_query = """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'qr_codes'
            ORDER BY ordinal_position;
            """
            columns = await conn.fetch(columns_query)
            
            # Get indexes
            indexes_query = """
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'qr_codes';
            """
            indexes = await conn.fetch(indexes_query)
            
            # Get constraints
            constraints_query = """
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = 'public.qr_codes'::regclass;
            """
            constraints = await conn.fetch(constraints_query)
            
            return {
                "success": True,
                "table_exists": True,
                "columns": [dict(c) for c in columns],
                "indexes": [dict(i) for i in indexes],
                "constraints": [dict(c) for c in constraints],
                "column_count": len(columns),
                "index_count": len(indexes),
                "constraint_count": len(constraints)
            }
            
        finally:
            await repo.pool.release(conn)
            
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )

