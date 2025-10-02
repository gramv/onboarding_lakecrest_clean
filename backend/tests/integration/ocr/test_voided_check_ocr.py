#!/usr/bin/env python3
"""
Test script for Voided Check OCR validation
"""
import os
import base64
import json
import asyncio
from groq import Groq
from app.voided_check_ocr_service import VoidedCheckOCRService

async def test_voided_check_ocr():
    """Test the voided check OCR service with new Llama 4 vision models"""
    
    # Initialize Groq client
    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in environment")
        print("ℹ️  Please add GROQ_API_KEY to your .env file")
        print("   You can get an API key from https://console.groq.com/keys")
        return
    
    groq_client = Groq(api_key=groq_api_key)
    
    # Initialize OCR service
    ocr_service = VoidedCheckOCRService(groq_client)
    
    print("🚀 Testing Voided Check OCR with Llama 4 Vision Models (2025)")
    print("=" * 60)
    print(f"   Primary Model:  {ocr_service.PRIMARY_MODEL}")
    print(f"   Fallback Model: {ocr_service.FALLBACK_MODEL}")
    print("=" * 60)
    
    # Sample test data - using a 10x10 white square PNG (meets minimum requirements)
    # This is a valid test image that meets the "at least 2 pixels" requirement
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8/5+hnoEIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC"
    
    test_cases = [
        {
            "name": "Test Llama 4 Scout OCR Model",
            "image_data": test_image,  # Valid base64 PNG image
            "manual_data": {
                "bank_name": "Wells Fargo",
                "routing_number": "121000248",
                "account_number": "1234567890"
            },
            "expected_routing": "121000248"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🔍 Running test: {test_case['name']}")
        print("=" * 50)
        
        # Extract check data
        result = ocr_service.extract_check_data(
            test_case['image_data'],
            "test_check.jpg"
        )
        
        if result['success']:
            print("✅ OCR extraction successful!")
            print(f"   Extracted data: {json.dumps(result['extracted_data'], indent=2)}")
            print(f"   Confidence scores: {result['confidence_scores']}")
            print(f"   Requires review: {result['requires_review']}")
            print(f"   Processing notes: {result['processing_notes']}")
            
            # Test validation against manual entry
            if test_case.get('manual_data'):
                comparison = ocr_service.validate_against_manual_entry(
                    result,
                    test_case['manual_data']
                )
                print(f"\n📊 Comparison with manual entry:")
                print(f"   Matches: {comparison['matches']}")
                print(f"   Mismatches: {comparison['mismatches']}")
                print(f"   Suggestions: {comparison['suggestions']}")
                print(f"   Overall confidence: {comparison['confidence']:.2%}")
        else:
            print(f"❌ OCR extraction failed: {result.get('error')}")
            print(f"   Processing notes: {result.get('processing_notes')}")
    
    # Test routing number validation
    print("\n\n🔢 Testing routing number validation:")
    print("=" * 50)
    test_routing_numbers = [
        ("121000248", "Wells Fargo"),  # Valid Wells Fargo routing
        ("026009593", "Bank of America"),  # Valid BoA routing
        ("111111118", "Invalid"),  # Invalid checksum
        ("12345678", "Invalid"),  # Wrong length
    ]
    
    for routing, expected_bank in test_routing_numbers:
        is_valid = ocr_service._validate_routing_checksum(routing)
        identified_bank = ocr_service._identify_bank_from_routing(routing)
        print(f"   {routing}: Valid={is_valid}, Bank={identified_bank or 'Unknown'} (Expected: {expected_bank})")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('.env', override=True)
    
    # Run the test
    asyncio.run(test_voided_check_ocr())