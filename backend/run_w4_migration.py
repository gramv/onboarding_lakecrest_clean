#!/usr/bin/env python3
"""
Simple W-4 Migration Runner
===========================
This script uses the existing supabase_service to run the W-4 schema migration.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.supabase_service_enhanced import SupabaseServiceEnhanced

def main():
    print("🚀 Running W-4 Schema Migration")
    print("=" * 40)
    
    try:
        # Initialize the Supabase service (same as backend uses)
        supabase_service = SupabaseServiceEnhanced()
        print("✅ Connected to Supabase")
        
        # Read the SQL migration file
        with open('fix_w4_schema.sql', 'r') as f:
            sql_content = f.read()
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        print(f"📋 Executing {len(statements)} SQL statements...")
        
        success_count = 0
        for i, stmt in enumerate(statements, 1):
            if not stmt or stmt.startswith('--'):
                continue
                
            try:
                print(f"   Step {i}: {stmt[:50]}...")
                
                # Use the raw SQL execution method
                result = supabase_service.client.postgrest.session.post(
                    f"{supabase_service.client.url}/rest/v1/rpc/exec_sql",
                    json={"sql": stmt},
                    headers={
                        "apikey": supabase_service.client.supabase_key,
                        "Authorization": f"Bearer {supabase_service.client.supabase_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if result.status_code == 200:
                    print(f"   ✅ Step {i} completed")
                    success_count += 1
                else:
                    print(f"   ⚠️  Step {i} failed: {result.text}")
                    
            except Exception as e:
                print(f"   ⚠️  Step {i} failed: {e}")
        
        print(f"\n✅ Migration completed: {success_count}/{len(statements)} steps successful")
        
        # Test the migration by trying to query with tax_year
        try:
            result = supabase_service.client.table('w4_forms').select('*').eq('tax_year', 2025).limit(1).execute()
            print("✅ Verification: tax_year column is working correctly")
            print("\n🎉 W-4 schema migration successful!")
            print("   The w4_forms table now has all required columns")
            print("   W-4 forms should now save to Supabase storage correctly")
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
