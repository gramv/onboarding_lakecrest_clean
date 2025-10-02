#!/usr/bin/env python3
import os
import re

# List of files to update
files = [
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/PersonalInfoStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/CompanyPoliciesStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/W4FormStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/DirectDepositStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/WelcomeStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9Section1Step.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/WeaponsPolicyStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/TraffickingAwarenessStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/DocumentUploadStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9CompleteStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9Section2Step.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/I9SupplementsStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/JobDetailsStep.tsx",
    "/Users/gouthamvemula/onbfinaldev/frontend/hotel-onboarding-frontend/src/pages/onboarding/FinalReviewStep.tsx",
]

def remove_navigation_buttons(file_path):
    """Remove NavigationButtons import and usage from a file"""
    with open(file_path, 'r') as f:
        content = f.read()

    original_content = content

    # Remove the import statement
    content = re.sub(r"import \{ NavigationButtons \} from ['\"]\@/components/navigation/NavigationButtons['\"].*?\n", "", content)

    # Remove NavigationButtons component usage
    # This regex handles multi-line NavigationButtons components
    content = re.sub(r"<NavigationButtons[\s\S]*?/>\n?", "", content)

    # Clean up any extra blank lines that might have been created
    content = re.sub(r"\n\n\n+", "\n\n", content)

    # Only write if changes were made
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        return True
    return False

# Process all files
for file_path in files:
    if os.path.exists(file_path):
        if remove_navigation_buttons(file_path):
            print(f"✓ Updated: {os.path.basename(file_path)}")
        else:
            print(f"✗ No changes needed: {os.path.basename(file_path)}")
    else:
        print(f"✗ File not found: {os.path.basename(file_path)}")