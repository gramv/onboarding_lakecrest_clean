# 📱 Week 1 Day 3: Supabase Phone Auth Setup

**Status:** Ready to Start  
**Goal:** Enable SMS and Email OTP verification  
**Time:** 2-3 hours

---

## ✅ **PREREQUISITES**

- [x] Migration 014 completed
- [x] All tables verified
- [ ] Supabase Dashboard access
- [ ] Twilio account (for SMS) OR MessageBird account

---

## 🎯 **WHAT WE'LL ACCOMPLISH**

1. ✅ Enable Phone Auth in Supabase
2. ✅ Configure SMS provider (Twilio)
3. ✅ Customize email templates
4. ✅ Test OTP delivery (SMS + Email)
5. ✅ Configure rate limits

---

## 📋 **STEP-BY-STEP GUIDE**

### **Step 1: Enable Phone Authentication**

#### **1.1 Open Supabase Dashboard**
```
1. Go to: https://app.supabase.com
2. Select your project
3. Click "Authentication" in left sidebar
4. Click "Providers" tab
```

#### **1.2 Enable Phone Provider**
```
1. Scroll to "Phone" section
2. Toggle "Enable Phone Sign-Up" to ON
3. Click "Save"
```

**Screenshot location:** Authentication → Providers → Phone

---

### **Step 2: Configure SMS Provider (Twilio)**

#### **2.1 Create Twilio Account**

**If you don't have Twilio:**
```
1. Go to: https://www.twilio.com/try-twilio
2. Sign up for free account
3. Verify your email and phone
4. You'll get $15 free credit
```

**If you have Twilio:**
```
1. Go to: https://console.twilio.com
2. Login to your account
```

#### **2.2 Get Twilio Credentials**

**Find your credentials:**
```
1. Go to Twilio Console: https://console.twilio.com
2. You'll see on the dashboard:
   - Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Auth Token: Click "Show" to reveal
```

**Get a Phone Number:**
```
1. In Twilio Console, click "Phone Numbers" → "Manage" → "Buy a number"
2. Select your country (e.g., United States)
3. Check "SMS" capability
4. Click "Search"
5. Choose a number and click "Buy"
6. Copy the phone number (format: +1234567890)
```

**OR Get Messaging Service SID (Recommended):**
```
1. Go to: Messaging → Services
2. Click "Create Messaging Service"
3. Name it: "Hotel Onboarding OTP"
4. Click "Create Messaging Service"
5. Add your phone number to the service
6. Copy the "Messaging Service SID" (starts with MG...)
```

#### **2.3 Configure Twilio in Supabase**

**In Supabase Dashboard:**
```
1. Authentication → Providers → Phone
2. Under "Phone Provider", select "Twilio"
3. Enter your credentials:
   
   Twilio Account SID:
   [ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]
   
   Twilio Auth Token:
   [your-auth-token-here]
   
   Twilio Messaging Service SID (recommended):
   [MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]
   
   OR
   
   Twilio Phone Number:
   [+1234567890]

4. Click "Save"
```

**Important Notes:**
- ✅ Use Messaging Service SID for production (better deliverability)
- ✅ Use Phone Number for testing/development
- ✅ Keep Auth Token secret (never commit to git)

---

### **Step 3: Customize OTP Message Template**

#### **3.1 SMS Template (Twilio)**

**In Twilio Console:**
```
1. Go to: Messaging → Services → Your Service
2. Click "Sender Pool" tab
3. Add your phone number
4. Click "Properties" tab
5. Scroll to "Message Template"
```

**Recommended SMS Template:**
```
Your Hotel Onboarding verification code is: {{.Token}}

This code expires in 60 seconds.

If you didn't request this, please ignore.
```

**Character count:** Keep under 160 characters for single SMS

#### **3.2 Email Template (Supabase)**

**In Supabase Dashboard:**
```
1. Authentication → Email Templates
2. Click "Magic Link" template
3. Edit the template
```

**Recommended Email Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Identity</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #333; margin-bottom: 20px;">🔒 Verify Your Identity</h1>
        
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You requested access to view employee documents. Enter this verification code:
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
            <h1 style="font-size: 36px; letter-spacing: 8px; color: #2563eb; margin: 0;">
                {{ .Token }}
            </h1>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code expires in <strong>60 seconds</strong>.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            If you didn't request this code, please ignore this email.
        </p>
    </div>
</body>
</html>
```

**Save the template**

---

### **Step 4: Configure Rate Limits**

#### **4.1 Set OTP Rate Limits**

**In Supabase Dashboard:**
```
1. Authentication → Rate Limits
2. Configure the following:

   OTP Requests per Hour: 10
   (Prevents spam/abuse)
   
   OTP Verification Attempts: 5
   (Prevents brute force)
   
   Failed Attempts Before Lockout: 3
   (Security measure)
   
   Lockout Duration: 15 minutes
   (Temporary ban)

