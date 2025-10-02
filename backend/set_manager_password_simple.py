import os
import bcrypt
from supabase import create_client, Client

# Set environment variables
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDg4NjUsImV4cCI6MjA2NjEyNDg2NX0.jbdVV5HzDKqF2Tz1rLo6Y6rjjMwHW9IHYOJvQMd3lds"

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Find the manager
result = supabase.table('users').select("*").eq('email', 'manager@demo.com').execute()

if result.data and len(result.data) > 0:
    manager = result.data[0]
    print(f"Found manager: {manager.get('email')}")
    print(f"  ID: {manager.get('id')}")
    print(f"  Name: {manager.get('first_name')} {manager.get('last_name')}")
    
    # Hash the password
    password = "SecurePass123!"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update the password
    update_result = supabase.table('users').update({
        'password_hash': password_hash
    }).eq('id', manager['id']).execute()
    
    print(f"✅ Password updated for manager@demo.com")
    print(f"   Password: {password}")
    
    # Verify the password works
    test_hash = update_result.data[0]['password_hash']
    is_valid = bcrypt.checkpw(password.encode('utf-8'), test_hash.encode('utf-8'))
    print(f"   Verification: {'✅ Password valid' if is_valid else '❌ Password invalid'}")
else:
    print("❌ Manager not found with email manager@demo.com")
    
    # Let's create the manager
    print("\n🔧 Creating manager account...")
    
    # First check if Demo Hotel property exists
    prop_result = supabase.table('properties').select("*").eq('name', 'Demo Hotel').execute()
    
    if prop_result.data and len(prop_result.data) > 0:
        property_id = prop_result.data[0]['id']
        print(f"Found property: Demo Hotel (ID: {property_id})")
        
        # Hash the password
        password = "SecurePass123!"
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create the manager
        new_manager = supabase.table('users').insert({
            'email': 'manager@demo.com',
            'first_name': 'Demo',
            'last_name': 'Manager',
            'role': 'manager',
            'password_hash': password_hash,
            'is_active': True
        }).execute()
        
        if new_manager.data:
            manager_id = new_manager.data[0]['id']
            print(f"✅ Manager created with ID: {manager_id}")
            
            # Assign to property
            assign_result = supabase.table('property_managers').insert({
                'property_id': property_id,
                'manager_id': manager_id
            }).execute()
            
            print(f"✅ Manager assigned to Demo Hotel")
            print(f"   Email: manager@demo.com")
            print(f"   Password: {password}")
        else:
            print("❌ Failed to create manager")
    else:
        print("❌ Demo Hotel property not found")