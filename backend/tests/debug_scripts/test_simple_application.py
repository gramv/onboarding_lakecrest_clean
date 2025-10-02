#!/usr/bin/env python3
"""Debug job application submission validation."""

import json
import requests

BASE_URL = "http://localhost:8000"

# Minimal application data
application_data = {
    "first_name": "Goutam",
    "last_name": "Vemula",
    "email": "goutamramv@gmail.com",
    "phone": "555-0123",
    "address": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94105",
    "department": "Engineering",
    "position": "Software Engineer",
    "work_authorized": "yes",
    "sponsorship_required": "no",
    "age_verification": True,
    "conviction_record": {
        "has_conviction": False
    },
    "previous_hotel_employment": False,
    "how_heard": "website",
    "personal_reference": {
        "name": "John Smith",
        "years_known": "5",
        "phone": "555-9999",
        "relationship": "Professional colleague"
    },
    "military_service": {},
    "education_history": [],
    "employment_history": [],
    "experience_years": "2-5",
    "hotel_experience": "no"
}

response = requests.post(
    f"{BASE_URL}/apply/test-prop-001",
    json=application_data
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 422:
    # Try to get more detail
    print("\nValidation errors might be in:")
    error_response = response.json()
    if 'detail' in error_response:
        print(f"Detail: {error_response['detail']}")
    if 'errors' in error_response:
        print(f"Errors: {error_response['errors']}")