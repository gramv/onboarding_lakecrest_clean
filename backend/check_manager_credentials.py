import asyncio
from app.supabase_service_enhanced import EnhancedSupabaseService
import bcrypt

async def check_manager():
    """Check manager credentials."""
    
    supabase = EnhancedSupabaseService()
    
    try:
        # Get the manager account
        managers = await supabase.get_managers()
        print(f"Found {len(managers)} managers")
        
        for manager in managers:
            print(f"\nManager: {manager.get('email')}")
            print(f"  ID: {manager.get('id')}")
            print(f"  Name: {manager.get('first_name')} {manager.get('last_name')}")
            print(f"  Active: {manager.get('is_active')}")
            print(f"  Has Password: {'password_hash' in manager and manager['password_hash'] is not None}")
            
            # Check if password SecurePass123! would work
            if 'password_hash' in manager and manager['password_hash']:
                test_password = "SecurePass123!"
                try:
                    is_valid = bcrypt.checkpw(
                        test_password.encode('utf-8'),
                        manager['password_hash'].encode('utf-8')
                    )
                    print(f"  Password 'SecurePass123!' valid: {is_valid}")
                except Exception as e:
                    print(f"  Error checking password: {e}")
            
            # Get property assignments
            property_managers = await supabase.client.table('property_managers').select('properties(*)').eq('manager_id', manager['id']).execute()
            if property_managers.data:
                for pm in property_managers.data:
                    if pm.get('properties'):
                        print(f"  Property: {pm['properties'].get('name')} (ID: {pm['properties'].get('id')})")
        
        # Set the password for the manager if needed
        print("\n🔧 Setting password for manager@demo.com...")
        
        # Find the manager
        manager_data = None
        for m in managers:
            if m.get('email') == 'manager@demo.com':
                manager_data = m
                break
        
        if manager_data:
            # Hash the password
            password_hash = bcrypt.hashpw("SecurePass123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update the password
            result = await supabase.client.table('users').update({
                'password_hash': password_hash
            }).eq('id', manager_data['id']).execute()
            
            print(f"✅ Password updated for manager@demo.com")
        else:
            print("❌ Manager not found with email manager@demo.com")
            
    finally:
        pass  # No close method needed

if __name__ == "__main__":
    asyncio.run(check_manager())