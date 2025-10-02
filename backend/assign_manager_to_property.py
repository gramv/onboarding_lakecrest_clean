#!/usr/bin/env python3
"""
Assign test manager to property
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env.test
load_dotenv('.env.test')

from app.supabase_service_enhanced import get_enhanced_supabase_service

def assign_manager():
    """Assign test manager to property"""
    service = get_enhanced_supabase_service()
    
    # Get the test manager user
    manager_result = service.client.table('users').select('*').eq('email', 'test-manager@demo.com').execute()
    
    if not manager_result.data:
        print("Test manager not found")
        return
    
    manager_id = manager_result.data[0]['id']
    print(f"Found manager with ID: {manager_id}")
    
    # Check if already assigned
    existing = service.client.table('property_managers').select('*').eq('manager_id', manager_id).execute()
    
    if existing.data:
        print(f"Manager already assigned to {len(existing.data)} properties")
        for prop in existing.data:
            print(f"  - Property: {prop['property_id']}")
    else:
        # Assign to test property
        assignment = {
            "manager_id": manager_id,
            "property_id": "903ed05b-5990-4ecf-b1b2-7592cf2923df"  # Test property
        }
        result = service.client.table('property_managers').insert(assignment).execute()
        
        if result.data:
            print(f"Successfully assigned manager to property!")
        else:
            print(f"Failed to assign manager")

if __name__ == "__main__":
    assign_manager()