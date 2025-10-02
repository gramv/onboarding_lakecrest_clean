#!/usr/bin/env python3
"""
Debug login process step by step
"""

import asyncio
import sys
from pathlib import Path
import bcrypt
import json

# Add the backend app to path
sys.path.insert(0, str(Path(__file__).parent / "hotel-onboarding-backend"))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / "hotel-onboarding-backend" / ".env"
load_dotenv(env_path)

from app.supabase_service_enhanced import EnhancedSupabaseService
# JWT token will be created manually

async def debug_login():
    """Debug the login process"""
    service = EnhancedSupabaseService()
    
    print("🔍 Debugging Login Process")
    print("=" * 60)
    
    email = "hr@demo.com"
    password = "Demo123!"
    
    print(f"Testing login for: {email}")
    print("-" * 40)
    
    # Step 1: Get user from database
    print("\n1. Fetching user from database...")
    try:
        result = service.admin_client.table('users').select("*").eq('email', email).execute()
        if result.data:
            user = result.data[0]
            print(f"✅ User found:")
            print(f"   - ID: {user['id']}")
            print(f"   - Email: {user['email']}")
            print(f"   - Role: {user['role']}")
            print(f"   - Active: {user.get('is_active', False)}")
            print(f"   - Property ID: {user.get('property_id', 'None')}")
            print(f"   - Password Hash Length: {len(user.get('password_hash', ''))}")
        else:
            print(f"❌ User not found")
            return
    except Exception as e:
        print(f"❌ Error fetching user: {e}")
        return
    
    # Step 2: Verify password
    print("\n2. Verifying password...")
    password_hash = user.get('password_hash', '')
    
    try:
        # Test bcrypt verification directly
        is_valid = bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        if is_valid:
            print(f"✅ Password verification: PASSED")
        else:
            print(f"❌ Password verification: FAILED")
            return
    except Exception as e:
        print(f"❌ Password verification error: {e}")
        return
    
    # Step 3: Get property name if manager
    print("\n3. Getting additional data...")
    property_name = None
    if user['role'] == 'manager' and user.get('property_id'):
        try:
            prop_result = service.admin_client.table('properties').select("*").eq('id', user['property_id']).execute()
            if prop_result.data:
                property_name = prop_result.data[0]['name']
                print(f"✅ Property found: {property_name}")
        except Exception as e:
            print(f"⚠️  Could not fetch property: {e}")
    
    # Step 4: Create JWT token
    print("\n4. Creating JWT token...")
    try:
        token_data = {
            "sub": str(user['id']),
            "email": user['email'],
            "role": user['role'],
        }
        
        if user.get('property_id'):
            token_data['property_id'] = str(user['property_id'])
        
        # Create token (expires in 24 hours)
        from datetime import datetime, timedelta, timezone
        import jwt
        import os
        
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
        JWT_ALGORITHM = "HS256"
        
        token_data['exp'] = datetime.now(timezone.utc) + timedelta(hours=24)
        token_data['iat'] = datetime.now(timezone.utc)
        
        access_token = jwt.encode(token_data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        print(f"✅ JWT token created successfully")
        print(f"   Token length: {len(access_token)}")
        
    except Exception as e:
        print(f"❌ Error creating token: {e}")
        return
    
    # Step 5: Build response
    print("\n5. Building login response...")
    try:
        login_response = {
            "success": True,
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": str(user['id']),
                    "email": user['email'],
                    "first_name": user.get('first_name', ''),
                    "last_name": user.get('last_name', ''),
                    "role": user['role'],
                    "is_active": user.get('is_active', True)
                }
            },
            "message": "Login successful"
        }
        
        if property_name:
            login_response['data']['user']['property_name'] = property_name
        
        print(f"✅ Response built successfully")
        print("\nResponse structure:")
        print(json.dumps(login_response, indent=2, default=str)[:500] + "...")
        
    except Exception as e:
        print(f"❌ Error building response: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n" + "=" * 60)
    print("✅ Login debug complete!")
    print("\nThe login process should work. If it's still failing, check:")
    print("  1. The JWT_SECRET_KEY environment variable")
    print("  2. The response serialization in the endpoint")
    print("  3. Any middleware that might be modifying the response")


if __name__ == "__main__":
    asyncio.run(debug_login())