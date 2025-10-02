#!/usr/bin/env python3
"""
Fix test accounts with proper bcrypt password hashing
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add the backend app to path
sys.path.insert(0, str(Path(__file__).parent / "hotel-onboarding-backend"))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / "hotel-onboarding-backend" / ".env"
load_dotenv(env_path)

# Import bcrypt directly
import bcrypt

from app.supabase_service_enhanced import EnhancedSupabaseService

# Test credentials
TEST_ACCOUNTS = [
    {
        "email": "hr@demo.com",
        "password": "Demo123!",
        "first_name": "System",
        "last_name": "Admin",
        "role": "hr",
        "property_id": None
    },
    {
        "email": "manager@demo.com",
        "password": "Demo123!",
        "first_name": "Test",
        "last_name": "Manager",
        "role": "manager",
        "property_id": "903ed05b-5990-4ecf-b1b2-7592cf2923df"  # Demo Hotel
    }
]


def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt directly"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt directly"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


async def fix_accounts():
    """Fix test accounts with proper bcrypt hashing"""
    service = EnhancedSupabaseService()
    
    print("🔧 Fixing test accounts with proper bcrypt hashing...")
    print("=" * 60)
    
    for account in TEST_ACCOUNTS:
        print(f"\n📝 Fixing account: {account['email']}")
        print("-" * 40)
        
        # Generate new bcrypt hash
        new_hash = hash_password_bcrypt(account['password'])
        print(f"Generated new bcrypt hash")
        
        # Verify the hash works
        if verify_password_bcrypt(account['password'], new_hash):
            print(f"✅ Hash verification successful")
        else:
            print(f"❌ Hash verification failed - something is wrong")
            continue
        
        # Update the user in database
        try:
            update_data = {
                "password_hash": new_hash,
                "first_name": account['first_name'],
                "last_name": account['last_name'],
                "role": account['role'],
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if account['property_id']:
                update_data['property_id'] = account['property_id']
            
            result = service.admin_client.table('users').update(update_data).eq('email', account['email']).execute()
            
            if result.data:
                print(f"✅ Account updated successfully")
                print(f"   - Email: {account['email']}")
                print(f"   - Password: {account['password']}")
                print(f"   - Role: {account['role']}")
                if account['property_id']:
                    print(f"   - Property ID: {account['property_id']}")
            else:
                print(f"❌ Failed to update account")
                
        except Exception as e:
            print(f"❌ Error updating account: {e}")
    
    # Verify the fixes
    print("\n\n🔍 Verifying fixed accounts...")
    print("-" * 40)
    
    for account in TEST_ACCOUNTS:
        try:
            result = service.admin_client.table('users').select("*").eq('email', account['email']).execute()
            if result.data:
                user = result.data[0]
                stored_hash = user['password_hash']
                
                # Test verification
                if verify_password_bcrypt(account['password'], stored_hash):
                    print(f"✅ {account['email']}: Password verification PASSED")
                else:
                    print(f"❌ {account['email']}: Password verification FAILED")
            else:
                print(f"❌ {account['email']}: Account not found")
                
        except Exception as e:
            print(f"❌ Error verifying {account['email']}: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Account fixing complete!")
    print("\n📝 Test Accounts:")
    print("  HR: hr@demo.com / Demo123!")
    print("  Manager: manager@demo.com / Demo123!")
    print("\n✨ You can now test login at:")
    print("  POST http://localhost:8000/auth/login")
    print("  Frontend: http://localhost:3000/login")


if __name__ == "__main__":
    asyncio.run(fix_accounts())