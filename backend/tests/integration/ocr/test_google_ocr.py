#!/usr/bin/env python3
"""Test Google Document AI connection and OCR functionality"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_google_ocr():
    """Test Google Document AI OCR service"""
    
    print("🔍 Testing Google Document AI OCR Service...")
    print("-" * 50)
    
    # Check environment variables
    project_id = os.getenv("GOOGLE_PROJECT_ID", "933544811759")
    processor_id = os.getenv("GOOGLE_PROCESSOR_ID", "50c628033c5d5dde")
    location = os.getenv("GOOGLE_PROCESSOR_LOCATION", "us")
    
    print(f"📋 Configuration:")
    print(f"   Project ID: {project_id}")
    print(f"   Processor ID: {processor_id}")
    print(f"   Location: {location}")
    
    # Check for credentials
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        print(f"   Credentials: {creds_path}")
        if not os.path.exists(creds_path):
            print(f"   ❌ Credentials file not found at {creds_path}")
    else:
        print("   ⚠️  GOOGLE_APPLICATION_CREDENTIALS not set")
        print("   ℹ️  Will try default application credentials")
    
    print("\n" + "-" * 50)
    
    try:
        # Import and initialize the service
        from app.google_ocr_service import GoogleDocumentOCRService
        from app.i9_section2 import I9DocumentType
        
        print("✅ Google OCR service module imported successfully")
        
        # Initialize the service
        ocr_service = GoogleDocumentOCRService(
            project_id=project_id,
            processor_id=processor_id,
            location=location
        )
        
        print(f"✅ Google OCR service initialized")
        print(f"   Processor: {ocr_service.processor_name}")
        
        # Test with a sample image (base64 encoded 1x1 white pixel PNG)
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        print("\n🧪 Testing OCR extraction with sample image...")
        result = ocr_service.extract_document_fields(
            document_type=I9DocumentType.DRIVERS_LICENSE,
            image_data=test_image,
            file_name="test.png"
        )
        
        print("\n📊 OCR Result:")
        print(f"   Success: {result.get('success', False)}")
        
        if result.get('success'):
            print("   ✅ OCR service is working!")
            extracted = result.get('extracted_data', {})
            if extracted:
                print(f"   Extracted fields: {list(extracted.keys())}")
            else:
                print("   ℹ️  No fields extracted (test image is blank)")
        else:
            error = result.get('error', 'Unknown error')
            print(f"   ❌ OCR failed: {error}")
            
            if "credentials" in str(error).lower():
                print("\n📝 To fix this, you need to:")
                print("   1. Go to Google Cloud Console")
                print("   2. Create a service account key")
                print("   3. Download the JSON file")
                print("   4. Save it as 'google-credentials.json' in backend root")
                print("   5. Add to .env: GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json")
            
    except ImportError as e:
        print(f"❌ Failed to import Google OCR service: {str(e)}")
        print("   Make sure you're running from the backend directory")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        print(f"   Error type: {type(e).__name__}")

if __name__ == "__main__":
    test_google_ocr()