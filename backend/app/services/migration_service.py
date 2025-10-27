"""
Database Migration Service

Industry-standard database migration framework with:
- Version control
- Migration tracking
- Rollback support
- Audit trail
- Idempotent execution
"""
import os
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncpg
import logging

logger = logging.getLogger(__name__)


class Migration:
    """Represents a single database migration"""
    
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.filename = filepath.name
        self.version = self._extract_version()
        self.description = self._extract_description()
        self.sql = filepath.read_text()
        self.checksum = self._calculate_checksum()
        
    def _extract_version(self) -> str:
        """Extract version from filename (YYYYMMDD_HHMMSS)"""
        match = re.match(r'(\d{8}_\d{6})_.*\.sql', self.filename)
        if not match:
            raise ValueError(f"Invalid migration filename: {self.filename}")
        return match.group(1)
    
    def _extract_description(self) -> str:
        """Extract description from filename"""
        match = re.match(r'\d{8}_\d{6}_(.*)\.sql', self.filename)
        if match:
            return match.group(1).replace('_', ' ').title()
        return "No description"
    
    def _calculate_checksum(self) -> str:
        """Calculate SHA-256 checksum of migration SQL"""
        return hashlib.sha256(self.sql.encode()).hexdigest()
    
    def get_up_sql(self) -> str:
        """Extract UP migration SQL"""
        # Extract everything before DOWN migration marker
        match = re.search(
            r'-- UP Migration.*?--\s*=+\s*\n(.*?)(?:--\s*=+\s*\n.*?-- DOWN Migration|$)',
            self.sql,
            re.DOTALL | re.IGNORECASE
        )
        if match:
            return match.group(1).strip()
        
        # If no markers, return everything except comments at the top
        lines = self.sql.split('\n')
        sql_lines = []
        in_header = True
        for line in lines:
            if in_header and (line.strip().startswith('--') or not line.strip()):
                continue
            in_header = False
            sql_lines.append(line)
        return '\n'.join(sql_lines).strip()
    
    def get_down_sql(self) -> Optional[str]:
        """Extract DOWN migration SQL (rollback)"""
        match = re.search(
            r'-- DOWN Migration.*?--\s*=+\s*\n(.*?)$',
            self.sql,
            re.DOTALL | re.IGNORECASE
        )
        if match:
            sql = match.group(1).strip()
            # Uncomment the rollback SQL
            sql = re.sub(r'^\s*--\s*', '', sql, flags=re.MULTILINE)
            return sql.strip() if sql else None
        return None


class MigrationService:
    """Service for managing database migrations"""
    
    def __init__(self, db_url: str, migrations_dir: str = "migrations"):
        self.db_url = db_url
        self.migrations_dir = Path(migrations_dir)
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize database connection pool"""
        if not self.pool:
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=5,
                statement_cache_size=0  # For pgbouncer compatibility
            )
            await self._ensure_migrations_table()
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
    
    async def _ensure_migrations_table(self):
        """Create schema_migrations table if it doesn't exist"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    applied_by VARCHAR(255),
                    execution_time_ms INTEGER,
                    checksum VARCHAR(64),
                    status VARCHAR(20) DEFAULT 'success',
                    error_message TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
                ON schema_migrations(version);
                
                CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
                ON schema_migrations(applied_at DESC);
            """)
            logger.info("✅ Migration tracking table ready")
    
    def _discover_migrations(self) -> List[Migration]:
        """Discover all migration files"""
        if not self.migrations_dir.exists():
            logger.warning(f"Migrations directory not found: {self.migrations_dir}")
            return []
        
        migrations = []
        for filepath in sorted(self.migrations_dir.glob("*.sql")):
            # Skip README and other non-migration files
            if filepath.name.startswith('README') or filepath.name.startswith('.'):
                continue
            
            try:
                migration = Migration(filepath)
                migrations.append(migration)
            except ValueError as e:
                logger.warning(f"Skipping invalid migration file: {e}")
        
        return sorted(migrations, key=lambda m: m.version)
    
    async def get_applied_migrations(self) -> List[Dict[str, Any]]:
        """Get list of applied migrations"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT version, description, applied_at, applied_by, 
                       execution_time_ms, status, error_message
                FROM schema_migrations
                ORDER BY applied_at DESC
            """)
            return [dict(row) for row in rows]
    
    async def get_pending_migrations(self) -> List[Migration]:
        """Get list of pending migrations"""
        all_migrations = self._discover_migrations()
        applied = await self.get_applied_migrations()
        applied_versions = {m['version'] for m in applied}
        
        pending = [m for m in all_migrations if m.version not in applied_versions]
        return pending
    
    async def apply_migration(
        self, 
        migration: Migration, 
        applied_by: str = "system"
    ) -> Dict[str, Any]:
        """Apply a single migration"""
        logger.info(f"📝 Applying migration: {migration.version} - {migration.description}")
        
        start_time = datetime.now()
        
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                try:
                    # Execute migration SQL
                    sql = migration.get_up_sql()
                    await conn.execute(sql)
                    
                    # Record migration
                    execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                    
                    await conn.execute("""
                        INSERT INTO schema_migrations 
                        (version, description, applied_by, execution_time_ms, checksum, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (version) DO NOTHING
                    """, migration.version, migration.description, applied_by, 
                        execution_time, migration.checksum, 'success')
                    
                    logger.info(f"✅ Migration applied: {migration.version} ({execution_time}ms)")
                    
                    return {
                        "success": True,
                        "version": migration.version,
                        "description": migration.description,
                        "execution_time_ms": execution_time
                    }
                    
                except Exception as e:
                    logger.error(f"❌ Migration failed: {migration.version} - {e}")
                    
                    # Record failure
                    await conn.execute("""
                        INSERT INTO schema_migrations 
                        (version, description, applied_by, status, error_message)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (version) DO UPDATE
                        SET status = $4, error_message = $5
                    """, migration.version, migration.description, applied_by, 
                        'failed', str(e))
                    
                    raise
    
    async def apply_all_pending(self, applied_by: str = "system") -> Dict[str, Any]:
        """Apply all pending migrations"""
        pending = await self.get_pending_migrations()
        
        if not pending:
            logger.info("✅ No pending migrations")
            return {
                "success": True,
                "applied_count": 0,
                "migrations": []
            }
        
        logger.info(f"📝 Found {len(pending)} pending migration(s)")
        
        results = []
        for migration in pending:
            try:
                result = await self.apply_migration(migration, applied_by)
                results.append(result)
            except Exception as e:
                logger.error(f"❌ Stopping migration process due to error: {e}")
                return {
                    "success": False,
                    "applied_count": len(results),
                    "migrations": results,
                    "error": str(e)
                }
        
        logger.info(f"✅ Applied {len(results)} migration(s)")
        return {
            "success": True,
            "applied_count": len(results),
            "migrations": results
        }
    
    async def get_migration_status(self) -> Dict[str, Any]:
        """Get overall migration status"""
        all_migrations = self._discover_migrations()
        applied = await self.get_applied_migrations()
        pending = await self.get_pending_migrations()
        
        return {
            "total_migrations": len(all_migrations),
            "applied_count": len(applied),
            "pending_count": len(pending),
            "last_applied": applied[0] if applied else None,
            "pending_versions": [m.version for m in pending]
        }

