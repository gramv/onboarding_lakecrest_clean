#!/usr/bin/env python3
"""
Script to check Supabase bucket structure for employee documents
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Employee details
property_name = "m6"
employee_name = "benjamin_thomas"

# List all files in the bucket
print("=" * 80)
print("CHECKING SUPABASE BUCKET STRUCTURE")
print("=" * 80)

# Try different path patterns
paths_to_check = [
    f"{property_name}/{employee_name}",
    f"{property_name}/{employee_name}/uploads",
    f"{property_name}/{employee_name}/uploads/i9-verification",
    f"{property_name}/{employee_name}/forms",
    f"onboarding-documents/{property_name}/{employee_name}",
]

for path in paths_to_check:
    print(f"\n📁 Checking path: {path}")
    print("-" * 80)
    try:
        result = supabase.storage.from_("onboarding-documents").list(path)
        if result:
            print(f"✅ Found {len(result)} items:")
            for item in result:
                print(f"   - {item['name']} (type: {item.get('metadata', {}).get('mimetype', 'unknown')})")
        else:
            print("   ⚠️  No items found")
    except Exception as e:
        print(f"   ❌ Error: {e}")

# Also check root level
print(f"\n📁 Checking root level")
print("-" * 80)
try:
    result = supabase.storage.from_("onboarding-documents").list()
    if result:
        print(f"✅ Found {len(result)} items at root:")
        for item in result:
            print(f"   - {item['name']}")
    else:
        print("   ⚠️  No items found at root")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 80)

