#!/usr/bin/env python3
"""
Detailed check of property_managers table
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

async def check_detailed():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    print("Property Managers Table Detailed Check")
    print("=" * 60)
    
    # Get all columns
    columns = await conn.fetch("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'property_managers'
        ORDER BY ordinal_position
    """)
    
    print("\nColumns in property_managers:")
    for col in columns:
        print(f"  - {col['column_name']}: {col['data_type']}")
    
    # Check if user_id exists
    has_user_id = await conn.fetchval("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'property_managers' 
            AND column_name = 'user_id'
        )
    """)
    
    # Check if manager_id exists
    has_manager_id = await conn.fetchval("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'property_managers' 
            AND column_name = 'manager_id'
        )
    """)
    
    print(f"\nColumn existence check:")
    print(f"  - has 'user_id' column: {has_user_id}")
    print(f"  - has 'manager_id' column: {has_manager_id}")
    
    # Check constraints
    constraints = await conn.fetch("""
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'property_managers'::regclass
    """)
    
    print(f"\nConstraints:")
    for constraint in constraints:
        print(f"  - {constraint['conname']}")
        print(f"    {constraint['definition']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_detailed())