# Supabase Branching Workflow for Security Implementation

**Date:** October 3, 2025  
**Plan:** Pro (Branching Available ✅)

---

## 🌿 **BRANCHING STRATEGY**

We'll use Supabase Preview Branches to safely test all security features before merging to production.

### **Benefits:**
- ✅ Test on real Supabase infrastructure
- ✅ Isolated environment (won't affect production)
- ✅ Easy rollback (just delete the branch)
- ✅ Can merge to production when ready
- ✅ Test data is separate from production

---

## 📋 **STEP-BY-STEP GUIDE**

### **Step 1: Create Preview Branch**

**Via Supabase Dashboard (Easiest):**

1. Go to your Supabase Dashboard
2. Click **Branches** in the left sidebar (Pro feature)
3. Click **Create Preview Branch**
4. Name it: `security-audit-trail-test`
5. Click **Create Branch**

**Via Supabase CLI (Alternative):**

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Create preview branch
supabase branches create security-audit-trail-test
```

---

### **Step 2: Get Branch Connection Details**

After creating the branch, you'll get:
- **Branch URL**: `https://[branch-id].supabase.co`
- **Branch API Keys**: Anon key and Service Role key
- **Branch Database URL**: Connection string for the branch

**Save these for testing!**

---

### **Step 3: Apply Migrations to Branch**

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your **Preview Branch** dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Copy the SQL from `backend/migrations/001_create_audit_trail.sql`
5. Paste and click **Run**

You should see:
```
✅ Audit trail table created successfully
✅ Indexes created for fast queries
✅ RLS policies enabled
✅ Ready to log document access
```

**Option B: Via CLI**

```bash
# Push migrations to the branch
supabase db push --linked

# Or apply specific migration
supabase migration up --linked
```

---

### **Step 4: Test on Branch**

**Update backend .env to point to branch:**

```bash
# Temporarily update these to test on branch
SUPABASE_URL=https://[branch-id].supabase.co
SUPABASE_KEY=[branch-service-role-key]
DATABASE_URL=postgresql://postgres:[branch-password]@[branch-host]:5432/postgres
```

**Run tests:**

```bash
cd backend

# Test audit trail
python3 -c "
from app.supabase_service_enhanced import get_supabase_service
from app.audit_service import get_audit_service
import asyncio

async def test():
    supabase = get_supabase_service()
    audit = get_audit_service(supabase)
    
    # Test logging
    success = await audit.log_document_access(
        document_path='test/document.pdf',
        document_type='i9',
        access_type='upload',
        accessed_by='test-user-123',
        employee_id='test-employee-456',
        property_id='test-property-789'
    )
    
    print(f'✅ Audit log created: {success}')
    
    # Test retrieval
    history = await audit.get_document_access_history(
        employee_id='test-employee-456'
    )
    
    print(f'✅ Retrieved {len(history)} audit entries')
    print(f'   Latest entry: {history[0] if history else None}')

asyncio.run(test())
"
```

---

### **Step 5: Verify in Branch Dashboard**

1. Go to **Preview Branch** dashboard
2. Click **Table Editor**
3. Find `document_access_log` table
4. Verify the test entry was created
5. Check all columns are populated correctly

---

### **Step 6: Test All Security Features**

Once audit trail works, continue with:

1. **Signed URL Expiration** - Apply migration, test
2. **Field-Level Encryption** - Apply migration, test
3. **RBAC Policies** - Apply migration, test

All on the **preview branch** first!

---

### **Step 7: Merge to Production**

**When all tests pass:**

**Via Dashboard:**
1. Go to **Branches**
2. Find your preview branch
3. Click **Merge to Production**
4. Confirm the merge

**Via CLI:**
```bash
# Merge branch to production
supabase branches merge security-audit-trail-test
```

**What happens:**
- ✅ All schema changes applied to production
- ✅ RLS policies copied to production
- ✅ Indexes created in production
- ✅ Production data remains untouched

---

### **Step 8: Update Production Environment**

After merge:

```bash
# Update backend .env back to production
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_KEY=[production-service-role-key]
DATABASE_URL=[production-database-url]
```

**Deploy backend with new code:**
```bash
git push heroku main
```

---

### **Step 9: Cleanup**

**Delete the preview branch:**

**Via Dashboard:**
1. Go to **Branches**
2. Find your preview branch
3. Click **Delete**

**Via CLI:**
```bash
supabase branches delete security-audit-trail-test
```

---

## 🔄 **COMPLETE WORKFLOW SUMMARY**

```
1. Create Preview Branch
   ↓
2. Apply Migration to Branch (SQL Editor)
   ↓
3. Update .env to point to branch
   ↓
4. Test audit trail on branch
   ↓
5. Verify in branch dashboard
   ↓
6. Test all security features
   ↓
7. All tests pass? → Merge to Production
   ↓
8. Update .env back to production
   ↓
9. Deploy backend to Heroku
   ↓
10. Delete preview branch
```

---

## 🎯 **WHAT I'LL DO**

Once you create the preview branch and share the connection details, I can:

1. ✅ Help you apply migrations to the branch
2. ✅ Write test scripts to verify each feature
3. ✅ Test audit trail, signed URLs, encryption, RBAC
4. ✅ Verify everything works before merge
5. ✅ Guide you through the merge process

---

## 📝 **NEXT STEPS**

**Your Action:**
1. Create preview branch: `security-audit-trail-test`
2. Share the branch connection details:
   - Branch URL
   - Branch Service Role Key
   - Branch Database URL (optional)

**My Action:**
1. Apply all migrations to the branch
2. Test each security feature
3. Verify everything works
4. Guide you through merge to production

---

## 🚀 **READY TO START?**

**Option 1: You create the branch**
- Go to Dashboard → Branches → Create Preview Branch
- Share the connection details with me

**Option 2: I guide you step-by-step**
- Tell me when you're ready
- I'll walk you through each step

**Which option do you prefer?**

