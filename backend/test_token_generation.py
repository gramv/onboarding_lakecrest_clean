#!/usr/bin/env python3
"""Test token generation for onboarding"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.auth import OnboardingTokenManager

# Test creating a token
token_data = OnboardingTokenManager.create_onboarding_token(
    employee_id="test-employee-123",
    expires_hours=72
)

print("Token Generation Test:")
print("=" * 60)
print(f"Token: {token_data['token']}")
print(f"Token length: {len(token_data['token'])}")
print(f"Token type: {type(token_data['token'])}")
print(f"Expires at: {token_data['expires_at']}")
print(f"Token ID: {token_data['token_id']}")
print("=" * 60)

# Test what the URL would look like
base_url = "http://localhost:3000"
onboarding_url = f"{base_url}/onboard?token={token_data['token']}"
print(f"\nFull URL: {onboarding_url}")
print(f"URL length: {len(onboarding_url)}")