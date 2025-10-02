#!/usr/bin/env python3
"""
Fix all frontend API path issues:
1. Add /api prefix to onboarding endpoints
2. Remove demo- checks that prevent cloud sync
3. Fix double /api/api/ prefixes
"""

import os
import re
from pathlib import Path
from datetime import datetime

# Define the fixes needed
FIXES = [
    # Fix 1: Add /api prefix to onboarding endpoints
    {
        'files': [
            'src/pages/onboarding/DirectDepositStep.tsx',
            'src/pages/onboarding/HealthInsuranceStep.tsx',
            'src/pages/onboarding/I9CompleteStep.tsx',
            'src/pages/onboarding/W4FormStep.tsx',
        ],
        'pattern': r'\$\{apiUrl\}/onboarding/',
        'replacement': '${apiUrl}/api/onboarding/',
        'description': 'Add /api prefix to onboarding endpoints'
    },
    
    # Fix 2: Remove demo- checks that prevent cloud sync
    {
        'files': [
            'src/pages/onboarding/I9Section1Step.tsx',
            'src/pages/onboarding/I9Section2Step.tsx',
            'src/pages/onboarding/I9CompleteStep.tsx',
            'src/components/I9Section1FormClean.tsx',
        ],
        'pattern': r'(employee(?:\?)?\.id (?:&& )?)\!employee\.id\.startsWith\([\'"]demo-[\'"]\)',
        'replacement': r'\1',  # Just keep the employee?.id part
        'description': 'Remove demo- checks'
    },
    
    # Fix 3: Also handle the test- variant
    {
        'files': [
            'src/components/I9Section1FormClean.tsx',
        ],
        'pattern': r'(employeeId (?:&& )?)\!employeeId\.startsWith\([\'"]test-[\'"]\) && \!employeeId\.startsWith\([\'"]demo-[\'"]\)',
        'replacement': r'\1',
        'description': 'Remove test- and demo- checks'
    },
    
    # Fix 4: Fix double /api/api/ prefixes
    {
        'files': [
            'src/components/OfficialI9Display.tsx',
            'src/components/OfficialW4Display.tsx',
        ],
        'pattern': r'/api/api/',
        'replacement': '/api/',
        'description': 'Fix double /api/api/ prefixes'
    },
    
    # Fix 5: Fix apiUrl default value 
    {
        'files': [
            'src/pages/onboarding/DirectDepositStep.tsx',
            'src/pages/onboarding/HealthInsuranceStep.tsx',
            'src/pages/onboarding/I9CompleteStep.tsx',
            'src/pages/onboarding/W4FormStep.tsx',
            'src/pages/onboarding/I9Section1Step.tsx',
            'src/pages/onboarding/I9Section2Step.tsx',
        ],
        'pattern': r"const apiUrl = import\.meta\.env\.VITE_API_URL \|\| '/api'",
        'replacement': "const apiUrl = import.meta.env.VITE_API_URL || ''",
        'description': 'Fix apiUrl default value'
    },
]

def main():
    frontend_dir = Path('/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-frontend')
    
    print("Fixing frontend API paths...")
    print("=" * 60)
    
    total_changes = 0
    
    for fix in FIXES:
        print(f"\n{fix['description']}:")
        print("-" * 40)
        
        for file_path in fix['files']:
            full_path = frontend_dir / file_path
            
            if not full_path.exists():
                print(f"  ⚠️  File not found: {file_path}")
                continue
                
            # Read file
            with open(full_path, 'r') as f:
                content = f.read()
                original_content = content
            
            # Apply fix
            content, count = re.subn(fix['pattern'], fix['replacement'], content)
            
            if count > 0:
                # Write back
                with open(full_path, 'w') as f:
                    f.write(content)
                print(f"  ✅ {file_path}: {count} change(s)")
                total_changes += count
            else:
                print(f"  ⏭️  {file_path}: No changes needed")
    
    print("\n" + "=" * 60)
    print(f"✅ Fixed {total_changes} issue(s) across all files")
    
    # Create a summary file
    summary_path = frontend_dir / 'api_fixes_summary.txt'
    with open(summary_path, 'w') as f:
        f.write(f"API Path Fixes Applied - {datetime.now()}\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Total changes made: {total_changes}\n\n")
        f.write("Fixes applied:\n")
        for fix in FIXES:
            f.write(f"- {fix['description']}\n")
            for file_path in fix['files']:
                f.write(f"  - {file_path}\n")
    
    print(f"\n📄 Summary saved to: {summary_path}")

if __name__ == "__main__":
    main()