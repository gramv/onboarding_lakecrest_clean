#!/usr/bin/env python3
"""
Simple test to verify phone validation is working
"""

# Direct model test
from app.models import JobApplicationData

def test_phone_directly():
    """Test phone validation at model level"""
    print("Testing phone validation at model level...")

    test_phones = [
        ("(555) 123-4567", "US format"),
        ("+52 55 1234 5678", "Mexican format"),
        ("+34 612 345 678", "Spanish format"),
        ("1234567", "7 digits minimum"),
        ("123456", "6 digits - should fail"),
    ]

    for phone, description in test_phones:
        try:
            # Create minimal test data with all required fields
            test_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "phone": phone,
                "address": "123 Test St",
                "city": "Test City",
                "state": "TX",
                "zip_code": "12345",
                "department": "housekeeping",
                "position": "housekeeper",
                "work_authorized": "yes",
                "sponsorship_required": "no",
                "age_verification": True,
                "conviction_record": {"has_conviction": False},
                "previous_hotel_employment": False,
                "how_heard": "website",
                "personal_reference": {
                    "name": "John Doe",
                    "years_known": "5",
                    "phone": "(555) 000-0000",
                    "relationship": "Friend"
                },
                "military_service": {},
                "education_history": [],
                "employment_history": [],
                "experience_years": "0-1",
                "hotel_experience": "no"
            }

            # Try to create the model
            app_data = JobApplicationData(**test_data)
            print(f"✅ {description}: {phone} - VALID")

        except Exception as e:
            if "Phone number must be" in str(e):
                print(f"❌ {description}: {phone} - INVALID: {str(e)}")
            else:
                print(f"❌ {description}: {phone} - ERROR: {str(e)}")

if __name__ == "__main__":
    test_phone_directly()