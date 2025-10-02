#!/usr/bin/env python3
"""Test Weapons Policy PDF with Signature"""

import asyncio
import base64
import json
import httpx
from datetime import datetime

async def test_weapons_policy_signature():
    """Test the Weapons Policy PDF generation with signature"""
    
    base_url = "http://localhost:8000"
    employee_id = "test-employee-456"
    
    print("🔍 Testing Weapons Policy PDF with Signature...\n")
    
    # Step 1: Test preview (no signature)
    print("1️⃣ Testing preview generation (no signature)...")
    
    preview_data = {
        "employee_data": {
            "firstName": "Jane",
            "lastName": "Smith",
            "property_name": "Grand Hotel"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/api/onboarding/{employee_id}/weapons-policy/generate-pdf",
            json=preview_data
        )
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('pdf'):
                print("✅ Preview PDF generated successfully")
                print(f"   PDF size: {len(result['data']['pdf'])} bytes (base64)")
                
                # Save preview for inspection
                pdf_bytes = base64.b64decode(result['data']['pdf'])
                with open('test_weapons_preview.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_weapons_preview.pdf")
            else:
                print("❌ Preview PDF missing in response")
        else:
            print(f"❌ Preview failed: {response.status_code}")
            print(f"   Response: {response.text}")
    
    # Step 2: Test with signature
    print("\n2️⃣ Testing signed document generation...")
    
    # Create a test signature
    from PIL import Image, ImageDraw
    import io
    
    # Create signature image
    width, height = 300, 100
    img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw signature-like curves
    points = [(30, 50), (80, 30), (130, 60), (180, 40), (230, 50), (270, 45)]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=(0, 0, 0, 255), width=3)
    
    # Add some flourishes
    draw.arc([(60, 40), (100, 60)], 0, 90, fill=(0, 0, 0, 255), width=2)
    draw.line([(150, 35), (160, 65)], fill=(0, 0, 0, 255), width=2)
    
    # Convert to base64
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    signature_base64 = base64.b64encode(img_buffer.read()).decode('utf-8')
    signature_data_url = f"data:image/png;base64,{signature_base64}"
    
    # Prepare signed request
    signed_data = {
        "employee_data": {
            "firstName": "Jane",
            "lastName": "Smith",
            "property_name": "Grand Hotel"
        },
        "signature_data": {
            "name": "Jane Smith",
            "timestamp": datetime.now().isoformat(),
            "ipAddress": "127.0.0.1",
            "signatureImage": signature_data_url,
            "signatureId": f"WP-{datetime.now().timestamp()}"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/api/onboarding/{employee_id}/weapons-policy/generate-pdf",
            json=signed_data
        )
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('pdf'):
                print("✅ Signed PDF generated successfully")
                print(f"   PDF size: {len(result['data']['pdf'])} bytes (base64)")
                print(f"   Filename: {result['data'].get('filename')}")
                
                # Save signed PDF for inspection
                pdf_bytes = base64.b64decode(result['data']['pdf'])
                with open('test_weapons_signed.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_weapons_signed.pdf")
            else:
                print("❌ Signed PDF missing in response")
        else:
            print(f"❌ Signed generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
    
    print("\n✅ Summary:")
    print("   - Preview PDF: Shows '[Signature will appear here]' placeholder")
    print("   - Signed PDF: Contains actual signature image")
    print("   - Employee names: Pulled from PersonalInfoStep data")
    print("   - Check the generated PDFs to verify signatures appear correctly!")

if __name__ == "__main__":
    asyncio.run(test_weapons_policy_signature())