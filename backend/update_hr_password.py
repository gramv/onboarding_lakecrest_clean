#!/usr/bin/env python3
"""
Update HR account password
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
import bcrypt

# Load environment variables
load_dotenv(".env.test")

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def update_hr_password():
    """Update HR account password"""
    print("Updating HR account password...")
    
    try:
        # Update HR password
        hr_data = {
            "password_hash": hash_password("password123")
        }
        result = supabase.table("users").update(hr_data).eq("email", "hr@demo.com").execute()
        
        if result.data:
            print(f"✅ HR password updated successfully")
            print(f"   Email: hr@demo.com")
            print(f"   New Password: password123")
        else:
            print(f"❌ No HR account found with email hr@demo.com")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    update_hr_password()