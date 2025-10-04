# 🚀 Week 1: Foundation - Implementation Guide

**Status:** In Progress  
**Started:** October 4, 2025  
**Goal:** Database schema + Supabase Auth setup

---

## ✅ **COMPLETED**

### **Day 1: Database Schema Created**

#### **Files Created:**
1. ✅ `backend/migrations/008_manager_review_enhancements.sql`
2. ✅ `backend/supabase/migrations/014_manager_review_enhancements.sql`
3. ✅ `backend/run_migration_014.py`

#### **Tables Created:**

**1. form_field_edits**
- Tracks every field edit by managers
- Captures OCR confidence, edit reason, notes
- Enables continuous improvement analytics

**2. document_access_sessions**
- 30-minute sessions after OTP verification
- Tracks which documents were viewed
- Audit trail for compliance

**3. employer_profiles**
- One-time setup per property
- Auto-fills I-9, W-4, insurance forms
- Version history tracked

**4. employer_profile_history**
- Tracks all changes to employer profiles
- Maintains audit trail

**5. manager_edit_patterns**
- Aggregated statistics per manager
- Identifies training opportunities

**6. ocr_accuracy_analytics (Materialized View)**
- Real-time OCR accuracy metrics
- Identifies problem fields
- Generates improvement recommendations

---

## 📋 **NEXT STEPS**

### **Day 2: Run Migration in Supabase**

#### **Option 1: Supabase Dashboard (Recommended)**

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   ```bash
   # Copy the migration file
   cat backend/supabase/migrations/014_manager_review_enhancements.sql
   ```

4. **Paste and Run**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for success message

5. **Verify**
   ```bash
   python backend/run_migration_014.py --verify
   ```

#### **Option 2: Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push

# Verify
python backend/run_migration_014.py --verify
```

---

### **Day 3: Enable Supabase Phone Auth**

#### **Step 1: Enable Phone Provider**

1. **Go to Supabase Dashboard**
   - Authentication → Providers

2. **Enable Phone**
   - Toggle "Phone" to ON
   - Click "Save"

#### **Step 2: Configure SMS Provider**

**Option A: Twilio (Recommended)**

1. **Get Twilio Credentials**
   - Sign up at: https://www.twilio.com
   - Get: Account SID, Auth Token, Phone Number

2. **Configure in Supabase**
   - Authentication → Providers → Phone
   - Select "Twilio" as provider
   - Enter:
     - Account SID
     - Auth Token
     - Messaging Service SID (or Phone Number)
   - Click "Save"

3. **Test SMS Delivery**
   ```typescript
   // Test in browser console
   const { data, error } = await supabase.auth.signInWithOtp({
     phone: '+14155550100'
   })
   console.log('OTP sent:', data)
   ```

**Option B: MessageBird**

1. **Get MessageBird Credentials**
   - Sign up at: https://www.messagebird.com
   - Get API Key

2. **Configure in Supabase**
   - Authentication → Providers → Phone
   - Select "MessageBird"
   - Enter API Key
   - Click "Save"

#### **Step 3: Configure Email Templates**

1. **Go to Authentication → Email Templates**

2. **Customize "Magic Link" Template**
   ```html
   <h2>Verify Your Identity</h2>
   <p>Your verification code is:</p>
   <h1 style="font-size: 32px; letter-spacing: 5px;">{{ .Token }}</h1>
   <p>This code expires in 60 seconds.</p>
   <p>If you didn't request this, please ignore this email.</p>
   ```

3. **Test Email Delivery**
   ```typescript
   const { data, error } = await supabase.auth.signInWithOtp({
     email: 'manager@hotel.com'
   })
   console.log('OTP sent:', data)
   ```

---

### **Day 4: Configure Rate Limits & Security**

#### **Step 1: Set Rate Limits**

1. **Go to Authentication → Rate Limits**

2. **Configure OTP Limits**
   - OTP requests per hour: 10
   - OTP verification attempts: 5
   - Enable CAPTCHA after: 3 failed attempts

3. **Save Settings**

#### **Step 2: Enable CAPTCHA (Optional)**

1. **Get reCAPTCHA Keys**
   - Go to: https://www.google.com/recaptcha/admin
   - Create new site (v2 Checkbox)
   - Get Site Key and Secret Key

2. **Configure in Supabase**
   - Authentication → Settings
   - Enable "Enable Captcha protection"
   - Enter Site Key and Secret Key
   - Save

---

### **Day 5: Backend Project Setup**

#### **Step 1: Install Dependencies**

```bash
cd backend

