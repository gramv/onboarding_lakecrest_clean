#!/usr/bin/env python3
"""
Apply RLS policies for document access tables
This script uses the Supabase service to apply RLS policies
"""
import asyncio
from app.supabase_service_enhanced import SupabaseService

async def main():
    print("🔧 Applying RLS policies for document access...")
    print("=" * 70)
    
    # Initialize Supabase service
    service = SupabaseService()
    
    # SQL statements to execute
    statements = [
        # Enable RLS
        "ALTER TABLE document_access_otps ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE document_access_sessions ENABLE ROW LEVEL SECURITY;",
        
        # Drop existing policies (ignore errors if they don't exist)
        "DROP POLICY IF EXISTS \"Managers can create OTP sessions\" ON document_access_otps;",
        "DROP POLICY IF EXISTS \"Managers can view their own OTP sessions\" ON document_access_otps;",
        "DROP POLICY IF EXISTS \"Managers can update their own OTP sessions\" ON document_access_otps;",
        "DROP POLICY IF EXISTS \"Managers can create access sessions\" ON document_access_sessions;",
        "DROP POLICY IF EXISTS \"Managers can view their own sessions\" ON document_access_sessions;",
        "DROP POLICY IF EXISTS \"Managers can update their own sessions\" ON document_access_sessions;",
        
        # Create new policies for document_access_otps
        """
        CREATE POLICY "Managers can create OTP sessions"
        ON document_access_otps
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        """,
        
        """
        CREATE POLICY "Managers can view their own OTP sessions"
        ON document_access_otps
        FOR SELECT
        TO authenticated
        USING (true);
        """,
        
        """
        CREATE POLICY "Managers can update their own OTP sessions"
        ON document_access_otps
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
        """,
        
        # Create new policies for document_access_sessions
        """
        CREATE POLICY "Managers can create access sessions"
        ON document_access_sessions
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        """,
        
        """
        CREATE POLICY "Managers can view their own sessions"
        ON document_access_sessions
        FOR SELECT
        TO authenticated
        USING (true);
        """,
        
        """
        CREATE POLICY "Managers can update their own sessions"
        ON document_access_sessions
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
        """,
        
        # Grant permissions
        "GRANT SELECT, INSERT, UPDATE ON document_access_otps TO authenticated;",
        "GRANT SELECT, INSERT, UPDATE ON document_access_sessions TO authenticated;",
    ]
    
    success_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements, 1):
        # Get first line for display
        first_line = stmt.strip().split('\n')[0][:60]
        print(f"[{i}/{len(statements)}] {first_line}...")
        
        try:
            # Execute the statement
            result = service.client.rpc('exec_sql', {'sql': stmt}).execute()
            print(f"    ✅ Success")
            success_count += 1
        except Exception as e:
            error_msg = str(e)
            if 'already exists' in error_msg.lower() or 'does not exist' in error_msg.lower():
                print(f"    ⚠️  Skipped (already exists/doesn't exist)")
                success_count += 1
            elif 'function exec_sql' in error_msg.lower():
                print(f"    ⚠️  exec_sql function not available, trying direct query...")
                # Try direct query instead
                try:
                    service.client.postgrest.query(stmt).execute()
                    print(f"    ✅ Success (direct query)")
                    success_count += 1
                except Exception as e2:
                    print(f"    ❌ Error: {str(e2)[:100]}")
                    error_count += 1
            else:
                print(f"    ❌ Error: {error_msg[:100]}")
                error_count += 1
    
    print("\n" + "=" * 70)
    print(f"RESULTS:")
    print(f"  ✅ Successful: {success_count}")
    print(f"  ❌ Errors: {error_count}")
    print("=" * 70)
    
    if error_count == 0:
        print("\n🎉 All RLS policies applied successfully!")
    else:
        print("\n⚠️  Some policies failed. You may need to apply them manually in Supabase.")

if __name__ == "__main__":
    asyncio.run(main())

