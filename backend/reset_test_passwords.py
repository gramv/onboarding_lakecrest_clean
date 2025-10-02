#!/usr/bin/env python3
"""Reset passwords for test accounts"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import bcrypt

load_dotenv('.env.test')

# Create Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY") 
supabase: Client = create_client(url, key)

# New password
new_password = "Demo1234!"
password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Update manager password
manager_update = supabase.table('users').update({
    'password_hash': password_hash
}).eq('email', 'manager@demo.com').execute()

if manager_update.data:
    print(f"✅ Manager password updated to: {new_password}")
else:
    print("❌ Failed to update manager password")

# Update HR password  
hr_update = supabase.table('users').update({
    'password_hash': password_hash
}).eq('email', 'hr@demo.com').execute()

if hr_update.data:
    print(f"✅ HR password updated to: {new_password}")
else:
    print("❌ Failed to update HR password")

print("\nTest accounts ready:")
print(f"  Manager: manager@demo.com / {new_password}")
print(f"  HR: hr@demo.com / {new_password}")