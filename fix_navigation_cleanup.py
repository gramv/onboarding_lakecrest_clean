#!/usr/bin/env python3
import os
import re

# Files reported with errors and their line numbers
files_with_errors = [
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/DocumentUploadStep.tsx", 546),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/FinalReviewStep.tsx", 347),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx", 311),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9CompleteStep.tsx", 916),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9Section1Step.tsx", 451),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9Section2Step.tsx", 609),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/JobDetailsStep.tsx", 265),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/TraffickingAwarenessStep.tsx", 145),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/WeaponsPolicyStep.tsx", 528),
    ("/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/WelcomeStep.tsx", 188),
]

def fix_navigation_cleanup(file_path, error_line):
    """Fix orphaned NavigationButtons-related code"""
    with open(file_path, 'r') as f:
        lines = f.readlines()

    # Look for patterns around the error line
    # Usually it's a conditional block that wrapped NavigationButtons
    start_check = max(0, error_line - 10)
    end_check = min(len(lines), error_line + 5)

    fixed = False

    # Check for orphaned conditional wrappers
    for i in range(start_check, end_check):
        if i < len(lines):
            line = lines[i]

            # Pattern 1: Empty conditional with just closing
            if re.search(r'^\s*\)\}\s*$', line) or re.search(r'^\s*\)\s*\}\s*$', line):
                # Check if the previous lines have an opening conditional
                if i > 0 and i < len(lines):
                    prev_lines = "".join(lines[max(0, i-3):i])
                    if '{/*' in prev_lines or '{timerComplete &&' in prev_lines or '{!isSigned &&' in prev_lines or '{showNavigation &&' in prev_lines:
                        # Remove the orphaned closing
                        lines[i] = ''
                        fixed = True

            # Pattern 2: Orphaned props (lines with just props and no component)
            elif 'onNext=' in line or 'onPrevious=' in line or 'canGoNext=' in line or 'canGoPrevious=' in line:
                # If this is an orphaned prop line, remove it
                lines[i] = ''
                fixed = True

    # Clean up comments about NavigationButtons
    for i in range(len(lines)):
        if 'Navigation Buttons' in lines[i] and '{/*' in lines[i]:
            # Check if the next line has the orphaned conditional
            if i + 1 < len(lines) and ('{timerComplete' in lines[i+1] or '{!isSigned' in lines[i+1] or '{showNavigation' in lines[i+1]):
                lines[i] = ''  # Remove the comment
                if i + 1 < len(lines):
                    # Check for the closing bracket
                    if i + 2 < len(lines) and ')}' in lines[i+2]:
                        lines[i+1] = ''  # Remove the conditional
                        lines[i+2] = ''  # Remove the closing
                        fixed = True

    if fixed:
        # Write back the fixed content
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True

    return False

# Process all files with errors
for file_path, error_line in files_with_errors:
    if os.path.exists(file_path):
        if fix_navigation_cleanup(file_path, error_line):
            print(f"✓ Fixed: {os.path.basename(file_path)} (line {error_line})")
        else:
            print(f"⚠ Manual check needed: {os.path.basename(file_path)} (line {error_line})")
    else:
        print(f"✗ File not found: {os.path.basename(file_path)}")