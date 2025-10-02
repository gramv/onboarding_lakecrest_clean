#!/usr/bin/env python3
"""
Safe Endpoint Consolidation Script
Comments out duplicate endpoints and adds consolidated versions
Can be reversed if issues arise
"""

import re
import shutil
from datetime import datetime
from pathlib import Path

def create_backup(file_path):
    """Create a backup of the file before modification"""
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def comment_out_lines(content, start_line, end_line):
    """Comment out lines in the content"""
    lines = content.split('\n')
    for i in range(start_line - 1, min(end_line, len(lines))):
        if lines[i] and not lines[i].strip().startswith('#'):
            lines[i] = '# DEPRECATED: ' + lines[i]
    return '\n'.join(lines)

def add_consolidated_import(content):
    """Add import for consolidated endpoints"""
    import_statement = """
# Import consolidated endpoints (Phase 2: API Consolidation)
from .consolidated_endpoints import ConsolidatedEndpoints
from .endpoint_migration import apply_endpoint_migrations
"""
    
    # Find where to insert (after other imports)
    lines = content.split('\n')
    insert_index = 0
    
    for i, line in enumerate(lines):
        if line.startswith('from .') or line.startswith('import '):
            insert_index = i + 1
        elif insert_index > 0 and line and not line.startswith('from') and not line.startswith('import'):
            break
    
    lines.insert(insert_index, import_statement)
    return '\n'.join(lines)

def add_consolidated_initialization(content):
    """Add initialization of consolidated endpoints"""
    init_code = """
# Initialize consolidated endpoints (Phase 2: API Consolidation)
consolidated_endpoints = ConsolidatedEndpoints(supabase_service)
migration_helper = apply_endpoint_migrations(app, consolidated_endpoints)
"""
    
    # Find where to add (after app initialization)
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'app = FastAPI(' in line:
            # Find the end of FastAPI initialization
            j = i
            while j < len(lines) and ')' not in lines[j]:
                j += 1
            # Insert after the initialization
            lines.insert(j + 2, init_code)
            break
    
    return '\n'.join(lines)

def replace_duplicate_endpoints(content):
    """Replace duplicate endpoints with consolidated versions"""
    
    # Define the duplicate endpoint patterns and their replacements
    duplicates = [
        {
            'pattern': r'@app\.get\("/api/hr/applications".*?\n(?:.*?\n){100}',  # Line 2978
            'line_start': 2978,
            'replacement': '''
# CONSOLIDATED: Using unified applications endpoint
@app.get("/api/hr/applications", deprecated=True)
async def get_hr_applications_deprecated(*args, **kwargs):
    """DEPRECATED: Use consolidated endpoint"""
    return await consolidated_endpoints.get_applications_unified(*args, **kwargs)
'''
        },
        {
            'pattern': r'@app\.get\("/api/hr/managers".*?\n(?:.*?\n){50}',  # Line 3086
            'line_start': 3086,
            'replacement': '''
# CONSOLIDATED: Using unified managers endpoint
@app.get("/api/hr/managers", deprecated=True)
async def get_hr_managers_deprecated(*args, **kwargs):
    """DEPRECATED: Use consolidated endpoint"""
    return await consolidated_endpoints.get_managers_unified(*args, **kwargs)
'''
        },
        {
            'pattern': r'@app\.get\("/api/hr/employees".*?\n(?:.*?\n){50}',  # Line 3118
            'line_start': 3118,
            'replacement': '''
# CONSOLIDATED: Using unified employees endpoint
@app.get("/api/hr/employees", deprecated=True)
async def get_hr_employees_deprecated(*args, **kwargs):
    """DEPRECATED: Use consolidated endpoint"""
    return await consolidated_endpoints.get_employees_unified(*args, **kwargs)
'''
        }
    ]
    
    # Comment out the duplicate endpoints
    lines = content.split('\n')
    
    # Mark lines for commenting
    comment_ranges = [
        (2978, 3026),  # Second /api/hr/applications
        (3086, 3116),  # Second /api/hr/managers  
        (3118, 3156)   # Second /api/hr/employees
    ]
    
    for start, end in comment_ranges:
        for i in range(start - 1, min(end, len(lines))):
            if i < len(lines) and lines[i] and not lines[i].strip().startswith('#'):
                lines[i] = '# DUPLICATE: ' + lines[i]
    
    return '\n'.join(lines)

def main():
    """Main consolidation function"""
    file_path = Path(__file__).parent.parent.parent / 'app' / 'main_enhanced.py'
    
    if not file_path.exists():
        print(f"Error: {file_path} not found")
        return 1
    
    print(f"Processing: {file_path}")
    
    # Create backup
    backup_path = create_backup(file_path)
    
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Step 1: Add imports
        print("Adding consolidated endpoint imports...")
        content = add_consolidated_import(content)
        
        # Step 2: Add initialization
        print("Adding consolidated endpoint initialization...")
        content = add_consolidated_initialization(content)
        
        # Step 3: Comment out duplicate endpoints
        print("Commenting out duplicate endpoints...")
        content = replace_duplicate_endpoints(content)
        
        # Write the modified content
        with open(file_path, 'w') as f:
            f.write(content)
        
        print("✅ Endpoint consolidation complete!")
        print(f"Backup saved at: {backup_path}")
        print("\nNext steps:")
        print("1. Start the backend server")
        print("2. Test all endpoints")
        print("3. Monitor /api/admin/migration-status for deprecation tracking")
        print("\nTo rollback if needed:")
        print(f"  cp {backup_path} {file_path}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Error during consolidation: {e}")
        print(f"Restoring from backup...")
        shutil.copy2(backup_path, file_path)
        print("Backup restored.")
        return 1

if __name__ == "__main__":
    exit(main())