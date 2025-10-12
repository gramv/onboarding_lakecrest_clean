#!/usr/bin/env python3
"""
Test Pydantic v2 extra fields behavior
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.models_enhanced import Employee
from datetime import date, datetime

# Create an Employee with manager_review_status
emp = Employee(
    id="test-123",
    property_id="prop-123",
    department="Front Desk",
    position="Agent",
    hire_date=date.today(),
    manager_review_status="completed",  # This is NOT in the model fields!
    manager_review_completed_at=datetime.now()
)

print("Testing Pydantic v2 extra fields:")
print(f"  hasattr(emp, 'manager_review_status'): {hasattr(emp, 'manager_review_status')}")
print(f"  hasattr(emp, '__pydantic_extra__'): {hasattr(emp, '__pydantic_extra__')}")

if hasattr(emp, '__pydantic_extra__'):
    print(f"  __pydantic_extra__: {emp.__pydantic_extra__}")

print(f"\n  getattr(emp, 'manager_review_status', 'NOT_FOUND'): {getattr(emp, 'manager_review_status', 'NOT_FOUND')}")

# Try to access via model_dump
emp_dict = emp.model_dump()
print(f"\n  'manager_review_status' in model_dump(): {'manager_review_status' in emp_dict}")
if 'manager_review_status' in emp_dict:
    print(f"  model_dump()['manager_review_status']: {emp_dict['manager_review_status']}")

# Check model fields
print(f"\n  Model fields: {list(emp.model_fields.keys())[:15]}...")
print(f"  'manager_review_status' in model_fields: {'manager_review_status' in emp.model_fields}")

