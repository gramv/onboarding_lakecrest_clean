#!/usr/bin/env python3
"""
Create HR test account
"""

import os
import sys
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import bcrypt

# Load environment variables
load_dotenv()

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_hr_account():
    """Create HR test account"""
    print("Creating HR test account...")
    
    try:
        # Check if HR account exists
        hr_users = supabase.table("users").select("*").eq("email", "hr@demo.com").execute()
        
        if not hr_users.data:
            print("Creating HR account...")
            hr_data = {
                "email": "hr@demo.com",
                "password_hash": hash_password("password123"),
                "role": "hr",
                "first_name": "Sarah",
                "last_name": "HR",
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
            hr_result = supabase.table("users").insert(hr_data).execute()
            hr_id = hr_result.data[0]["id"]
            print(f"✅ HR account created (ID: {hr_id})")
            print(f"   Email: hr@demo.com")
            print(f"   Password: password123")
            print(f"   Role: hr")
        else:
            hr_id = hr_users.data[0]["id"]
            print(f"✅ HR account already exists (ID: {hr_id})")
            print(f"   Email: hr@demo.com")
            print(f"   Role: hr")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    create_hr_account()