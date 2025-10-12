#!/usr/bin/env python3
"""
Deep analysis of Employee model field recognition issue
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.models_enhanced import Employee
from datetime import date, datetime
import json

print("=" * 80)
print("DEEP ANALYSIS: Employee Model Field Recognition")
print("=" * 80)

# Test 1: Check if fields are in the model definition
print("\n1. Checking Employee model fields definition:")
print(f"   Total model fields: {len(Employee.model_fields)}")
print(f"   'manager_review_status' in model_fields: {'manager_review_status' in Employee.model_fields}")
print(f"   'manager_review_completed_at' in model_fields: {'manager_review_completed_at' in Employee.model_fields}")

if 'manager_review_status' in Employee.model_fields:
    field_info = Employee.model_fields['manager_review_status']
    print(f"   manager_review_status field info: {field_info}")
    print(f"   - default: {field_info.default}")
    print(f"   - annotation: {field_info.annotation}")

# Test 2: Create an Employee with minimal required fields
print("\n2. Creating Employee with minimal fields (no manager_review fields):")
emp1 = Employee(
    property_id="test-prop",
    department="Front Desk",
    position="Agent",
    hire_date=date.today()
)
print(f"   Created employee: {emp1.id}")
print(f"   hasattr(emp1, 'manager_review_status'): {hasattr(emp1, 'manager_review_status')}")
print(f"   emp1.manager_review_status: {emp1.manager_review_status}")
print(f"   hasattr(emp1, 'manager_review_completed_at'): {hasattr(emp1, 'manager_review_completed_at')}")
print(f"   emp1.manager_review_completed_at: {emp1.manager_review_completed_at}")

# Test 3: Create an Employee with manager_review fields explicitly set
print("\n3. Creating Employee with manager_review fields explicitly set:")
emp2 = Employee(
    property_id="test-prop",
    department="Front Desk",
    position="Agent",
    hire_date=date.today(),
    manager_review_status="completed",
    manager_review_completed_at=datetime.now()
)
print(f"   Created employee: {emp2.id}")
print(f"   hasattr(emp2, 'manager_review_status'): {hasattr(emp2, 'manager_review_status')}")
print(f"   emp2.manager_review_status: {emp2.manager_review_status}")
print(f"   hasattr(emp2, 'manager_review_completed_at'): {hasattr(emp2, 'manager_review_completed_at')}")
print(f"   emp2.manager_review_completed_at: {emp2.manager_review_completed_at}")

# Test 4: Check model_dump() output
print("\n4. Checking model_dump() output:")
emp2_dict = emp2.model_dump()
print(f"   'manager_review_status' in model_dump(): {'manager_review_status' in emp2_dict}")
print(f"   'manager_review_completed_at' in model_dump(): {'manager_review_completed_at' in emp2_dict}")
if 'manager_review_status' in emp2_dict:
    print(f"   model_dump()['manager_review_status']: {emp2_dict['manager_review_status']}")

# Test 5: Check __dict__ directly
print("\n5. Checking __dict__ directly:")
print(f"   'manager_review_status' in emp2.__dict__: {'manager_review_status' in emp2.__dict__}")
print(f"   'manager_review_completed_at' in emp2.__dict__: {'manager_review_completed_at' in emp2.__dict__}")

# Test 6: Check if there's a __pydantic_extra__ dict
print("\n6. Checking for __pydantic_extra__:")
print(f"   hasattr(emp2, '__pydantic_extra__'): {hasattr(emp2, '__pydantic_extra__')}")
if hasattr(emp2, '__pydantic_extra__'):
    print(f"   __pydantic_extra__: {emp2.__pydantic_extra__}")

# Test 7: List all attributes
print("\n7. All attributes of emp2:")
all_attrs = [attr for attr in dir(emp2) if not attr.startswith('_')]
print(f"   Total non-private attributes: {len(all_attrs)}")
manager_review_attrs = [attr for attr in all_attrs if 'manager_review' in attr]
print(f"   Manager review related attributes: {manager_review_attrs}")

# Test 8: Check model_config
print("\n8. Checking model_config:")
print(f"   model_config: {Employee.model_config}")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)

