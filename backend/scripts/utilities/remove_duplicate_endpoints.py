#!/usr/bin/env python3
"""
Remove duplicate backend endpoints (keeping only /api/ versions)
Since all frontend now uses /api/ prefix, we can safely remove the non-/api/ versions
"""

import re
from pathlib import Path
from datetime import datetime
import shutil

# Path to the backend file
BACKEND_FILE = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend/app/main_enhanced.py")

def create_backup():
    """Create a backup of the file before modifying"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKEND_FILE.parent / f"{BACKEND_FILE.stem}_backup_cleanup_{timestamp}{BACKEND_FILE.suffix}"
    shutil.copy2(BACKEND_FILE, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def remove_duplicate_endpoints():
    """Remove non-/api/ endpoint decorators when /api/ version exists"""
    
    with open(BACKEND_FILE, 'r') as f:
        lines = f.readlines()
    
    # Track which endpoints have /api/ versions
    api_endpoints = set()
    
    # First pass: collect all /api/ endpoints
    for line in lines:
        match = re.match(r'^@app\.(get|post|put|delete|patch)\("(/api/[^"]+)"', line)
        if match:
            method = match.group(1)
            path = match.group(2).replace('/api', '')  # Remove /api to get base path
            api_endpoints.add((method, path))
    
    print(f"Found {len(api_endpoints)} endpoints with /api/ prefix")
    
    # Second pass: remove duplicates
    new_lines = []
    removed_count = 0
    skip_next = False
    
    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue
            
        # Check if this is a non-/api/ endpoint
        match = re.match(r'^@app\.(get|post|put|delete|patch)\("(/[^"]+)"', line)
        
        if match and not match.group(2).startswith('/api/'):
            method = match.group(1)
            path = match.group(2)
            
            # Check if we have an /api/ version of this endpoint
            if (method, path) in api_endpoints:
                # Check if the next line is the /api/ version
                if i + 1 < len(lines):
                    next_match = re.match(r'^@app\.(get|post|put|delete|patch)\("(/api' + re.escape(path) + r')"', lines[i + 1])
                    if next_match and next_match.group(1) == method:
                        # Skip this non-/api/ line, keep the /api/ one
                        print(f"  Removing duplicate: @app.{method}(\"{path}\")")
                        removed_count += 1
                        continue
        
        new_lines.append(line)
    
    return ''.join(new_lines), removed_count

def main():
    print("Removing duplicate backend endpoints...")
    print("=" * 60)
    
    # Create backup
    backup_path = create_backup()
    
    try:
        # Remove duplicates
        new_content, removed = remove_duplicate_endpoints()
        
        if removed > 0:
            # Write the updated content
            with open(BACKEND_FILE, 'w') as f:
                f.write(new_content)
            
            print(f"\n✅ Successfully removed {removed} duplicate endpoint(s)")
            print(f"Backup saved at: {backup_path}")
        else:
            print("\n✅ No duplicates found to remove")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"Restoring from backup...")
        shutil.copy2(backup_path, BACKEND_FILE)
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())