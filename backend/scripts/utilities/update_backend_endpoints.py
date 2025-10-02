#!/usr/bin/env python3
"""
Script to update backend endpoints to use /api/ prefix
This script will:
1. Read the main_enhanced.py file
2. Add /api/ prefix to endpoints that don't have it
3. Keep old endpoints working temporarily for safety
4. Create a backup before making changes
"""

import re
import shutil
from datetime import datetime
from pathlib import Path

# Path to the backend file
BACKEND_FILE = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend/app/main_enhanced.py")

# Create backup first
def create_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKEND_FILE.parent / f"{BACKEND_FILE.stem}_backup_{timestamp}{BACKEND_FILE.suffix}"
    shutil.copy2(BACKEND_FILE, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

# Endpoints that need /api/ prefix added
ENDPOINTS_TO_UPDATE = [
    # Authentication endpoints
    ('/healthz', 'GET'),
    ('/auth/login', 'POST'),
    ('/auth/refresh', 'POST'),
    ('/auth/logout', 'POST'),
    ('/auth/me', 'GET'),
    
    # Manager endpoints
    ('/manager/applications', 'GET'),
    ('/manager/property', 'GET'),
    ('/manager/dashboard-stats', 'GET'),
    ('/manager/applications/stats', 'GET'),
    ('/manager/applications/departments', 'GET'),
    ('/manager/applications/positions', 'GET'),
    
    # HR endpoints (without /api/)
    ('/hr/dashboard-stats', 'GET'),
    ('/hr/properties', 'GET'),
    ('/hr/properties', 'POST'),
    ('/hr/properties/{id}', 'PUT'),
    ('/hr/properties/{id}', 'DELETE'),
    ('/hr/properties/{property_id}/stats', 'GET'),
    ('/hr/properties/{id}/managers', 'GET'),
    ('/hr/properties/{id}/managers', 'POST'),
    ('/hr/properties/{id}/managers/{manager_id}', 'DELETE'),
    ('/hr/applications', 'GET'),
    ('/hr/applications/talent-pool', 'GET'),
    ('/hr/applications/{id}/reactivate', 'POST'),
    ('/hr/users', 'GET'),
    ('/hr/managers', 'GET'),
    ('/hr/managers', 'POST'),
    ('/hr/employees', 'GET'),
    ('/hr/employees/{id}', 'GET'),
    ('/hr/applications/departments', 'GET'),
    ('/hr/applications/positions', 'GET'),
    ('/hr/applications/stats', 'GET'),
    ('/hr/applications/{id}/history', 'GET'),
    ('/hr/managers/{id}', 'GET'),
    ('/hr/managers/{id}', 'PUT'),
    ('/hr/managers/{id}', 'DELETE'),
    ('/hr/managers/{id}/reactivate', 'POST'),
    ('/hr/managers/{id}/reset-password', 'POST'),
    ('/hr/managers/{id}/performance', 'GET'),
    ('/hr/managers/unassigned', 'GET'),
    ('/hr/employees/search', 'GET'),
    ('/hr/employees/{employee_id}/status', 'PUT'),
    ('/hr/employees/stats', 'GET'),
    ('/hr/applications/bulk-action', 'POST'),
    ('/hr/applications/bulk-status-update', 'POST'),
    ('/hr/applications/bulk-reactivate', 'POST'),
    ('/hr/applications/bulk-talent-pool', 'POST'),
    ('/hr/applications/bulk-talent-pool-notify', 'POST'),
    
    # Application endpoints
    ('/applications/{id}/approve', 'POST'),
    ('/applications/{id}/approve-enhanced', 'POST'),
    ('/applications/{id}/reject', 'POST'),
    ('/applications/{id}/reject-enhanced', 'POST'),
    ('/applications/check-duplicate', 'POST'),
    ('/apply/{id}', 'POST'),
    
    # Property endpoints
    ('/properties/{id}/info', 'GET'),
    
    # Notification endpoints
    ('/notifications', 'GET'),
    ('/notifications/count', 'GET'),
    ('/notifications/mark-read', 'POST'),
    
    # Onboarding endpoints (non-/api/)
    ('/onboard/verify', 'GET'),
    ('/onboard/update-progress', 'POST'),
    
    # Secret endpoints
    ('/secret/create-hr', 'POST'),
    ('/secret/create-manager', 'POST'),
]

def update_endpoints():
    # Read the file
    with open(BACKEND_FILE, 'r') as f:
        content = f.read()
    
    # Track changes
    changes_made = []
    
    # For each endpoint that needs updating
    for endpoint, method in ENDPOINTS_TO_UPDATE:
        method_lower = method.lower()
        
        # Pattern to find the decorator
        # Look for @app.METHOD("ENDPOINT"
        pattern = f'@app\\.{method_lower}\\("{re.escape(endpoint)}"'
        
        # Check if this endpoint exists
        if re.search(pattern, content):
            # Find the line number for reference
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    print(f"Found {method} {endpoint} at line {i}")
                    
                    # Add the new /api/ version right after the original
                    # Find the full function definition
                    func_start = i - 1
                    func_end = func_start
                    
                    # Find where the function ends (next @app. decorator or end of file)
                    for j in range(func_start + 1, len(lines)):
                        if lines[j].startswith('@app.') or j == len(lines) - 1:
                            func_end = j - 1
                            break
                    
                    # Extract the function
                    func_lines = lines[func_start:func_end + 1]
                    
                    # Get the function name
                    func_match = re.search(r'async def (\w+)\(', '\n'.join(func_lines))
                    if func_match:
                        func_name = func_match.group(1)
                        
                        # Create the new decorator line with /api/ prefix
                        new_decorator = f'@app.{method_lower}("/api{endpoint}")'
                        
                        # Insert the new decorator before the function
                        # Find the position to insert
                        insert_pos = func_start
                        lines.insert(insert_pos, new_decorator)
                        
                        changes_made.append(f"Added /api{endpoint} ({method}) -> {func_name}")
                        
                        # Update content
                        content = '\n'.join(lines)
                        break
    
    return content, changes_made

def main():
    print("Starting backend endpoint update...")
    print(f"Processing: {BACKEND_FILE}")
    
    # Create backup
    backup_path = create_backup()
    
    try:
        # Update endpoints
        new_content, changes = update_endpoints()
        
        if changes:
            print(f"\nMade {len(changes)} changes:")
            for change in changes:
                print(f"  - {change}")
            
            # Write the updated content
            with open(BACKEND_FILE, 'w') as f:
                f.write(new_content)
            
            print(f"\nSuccessfully updated {BACKEND_FILE}")
            print(f"Backup saved at: {backup_path}")
        else:
            print("No changes were needed")
            
    except Exception as e:
        print(f"Error: {e}")
        print(f"Backup is available at: {backup_path}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())