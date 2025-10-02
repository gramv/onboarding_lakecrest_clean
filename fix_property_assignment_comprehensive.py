#!/usr/bin/env python3
"""
Comprehensive Property Assignment Fix
Addresses the dual property reference system issue and prevents future problems.
"""

import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def analyze_manager_properties(manager_id: str, email: str) -> Dict[str, Any]:
    """Analyze a manager's property relationships comprehensively"""
    print(f"\n=== ANALYZING {email} ===")
    
    # Get user data
    user_result = supabase.table('users').select('*').eq('id', manager_id).execute()
    if not user_result.data:
        return {"error": "User not found"}
    
    user = user_result.data[0]
    current_property_id = user.get('property_id')
    
    # Get property assignments
    assignments = supabase.table('property_managers').select('*').eq('manager_id', manager_id).execute()
    assigned_properties = [a['property_id'] for a in assignments.data]
    
    # Get employees managed
    employees = supabase.table('employees').select('id, property_id').eq('manager_id', manager_id).execute()
    employee_properties = {}
    for emp in employees.data:
        prop_id = emp['property_id']
        if prop_id not in employee_properties:
            employee_properties[prop_id] = 0
        employee_properties[prop_id] += 1
    
    # Get property names
    all_property_ids = set([current_property_id] + assigned_properties + list(employee_properties.keys()))
    all_property_ids.discard(None)
    
    property_names = {}
    if all_property_ids:
        props_result = supabase.table('properties').select('id, name, city, state').in_('id', list(all_property_ids)).execute()
        for prop in props_result.data:
            property_names[prop['id']] = f"{prop['name']} ({prop['city']}, {prop['state']})"
    
    analysis = {
        "manager_id": manager_id,
        "email": email,
        "current_property_id": current_property_id,
        "current_property_name": property_names.get(current_property_id, "Unknown"),
        "assigned_properties": assigned_properties,
        "assigned_property_names": [property_names.get(p, "Unknown") for p in assigned_properties],
        "employee_properties": employee_properties,
        "employee_property_names": {property_names.get(k, "Unknown"): v for k, v in employee_properties.items()},
        "total_employees": sum(employee_properties.values()),
        "property_names": property_names
    }
    
    print(f"Current property_id: {current_property_id} ({property_names.get(current_property_id, 'Unknown')})")
    print(f"Assigned properties: {len(assigned_properties)}")
    for prop_id in assigned_properties:
        print(f"  - {prop_id} ({property_names.get(prop_id, 'Unknown')})")
    print(f"Employees managed: {analysis['total_employees']} across {len(employee_properties)} properties")
    for prop_id, count in employee_properties.items():
        print(f"  - {count} employees in {property_names.get(prop_id, 'Unknown')}")
    
    return analysis

def determine_primary_property(analysis: Dict[str, Any]) -> str:
    """Determine the primary property for a manager based on business logic"""
    
    # Strategy 1: Property with most employees
    if analysis['employee_properties']:
        primary_by_employees = max(analysis['employee_properties'].items(), key=lambda x: x[1])
        primary_property_id = primary_by_employees[0]
        print(f"Primary property by employee count: {primary_property_id} ({primary_by_employees[1]} employees)")
        return primary_property_id
    
    # Strategy 2: Use first assigned property
    if analysis['assigned_properties']:
        primary_property_id = analysis['assigned_properties'][0]
        print(f"Primary property by assignment: {primary_property_id}")
        return primary_property_id
    
    # Strategy 3: Keep current if it exists
    if analysis['current_property_id']:
        print(f"Keeping current property_id: {analysis['current_property_id']}")
        return analysis['current_property_id']
    
    raise ValueError("Cannot determine primary property")

