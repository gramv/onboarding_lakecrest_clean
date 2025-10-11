"""
Minimal field encryption backfill script (no KMS).

- Detect legacy Fernet/plaintext values and re-encrypt via AES-GCM current version on write paths.
- Batch controls via env: BATCH_SIZE (default 200), PAUSE_AFTER_ERRORS (default 10).
This script performs a dry-run by default unless RUN=true is set.
"""

import os
import time
import logging
from typing import List, Dict, Any

from app.services.encryption_service import get_encryption_service
from app.supabase_service_enhanced import EnhancedSupabaseService

logger = logging.getLogger(__name__)


def _get_env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def migrate_table_fields(table: str, id_column: str, fields: List[str]) -> None:
    svc = EnhancedSupabaseService()
    enc = get_encryption_service()

    batch_size = _get_env_int("BATCH_SIZE", 200)
    pause_after_errors = _get_env_int("PAUSE_AFTER_ERRORS", 10)
    dry_run = os.getenv("RUN", "false").lower() != "true"

    offset = 0
    total_processed = 0
    total_updated = 0
    errors = 0

    logger.info(f"Starting migration for {table} fields {fields} (batch={batch_size}, dry_run={dry_run})")

    while True:
        # Fetch a batch
        rows = svc.admin_client.table(table).select("*, {}".format(
            ",".join(fields)
        )).range(offset, offset + batch_size - 1).execute().data

        if not rows:
            break

        for row in rows:
            total_processed += 1
            row_id = row.get(id_column)
            updated = {}
            try:
                for f in fields:
                    value = row.get(f)
                    if value is None:
                        continue
                    # Try decrypt via service (handles AES and legacy Fernet/plain)
                    try:
                        decrypted = enc.decrypt_field(value, f) if isinstance(value, dict) or (isinstance(value, str) and value.startswith('{')) else enc.decrypt_field(value, f)
                    except Exception:
                        # Decrypt may raise; skip and count error
                        raise
                    # If decrypted equals original plaintext (legacy/plain), re-encrypt
                    if isinstance(value, (str, dict)):
                        # Only re-encrypt when not already structured AES blob
                        if not (isinstance(value, dict) and 'v' in value and 'c' in value):
                            encrypted = enc.encrypt_field(decrypted, f)
                            updated[f] = encrypted
                if updated and not dry_run:
                    svc.admin_client.table(table).update(updated).eq(id_column, row_id).execute()
                    total_updated += 1
            except Exception as e:
                errors += 1
                logger.error(f"Failed to process {table}.{row_id}: {e}")
                if errors % pause_after_errors == 0:
                    time.sleep(1)

        offset += batch_size

    logger.info(f"Completed migration for {table}: processed={total_processed}, updated={total_updated}, errors={errors}")


if __name__ == "__main__":
    # Example: migrate SSN in employees and job_applications
    migrate_table_fields("employees", "id", ["ssn"])  # adjust to actual column names
    migrate_table_fields("job_applications", "id", ["ssn"])  # adjust as needed


