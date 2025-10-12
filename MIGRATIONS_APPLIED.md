# Database Migrations Tracking

**Purpose:** Track which migrations have been applied to production Supabase database  
**Method:** Manual execution via Supabase SQL Editor  
**Project:** kzommszdhapvqpekpvnt

---

## How to Apply a Migration

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/kzommszdhapvqpekpvnt/editor
2. Click "New Query"
3. Copy SQL from migration file
4. Paste and click "Run"
5. Mark as applied below with date

---

## Applied Migrations

### ✅ Core Schema (Already Applied)
- [x] `supabase/migrations/001_onboarding_tokens.sql`
- [x] `supabase/migrations/002_onboarding_form_data.sql`
- [x] `supabase/migrations/007_manager_review_system.sql`
- [x] `supabase/migrations/008_add_missing_columns.sql`
- [x] `supabase/migrations/011_create_email_recipients_table.sql`
- [x] `supabase/migrations/014_manager_review_enhancements.sql`
- [x] `migrations/create_document_approvals_table.sql`
- [x] `migrations/002_add_encrypted_fields.sql`

### 🆕 Recently Applied

- [x] **018_extract_emergency_contacts.sql** - Date: **October 11, 2025**
  - **Location:** `backend/migrations/018_extract_emergency_contacts.sql`
  - **Purpose:** Add emergency_contact columns to employees table
  - **Status:** ✅ Applied successfully (initial version)
  - **Applied by:** Manual SQL Editor
  
- [x] **019_fix_emergency_contact_fields.sql** - Date: **October 11, 2025**
  - **Location:** `backend/migrations/019_fix_emergency_contact_fields.sql`
  - **Purpose:** Fix emergency contact fields (remove email, add address)
  - **Status:** ✅ Applied successfully
  - **Applied by:** Manual SQL Editor
  - **Verified:** 4 columns confirmed (emergency_contact_name, relationship, phone, address)

---

## Future Migrations

Add new migrations here as they're created. After applying, move to "Applied Migrations" section above.

---

## Notes

- Always backup before running migrations (Supabase auto-backups daily)
- Test migrations on staging/dev first if possible
- For complex migrations, consider using transactions
- Keep this document updated after each migration

---

**Last Updated:** October 11, 2025

