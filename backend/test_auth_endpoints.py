#!/usr/bin/env python3
"""
Test script to verify both old and new auth endpoints are accessible
Part of the Strangler Fig Pattern migration
"""

import asyncio
from fastapi.testclient import TestClient
from app.main_enhanced import app

def test_auth_endpoints():
    """Test that both old and new auth endpoints are accessible"""
    client = TestClient(app)
    
    print("\n" + "="*60)
    print("TESTING AUTH ENDPOINTS - STRANGLER FIG PATTERN")
    print("="*60)
    
    # List of endpoints to test (old and new versions)
    endpoints = [
        # Old endpoints (original)
        ("/api/auth/login", "POST", "Original"),
        ("/api/auth/refresh", "POST", "Original"),
        ("/api/auth/logout", "POST", "Original"),
        ("/api/auth/request-password-reset", "POST", "Original"),
        ("/api/auth/verify-reset-token", "GET", "Original"),
        ("/api/auth/reset-password", "POST", "Original"),
        ("/api/auth/change-password", "POST", "Original"),
        ("/api/auth/me", "GET", "Original"),
        
        # New endpoints (v2 - refactored)
        ("/v2/api/auth/login", "POST", "V2 Refactored"),
        ("/v2/api/auth/refresh", "POST", "V2 Refactored"),
        ("/v2/api/auth/logout", "POST", "V2 Refactored"),
        ("/v2/api/auth/request-password-reset", "POST", "V2 Refactored"),
        ("/v2/api/auth/verify-reset-token", "GET", "V2 Refactored"),
        ("/v2/api/auth/reset-password", "POST", "V2 Refactored"),
        ("/v2/api/auth/change-password", "POST", "V2 Refactored"),
        ("/v2/api/auth/me", "GET", "V2 Refactored"),
    ]
    
    results = []
    
    for endpoint, method, version in endpoints:
        try:
            if method == "GET":
                # For GET endpoints, we expect 400 or 401 without params
                response = client.get(endpoint)
            else:
                # For POST endpoints, send empty body to test accessibility
                response = client.post(endpoint, json={})
            
            # We expect error responses (400, 401, etc.) but the endpoint should be reachable
            # A 404 would mean the endpoint doesn't exist
            if response.status_code == 404:
                status = "❌ NOT FOUND"
            else:
                status = f"✅ ACCESSIBLE (status: {response.status_code})"
            
            results.append((endpoint, version, status))
            
        except Exception as e:
            results.append((endpoint, version, f"❌ ERROR: {str(e)[:50]}"))
    
    # Print results
    print("\nEndpoint Accessibility Test Results:")
    print("-" * 60)
    
    # Group by version
    print("\nORIGINAL ENDPOINTS:")
    for endpoint, version, status in results:
        if version == "Original":
            print(f"  {endpoint:<40} {status}")
    
    print("\nV2 REFACTORED ENDPOINTS:")
    for endpoint, version, status in results:
        if version == "V2 Refactored":
            print(f"  {endpoint:<40} {status}")
    
    # Summary
    original_ok = sum(1 for _, v, s in results if v == "Original" and "✅" in s)
    v2_ok = sum(1 for _, v, s in results if v == "V2 Refactored" and "✅" in s)
    
    print("\n" + "="*60)
    print("SUMMARY:")
    print(f"  Original endpoints accessible: {original_ok}/8")
    print(f"  V2 endpoints accessible: {v2_ok}/8")
    
    if original_ok == 8 and v2_ok == 8:
        print("\n✅ SUCCESS: Both old and new endpoints are accessible!")
        print("   Safe to proceed with gradual migration.")
    elif original_ok == 8 and v2_ok == 0:
        print("\n⚠️  WARNING: V2 endpoints not accessible yet.")
        print("   Check router configuration.")
    else:
        print("\n⚠️  WARNING: Some endpoints are not accessible.")
        print("   Review the configuration before proceeding.")
    
    print("="*60 + "\n")
    
    return original_ok == 8  # Return True if all original endpoints work

if __name__ == "__main__":
    test_auth_endpoints()