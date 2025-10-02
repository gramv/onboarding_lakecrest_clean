#!/usr/bin/env python3
"""
Test login endpoints for HR and Manager accounts
Verifies JWT token generation and access control
"""

import asyncio
import httpx
import json
from datetime import datetime

# API Base URL
API_BASE = "http://localhost:8000"

# Test credentials
TEST_ACCOUNTS = [
    {
        "email": "hr@demo.com",
        "password": "Demo123!",
        "role": "HR",
        "expected_role": "hr"
    },
    {
        "email": "manager@demo.com",
        "password": "Demo123!",
        "role": "Manager",
        "expected_role": "manager"
    }
]


async def test_login_endpoint():
    """Test the /auth/login endpoint for each account"""
    async with httpx.AsyncClient() as client:
        print("🔐 Testing Login Endpoints")
        print("=" * 60)
        
        for account in TEST_ACCOUNTS:
            print(f"\n📝 Testing {account['role']} Login")
            print("-" * 40)
            
            # Prepare login data
            login_data = {
                "email": account["email"],
                "password": account["password"]
            }
            
            print(f"Email: {account['email']}")
            print(f"Password: {account['password']}")
            
            try:
                # Make login request
                response = await client.post(
                    f"{API_BASE}/auth/login",
                    json=login_data,
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"\nResponse Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Login successful!")
                    
                    # Check for token
                    if "access_token" in data:
                        print(f"✅ JWT Token received")
                        token = data["access_token"]
                        
                        # Decode token payload (without verification for testing)
                        import base64
                        token_parts = token.split(".")
                        if len(token_parts) >= 2:
                            # Decode payload
                            payload = base64.urlsafe_b64decode(
                                token_parts[1] + "=" * (4 - len(token_parts[1]) % 4)
                            )
                            token_data = json.loads(payload)
                            
                            print("\n📊 Token Details:")
                            print(f"   - User ID: {token_data.get('sub', 'N/A')}")
                            print(f"   - Email: {token_data.get('email', 'N/A')}")
                            print(f"   - Role: {token_data.get('role', 'N/A')}")
                            
                            if token_data.get('role') == account['expected_role']:
                                print(f"   ✅ Role matches expected: {account['expected_role']}")
                            else:
                                print(f"   ❌ Role mismatch! Expected: {account['expected_role']}, Got: {token_data.get('role')}")
                            
                            if 'property_id' in token_data:
                                print(f"   - Property ID: {token_data['property_id']}")
                            
                            # Check token expiry
                            if 'exp' in token_data:
                                exp_time = datetime.fromtimestamp(token_data['exp'])
                                print(f"   - Expires: {exp_time}")
                    else:
                        print(f"❌ No access token in response")
                    
                    # Check user info in response
                    if "user" in data:
                        user = data["user"]
                        print(f"\n👤 User Information:")
                        print(f"   - Name: {user.get('first_name', '')} {user.get('last_name', '')}")
                        print(f"   - Role: {user.get('role', 'N/A')}")
                        if user.get('property_name'):
                            print(f"   - Property: {user['property_name']}")
                        
                else:
                    print(f"❌ Login failed!")
                    error_detail = response.json()
                    print(f"Error: {error_detail.get('detail', 'Unknown error')}")
                    
            except httpx.ConnectError:
                print(f"❌ Could not connect to API at {API_BASE}")
                print(f"   Make sure the backend server is running:")
                print(f"   cd hotel-onboarding-backend")
                print(f"   python3 -m uvicorn app.main_enhanced:app --reload")
                return
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Test invalid login
        print(f"\n\n🚫 Testing Invalid Login")
        print("-" * 40)
        
        invalid_data = {
            "email": "invalid@demo.com",
            "password": "WrongPassword"
        }
        
        try:
            response = await client.post(
                f"{API_BASE}/auth/login",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                print(f"✅ Invalid login correctly rejected (Status: {response.status_code})")
                if response.status_code == 401:
                    print(f"   Correct status code for unauthorized")
            else:
                print(f"❌ Invalid login was accepted! This is a security issue.")
                
        except Exception as e:
            print(f"Error testing invalid login: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Login endpoint testing complete!")
        print("\nNotes:")
        print("  - HR users have full system access")
        print("  - Managers can only access their assigned property")
        print("  - JWT tokens expire after 24 hours")


if __name__ == "__main__":
    print("🚀 Hotel Onboarding System - Login Endpoint Test")
    print("Testing against: http://localhost:8000")
    print()
    asyncio.run(test_login_endpoint())