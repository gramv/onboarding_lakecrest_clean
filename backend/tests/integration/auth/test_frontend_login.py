#!/usr/bin/env python3
"""Test that frontend can now login properly"""

import requests
import json

# Test through frontend proxy
print("Testing login through frontend proxy...")
response = requests.post(
    "http://localhost:3000/auth/login",
    json={
        "email": "manager@demo.com",
        "password": "Manager123!"
    }
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print("✅ Login successful through frontend proxy!")
    if 'data' in data and 'token' in data['data']:
        print(f"   Got token: {data['data']['token'][:50]}...")
        print(f"   User: {data['data']['user']['email']}")
        print(f"   Role: {data['data']['user']['role']}")
else:
    print(f"❌ Failed: {response.text}")

# Also test backend directly
print("\nTesting backend directly...")
response = requests.post(
    "http://localhost:8000/auth/login",
    json={
        "email": "manager@demo.com",
        "password": "Manager123!"
    }
)
print(f"Backend status: {response.status_code}")
