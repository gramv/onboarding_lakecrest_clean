#!/usr/bin/env python3
"""
Create 10 test job applications for a property
Manager login: gvemula@mail.yu.edu / Gouthi321@
"""

import asyncio
import httpx
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "gvemula@mail.yu.edu"
MANAGER_PASSWORD = "Gouthi321@"

# Test applicants - will rotate through these emails
TEST_EMAILS = [
    "vgoutamram@gmail.com",
    "gthmvemula@gmail.com",
    "goutamramv@gmail.com"
]

# Sample data for variety - Extended for more applications
FIRST_NAMES = ["Alex", "Sophia", "Daniel", "Emma", "Ryan", "Olivia", "Nathan", "Isabella",
                "Kevin", "Mia", "Christopher", "Ava", "William", "Charlotte", "Benjamin",
                "Amelia", "Lucas", "Harper", "Mason", "Evelyn", "Ethan", "Abigail",
                "Jacob", "Emily", "Michael", "Elizabeth", "Joshua", "Sofia", "Matthew", "Victoria"]
LAST_NAMES = ["Anderson", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
              "Moore", "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker",
              "Adams", "Nelson", "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell",
              "Parker", "Evans", "Edwards", "Collins", "Stewart", "Morris"]
POSITIONS = ["Front Desk", "Housekeeping", "Maintenance", "Concierge", "Restaurant Server", "Cook", "Security", "Bellhop"]
DEPARTMENTS = ["Front Office", "Housekeeping", "Maintenance", "Food & Beverage", "Security", "Guest Services"]
CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego"]
STATES = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA"]

async def get_manager_property():
    """Login as manager and get their property ID"""
    async with httpx.AsyncClient() as client:
        # Login as manager
        print(f"Logging in as manager: {MANAGER_EMAIL}")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD}
        )

        if login_response.status_code != 200:
            print(f"❌ Failed to login as manager: {login_response.text}")
            return None, None

        login_data = login_response.json()
        print(f"Login response: {json.dumps(login_data, indent=2)}")

        # Try different token field names
        token = login_data.get("access_token") or login_data.get("token")

        # If login_data has a "data" field, check there too
        if not token and "data" in login_data:
            token = login_data["data"].get("access_token") or login_data["data"].get("token")

        if not token:
            print("❌ No access token received")
            return None, None

        # Get manager's property
        headers = {"Authorization": f"Bearer {token}"}
        property_response = await client.get(
            f"{BASE_URL}/api/manager/property",
            headers=headers
        )

        if property_response.status_code != 200:
            print(f"❌ Failed to get manager's property: {property_response.text}")
            return None, None

        property_data = property_response.json()

        # Handle different response structures
        if isinstance(property_data, dict):
            if "data" in property_data:
                property_info = property_data["data"]
            else:
                property_info = property_data
        else:
            property_info = property_data

        property_id = property_info.get("id")
        property_name = property_info.get("name", "Unknown Property")

        print(f"✅ Found property: {property_name} (ID: {property_id})")
        return property_id, property_name

