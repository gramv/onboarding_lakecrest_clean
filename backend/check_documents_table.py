#!/usr/bin/env python3
"""
Check the structure of the documents table
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client with service key
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

print("=" * 80)
print("CHECKING 'documents' TABLE STRUCTURE")
print("=" * 80)

try:
    # Get a sample row to see structure
    result = supabase.table("documents").select("*").limit(1).execute()

    if result.data and len(result.data) > 0:
        print("\nColumns in documents table:")
        for key, value in result.data[0].items():
            print(f"  - {key}: {type(value).__name__}")
    else:
        print("\nTable exists but is empty. Trying to insert test data to check schema...")

        # Try inserting test data to see what fields are accepted
        test_data = {
            "bucket": "test-bucket",
            "path": "test/path/file.pdf",
            "size": 1024,
            "content_type": "application/pdf",
            "public_url": "https://test.com/file.pdf"
        }

        try:
            insert_result = supabase.table("documents").insert(test_data).execute()
            print("\nSuccessfully inserted test data. Table columns:")
            for key in insert_result.data[0].keys():
                print(f"  - {key}")

            # Clean up test data
            if insert_result.data and len(insert_result.data) > 0:
                supabase.table("documents").delete().eq("id", insert_result.data[0]["id"]).execute()
                print("\n(Test data cleaned up)")

        except Exception as e:
            print(f"\nError inserting test data: {e}")
            print("\nThis error tells us what fields the table expects.")

except Exception as e:
    print(f"Error checking documents table: {e}")

# Check what the code expects vs what exists
print("\n" + "=" * 80)
print("WHAT THE CODE EXPECTS (from save_signed_document):")
print("=" * 80)
print("""
The backend code expects these fields:
  - bucket (VARCHAR)
  - path (TEXT)
  - size (BIGINT)
  - content_type (VARCHAR)
  - public_url (TEXT)
  - uploaded_at (TIMESTAMP)

The code inserts data like this:
  {
    "bucket": "onboarding-documents",
    "path": "{property_id}/{employee_id}/{form_type}/active/{filename}",
    "size": file_size,
    "content_type": "application/pdf",
    "public_url": None,
    "uploaded_at": datetime.now()
  }
""")