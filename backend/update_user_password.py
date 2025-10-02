#!/usr/bin/env python3
"""Update user password in database."""

import os
import sys
import bcrypt
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def update_password(email: str, password: str):
    """Update user password."""
    
    # Hash the password
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    hashed_str = hashed.decode('utf-8')
    
    # Check if user exists
    result = supabase.table("users").select("*").eq("email", email).execute()
    
    if result.data:
        # Update existing user's password
        update_result = supabase.table("users").update({
            "password_hash": hashed_str
        }).eq("email", email).execute()
        
        if update_result.data:
            print(f"✅ Updated password for {email}")
            print(f"   User role: {result.data[0].get('role', 'unknown')}")
        else:
            print(f"❌ Failed to update password for {email}")
    else:
        print(f"❌ User {email} not found in database")
        print("Creating new user...")
        
        # Create new user
        insert_result = supabase.table("users").insert({
            "email": email,
            "password_hash": hashed_str,
            "role": "manager",  # Default role
            "first_name": "Goutham",
            "last_name": "Vemula"
        }).execute()
        
        if insert_result.data:
            print(f"✅ Created user {email} with role: manager")
        else:
            print(f"❌ Failed to create user")

if __name__ == "__main__":
    email = "gvemula@mail.yu.edu"
    password = "Gouthi321@"
    
    print(f"Updating password for {email}...")
    update_password(email, password)
    
    print("\nYou can now login with:")
    print(f"  Email: {email}")
    print(f"  Password: {password}")