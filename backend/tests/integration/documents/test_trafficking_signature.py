#!/usr/bin/env python3
"""Test Human Trafficking Certificate with Signature"""

import asyncio
import base64
import json
import httpx
from datetime import datetime

async def test_trafficking_certificate():
    """Test the complete Human Trafficking certificate flow"""
    
    base_url = "http://localhost:8000"
    employee_id = "test-employee-123"
    
    print("🔍 Testing Human Trafficking Certificate Generation...\n")
    
    # Step 1: Test preview (no signature)
    print("1️⃣ Testing preview generation (no signature)...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/api/onboarding/{employee_id}/human-trafficking/preview"
        )
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('pdf'):
                print("✅ Preview PDF generated successfully")
                print(f"   PDF size: {len(result['data']['pdf'])} bytes (base64)")
            else:
                print("❌ Preview PDF missing in response")
        else:
            print(f"❌ Preview failed: {response.status_code}")
            print(f"   Response: {response.text}")
    
    # Step 2: Test with signature
    print("\n2️⃣ Testing signed certificate generation...")
    
    # Create a simple test signature (black line on transparent background)
    from PIL import Image, ImageDraw
    import io
    
    # Create a signature image
    width, height = 300, 100
    img = Image.new('RGBA', (width, height), (255, 255, 255, 0))  # Transparent
    draw = ImageDraw.Draw(img)
    
    # Draw a simple signature-like curve
    points = [(50, 50), (100, 40), (150, 60), (200, 45), (250, 50)]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=(0, 0, 0, 255), width=3)
    
    # Add a cross for the signature
    draw.line([(80, 30), (120, 70)], fill=(0, 0, 0, 255), width=2)
    
    # Convert to base64
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    signature_base64 = base64.b64encode(img_buffer.read()).decode('utf-8')
    signature_data_url = f"data:image/png;base64,{signature_base64}"
    
    # Prepare request data
    request_data = {
        "employee_data": {
            "firstName": "John",
            "lastName": "Doe",
            "name": "John Doe",
            "completionDate": datetime.now().isoformat(),
            "property_name": "Test Hotel"
        },
        "signature_data": {
            "name": "John Doe",
            "timestamp": datetime.now().isoformat(),
            "ipAddress": "127.0.0.1",
            "signatureImage": signature_data_url,
            "signatureId": f"HT-{datetime.now().timestamp()}"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/api/onboarding/{employee_id}/human-trafficking/generate-pdf",
            json=request_data
        )
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('pdf'):
                print("✅ Signed PDF generated successfully")
                print(f"   PDF size: {len(result['data']['pdf'])} bytes (base64)")
                print(f"   Filename: {result['data'].get('filename')}")
                
                # Save the PDF for manual inspection
                pdf_bytes = base64.b64decode(result['data']['pdf'])
                with open('test_trafficking_certificate_signed.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_trafficking_certificate_signed.pdf")
            else:
                print("❌ Signed PDF missing in response")
        else:
            print(f"❌ Signed generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
    
    print("\n✨ Test complete! Check the generated PDF to verify the signature appears correctly.")

if __name__ == "__main__":
    asyncio.run(test_trafficking_certificate())