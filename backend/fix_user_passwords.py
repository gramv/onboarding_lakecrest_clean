#!/usr/bin/env python3
"""
Fix users without password_hash by setting a default password
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import asyncpg
import bcrypt

# Load environment variables
env_path = Path(__file__).parent / '.env.test'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

async def fix_passwords():
    """Fix users without password_hash"""
    
    print("=" * 80)
    print("Fixing User Password Hashes")
    print("=" * 80)
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Find users without password_hash
    users_without_hash = await conn.fetch("""
        SELECT id, email, role
        FROM users
        WHERE password_hash IS NULL OR password_hash = ''
    """)
    
    if not users_without_hash:
        print("✓ All users already have password_hash")
        await conn.close()
        return True
    
    print(f"\nFound {len(users_without_hash)} users without password_hash:")
    for user in users_without_hash:
        print(f"  - {user['email']} (role: {user['role']})")
    
    # Set default passwords based on role
    print("\nSetting default passwords...")
    
    for user in users_without_hash:
        # Use a default password based on role
        if user['role'] == 'hr':
            default_password = 'hr123456'
        elif user['role'] == 'manager':
            default_password = 'manager123456'
        else:
            default_password = 'password123456'
        
        # Hash the password
        password_hash = bcrypt.hashpw(
            default_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Update the user
        await conn.execute("""
            UPDATE users
            SET password_hash = $1,
                must_change_password = true
            WHERE id = $2
        """, password_hash, user['id'])
        
        print(f"  ✓ Updated {user['email']} with default password: {default_password}")
    
    # Verify all users now have password_hash
    remaining = await conn.fetchval("""
        SELECT COUNT(*)
        FROM users
        WHERE password_hash IS NULL OR password_hash = ''
    """)
    
    if remaining == 0:
        print("\n✓ All users now have password_hash")
        print("\nDefault passwords set (users must change on first login):")
        print("  - HR users: hr123456")
        print("  - Manager users: manager123456")
        print("  - Other users: password123456")
        success = True
    else:
        print(f"\n✗ Still {remaining} users without password_hash")
        success = False
    
    await conn.close()
    return success

async def main():
    success = await fix_passwords()
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())