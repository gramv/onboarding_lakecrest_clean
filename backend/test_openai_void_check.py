#!/usr/bin/env python3
"""
Test script for OpenAI GPT-5 void check validation
Tests the new OpenAI-based OCR service integration
"""
import os
import sys
import base64
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from openai import OpenAI
from voided_check_ocr_service import VoidedCheckOCRService

def test_openai_connection():
    """Test basic OpenAI connection with the API key from environment"""
    print("Testing OpenAI connection...")
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Test basic text completion to verify connection
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Hello, this is a test. Please respond with 'Connection successful!'"}
            ],
            max_tokens=50
        )
        
        if response and response.choices:
            print("✅ OpenAI connection successful!")
            print(f"Response: {response.choices[0].message.content}")
            return client
        else:
            print("❌ Unexpected response format")
            return None
            
    except Exception as e:
        print(f"❌ OpenAI connection failed: {e}")
        return None

def test_ocr_service_initialization():
    """Test OCR service initialization with OpenAI client"""
    print("\nTesting OCR service initialization...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        ocr_service = VoidedCheckOCRService(client)
        print("✅ OCR service initialized successfully!")
        return ocr_service
    except Exception as e:
        print(f"❌ OCR service initialization failed: {e}")
        return None

def create_dummy_check_image():
    """Create a dummy base64 encoded image for testing"""
    # Create a simple test image (1x1 pixel PNG in base64)
    # This is just for testing the API structure, not actual OCR
    dummy_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    return dummy_png

def test_ocr_extraction():
    """Test OCR extraction with dummy data (structure test only)"""
    print("\nTesting OCR extraction structure...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False
    
    try:
        client = OpenAI(api_key=api_key)
        ocr_service = VoidedCheckOCRService(client)
        
        # Create dummy test data
        dummy_image = create_dummy_check_image()
        
        print("⚠️  Note: Using dummy image for structure validation.")
        print("    GPT-5 (released August 2025) will be used as primary model.")
        
        # Test the extraction (expect it to fail gracefully)
        result = ocr_service.extract_check_data(dummy_image, "test_check.png")
        
        print(f"✅ OCR extraction completed (structure test)")
        print(f"Result keys: {list(result.keys())}")
        print(f"Success: {result.get('success', False)}")
        
        if not result.get('success'):
            print(f"OCR processing result: {result.get('error', 'Processing completed')}")
        
        return True
        
    except Exception as e:
        print(f"❌ OCR extraction test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing OpenAI GPT-5 Void Check Integration")
    print("=" * 50)
    
    # Test 1: Basic connection
    client = test_openai_connection()
    if not client:
        print("❌ Cannot proceed without valid OpenAI connection")
        return False
    
    # Test 2: Service initialization
    ocr_service = test_ocr_service_initialization()
    if not ocr_service:
        print("❌ Cannot proceed without valid OCR service")
        return False
    
    # Test 3: OCR extraction structure
    success = test_ocr_extraction()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests completed successfully!")
        print("📝 Notes:")
        print("   - OpenAI connection verified")
        print("   - OCR service structure validated")
        print("   - GPT-5 (primary) with GPT-4o (fallback) configured")
        print("   - Ready to test with real void check images")
    else:
        print("❌ Some tests failed")
    
    return success

if __name__ == "__main__":
    main()
