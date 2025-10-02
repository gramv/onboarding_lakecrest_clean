#!/usr/bin/env python3
"""
Verify HR Manager System schema updates were applied correctly
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

# Load environment variables
env_path = Path(__file__).parent / '.env.test'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

async def verify_schema():
    """Verify all schema changes were applied correctly"""
    
    print("=" * 80)
    print("HR Manager System Schema Verification")
    print("=" * 80)
    
    # Connect with statement_cache_size=0 to avoid pgbouncer issues
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    results = []
    
    # 1. Check property_managers table structure
    print("\n1. Checking property_managers table...")
    columns = await conn.fetch("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'property_managers'
        ORDER BY ordinal_position
    """)
    
    expected_cols = {'user_id', 'property_id', 'created_at'}
    actual_cols = {col['column_name'] for col in columns}
    
    if expected_cols.issubset(actual_cols):
        print("  ✓ property_managers has correct columns")
        for col in columns:
            print(f"    - {col['column_name']}: {col['data_type']}")
        results.append(('property_managers structure', True))
    else:
        print(f"  ✗ Missing columns: {expected_cols - actual_cols}")
        results.append(('property_managers structure', False))
    
    # Check unique constraint
    unique_constraint = await conn.fetchval("""
        SELECT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_user_property'
        )
    """)
    if unique_constraint:
        print("  ✓ unique_user_property constraint exists")
        results.append(('unique_user_property constraint', True))
    else:
        print("  ✗ unique_user_property constraint missing")
        results.append(('unique_user_property constraint', False))
    
    # 2. Check i9_section2 table
    print("\n2. Checking i9_section2 table...")
    i9_exists = await conn.fetchval("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'i9_section2'
        )
    """)
    
    if i9_exists:
        print("  ✓ i9_section2 table exists")
        i9_columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'i9_section2'
            ORDER BY ordinal_position
        """)
        for col in i9_columns:
            print(f"    - {col['column_name']}: {col['data_type']}")
        results.append(('i9_section2 table', True))
    else:
        print("  ✗ i9_section2 table does not exist")
        results.append(('i9_section2 table', False))
    
    # 3. Check application_reviews table
    print("\n3. Checking application_reviews table...")
    reviews_exists = await conn.fetchval("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'application_reviews'
        )
    """)
    
    if reviews_exists:
        print("  ✓ application_reviews table exists")
        review_columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'application_reviews'
            ORDER BY ordinal_position
        """)
        for col in review_columns:
            print(f"    - {col['column_name']}: {col['data_type']}")
        results.append(('application_reviews table', True))
    else:
        print("  ✗ application_reviews table does not exist")
        results.append(('application_reviews table', False))
    
    # 4. Check users table updates
    print("\n4. Checking users table updates...")
    user_columns = await conn.fetch("""
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'users' 
        AND column_name IN ('password_hash', 'is_active', 'must_change_password', 'password')
    """)
    
    user_cols_set = {col['column_name'] for col in user_columns}
    
    if 'password_hash' in user_cols_set:
        print("  ✓ password_hash column exists")
        results.append(('users.password_hash', True))
    else:
        print("  ✗ password_hash column missing")
        results.append(('users.password_hash', False))
    
    if 'password' not in user_cols_set:
        print("  ✓ old password column removed")
        results.append(('password column removed', True))
    else:
        print("  ✗ old password column still exists")
        results.append(('password column removed', False))
    
    if 'is_active' in user_cols_set:
        print("  ✓ is_active column exists")
        results.append(('users.is_active', True))
    else:
        print("  ✗ is_active column missing")
        results.append(('users.is_active', False))
    
    if 'must_change_password' in user_cols_set:
        print("  ✓ must_change_password column exists")
        results.append(('users.must_change_password', True))
    else:
        print("  ✗ must_change_password column missing")
        results.append(('users.must_change_password', False))
    
    # 5. Check indexes
    print("\n5. Checking performance indexes...")
    indexes = await conn.fetch("""
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('users', 'properties', 'job_applications', 'employees', 'i9_section2', 'application_reviews')
        AND indexname LIKE 'idx_%'
    """)
    
    index_names = {idx['indexname'] for idx in indexes}
    expected_indexes = {
        'idx_users_email',
        'idx_users_role',
        'idx_properties_active',
        'idx_applications_property_status',
        'idx_employees_property',
        'idx_i9_section2_employee',
        'idx_reviews_application'
    }
    
    for idx in expected_indexes:
        if idx in index_names:
            print(f"  ✓ {idx} exists")
            results.append((idx, True))
        else:
            print(f"  ✗ {idx} missing")
            results.append((idx, False))
    
    # 6. Test data integrity
    print("\n6. Testing data integrity...")
    
    # Check if any users exist and have proper password_hash
    user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
    users_with_hash = await conn.fetchval("SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL")
    
    print(f"  - Total users: {user_count}")
    print(f"  - Users with password_hash: {users_with_hash}")
    
    if user_count == 0:
        print("  ⚠ No users in database (fresh database)")
    elif users_with_hash == user_count:
        print("  ✓ All users have password_hash")
        results.append(('password migration', True))
    else:
        print(f"  ✗ {user_count - users_with_hash} users missing password_hash")
        results.append(('password migration', False))
    
    await conn.close()
    
    # Summary
    print("\n" + "=" * 80)
    print("Verification Summary")
    print("=" * 80)
    
    passed = sum(1 for _, success in results if success)
    failed = sum(1 for _, success in results if not success)
    
    print(f"Total checks: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n✓ All schema updates verified successfully!")
        print("\nThe database is ready for the HR Manager System.")
        return True
    else:
        print("\n✗ Some schema updates need attention:")
        for check, success in results:
            if not success:
                print(f"  - {check}")
        return False

async def main():
    success = await verify_schema()
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())