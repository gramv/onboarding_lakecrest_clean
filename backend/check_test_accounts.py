#!/usr/bin/env python3
"""Check if test accounts exist"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.test')

# Create Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY") 
supabase: Client = create_client(url, key)

# Check for manager account
manager_response = supabase.table('users').select('*').eq('email', 'manager@demo.com').execute()
if manager_response.data:
    manager = manager_response.data[0]
    print(f"Manager found: {manager['email']}, role: {manager['role']}, active: {manager.get('is_active', True)}")
else:
    print("Manager account not found")

# Check for HR account  
hr_response = supabase.table('users').select('*').eq('email', 'hr@demo.com').execute()
if hr_response.data:
    hr = hr_response.data[0]
    print(f"HR found: {hr['email']}, role: {hr['role']}, active: {hr.get('is_active', True)}")
else:
    print("HR account not found")

# Show all existing users and their roles
print("\nAll users in database:")
all_users = supabase.table('users').select('email, role, is_active').execute()
for user in all_users.data:
    print(f"  - {user['email']}: role={user['role']}, active={user.get('is_active', True)}")