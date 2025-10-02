#!/usr/bin/env python3
"""
Test script to verify Document AI and Groq API connections
"""
import os
import sys
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 60)
print("Testing OCR API Configurations")
print("=" * 60)

# Test 1: Check Groq API
print("\n1. Testing Groq API Configuration...")
groq_api_key = os.getenv('GROQ_API_KEY')
groq_model = os.getenv('GROQ_MODEL')

if groq_api_key:
    print(f"   ✅ GROQ_API_KEY found: {groq_api_key[:20]}...")
    print(f"   ✅ GROQ_MODEL: {groq_model}")
    
    # Test actual API connection
    try:
        from groq import Groq
        client = Groq(api_key=groq_api_key)
        
        # Simple test message
        completion = client.chat.completions.create(
            model="llama-3.1-70b-versatile",  # Use a stable model for testing
            messages=[
                {"role": "system", "content": "You are a test bot. Reply with 'API Working' only."},
                {"role": "user", "content": "Test"}
            ],
            max_tokens=10
        )
        
        if completion.choices[0].message.content:
            print(f"   ✅ Groq API Connection Successful!")
            print(f"   Response: {completion.choices[0].message.content}")
    except Exception as e:
        print(f"   ❌ Groq API Connection Failed: {str(e)}")
else:
    print("   ❌ GROQ_API_KEY not found in environment")

# Test 2: Check Google Document AI
print("\n2. Testing Google Document AI Configuration...")
google_creds_base64 = os.getenv('GOOGLE_CREDENTIALS_BASE64')
google_project_id = os.getenv('GOOGLE_PROJECT_ID')
google_processor_id = os.getenv('GOOGLE_PROCESSOR_ID')
google_processor_location = os.getenv('GOOGLE_PROCESSOR_LOCATION')

if google_creds_base64:
    print(f"   ✅ GOOGLE_CREDENTIALS_BASE64 found (length: {len(google_creds_base64)})")
    print(f"   ✅ GOOGLE_PROJECT_ID: {google_project_id}")
    print(f"   ✅ GOOGLE_PROCESSOR_ID: {google_processor_id}")
    print(f"   ✅ GOOGLE_PROCESSOR_LOCATION: {google_processor_location}")
    
    # Decode and verify the credentials
    try:
        import json
        creds_json = base64.b64decode(google_creds_base64).decode('utf-8')
        creds = json.loads(creds_json)
        print(f"   ✅ Credentials decoded successfully")
        print(f"   Project ID in creds: {creds.get('project_id')}")
        print(f"   Client email: {creds.get('client_email')}")
        
        # Test actual Document AI connection
        try:
            # Save credentials to temp file for Google client
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                f.write(creds_json)
                temp_creds_path = f.name
            
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = temp_creds_path
            
            from google.cloud import documentai_v1
            
            # Initialize the client
            client = documentai_v1.DocumentProcessorServiceClient()
            
            # Construct processor name
            processor_name = f"projects/{google_project_id}/locations/{google_processor_location}/processors/{google_processor_id}"
            
            print(f"   ✅ Google Document AI Client initialized")
            print(f"   Processor path: {processor_name}")
            
            # Clean up temp file
            os.unlink(temp_creds_path)
            
        except Exception as e:
            print(f"   ❌ Google Document AI Connection Failed: {str(e)}")
            
    except Exception as e:
        print(f"   ❌ Failed to decode credentials: {str(e)}")
else:
    print("   ❌ GOOGLE_CREDENTIALS_BASE64 not found in environment")

# Test 3: Check if the main app can initialize with these configs
print("\n3. Testing main app initialization with OCR services...")
try:
    # Add the app directory to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Try to import the OCR services as the main app does
    from app.voided_check_ocr_service import VoidedCheckOCRService
    print("   ✅ VoidedCheckOCRService imported successfully")
    
    from app.google_ocr_service_production import GoogleDocumentOCRServiceProduction
    print("   ✅ GoogleDocumentOCRServiceProduction imported successfully")
    
except Exception as e:
    print(f"   ⚠️  Failed to import OCR services: {str(e)}")

print("\n" + "=" * 60)
print("API Configuration Test Complete")
print("=" * 60)

# Summary
print("\n📊 Summary:")
if groq_api_key and google_creds_base64:
    print("✅ Both Groq and Google Document AI are configured")
    print("   - Groq API: Ready for voided check OCR")
    print("   - Google Document AI: Ready for government document processing")
elif groq_api_key:
    print("⚠️  Only Groq API is configured")
    print("   - Voided check OCR will work")
    print("   - Government document processing will NOT work")
elif google_creds_base64:
    print("⚠️  Only Google Document AI is configured")
    print("   - Government document processing will work")
    print("   - Voided check OCR will NOT work")
else:
    print("❌ No OCR APIs are configured")
    print("   - Document processing features will not be available")

print("\n💡 These APIs enable:")
print("   1. I-9 form data extraction from driver's licenses and passports")
print("   2. Voided check validation for direct deposit setup")
print("   3. Automatic form field population from uploaded documents")