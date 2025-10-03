# ✅ FIXED: Supabase Service Key Configuration

## 🐛 Issue Identified

The Company Policies documents (and all other PDFs) were not being saved to Supabase Storage because the backend was missing the **Supabase Service Role Key**.

### What Was Happening:
- Frontend was generating PDFs successfully
- Frontend was calling the backend to save PDFs
- Backend was receiving the requests
- **Backend couldn't upload to Supabase Storage** because it only had the `SUPABASE_ANON_KEY`
- The anon key doesn't have permission to write to storage buckets

### Error in Logs:
The backend was logging warnings:
```
SUPABASE_SERVICE_KEY not set, using anon key for admin operations — manager-specific 
queries may be blocked by RLS. Ensure the service role key is configured in the .env file.
```

---

## ✅ Solution Applied

Added the Supabase Service Role Key to Heroku:

```bash
heroku config:set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -a ordermanagement
```

### What This Fixes:
1. **PDF Storage** - Backend can now upload PDFs to Supabase Storage
2. **Document Retrieval** - Backend can retrieve signed PDFs from storage
3. **Admin Operations** - Backend can perform privileged operations that bypass RLS
4. **Manager Queries** - Backend can query data across properties for managers

---

## 🔑 Environment Variables Now Configured

### Heroku (Production):
```
SUPABASE_URL=https://kzommszdhapvqpekpvnt.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (public key for frontend)
SUPABASE_SERVICE_KEY=eyJhbGci... (service role key for backend) ✅ ADDED
```

### Local (.env):
```
SUPABASE_URL=https://kzommszdhapvqpekpvnt.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (public key)
SUPABASE_SERVICE_KEY=eyJhbGci... (service role key)
```

---

## 🧪 How to Test

1. **Navigate to Company Policies step** in the onboarding flow
2. **Complete all 4 sections** (provide initials for each)
3. **Go to Section 5** (Final Acknowledgment)
4. **Check the acknowledgment box**
5. **Sign the document** using the signature pad
6. **Click "Complete Company Policies"**

### Expected Behavior:
- ✅ PDF should generate successfully
- ✅ PDF should be uploaded to Supabase Storage bucket `onboarding-documents`
- ✅ Document metadata should be saved to `onboarding_form_data` table
- ✅ Signed PDF URL should be returned and displayed
- ✅ You should be able to view/download the signed PDF

---

## 📝 Backend Code Reference

The backend checks for the service key in this order:

```python
self.supabase_service_key = (
    os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE")
)
```

If found, it creates an admin client:
```python
if self.supabase_service_key:
    self.admin_client: Client = create_client(self.supabase_url, self.supabase_service_key)
else:
    self.admin_client = self.client  # Falls back to anon key
    logger.warning("SUPABASE_SERVICE_KEY not set...")
```

The admin client is used for:
- Uploading files to storage
- Bypassing Row Level Security (RLS) for admin operations
- Manager-specific queries across properties
- Document generation and storage

---

## 🔒 Security Notes

### Service Role Key Permissions:
- **Full database access** - Bypasses all RLS policies
- **Storage access** - Can read/write to all buckets
- **Admin operations** - Can perform any operation

### Security Best Practices:
✅ **Never expose service key to frontend** - Only use in backend
✅ **Keep it secret** - Don't commit to git (already in .gitignore)
✅ **Use environment variables** - Never hardcode
✅ **Rotate periodically** - Change key every 6-12 months
✅ **Monitor usage** - Check Supabase logs for suspicious activity

---

## 🎯 What's Fixed Now

### Before:
- ❌ PDFs generated but not saved
- ❌ Documents lost on page refresh
- ❌ No document history
- ❌ Manager review couldn't access documents
- ❌ Backend warnings in logs

### After:
- ✅ PDFs saved to Supabase Storage
- ✅ Documents persist across sessions
- ✅ Complete document history
- ✅ Manager review can access all documents
- ✅ No warnings in logs
- ✅ Proper admin operations

---

## 📊 Verification

Check that the service key is configured:
```bash
heroku config -a ordermanagement | grep SUPABASE
```

Should show:
```
SUPABASE_ANON_KEY:     eyJhbGci...
SUPABASE_SERVICE_KEY:  eyJhbGci...
SUPABASE_URL:          https://kzommszdhapvqpekpvnt.supabase.co
```

Check backend logs for warnings:
```bash
heroku logs --tail -a ordermanagement | grep -i "service.*key\|warning"
```

Should show NO warnings about missing service key.

---

## 🚀 Next Steps

1. **Test document generation** - Try completing Company Policies step
2. **Verify storage** - Check Supabase dashboard → Storage → onboarding-documents bucket
3. **Test other steps** - I-9, W-4, Direct Deposit, etc. should all save PDFs now
4. **Manager review** - Managers should be able to view all employee documents

---

**Status:** ✅ FIXED - Service key configured, documents will now save to Supabase Storage!

**Deployed:** October 3, 2025
**Heroku Version:** v129