# Install Python dependencies
pip install supabase-py python-dotenv fastapi uvicorn pydantic

# Or update requirements.txt
echo "supabase>=1.0.0" >> requirements.txt
pip install -r requirements.txt
```

#### **Step 2: Update Environment Variables**

```bash
# backend/.env

# Existing variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Add these for Phone Auth
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# JWT Secret (for session management)
JWT_SECRET=your-secret-key-here
```

#### **Step 3: Create Service Files**

**File: `backend/app/services/supabase_auth_service.py`**

```python
from supabase import create_client, Client
import os

class SupabaseAuthService:
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )
    
    async def get_user(self, user_id: str):
        """Get user by ID"""
        try:
            user = self.supabase.auth.admin.get_user_by_id(user_id)
            return user
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    async def update_user_phone(self, user_id: str, phone: str):
        """Update user phone number"""
        try:
            user = self.supabase.auth.admin.update_user_by_id(
                user_id,
                {
                    "phone": phone,
                    "user_metadata": {
                        "notification_preference": "sms"
                    }
                }
            )
            return user
        except Exception as e:
            print(f"Error updating user phone: {e}")
            return None
    
    async def send_otp_sms(self, phone: str):
        """Send OTP via SMS"""
        try:
            result = self.supabase.auth.sign_in_with_otp({
                "phone": phone
            })
            return result
        except Exception as e:
            print(f"Error sending OTP: {e}")
            return None
    
    async def send_otp_email(self, email: str):
        """Send OTP via email"""
        try:
            result = self.supabase.auth.sign_in_with_otp({
                "email": email
            })
            return result
        except Exception as e:
            print(f"Error sending OTP: {e}")
            return None
    
    async def verify_otp(self, phone_or_email: str, token: str, type: str):
        """Verify OTP"""
        try:
            if type == 'sms':
                result = self.supabase.auth.verify_otp({
                    "phone": phone_or_email,
                    "token": token,
                    "type": "sms"
                })
            else:
                result = self.supabase.auth.verify_otp({
                    "email": phone_or_email,
                    "token": token,
                    "type": "email"
                })
            return result
        except Exception as e:
            print(f"Error verifying OTP: {e}")
            return None

# Singleton instance
supabase_auth_service = SupabaseAuthService()
```

---

## 🧪 **TESTING**

### **Test Migration**

```bash
# Verify tables exist
python backend/run_migration_014.py --verify
```

**Expected Output:**
```
✅ form_field_edits - exists
✅ document_access_sessions - exists
✅ employer_profiles - exists
✅ employer_profile_history - exists
✅ manager_edit_patterns - exists
```

### **Test Supabase Auth**

```bash
# Create test script: backend/test_auth.py
python backend/test_auth.py
```

**Test Script:**
```python
import asyncio
from app.services.supabase_auth_service import supabase_auth_service

async def test_auth():
    # Test SMS OTP
    print("Testing SMS OTP...")
    result = await supabase_auth_service.send_otp_sms("+14155550100")
    print(f"SMS sent: {result}")
    
    # Test Email OTP
    print("\nTesting Email OTP...")
    result = await supabase_auth_service.send_otp_email("test@example.com")
    print(f"Email sent: {result}")

if __name__ == "__main__":
    asyncio.run(test_auth())
```

---

## 📊 **WEEK 1 CHECKLIST**

### **Database**
- [x] Migration file created
- [ ] Migration run in Supabase
- [ ] Tables verified
- [ ] Indexes created
- [ ] RLS policies enabled

### **Supabase Auth**
- [ ] Phone provider enabled
- [ ] SMS provider configured (Twilio)
- [ ] Email templates customized
- [ ] Rate limits set
- [ ] CAPTCHA configured (optional)

### **Backend Setup**
- [ ] Dependencies installed
- [ ] Environment variables updated
- [ ] Auth service created
- [ ] Tests passing

---

## 🎯 **SUCCESS CRITERIA**

By end of Week 1, you should have:

1. ✅ **Database Schema**
   - All 5 tables created
   - Materialized view working
   - RLS policies active

2. ✅ **Supabase Auth**
   - Phone OTP working
   - Email OTP working
   - Rate limits configured

3. ✅ **Backend Foundation**
   - Auth service created
   - Environment configured
   - Tests passing

---

## 🚀 **NEXT: WEEK 2**

Once Week 1 is complete, we'll move to:
- Backend API endpoints
- Verification flow
- Employer profile CRUD
- Edit tracking endpoints

---

**Ready to run the migration? Let me know when you're ready for Day 2!** 🎯

