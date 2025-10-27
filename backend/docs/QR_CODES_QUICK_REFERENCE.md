# QR Codes Table - Quick Reference Card

**⏱️ Total Time:** 20 minutes  
**🎯 Goal:** Add missing `qr_codes` table to RDS

---

## 🚀 Quick Steps

### 1️⃣ Get Password (2 min)
```bash
aws secretsmanager get-secret-value \
  --secret-id onboarding/database/credentials-production \
  --region us-east-1 \
  --query SecretString \
  --output text | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])"
```
**Copy the output password**

---

### 2️⃣ Open AWS Query Editor (1 min)
- URL: https://console.aws.amazon.com/rds/home?region=us-east-1#query-editor:
- Instance: `onboarding-production-db`
- Database: `onboarding`
- Username: `postgres`
- Password: *paste from step 1*

---

### 3️⃣ Run Migration SQL (5 min)
**Copy this entire SQL block and paste into Query Editor:**

```sql
-- Create QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL,
    qr_code_url TEXT NOT NULL,
    application_url TEXT NOT NULL,
    storage_path TEXT,
    public_url TEXT,
    format VARCHAR(10) DEFAULT 'PNG',
    size_width INTEGER,
    size_height INTEGER,
    version INTEGER DEFAULT 1,
    error_correction VARCHAR(1) DEFAULT 'L',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_property_qr_code UNIQUE(property_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_property_id ON public.qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_generated_at ON public.qr_codes(generated_at);

CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_codes_updated_at();

CREATE OR REPLACE FUNCTION increment_qr_access_count(qr_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.qr_codes
    SET access_count = access_count + 1, last_accessed_at = NOW()
    WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql;
```

**Click "Run"** ✅

---

### 4️⃣ Verify (3 min)
**Run each query in Query Editor:**

```sql
-- Should return: true
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'qr_codes'
);

-- Should return: 18
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'qr_codes';

-- Should return: 3
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'qr_codes';
```

**Expected:** ✅ true, ✅ 18, ✅ 3

---

### 5️⃣ Confirm Schema Match (5 min)
```bash
cd backend
python3 scripts/compare_supabase_vs_rds_schema.py
```

**Look for:**
```
Supabase tables: 44
RDS tables: 44
qr_codes                       Supabase: ✅  RDS: ✅
```

---

### 6️⃣ Re-enable Validation (2 min)
```bash
# Edit backend/QUICK_DEPLOY.sh
# Uncomment lines 40-52 (remove the # symbols)
```

---

## ✅ Done!

**You've successfully:**
- ✅ Added `qr_codes` table to RDS
- ✅ Verified 44/44 tables match
- ✅ Re-enabled schema validation
- ✅ Unblocked QR code migration

---

## 📋 Task Checklist

- [ ] Task 1: Get password from Secrets Manager
- [ ] Task 2: Connect to RDS Query Editor
- [ ] Task 3: Execute migration SQL
- [ ] Task 4: Verify table structure (18 columns, 3 indexes)
- [ ] Task 5: Run schema comparison (44/44 tables)
- [ ] Task 6: Re-enable schema validation in QUICK_DEPLOY.sh

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't get password | Check AWS CLI: `aws sts get-caller-identity` |
| Query Editor won't connect | Verify RDS is running: `aws rds describe-db-instances` |
| SQL fails | Copy SQL exactly as shown above |
| Table already exists | Skip to Task 4 (verify) |
| Schema comparison still shows 43 | Re-run Task 3 and 4 |

---

## 📚 Full Documentation

- **Detailed Plan:** `backend/docs/QR_CODES_TABLE_MIGRATION_PLAN.md`
- **AWS Console Guide:** `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`
- **Migration Status:** `backend/docs/MIGRATION_STATUS.md`
- **Complete Checklist:** `backend/docs/MIGRATION_CHECKLIST.md`

---

**Ready? Start with Step 1! ⬆️**

