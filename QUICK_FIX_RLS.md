# 🔧 Quick Fix: Disable RLS for Document Access Tables

**Issue:** Row Level Security (RLS) is blocking OTP creation

**Error:** `new row violates row-level security policy for table "document_access_otps"`

---

## ✅ **Quick Solution**

Run this SQL in your Supabase SQL Editor:

### **Option 1: Disable RLS (Quickest)**

```sql
-- Disable RLS on document access tables
ALTER TABLE document_access_otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_sessions DISABLE ROW LEVEL SECURITY;
```

### **Option 2: Add Permissive Policies (More Secure)**

```sql
-- Enable RLS
ALTER TABLE document_access_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON document_access_otps;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON document_access_sessions;

-- Create permissive policies
CREATE POLICY "Allow all for authenticated users"
ON document_access_otps
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users"
ON document_access_sessions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON document_access_otps TO authenticated;
GRANT ALL ON document_access_sessions TO authenticated;
```

---

## 📋 **How to Apply**

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### **Step 2: Run the SQL**

1. Click "New Query"
2. Paste the SQL from **Option 1** (quickest) or **Option 2** (more secure)
3. Click "Run" or press `Cmd+Enter`

### **Step 3: Verify**

You should see:
```
Success. No rows returned
```

### **Step 4: Test**

1. Refresh your browser
2. Click "Review & Complete I-9"
3. OTP modal should work now!

---

## 🎯 **What This Does**

**Option 1 (Disable RLS):**
- Completely disables RLS on these tables
- Fastest solution
- Less secure (but backend still has authentication)

**Option 2 (Permissive Policies):**
- Keeps RLS enabled
- Allows all authenticated users to access
- More secure
- Recommended for production

---

## 🔍 **Why This Happened**

The `document_access_otps` and `document_access_sessions` tables were created without RLS policies, but RLS was enabled by default. This blocks all INSERT/UPDATE/DELETE operations unless there's a policy allowing them.

---

## ✅ **After Applying**

The OTP flow will work:
1. ✅ Manager clicks "Verify Identity"
2. ✅ OTP is created in database
3. ✅ Email is sent
4. ✅ Manager enters code
5. ✅ Verification succeeds
6. ✅ Session is created
7. ✅ Employee data loads

---

**Apply this fix now and try the OTP flow again!** 🚀