3. Click "Save"
```

#### **4.2 Enable CAPTCHA (Optional but Recommended)**

**Get reCAPTCHA Keys:**
```
1. Go to: https://www.google.com/recaptcha/admin
2. Click "+" to create new site
3. Choose "reCAPTCHA v2" → "I'm not a robot" Checkbox
4. Add your domain (or localhost for testing)
5. Accept terms and click "Submit"
6. Copy:
   - Site Key
   - Secret Key
```

**Configure in Supabase:**
```
1. Authentication → Settings
2. Scroll to "Security and Protection"
3. Toggle "Enable Captcha protection" to ON
4. Enter:
   Site Key: [your-site-key]
   Secret Key: [your-secret-key]
5. Click "Save"
```

---

### **Step 5: Test OTP Delivery**

#### **5.1 Test SMS OTP**

**Create test file:** `backend/test_sms_otp.py`

```python
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

async def test_sms_otp():
    supabase: Client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_ANON_KEY')
    )
    
    # Replace with your phone number
    phone = "+14155550100"  # Use your real number for testing
    
    print(f"📱 Sending SMS OTP to: {phone}")
    
    try:
        result = supabase.auth.sign_in_with_otp({
            "phone": phone
        })
        
        print("✅ SMS OTP sent successfully!")
        print(f"Result: {result}")
        
        # Now check your phone for the code
        print("\n📲 Check your phone for the verification code")
        print("Enter the code you received:")
        
        code = input("Code: ")
        
        # Verify the code
        verify_result = supabase.auth.verify_otp({
            "phone": phone,
            "token": code,
            "type": "sms"
        })
        
        print("✅ OTP verified successfully!")
        print(f"Session: {verify_result}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sms_otp())
```

**Run the test:**
```bash
cd backend
python3 test_sms_otp.py
```

**Expected Output:**
```
📱 Sending SMS OTP to: +14155550100
✅ SMS OTP sent successfully!
📲 Check your phone for the verification code
Enter the code you received:
Code: 123456
✅ OTP verified successfully!
```

#### **5.2 Test Email OTP**

**Create test file:** `backend/test_email_otp.py`

```python
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

async def test_email_otp():
    supabase: Client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_ANON_KEY')
    )
    
    # Replace with your email
    email = "your-email@example.com"
    
    print(f"📧 Sending Email OTP to: {email}")
    
    try:
        result = supabase.auth.sign_in_with_otp({
            "email": email
        })
        
        print("✅ Email OTP sent successfully!")
        print(f"Result: {result}")
        
        # Now check your email for the code
        print("\n📬 Check your email for the verification code")
        print("Enter the code you received:")
        
        code = input("Code: ")
        
        # Verify the code
        verify_result = supabase.auth.verify_otp({
            "email": email,
            "token": code,
            "type": "email"
        })
        
        print("✅ OTP verified successfully!")
        print(f"Session: {verify_result}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_email_otp())
```

**Run the test:**
```bash
cd backend
python3 test_email_otp.py
```

---

## 🎯 **SUCCESS CRITERIA**

By end of Day 3, you should have:

- [x] Phone Auth enabled in Supabase
- [x] Twilio configured and working
- [x] SMS OTP delivery tested
- [x] Email OTP delivery tested
- [x] Rate limits configured
- [x] CAPTCHA enabled (optional)

---

## 🐛 **TROUBLESHOOTING**

### **SMS Not Sending**

**Check:**
1. Twilio credentials are correct
2. Phone number is in E.164 format (+1234567890)
3. Twilio account has credit
4. Phone number is verified (for trial accounts)

**Twilio Trial Limitations:**
- Can only send to verified phone numbers
- Add your number in: Phone Numbers → Verified Caller IDs

### **Email Not Sending**

**Check:**
1. Email address is valid
2. Check spam folder
3. Supabase email settings are correct
4. Rate limits not exceeded

### **OTP Verification Failing**

**Check:**
1. Code entered within 60 seconds
2. Code is exactly 6 digits
3. No extra spaces
4. Using correct verification method (sms vs email)

---

## 📊 **DAY 3 CHECKLIST**

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Messaging Service created
- [ ] Twilio configured in Supabase
- [ ] SMS template customized
- [ ] Email template customized
- [ ] Rate limits set
- [ ] CAPTCHA configured
- [ ] SMS OTP tested successfully
- [ ] Email OTP tested successfully

---

## 🚀 **NEXT: DAY 4**

Tomorrow we'll:
- Create backend auth service
- Build verification endpoints
- Test the complete flow
- Prepare for frontend integration

---

**Ready to enable Phone Auth? Let me know when you're done and we'll test it together!** 📱✅

