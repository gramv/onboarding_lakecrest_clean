#!/usr/bin/env python3
"""
Create or verify test property for job application testing.
"""

import sys
import os
from pathlib import Path

# Add backend path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Load environment variables
from dotenv import load_dotenv
env_path = backend_path / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✓ Loaded environment from {env_path}")

from app.supabase_service_enhanced import EnhancedSupabaseService
from app.models import Property
import uuid

import asyncio

async def ensure_test_property():
    """Ensure test property exists"""
    
    print("Checking for test property...")
    
    # Initialize service
    supabase = EnhancedSupabaseService()
    
    # Use a valid UUID for test property
    test_property_id = "550e8400-e29b-41d4-a716-446655440001"  # Valid UUID format
    
    try:
        existing = await supabase.get_property_by_id(test_property_id)
        if existing:
            print(f"✓ Test property already exists: {existing.name}")
            print(f"  ID: {existing.id}")
            print(f"  Active: {existing.is_active}")
            
            # Ensure it's active
            if not existing.is_active:
                print("  Activating property...")
                # Update to active
                updated = await supabase.update_property(test_property_id, {"is_active": True})
                print("  ✓ Property activated")
            
            return existing
    except:
        pass  # Property doesn't exist
    
    # Create test property
    print("Creating test property...")
    
    from datetime import datetime, timezone
    
    test_property = Property(
        id=test_property_id,
        name="Test Hotel - Demo",
        address="123 Test Street",
        city="Test City",
        state="CA",
        zip_code="90210",
        phone="555-000-1234",
        email="info@testhotel.com",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    try:
        created = await supabase.create_property(test_property)
        print(f"✓ Test property created successfully!")
        print(f"  ID: {created.id}")
        print(f"  Name: {created.name}")
        return created
    except Exception as e:
        print(f"✗ Error creating property: {e}")
        
        # Try to get any active property
        print("\nLooking for any active property...")
        properties = await supabase.get_all_properties()
        active_props = [p for p in properties if p.is_active]
        
        if active_props:
            prop = active_props[0]
            print(f"✓ Found active property: {prop.name}")
            print(f"  ID: {prop.id}")
            print(f"\n⚠️  Update PROPERTY_ID in test script to: {prop.id}")
            return prop
        else:
            print("✗ No active properties found")
            return None

async def main():
    property = await ensure_test_property()
    
    if property:
        print("\n" + "=" * 60)
        print("✅ PROPERTY READY FOR TESTING")
        print(f"Property ID: {property.id}")
        print(f"Property Name: {property.name}")
        print("=" * 60)
        return property
    else:
        print("\n" + "=" * 60)
        print("❌ COULD NOT SET UP TEST PROPERTY")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())