#!/usr/bin/env python3
"""
Test script for I-9 deadline tracking functionality
"""

import requests
import json
from datetime import datetime, date, timedelta

# API base URL
BASE_URL = "http://localhost:8000"

# Test credentials (you'll need to replace with actual HR credentials)
HR_EMAIL = "hr@example.com"
HR_PASSWORD = "password123"

def login_hr():
    """Login as HR user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": HR_EMAIL,
        "password": HR_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_get_pending_deadlines(token):
    """Test getting pending I-9 deadlines"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/i9/pending-deadlines", headers=headers)
    
    print("\n=== Test: Get Pending I-9 Deadlines ===")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('message')}")
        if 'data' in data:
            summary = data['data'].get('summary', {})
            print(f"Total pending: {summary.get('total', 0)}")
            print(f"Overdue: {summary.get('overdue', 0)}")
            print(f"Due today: {summary.get('due_today', 0)}")
            print(f"Approaching: {summary.get('approaching', 0)}")
            
            deadlines = data['data'].get('deadlines', [])
            if deadlines:
                print("\nFirst deadline:")
                print(json.dumps(deadlines[0], indent=2, default=str))
    else:
        print(f"Error: {response.text}")

def test_set_deadlines(token, employee_id):
    """Test setting I-9 deadlines for an employee"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Set start date to tomorrow
    start_date = (date.today() + timedelta(days=1)).isoformat()
    
    response = requests.post(f"{BASE_URL}/api/i9/set-deadlines", 
        headers=headers,
        json={
            "employee_id": employee_id,
            "start_date": start_date,
            "auto_assign_manager": True,
            "assignment_method": "least_workload"
        }
    )
    
    print("\n=== Test: Set I-9 Deadlines ===")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('message')}")
        if 'data' in data:
            deadline_data = data['data']
            print(f"Employee ID: {deadline_data.get('employee_id')}")
            print(f"Start date: {deadline_data.get('start_date')}")
            print(f"Section 1 deadline: {deadline_data.get('section1_deadline')}")
            print(f"Section 2 deadline: {deadline_data.get('section2_deadline')}")
            print(f"Assigned manager: {deadline_data.get('assigned_manager_id')}")
    else:
        print(f"Error: {response.text}")

def test_compliance_report(token):
    """Test getting I-9 compliance report"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get report for last 30 days
    end_date = date.today().isoformat()
    start_date = (date.today() - timedelta(days=30)).isoformat()
    
    response = requests.get(
        f"{BASE_URL}/api/i9/compliance-report",
        headers=headers,
        params={
            "start_date": start_date,
            "end_date": end_date
        }
    )
    
    print("\n=== Test: I-9 Compliance Report ===")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('message')}")
        if 'data' in data:
            report = data['data']
            print(f"Total I-9s: {report.get('total_i9s', 0)}")
            print(f"Section 1 on-time: {report.get('section1_on_time', 0)}")
            print(f"Section 1 late: {report.get('section1_late', 0)}")
            print(f"Section 2 on-time: {report.get('section2_on_time', 0)}")
            print(f"Section 2 late: {report.get('section2_late', 0)}")
            print(f"Compliance rate: {report.get('compliance_rate', 0):.1f}%")
    else:
        print(f"Error: {response.text}")

def test_mark_complete(token, employee_id, section):
    """Test marking I-9 section as complete"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{BASE_URL}/api/i9/mark-complete",
        headers=headers,
        json={
            "employee_id": employee_id,
            "section": section
        }
    )
    
    print(f"\n=== Test: Mark I-9 Section {section} Complete ===")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('message')}")
        if 'data' in data:
            completion_data = data['data']
            print(f"Employee ID: {completion_data.get('employee_id')}")
            print(f"Section: {completion_data.get('section')}")
            print(f"Completed by: {completion_data.get('completed_by')}")
            print(f"Completed at: {completion_data.get('completed_at')}")
    else:
        print(f"Error: {response.text}")

def main():
    """Run all tests"""
    print("=" * 60)
    print("I-9 DEADLINE TRACKING TEST SUITE")
    print("=" * 60)
    
    # Login
    print("\nLogging in as HR...")
    token = login_hr()
    
    if not token:
        print("Failed to login. Please check credentials and try again.")
        print("\nNote: You need to update HR_EMAIL and HR_PASSWORD in this script")
        print("with actual HR user credentials from your database.")
        return
    
    print("Login successful!")
    
    # Run tests
    test_get_pending_deadlines(token)
    
    # To test setting deadlines, you need a valid employee ID
    # Uncomment and update with actual employee ID:
    # test_set_deadlines(token, "employee-id-here")
    
    test_compliance_report(token)
    
    # To test marking complete, you need a valid employee ID
    # Uncomment and update with actual employee ID:
    # test_mark_complete(token, "employee-id-here", 1)
    
    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()