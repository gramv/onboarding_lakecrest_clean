#!/usr/bin/env python3
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Email to check
email = "gvemula@mail.yu.edu"

print(f"Checking property assignment for {email}...")

# 1. Check if user exists
user_response = supabase.table('users').select('*').eq('email', email).execute()
if user_response.data:
    user = user_response.data[0]
    print(f"\n✓ User found: {user}")
else:
    print(f"\n✗ User not found with email {email}")
    exit(1)

# 2. Check if any properties exist
properties_response = supabase.table('properties').select('*').execute()
if properties_response.data:
    properties = properties_response.data
    print(f"\n✓ Found {len(properties)} properties:")
    for prop in properties:
        print(f"  - {prop['id']}: {prop.get('name', 'Unnamed')}")

    # Use the first property
    property_id = properties[0]['id']
    property_name = properties[0].get('name', 'Default Property')
else:
    print("\n✗ No properties found. Creating a default property...")
    # Create a default property
    new_property = {
        'id': 'prop_001',
        'name': 'Default Hotel Property',
        'address': '123 Main St',
        'city': 'New York',
        'state': 'NY',
        'zip': '10001'
    }
    prop_response = supabase.table('properties').insert(new_property).execute()
    property_id = 'prop_001'
    property_name = 'Default Hotel Property'
    print(f"✓ Created property: {property_name}")

# 3. Check property_managers table for existing assignment
manager_response = supabase.table('property_managers').select('*').eq('user_id', user['id']).execute()
if manager_response.data:
    print(f"\n✓ User already assigned to properties:")
    for assignment in manager_response.data:
        print(f"  - Property ID: {assignment['property_id']}")
else:
    print(f"\n✗ User not assigned to any property. Creating assignment...")
    # Create property assignment
    assignment = {
        'user_id': user['id'],
        'property_id': property_id
    }
    assign_response = supabase.table('property_managers').insert(assignment).execute()
    if assign_response.data:
        print(f"✓ Successfully assigned user to property: {property_name}")
    else:
        print(f"✗ Failed to assign user to property")

# 4. Update user role to ensure they have proper access
if user.get('role') != 'manager':
    print(f"\nUpdating user role to 'manager'...")
    update_response = supabase.table('users').update({'role': 'manager'}).eq('id', user['id']).execute()
    if update_response.data:
        print(f"✓ User role updated to 'manager'")
    else:
        print(f"✗ Failed to update user role")

print("\n✅ Property assignment check complete!")
print(f"User {email} should now be able to access the dashboard.")
print("\nPlease refresh your browser to see the changes.")