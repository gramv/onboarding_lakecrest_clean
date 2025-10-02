#!/usr/bin/env python3
"""
Add /api/ prefix to all backend endpoints that don't have it yet
"""

import re
from pathlib import Path
import shutil
from datetime import datetime

# File path
FILE_PATH = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend/app/main_enhanced.py")

# Create backup
def create_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = FILE_PATH.parent / f"{FILE_PATH.stem}_backup_{timestamp}{FILE_PATH.suffix}"
    shutil.copy2(FILE_PATH, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

# Endpoints that already have /api/ versions (to skip)
ALREADY_HAS_API = [
    '/api/hr/dashboard-stats',
    '/api/manager/property', 
    '/api/manager/dashboard-stats',
    '/api/hr/properties/{property_id}/stats',
]

def add_api_prefixes():
    with open(FILE_PATH, 'r') as f:
        lines = f.readlines()
    
    modified_lines = []
    changes_made = 0
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is an endpoint decorator
        match = re.match(r'^@app\.(get|post|put|delete|patch)\("([^"]+)"', line)
        
        if match:
            method = match.group(1)
            path = match.group(2)
            
            # Skip if it already has /api/ prefix
            if path.startswith('/api/'):
                modified_lines.append(line)
                i += 1
                continue
            
            # Check if the next line is already the /api/ version
            api_path = f'/api{path}'
            next_line_is_api = False
            
            if i + 1 < len(lines):
                next_match = re.match(r'^@app\.(get|post|put|delete|patch)\("([^"]+)"', lines[i + 1])
                if next_match and next_match.group(2) == api_path:
                    next_line_is_api = True
            
            if not next_line_is_api:
                # Add the original line
                modified_lines.append(line)
                # Add the /api/ version
                api_line = f'@app.{method}("{api_path}"'
                
                # Copy any parameters from the original line
                if ',' in line:
                    params = line[line.index(','):]
                    api_line += params
                else:
                    api_line += ')\n'
                
                modified_lines.append(api_line)
                changes_made += 1
                print(f"Added {api_path} ({method.upper()})")
            else:
                # Already has /api/ version, just keep original
                modified_lines.append(line)
        else:
            modified_lines.append(line)
        
        i += 1
    
    return ''.join(modified_lines), changes_made

def main():
    print("Adding /api/ prefixes to backend endpoints...")
    
    # Create backup
    backup_path = create_backup()
    
    try:
        # Add API prefixes
        new_content, changes = add_api_prefixes()
        
        if changes > 0:
            # Write the updated content
            with open(FILE_PATH, 'w') as f:
                f.write(new_content)
            
            print(f"\nSuccessfully added {changes} /api/ endpoint(s)")
            print(f"Backup saved at: {backup_path}")
        else:
            print("No changes were needed - all endpoints already have /api/ versions")
            
    except Exception as e:
        print(f"Error: {e}")
        print(f"Restoring from backup...")
        shutil.copy2(backup_path, FILE_PATH)
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())