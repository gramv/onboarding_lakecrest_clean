import asyncio
import json
from datetime import datetime, timedelta
import jwt
from app.supabase_service_enhanced import SupabaseServiceEnhanced

async def test_manager_api():
    """Test manager dashboard API connections."""
    
    # Initialize services
    supabase = SupabaseServiceEnhanced()
    await supabase.initialize()
    
    try:
        # Get the manager account
        managers = await supabase.get_managers()
        print(f"Found {len(managers)} managers")
        
        if not managers:
            print("❌ No managers found")
            return
            
        manager = managers[0]
        print(f"\n✅ Using manager: {manager.get('email')}")
        
        # Create a JWT token for the manager
        SECRET_KEY = "your-secret-key-change-in-production"
        
        payload = {
            "sub": manager["email"],
            "email": manager["email"],
            "first_name": manager.get("first_name", "Demo"),
            "last_name": manager.get("last_name", "Manager"),
            "role": "manager",
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        print(f"\n🔑 Manager Token Generated:")
        print(f"   {token}")
        
        # Test the endpoints using curl
        import subprocess
        
        # Test dashboard stats
        print("\n📊 Testing Dashboard Stats Endpoint:")
        result = subprocess.run([
            "curl", "-s", "-X", "GET",
            "http://localhost:8000/api/manager/dashboard-stats",
            "-H", f"Authorization: Bearer {token}"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            try:
                stats = json.loads(result.stdout)
                print(json.dumps(stats, indent=2))
            except:
                print(result.stdout)
        else:
            print("❌ Failed to get dashboard stats")
            
        # Test property endpoint
        print("\n🏨 Testing Property Endpoint:")
        result = subprocess.run([
            "curl", "-s", "-X", "GET",
            "http://localhost:8000/api/manager/property",
            "-H", f"Authorization: Bearer {token}"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            try:
                property_data = json.loads(result.stdout)
                print(json.dumps(property_data, indent=2))
            except:
                print(result.stdout)
        else:
            print("❌ Failed to get property data")
            
        print("\n✅ Manager API test complete!")
        print(f"\n📱 To test in browser, save this token in localStorage:")
        print(f"   localStorage.setItem('token', '{token}')")
        print(f"   localStorage.setItem('user', JSON.stringify({json.dumps({'email': manager['email'], 'role': 'manager', 'first_name': manager.get('first_name', 'Demo'), 'last_name': manager.get('last_name', 'Manager')})}))")
        
    finally:
        await supabase.close()

if __name__ == "__main__":
    asyncio.run(test_manager_api())