async def create_application(property_id, index, offset=0):
    """Create a single job application"""
    async with httpx.AsyncClient() as client:
        # Rotate through the test emails with more variation
        email = TEST_EMAILS[index % len(TEST_EMAILS)]

        # Generate unique name combinations using offset
        name_index = (index + offset) % (len(FIRST_NAMES) * len(LAST_NAMES))
        first_name_index = name_index % len(FIRST_NAMES)
        last_name_index = (name_index // len(FIRST_NAMES)) % len(LAST_NAMES)

        first_name = FIRST_NAMES[first_name_index]
        last_name = LAST_NAMES[last_name_index]
        city_index = index % len(CITIES)

        # Create application data with all required fields
        application_data = {
            # Personal Information
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": f"555-{random.randint(1000, 9999)}",
            "address": f"{random.randint(100, 999)} {random.choice(['Main', 'Oak', 'Elm', 'Park', 'First'])} St",
            "city": CITIES[city_index],
            "state": STATES[city_index],
            "zip_code": f"{random.randint(10000, 99999)}",

            # Position Information
            "position": random.choice(POSITIONS),
            "department": random.choice(DEPARTMENTS),
            "start_date": (datetime.now() + timedelta(days=random.randint(7, 30))).strftime("%Y-%m-%d"),
            "desired_pay": str(random.randint(15, 35)),
            "employment_type": random.choice(["full_time", "part_time"]),

            # Required fields for validation (strings not booleans)
            "work_authorized": "yes",
            "sponsorship_required": "no",
            "age_verification": True,
            "conviction_record": {
                "has_conviction": False,
                "explanation": ""
            },
            "previous_hotel_employment": random.choice([True, False]),
            "how_heard": random.choice(["online", "friend", "job_board", "walk_in", "other"]),
            "how_did_you_hear": random.choice(["Online", "Friend", "Job Board", "Company Website", "Walk-in"]),

            # Experience
            "experience_years": str(random.randint(0, 10)),
            "hotel_experience": random.choice(["yes", "no"]),

            # References
            "personal_reference": {
                "name": f"{random.choice(['Tom', 'Alice', 'Bob', 'Carol'])} {random.choice(['Smith', 'Jones', 'Brown'])}",
                "phone": f"555-{random.randint(1000, 9999)}",
                "relationship": random.choice(["Friend", "Former Colleague", "Neighbor"]),
                "years_known": str(random.randint(1, 10))
            },

            # Military Service
            "military_service": {
                "has_served": False,
                "branch": "",
                "discharge_type": ""
            },

            # Education History
            "education_history": [
                {
                    "school_name": random.choice(["High School", "Community College", "State University"]),
                    "degree": random.choice(["High School Diploma", "Associate's", "Bachelor's", "N/A"]),
                    "graduation_year": str(random.randint(2010, 2023)),
                    "location": CITIES[city_index] + ", " + STATES[city_index],
                    "years_attended": str(random.randint(1, 4)),
                    "graduated": True
                }
            ],

            # Employment History with all required fields and correct date format
            "employment_history": [
                {
                    "company_name": f"{random.choice(['Hilton', 'Marriott', 'Hyatt', 'Holiday Inn'])} Hotels",
                    "employer": f"{random.choice(['Hilton', 'Marriott', 'Hyatt', 'Holiday Inn'])} Hotels",  # Keep both for compatibility
                    "phone": f"555-{random.randint(1000, 9999)}",
                    "address": f"{random.randint(100, 999)} Business Ave",
                    "supervisor": f"{random.choice(['John', 'Jane', 'Mike', 'Sarah'])} Manager",
                    "job_title": random.choice(POSITIONS),
                    "position": random.choice(POSITIONS),  # Keep both for compatibility
                    "starting_salary": str(random.randint(12, 25)),
                    "ending_salary": str(random.randint(15, 30)),
                    "from_date": "01/2020",  # MM/YYYY format
                    "to_date": "12/2023",  # MM/YYYY format
                    "start_date": "2020-01-01",  # Keep both for compatibility
                    "end_date": "2023-12-31",  # Keep both for compatibility
                    "reason_for_leaving": "Better opportunity",
                    "may_contact": True
                }
            ] if random.random() > 0.3 else []  # 70% chance of having employment history
        }

        # Submit application
        response = await client.post(
            f"{BASE_URL}/api/apply/{property_id}",
            json=application_data
        )

        if response.status_code == 200:
            result = response.json()
            app_id = result.get('data', {}).get('application_id', 'N/A')
            print(f"✅ Application {index + 1}/20 created:")
            print(f"   Name: {first_name} {last_name}")
            print(f"   Email: {email}")
            print(f"   Position: {application_data['position']}")
            print(f"   Application ID: {app_id}")
            return True
        else:
            # Check if it's a duplicate error
            if "Duplicate application" in response.text:
                print(f"⚠️  Application {index + 1}: Skipped (duplicate - {first_name} {last_name} with {email})")
            else:
                print(f"❌ Failed to create application {index + 1}: {response.text}")
            return False

async def main():
    print("=" * 60)
    print("Creating 20 Test Job Applications")
    print("=" * 60)

    # Get the manager's property
    property_id, property_name = await get_manager_property()

    if not property_id:
        print("❌ Could not get property ID. Make sure the manager account exists and has a property assigned.")
        return

    print(f"\n📋 Creating applications for: {property_name}")
    print("=" * 60)

    # Create 20 applications with unique combinations
    # Using offset of 30 to get different name combinations
    success_count = 0
    offset = random.randint(30, 100)  # Random offset to get different combinations
    for i in range(20):
        success = await create_application(property_id, i, offset)
        if success:
            success_count += 1
        await asyncio.sleep(0.5)  # Small delay between requests

    print("\n" + "=" * 60)
    print(f"✅ Successfully created {success_count}/20 applications")
    print(f"📧 Applications use these emails (rotating):")
    for email in TEST_EMAILS:
        print(f"   - {email}")
    print("\n💡 You can now login as manager to view and approve these applications")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())