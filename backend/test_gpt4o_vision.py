#!/usr/bin/env python3
"""
Simple test of GPT-4o vision capabilities
"""
import os
from openai import OpenAI

def test_gpt4o_vision():
    api_key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)
    
    # Simple test image (1x1 red pixel)
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    try:
        print("Testing GPT-4o vision with simple prompt...")
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe what you see in this image. If you can't see anything meaningful, just say 'This is a very small test image'."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{test_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=100
        )
        
        if response and response.choices:
            content = response.choices[0].message.content
            print(f"✅ GPT-4o vision response: {content}")
            
            if content:
                print("✅ GPT-4o vision is working!")
                return True
            else:
                print("❌ Empty response from GPT-4o")
                return False
        else:
            print("❌ No response from GPT-4o")
            return False
            
    except Exception as e:
        print(f"❌ GPT-4o vision test failed: {e}")
        return False

def test_gpt4o_json_mode():
    api_key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)
    
    # Simple test image (1x1 red pixel)
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    try:
        print("\nTesting GPT-4o vision with JSON mode...")
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this image and return a JSON object with this structure: {\"description\": \"what you see\", \"confidence\": \"high/medium/low\"}. If you can't see anything meaningful, describe it as a test image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{test_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=100,
            response_format={"type": "json_object"}
        )
        
        if response and response.choices:
            content = response.choices[0].message.content
            print(f"✅ GPT-4o JSON response: {content}")
            
            if content:
                print("✅ GPT-4o JSON mode is working!")
                return True
            else:
                print("❌ Empty response from GPT-4o JSON mode")
                return False
        else:
            print("❌ No response from GPT-4o JSON mode")
            return False
            
    except Exception as e:
        print(f"❌ GPT-4o JSON test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing GPT-4o Vision Capabilities")
    print("="*50)
    
    vision_works = test_gpt4o_vision()
    json_works = test_gpt4o_json_mode()
    
    print("\n" + "="*50)
    if vision_works and json_works:
        print("✅ GPT-4o vision and JSON mode both work!")
        print("The issue might be in our OCR service logic.")
    else:
        print("❌ There's an issue with GPT-4o vision capabilities.")
