#!/usr/bin/env python3
"""Reset manager password for testing"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import bcrypt

# Load environment variables
load_dotenv(".env.test")

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

try:
    # Update password for manager@demo.com
    email = "manager@demo.com"
    new_password = "password123"
    
    print(f"Resetting password for {email}...")
    
    # Generate new password hash
    password_hash = hash_password(new_password)
    
    # Update the user
    result = supabase.table("users").update({
        "password_hash": password_hash
    }).eq("email", email).execute()
    
    if result.data:
        print(f"✅ Password reset successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {new_password}")
    else:
        print(f"❌ Failed to reset password - user not found")
        
except Exception as e:
    print(f"❌ Error: {e}")