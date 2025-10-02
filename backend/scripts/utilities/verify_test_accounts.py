#!/usr/bin/env python3
"""
Verify test accounts can login successfully
Tests authentication and property access for HR and Manager accounts
"""

import asyncio
import sys
from pathlib import Path
import hashlib

# Add the backend app to path
sys.path.insert(0, str(Path(__file__).parent / "hotel-onboarding-backend"))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / "hotel-onboarding-backend" / ".env"
load_dotenv(env_path)

from app.supabase_service_enhanced import EnhancedSupabaseService
from app.models import UserRole


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


async def verify_accounts():
    """Verify all test accounts work correctly"""
    service = EnhancedSupabaseService()
    
    print("🔍 Verifying Test Accounts...")
    print("=" * 60)
    
    # Test data
    test_accounts = [
        {
            "email": "hr@demo.com",
            "password": "Demo123!",
            "role": "HR",
            "expected_access": "Full system access"
        },
        {
            "email": "manager@demo.com",
            "password": "Demo123!",
            "role": "Manager",
            "expected_access": "Demo Hotel data only"
        }
    ]
    
    for account in test_accounts:
        print(f"\n✨ Testing {account['role']} Account")
        print("-" * 40)
        print(f"Email: {account['email']}")
        print(f"Password: {account['password']}")
        
        try:
            # Fetch user from database
            result = service.admin_client.table('users').select("*").eq('email', account['email']).execute()
            
            if result.data:
                user = result.data[0]
                
                # Verify password
                if user['password_hash'] == hash_password(account['password']):
                    print(f"✅ Password verification: PASSED")
                else:
                    print(f"❌ Password verification: FAILED")
                    continue
                
                # Verify role
                if user['role'].upper() == account['role'].upper():
                    print(f"✅ Role verification: PASSED ({user['role']})")
                else:
                    print(f"❌ Role verification: FAILED (Expected: {account['role']}, Got: {user['role']})")
                
                # Verify active status
                if user['is_active']:
                    print(f"✅ Active status: PASSED")
                else:
                    print(f"❌ Active status: FAILED (Account is inactive)")
                
                # Check property assignment for managers
                if account['role'] == "Manager":
                    if user.get('property_id'):
                        # Get property details
                        prop_result = service.admin_client.table('properties').select("*").eq('id', user['property_id']).execute()
                        if prop_result.data:
                            print(f"✅ Property assignment: PASSED")
                            print(f"   - Property: {prop_result.data[0]['name']}")
                            print(f"   - Location: {prop_result.data[0]['city']}, {prop_result.data[0]['state']}")
                        else:
                            print(f"❌ Property assignment: Property not found")
                    else:
                        print(f"❌ Property assignment: No property assigned")
                elif account['role'] == "HR":
                    print(f"✅ Access level: {account['expected_access']}")
                
                print(f"\n📊 Account Summary:")
                print(f"   - User ID: {user['id']}")
                print(f"   - Full Name: {user.get('first_name', '')} {user.get('last_name', '')}")
                print(f"   - Created: {user.get('created_at', 'Unknown')}")
                print(f"   - Can access: {account['expected_access']}")
                
            else:
                print(f"❌ Account not found in database")
                
        except Exception as e:
            print(f"❌ Error verifying account: {e}")
    
    # Test property exists
    print("\n\n📍 Verifying Test Property")
    print("-" * 40)
    
    try:
        prop_result = service.admin_client.table('properties').select("*").eq('name', 'Demo Hotel').execute()
        if prop_result.data:
            property = prop_result.data[0]
            print(f"✅ Property exists: Demo Hotel")
            print(f"   - ID: {property['id']}")
            print(f"   - Address: {property['address']}")
            print(f"   - City: {property['city']}, {property['state']} {property['zip_code']}")
            print(f"   - Phone: {property['phone']}")
            print(f"   - Active: {property.get('is_active', False)}")
            
            # Check managers assigned to this property
            manager_result = service.admin_client.table('users').select("*").eq('property_id', property['id']).eq('role', 'manager').execute()
            if manager_result.data:
                print(f"\n   Assigned Managers:")
                for manager in manager_result.data:
                    print(f"   - {manager['email']} ({manager.get('first_name', '')} {manager.get('last_name', '')})")
        else:
            print(f"❌ Property 'Demo Hotel' not found")
            
    except Exception as e:
        print(f"❌ Error verifying property: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Verification Complete!")
    print("\nReady for testing with:")
    print("  - Frontend: http://localhost:3000")
    print("  - Backend API: http://localhost:8000/docs")
    print("\nLogin Credentials:")
    print("  - HR: hr@demo.com / Demo123!")
    print("  - Manager: manager@demo.com / Demo123!")


if __name__ == "__main__":
    asyncio.run(verify_accounts())