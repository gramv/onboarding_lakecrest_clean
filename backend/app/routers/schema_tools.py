"""
Schema Tools Router
Provides endpoints for schema discovery and comparison (admin/dev only)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import asyncpg
import os
import json

router = APIRouter(prefix="/api/schema-tools", tags=["Schema Tools"])


async def get_rds_connection():
    """Get RDS database connection"""
    db_url = os.getenv('RDS_DATABASE_URL')
    
    if not db_url:
        # Try to get from AWS Secrets Manager
        try:
            import subprocess
            result = subprocess.run([
                'aws', 'secretsmanager', 'get-secret-value',
                '--secret-id', 'onboarding/database/credentials-production',
                '--region', 'us-east-1',
                '--query', 'SecretString',
                '--output', 'text'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                secret = json.loads(result.stdout)
                db_url = secret['url']
            else:
                raise Exception("Failed to get RDS credentials from Secrets Manager")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cannot get RDS credentials: {str(e)}")
    
    try:
        conn = await asyncpg.connect(db_url, timeout=10)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot connect to RDS: {str(e)}")


@router.get("/discover-rds-schema")
async def discover_rds_schema() -> Dict[str, Any]:
    """
    Discover and return the complete RDS schema
    
    This endpoint connects to RDS and extracts:
    - All tables and their columns
    - Column types, nullability, defaults
    - Indexes
    - Views
    - Constraints
    
    Returns the schema as JSON
    """
    conn = None
    try:
        conn = await get_rds_connection()
        
        schema = {
            "tables": {},
            "views": {},
            "generated_at": None
        }
        
        # Get all tables
        tables_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """
        tables = await conn.fetch(tables_query)
        
        for table_row in tables:
            table_name = table_row['table_name']
            schema["tables"][table_name] = {
                "columns": {},
                "indexes": [],
                "constraints": []
            }
            
            # Get columns
            columns_query = """
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    is_nullable,
                    column_default,
                    ordinal_position
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = $1
                ORDER BY ordinal_position
            """
            columns = await conn.fetch(columns_query, table_name)
            
            for col in columns:
                schema["tables"][table_name]["columns"][col['column_name']] = {
                    'type': col['data_type'],
                    'nullable': col['is_nullable'] == 'YES',
                    'default': col['column_default'],
                    'max_length': col['character_maximum_length'],
                    'numeric_precision': col['numeric_precision'],
                    'numeric_scale': col['numeric_scale'],
                    'position': col['ordinal_position']
                }
            
            # Get indexes
            indexes_query = """
                SELECT
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                AND tablename = $1
                ORDER BY indexname
            """
            indexes = await conn.fetch(indexes_query, table_name)
            schema["tables"][table_name]["indexes"] = [
                {
                    "name": idx['indexname'],
                    "definition": idx['indexdef']
                }
                for idx in indexes
            ]
            
            # Get constraints
            constraints_query = """
                SELECT
                    con.conname AS constraint_name,
                    con.contype AS constraint_type,
                    pg_get_constraintdef(con.oid) AS constraint_definition
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = 'public'
                AND rel.relname = $1
                ORDER BY con.conname
            """
            constraints = await conn.fetch(constraints_query, table_name)
            schema["tables"][table_name]["constraints"] = [
                {
                    "name": c['constraint_name'],
                    "type": c['constraint_type'],
                    "definition": c['constraint_definition']
                }
                for c in constraints
            ]
        
        # Get views
        views_query = """
            SELECT 
                table_name,
                view_definition
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
        views = await conn.fetch(views_query)
        
        for view in views:
            schema["views"][view['table_name']] = {
                "definition": view['view_definition']
            }
        
        # Add metadata
        from datetime import datetime
        schema["generated_at"] = datetime.now().isoformat()
        schema["table_count"] = len(schema["tables"])
        schema["view_count"] = len(schema["views"])
        
        return schema
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schema discovery failed: {str(e)}")
    finally:
        if conn:
            await conn.close()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "schema-tools"}

