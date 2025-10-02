#!/usr/bin/env python3
"""
Test critical API endpoints to establish baseline functionality
"""
from fastapi.testclient import TestClient
from app.main_enhanced import app
import json

client = TestClient(app)

def test_endpoint(method, path, **kwargs):
    """Test an endpoint and return results"""
    try:
        if method == 'GET':
            response = client.get(path, **kwargs)
        elif method == 'POST':
            response = client.post(path, **kwargs)
        else:
            response = client.request(method, path, **kwargs)
        
        return {
            'path': path,
            'method': method,
            'status': response.status_code,
            'success': 200 <= response.status_code < 300,
            'content_type': response.headers.get('content-type', ''),
            'has_json': 'application/json' in response.headers.get('content-type', '')
        }
    except Exception as e:
        return {
            'path': path,
            'method': method,
            'status': 'error',
            'success': False,
            'error': str(e)
        }

# Test critical endpoints
results = []

# Public endpoints
public_endpoints = [
    ('GET', '/health'),
    ('GET', '/api/health'),
    ('GET', '/api/properties'),
    ('POST', '/api/apply'),
    ('POST', '/api/verify-token'),
]

# Document endpoints
document_endpoints = [
    ('GET', '/api/forms/i9/preview'),
    ('GET', '/api/forms/w4/preview'),
    ('GET', '/api/documents/templates'),
]

# Manager endpoints (will fail without auth)
manager_endpoints = [
    ('GET', '/api/manager/dashboard'),
    ('GET', '/api/manager/applications'),
]

print("Testing Critical API Endpoints")
print("=" * 60)

all_endpoints = [
    ("Public Endpoints", public_endpoints),
    ("Document Endpoints", document_endpoints),
    ("Manager Endpoints (expect 401)", manager_endpoints)
]

for category, endpoints in all_endpoints:
    print(f"\n{category}:")
    print("-" * 40)
    for method, path in endpoints:
        result = test_endpoint(method, path)
        results.append(result)
        status = result['status']
        icon = "✅" if result['success'] else "❌" if status != 401 else "🔒"
        print(f"{icon} {method:6} {path:40} -> {status}")

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
successful = [r for r in results if r['success']]
failed = [r for r in results if not r['success'] and r['status'] != 401]
auth_required = [r for r in results if r['status'] == 401]

print(f"✅ Successful: {len(successful)}")
print(f"❌ Failed: {len(failed)}")
print(f"🔒 Auth Required: {len(auth_required)}")

# Save results
with open('critical_endpoints_baseline.json', 'w') as f:
    json.dump({
        'total': len(results),
        'successful': len(successful),
        'failed': len(failed),
        'auth_required': len(auth_required),
        'details': results
    }, f, indent=2)

print("\nResults saved to critical_endpoints_baseline.json")