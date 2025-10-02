#!/usr/bin/env python3
"""
Get property information for manager
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

# Login
login_response = requests.post(
    f"{API_BASE_URL}/api/auth/login",
    json={
        "email": "gvemula@mail.yu.edu",
        "password": "Gouthi321@"
    }
)

if login_response.status_code == 200:
    auth_data = login_response.json()
    token = auth_data.get("access_token")
    print("Login successful!")
    print(json.dumps(auth_data, indent=2))

    # Get manager's properties
    headers = {"Authorization": f"Bearer {token}"}

    # Try to get properties
    props_response = requests.get(
        f"{API_BASE_URL}/api/manager/properties",
        headers=headers
    )

    if props_response.status_code == 200:
        print("\n\nManager's Properties:")
        print(json.dumps(props_response.json(), indent=2))
    else:
        print(f"\nFailed to get properties: {props_response.status_code}")

        # Try HR endpoint
        props_response = requests.get(
            f"{API_BASE_URL}/api/hr/properties",
            headers=headers
        )

        if props_response.status_code == 200:
            print("\n\nAll Properties (HR view):")
            properties = props_response.json()
            if properties and isinstance(properties, list) and len(properties) > 0:
                # Just show first property
                print(f"Using first property: {properties[0].get('name')}")
                print(f"Property ID: {properties[0].get('id')}")
            else:
                print(json.dumps(properties, indent=2))
else:
    print(f"Login failed: {login_response.json()}")