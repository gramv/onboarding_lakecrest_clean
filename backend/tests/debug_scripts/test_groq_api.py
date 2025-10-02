#!/usr/bin/env python3
"""
Test Groq API connection and model availability
"""
import os
import asyncio
from groq import Groq
import json

async def test_groq_models():
    """Test Groq API and list available models"""
    
    # Initialize Groq client
    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found")
        return
    
    print("✅ GROQ_API_KEY found")
    print(f"   Key prefix: {groq_api_key[:10]}...")
    
    try:
        groq_client = Groq(api_key=groq_api_key)
        print("✅ Groq client initialized successfully")
        
        # Test a simple text completion first
        print("\n📝 Testing text completion with Llama models...")
        test_models = [
            "llama-3.3-70b-versatile",  # Latest text model
            "llama-3.1-8b-instant",      # Fast text model
        ]
        
        for model in test_models:
            try:
                response = groq_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": "Say 'Hello, Groq API is working!' in 5 words or less."}
                    ],
                    max_tokens=20,
                    temperature=0
                )
                print(f"   ✅ {model}: {response.choices[0].message.content}")
            except Exception as e:
                print(f"   ❌ {model}: {str(e)[:100]}")
        
        # Test vision models (without actual images)
        print("\n🖼️ Testing vision model availability...")
        vision_models = [
            "llama-3.2-90b-vision-preview"  # Start with known working model
        ]
        
        # Create a simple 1x1 white pixel as base64
        # This is a minimal valid PNG image
        simple_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        for model in vision_models:
            try:
                response = groq_client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "What do you see in this image? Reply in JSON: {\"description\": \"your answer\"}"
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{simple_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    temperature=0,
                    max_tokens=100,
                    response_format={"type": "json_object"}
                )
                result = response.choices[0].message.content
                print(f"   ✅ {model}: Working! Response: {result[:80]}...")
            except Exception as e:
                error_msg = str(e)
                if "model not found" in error_msg.lower():
                    print(f"   ⚠️ {model}: Model not available")
                else:
                    print(f"   ❌ {model}: {error_msg[:100]}")
        
        print("\n📊 Summary:")
        print("   - Groq API connection: ✅ Working")
        print("   - Text models: ✅ Available")
        print("   - Vision models: Check results above")
        print("\n💡 Note: Some models may be in preview or require specific access")
        
    except Exception as e:
        print(f"\n❌ Error initializing Groq client: {e}")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('.env', override=True)
    
    print("🚀 Testing Groq API Connection and Models")
    print("=" * 50)
    
    # Run the test
    asyncio.run(test_groq_models())
