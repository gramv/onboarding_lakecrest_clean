# Minimal Encryption Hardening (No KMS)

This hardening raises posture without KMS or schema changes.

## Env Vars (prod/staging)
- ENVIRONMENT=production (or staging)
- FIELD_ENCRYPTION_KEY
- DOCUMENT_ENCRYPTION_KEY (or reuse FIELD_ENCRYPTION_KEY)
- CURRENT_ENCRYPTION_KEY_VERSION (default 1)

## Behavior
- Startup self-tests: fail-fast in prod/staging if keys missing or round-trip fails.
- Fields: AES-256-GCM with per-item salt/nonce. Legacy Fernet tokens dual-decrypted when encountered.
- Documents: Fernet encryption preserved; metadata now includes `version`.
- Migration: optional `backend/scripts/migrate_field_encryption_minimal.py` with knobs BATCH_SIZE, PAUSE_AFTER_ERRORS, RUN.

## Rollout tips
- Canary first; monitor decrypt warnings/errors.
- Dry-run migration, then small batches off-hours.
