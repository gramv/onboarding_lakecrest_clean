#!/usr/bin/env python3
"""
Test script to verify Company Policies PDF generation is working after fix.
"""

import asyncio
import aiohttp
import json
import base64

# Configuration
BASE_URL = "http://localhost:8000"

async def test_company_policies_pdf():
    """Test the Company Policies PDF generation"""
    
    async with aiohttp.ClientSession() as session:
        print("\n" + "="*60)
        print("TESTING COMPANY POLICIES PDF GENERATION")
        print("="*60)
        
        # Use the employee ID from the logs
        employee_id = "fc7290f1-9ef0-4ee2-8f91-214646d73bf3"
        
        print(f"\n1. Testing PDF generation for employee: {employee_id}")
        
        # Prepare test data with employee information
        test_data = {
            "employee_data": {
                "companyPoliciesInitials": "GV",
                "eeoInitials": "GV",
                "sexualHarassmentInitials": "GV",
                "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                "signatureDate": "2025-08-23"
            }
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/onboarding/{employee_id}/company-policies/generate-pdf",
                json=test_data
            ) as resp:
                print(f"   Response status: {resp.status}")
                
                if resp.status == 200:
                    result = await resp.json()
                    
                    # Check for pdf in data field or directly
                    pdf_data = None
                    if "data" in result and "pdf" in result["data"]:
                        pdf_data = result["data"]["pdf"]
                    elif "pdf" in result:
                        pdf_data = result["pdf"]
                    
                    if pdf_data:
                        # Verify it's valid base64
                        try:
                            decoded = base64.b64decode(pdf_data)
                            print(f"   ✅ PDF generated successfully!")
                            print(f"   PDF size: {len(decoded)} bytes")
                            
                            # Check PDF header
                            if decoded[:4] == b'%PDF':
                                print(f"   ✅ Valid PDF format detected")
                            else:
                                print(f"   ⚠️ Invalid PDF format")
                            
                            # Save to file for manual inspection
                            test_file = "/tmp/test_company_policies.pdf"
                            with open(test_file, "wb") as f:
                                f.write(decoded)
                            print(f"   💾 PDF saved to: {test_file}")
                            
                            return True
                            
                        except Exception as e:
                            print(f"   ❌ Invalid base64 encoding: {e}")
                            return False
                    else:
                        print(f"   ❌ No PDF in response: {result}")
                        return False
                        
                else:
                    error_text = await resp.text()
                    print(f"   ❌ PDF generation failed")
                    print(f"   Error: {error_text[:500]}")
                    
                    # Try to parse error details
                    try:
                        error_json = json.loads(error_text)
                        if "detail" in error_json:
                            print(f"   Detail: {error_json['detail']}")
                    except:
                        pass
                    
                    return False
                    
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        finally:
            print("\n" + "="*60)
            print("TEST COMPLETE")
            print("="*60)

if __name__ == "__main__":
    result = asyncio.run(test_company_policies_pdf())
    exit(0 if result else 1)