def fix_manager_property_assignment(manager_id: str, email: str, dry_run: bool = True) -> Dict[str, Any]:
    """Fix property assignment for a single manager"""
    
    # Analyze current state
    analysis = analyze_manager_properties(manager_id, email)
    if "error" in analysis:
        return analysis
    
    # Determine primary property
    try:
        primary_property_id = determine_primary_property(analysis)
    except ValueError as e:
        return {"error": str(e)}
    
    # Determine what needs to be fixed
    fixes_needed = []
    
    # Check if users.property_id needs update
    if analysis['current_property_id'] != primary_property_id:
        fixes_needed.append({
            "type": "update_user_property_id",
            "from": analysis['current_property_id'],
            "to": primary_property_id
        })
    
    # Check if property_managers assignment exists
    if primary_property_id not in analysis['assigned_properties']:
        fixes_needed.append({
            "type": "create_property_assignment",
            "property_id": primary_property_id
        })
    
    print(f"\nFIXES NEEDED:")
    for fix in fixes_needed:
        print(f"  - {fix}")
    
    if not fixes_needed:
        print("✅ No fixes needed - already consistent")
        return {"status": "consistent", "fixes": []}
    
    if dry_run:
        print("🔍 DRY RUN - No changes made")
        return {"status": "dry_run", "fixes": fixes_needed, "primary_property": primary_property_id}
    
    # Apply fixes
    results = []
    for fix in fixes_needed:
        try:
            if fix["type"] == "update_user_property_id":
                result = supabase.table('users').update({
                    'property_id': fix["to"]
                }).eq('id', manager_id).execute()
                
                if result.data:
                    results.append({"fix": fix, "status": "success"})
                    print(f"✅ Updated users.property_id: {fix['from']} -> {fix['to']}")
                else:
                    results.append({"fix": fix, "status": "failed", "error": "No data returned"})
                    print(f"❌ Failed to update users.property_id")
            
            elif fix["type"] == "create_property_assignment":
                result = supabase.table('property_managers').insert({
                    'manager_id': manager_id,
                    'property_id': fix["property_id"],
                    'assigned_at': datetime.now(timezone.utc).isoformat()
                }).execute()
                
                if result.data:
                    results.append({"fix": fix, "status": "success"})
                    print(f"✅ Created property assignment: {fix['property_id']}")
                else:
                    results.append({"fix": fix, "status": "failed", "error": "No data returned"})
                    print(f"❌ Failed to create property assignment")
        
        except Exception as e:
            results.append({"fix": fix, "status": "error", "error": str(e)})
            print(f"❌ Error applying fix {fix}: {e}")
    
    return {
        "status": "completed",
        "fixes": fixes_needed,
        "results": results,
        "primary_property": primary_property_id
    }

def main():
    print("🔧 COMPREHENSIVE PROPERTY ASSIGNMENT FIX")
    print("=" * 50)
    
    # Target users
    target_users = [
        ("23e3e040-e192-47d6-aeee-68471198e4aa", "gvemula@mail.yu.edu"),
        ("7a4836e0-7f4d-41c0-b6fc-934076cf2c86", "vgoutamram@gmail.com")
    ]
    
    # First, run dry run analysis
    print("\n🔍 PHASE 1: DRY RUN ANALYSIS")
    print("=" * 30)
    
    dry_run_results = []
    for manager_id, email in target_users:
        result = fix_manager_property_assignment(manager_id, email, dry_run=True)
        dry_run_results.append((email, result))
    
    # Show summary
    print("\n📊 DRY RUN SUMMARY")
    print("=" * 20)
    for email, result in dry_run_results:
        print(f"\n{email}:")
        if result.get("status") == "consistent":
            print("  ✅ Already consistent")
        elif result.get("status") == "dry_run":
            print(f"  🔧 Needs {len(result['fixes'])} fixes")
            print(f"  🎯 Primary property: {result['primary_property']}")
        else:
            print(f"  ❌ Error: {result.get('error', 'Unknown error')}")
    
    # Ask for confirmation
    print("\n" + "=" * 50)
    response = input("Apply fixes? (yes/no): ").lower().strip()
    
    if response != 'yes':
        print("❌ Aborted by user")
        return
    
    # Apply fixes
    print("\n🚀 PHASE 2: APPLYING FIXES")
    print("=" * 30)
    
    for manager_id, email in target_users:
        print(f"\n🔧 Fixing {email}...")
        result = fix_manager_property_assignment(manager_id, email, dry_run=False)
        
        if result.get("status") == "completed":
            success_count = sum(1 for r in result["results"] if r["status"] == "success")
            total_fixes = len(result["results"])
            print(f"✅ Completed: {success_count}/{total_fixes} fixes successful")
        else:
            print(f"❌ Failed: {result.get('error', 'Unknown error')}")
    
    print("\n🎉 COMPREHENSIVE FIX COMPLETED!")
    print("Please test login for both users.")

if __name__ == "__main__":
    main()
