#!/usr/bin/env python3
"""
Test if Employee model correctly sets manager_review_status attribute
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
    manager_review_status="completed",
    manager_review_completed_at=datetime.now()
)

print("Testing Employee model:")
print(f"  hasattr(emp, 'manager_review_status'): {hasattr(emp, 'manager_review_status')}")
print(f"  emp.manager_review_status: {emp.manager_review_status}")
print(f"  getattr(emp, 'manager_review_status', 'DEFAULT'): {getattr(emp, 'manager_review_status', 'DEFAULT')}")
print(f"  hasattr(emp, 'manager_review_completed_at'): {hasattr(emp, 'manager_review_completed_at')}")
print(f"  emp.manager_review_completed_at: {emp.manager_review_completed_at}")

print("\nEmployee dict:")
emp_dict = emp.model_dump()
print(f"  'manager_review_status' in dict: {'manager_review_status' in emp_dict}")
print(f"  dict['manager_review_status']: {emp_dict.get('manager_review_status')}")

print("\n✅ Employee model works correctly!" if hasattr(emp, 'manager_review_status') else "\n❌ Employee model BROKEN!")

