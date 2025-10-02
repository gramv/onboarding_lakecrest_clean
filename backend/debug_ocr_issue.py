#!/usr/bin/env python3
"""
Diagnostic test for void check OCR issues
Debug why manual verification fallback is being triggered
"""
import os
import sys
import base64
import json
import logging
from pathlib import Path

# Set logging to DEBUG level to see detailed output
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from openai import OpenAI
from voided_check_ocr_service import VoidedCheckOCRService

def create_test_check_image():
    """Create a more realistic test image with some text"""
    # This is a small test image with some text-like patterns
    # In reality, you'd upload a real void check image
    test_image_base64 = """
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==
""".strip()
    return test_image_base64

def debug_ocr_extraction():
    """Debug OCR extraction to understand the failure"""
    print("🔍 Debugging OCR Extraction Process")
    print("=" * 50)
    
    # Use the provided API key
    api_key = os.getenv("OPENAI_API_KEY")
    
    try:
        # Initialize client and service
        client = OpenAI(api_key=api_key)
        ocr_service = VoidedCheckOCRService(client)
        
        # Create test image
        test_image = create_test_check_image()
        print(f"✅ Test image created (length: {len(test_image)} chars)")
        
        # Run extraction with detailed error tracking
        print("\n📊 Running OCR extraction...")
        result = ocr_service.extract_check_data(test_image, "test_check.png")
        
        print(f"\n📋 OCR Result:")
        print(f"   Success: {result.get('success', 'unknown')}")
        print(f"   Error: {result.get('error', 'none')}")
        print(f"   Processing Notes: {result.get('processing_notes', [])}")
        
        if result.get('success'):
            print(f"   Extracted Data: {result.get('extracted_data', {})}")
            print(f"   Confidence Scores: {result.get('confidence_scores', {})}")
            print(f"   Requires Review: {result.get('requires_review', 'unknown')}")
        else:
            print(f"\n❌ OCR Failed - This would trigger manual verification fallback")
            error_msg = result.get('error', '')
            
            # Check what type of error would trigger manual verification
            if '403' in str(error_msg) or 'Forbidden' in str(error_msg) or 'quota' in str(error_msg).lower():
                print(f"   ⚠️  This error would trigger manual verification fallback")
                print(f"   📝 User would see: 'Automatic verification unavailable. HR will manually verify your banking information.'")
            else:
                print(f"   ❌ This would show a regular error to the user")
        
        return result
        
    except Exception as e:
        print(f"❌ Exception during debugging: {e}")
        return None

def test_openai_models():
    """Test which OpenAI models are actually available"""
    print("\n🤖 Testing OpenAI Model Availability")
    print("=" * 50)
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Test GPT-5
        print("Testing GPT-5...")
        try:
            response = client.chat.completions.create(
                model="gpt-5",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            print("   ✅ GPT-5 chat completions available")
        except Exception as e:
            print(f"   ❌ GPT-5 chat completions failed: {e}")
        
        # Test GPT-5 responses
        print("Testing GPT-5 responses API...")
        try:
            # Try a minimal responses API call
            response = client.responses.create(
                model="gpt-5",
                input=[],
                text={"format": {"type": "text"}, "verbosity": "low"},
                reasoning={"effort": "low", "summary": "auto"},
                tools=[],
                store=False,
                include=[]
            )
            print("   ✅ GPT-5 responses API available")
        except Exception as e:
            print(f"   ❌ GPT-5 responses API failed: {e}")
        
        # Test GPT-4o
        print("Testing GPT-4o...")
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            print("   ✅ GPT-4o available")
        except Exception as e:
            print(f"   ❌ GPT-4o failed: {e}")
            
    except Exception as e:
        print(f"❌ Error testing models: {e}")

def main():
    """Run diagnostic tests"""
    print("🚀 Void Check OCR Diagnostic Tool")
    print("=" * 50)
    
    # Test model availability
    test_openai_models()
    
    # Debug OCR extraction
    debug_ocr_extraction()
    
    print("\n" + "=" * 50)
    print("🎯 DIAGNOSIS SUMMARY:")
    print("If you're seeing 'validation unavailable - will be reviewed manually',")
    print("it's likely because:")
    print("1. GPT-5 responses API is returning 400 errors (experimental)")
    print("2. GPT-4o fallback might also be failing")
    print("3. The system interprets any OCR failure as needing manual review")
    print("\n💡 SOLUTION:")
    print("Let's fix the underlying OCR service to work reliably with GPT-4o!")

if __name__ == "__main__":
    main()
