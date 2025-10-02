#!/usr/bin/env python3
"""
Comprehensive Test Data Setup for Hotel Employee Onboarding System

This script creates all necessary test data for the complete onboarding flow:
- HR user account
- Manager account assigned to property
- Test property
- Job applications in various states
- Employees in different onboarding stages
- Test onboarding sessions with sample data
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import uuid
import bcrypt
from dotenv import load_dotenv

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv('.env')

from app.supabase_service_enhanced import SupabaseServiceEnhanced

# Test account credentials
TEST_ACCOUNTS = {
    'hr': {
        'email': 'hr@demo.com',
        'password': 'TestPassword123!',
        'role': 'hr',
        'full_name': 'HR Administrator'
    },
    'manager': {
        'email': 'manager@demo.com',
        'password': 'TestPassword123!',
        'role': 'manager',
        'full_name': 'John Manager'
    },
    'manager2': {
        'email': 'manager2@demo.com',
        'password': 'TestPassword123!',
        'role': 'manager',
        'full_name': 'Jane Manager'
    }
}

# Test property configuration
TEST_PROPERTY = {
    'id': 'test-prop-001',
    'name': 'Grand Hotel Demo',
    'address': '123 Demo Street, Test City, TC 12345',
    'phone': '555-0100',
    'manager_email': 'manager@demo.com'
}

# Additional test property
TEST_PROPERTY_2 = {
    'id': 'test-prop-002',
    'name': 'Downtown Test Hotel',
    'address': '456 Main Street, Test City, TC 12345',
    'phone': '555-0200',
    'manager_email': 'manager2@demo.com'
}

class TestDataSetup:
    def __init__(self):
        self.service = SupabaseServiceEnhanced()
        self.created_users = {}
        self.created_properties = {}
        self.created_applications = []
        self.created_employees = []
        self.created_sessions = []

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    async def cleanup_existing_data(self):
        """Clean up any existing test data"""
        print("\n🧹 Cleaning up existing test data...")

        try:
            # Delete test onboarding sessions
            sessions = await self.service.supabase.table('onboarding_sessions').select('id').execute()
            if sessions.data:
                for session in sessions.data:
                    if 'test' in session.get('id', '').lower():
                        await self.service.supabase.table('onboarding_sessions').delete().eq('id', session['id']).execute()

            # Delete test employees
            employees = await self.service.supabase.table('employees').select('id').execute()
            if employees.data:
                for emp in employees.data:
                    if emp.get('email', '').endswith('@demo.com') or emp.get('email', '').startswith('test'):
                        await self.service.supabase.table('employees').delete().eq('id', emp['id']).execute()

            # Delete test applications
            applications = await self.service.supabase.table('job_applications').select('id').execute()
            if applications.data:
                for app in applications.data:
                    if app.get('email', '').endswith('@demo.com') or app.get('email', '').startswith('test'):
                        await self.service.supabase.table('job_applications').delete().eq('id', app['id']).execute()

            print("✅ Cleanup completed")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")

    async def create_test_property(self, property_data: Dict[str, Any]) -> str:
        """Create or update a test property"""
        try:
            # Check if property exists
            existing = await self.service.supabase.table('properties').select('*').eq('id', property_data['id']).execute()

            if existing.data:
                # Update existing property
                result = await self.service.supabase.table('properties').update({
                    'name': property_data['name'],
                    'address': property_data['address'],
                    'phone': property_data.get('phone'),
                    'manager_email': property_data.get('manager_email')
                }).eq('id', property_data['id']).execute()
                print(f"✅ Updated property: {property_data['name']} (ID: {property_data['id']})")
            else:
                # Create new property
                result = await self.service.supabase.table('properties').insert(property_data).execute()
                print(f"✅ Created property: {property_data['name']} (ID: {property_data['id']})")

            self.created_properties[property_data['id']] = property_data
            return property_data['id']
        except Exception as e:
            print(f"❌ Error creating property {property_data['name']}: {e}")
            return None

    async def create_user_account(self, account_data: Dict[str, Any], property_id: Optional[str] = None) -> str:
        """Create or update a user account"""
        try:
            # Check if user exists
            existing = await self.service.supabase.table('users').select('*').eq('email', account_data['email']).execute()

            user_data = {
                'email': account_data['email'],
                'password_hash': self.hash_password(account_data['password']),
                'role': account_data['role'],
                'full_name': account_data.get('full_name'),
                'is_active': True
            }

            if existing.data:
                # Update existing user
                result = await self.service.supabase.table('users').update(user_data).eq('email', account_data['email']).execute()
                user_id = existing.data[0]['id']
                print(f"✅ Updated {account_data['role']} user: {account_data['email']}")
            else:
                # Create new user
                user_id = str(uuid.uuid4())
                user_data['id'] = user_id
                result = await self.service.supabase.table('users').insert(user_data).execute()
                print(f"✅ Created {account_data['role']} user: {account_data['email']}")

            # If manager, assign to property
            if account_data['role'] == 'manager' and property_id:
                await self.assign_manager_to_property(user_id, property_id)

            self.created_users[account_data['email']] = user_id
            return user_id
        except Exception as e:
            print(f"❌ Error creating user {account_data['email']}: {e}")
            return None

    async def assign_manager_to_property(self, user_id: str, property_id: str):
        """Assign a manager to a property"""
        try:
            # Check if assignment exists
            existing = await self.service.supabase.table('property_managers').select('*').eq('user_id', user_id).eq('property_id', property_id).execute()

            if not existing.data:
                # Create new assignment
                await self.service.supabase.table('property_managers').insert({
                    'user_id': user_id,
                    'property_id': property_id
                }).execute()
                print(f"  → Assigned manager to property {property_id}")
        except Exception as e:
            print(f"⚠️ Warning assigning manager: {e}")

    async def create_job_application(self, property_id: str, status: str, first_name: str, last_name: str, email: str) -> str:
        """Create a job application"""
        try:
            app_id = str(uuid.uuid4())
            application_data = {
                'id': app_id,
                'property_id': property_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': '555-0' + str(1000 + len(self.created_applications)),
                'position_applied': 'Front Desk Agent' if len(self.created_applications) % 2 == 0 else 'Housekeeping',
                'availability_date': (datetime.now() + timedelta(days=7)).isoformat(),
                'status': status,
                'submitted_at': datetime.now(timezone.utc).isoformat(),
                'has_reliable_transportation': True,
                'can_work_weekends': True,
                'desired_hours': 'full_time',
                'emergency_contact_name': f'{first_name} Emergency',
                'emergency_contact_phone': '555-9999',
                'emergency_contact_relationship': 'Parent'
            }

            if status == 'approved':
                application_data['approved_at'] = datetime.now(timezone.utc).isoformat()
                application_data['approved_by'] = self.created_users.get('manager@demo.com')
            elif status == 'rejected':
                application_data['rejected_at'] = datetime.now(timezone.utc).isoformat()
                application_data['rejected_by'] = self.created_users.get('manager@demo.com')
                application_data['rejection_reason'] = 'Position filled'

            result = await self.service.supabase.table('job_applications').insert(application_data).execute()

            if result.data:
                self.created_applications.append(app_id)
                print(f"  → Created {status} application for {first_name} {last_name}")
                return app_id
        except Exception as e:
            print(f"❌ Error creating application: {e}")
            return None

    async def create_employee_with_onboarding(self, application_id: str, property_id: str, first_name: str, last_name: str, email: str, onboarding_progress: str) -> str:
        """Create an employee with onboarding session"""
        try:
            employee_id = str(uuid.uuid4())

            # Create employee record
            employee_data = {
                'id': employee_id,
                'property_id': property_id,
                'application_id': application_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': '555-1' + str(1000 + len(self.created_employees)),
                'position': 'Front Desk Agent',
                'department': 'Front Office',
                'hire_date': datetime.now().date().isoformat(),
                'employment_type': 'full_time',
                'status': 'onboarding' if onboarding_progress != 'completed' else 'active',
                'created_at': datetime.now(timezone.utc).isoformat()
            }

            result = await self.service.supabase.table('employees').insert(employee_data).execute()

            if result.data:
                self.created_employees.append(employee_id)
                print(f"  → Created employee: {first_name} {last_name} (Status: {onboarding_progress})")

                # Create onboarding session based on progress
                if onboarding_progress != 'not_started':
                    await self.create_onboarding_session(employee_id, property_id, first_name, last_name, email, onboarding_progress)

                return employee_id
        except Exception as e:
            print(f"❌ Error creating employee: {e}")
            return None

    async def create_onboarding_session(self, employee_id: str, property_id: str, first_name: str, last_name: str, email: str, progress: str):
        """Create an onboarding session with sample data"""
        try:
            session_id = str(uuid.uuid4())
            token = str(uuid.uuid4())

            # Base session data
            session_data = {
                'id': session_id,
                'employee_id': employee_id,
                'property_id': property_id,
                'token': token,
                'status': 'not_started',
                'current_step': 'welcome',
                'phase': 'employee',
                'language_preference': 'en',
                'steps_completed': [],
                'progress_percentage': 0.0,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                'completed_forms': {},
                'uploaded_documents': {},
                'federal_compliance_checks': {}
            }

            # Add progress-specific data
            if progress == 'personal_info_completed':
                session_data['current_step'] = 'i9_section1'
                session_data['steps_completed'] = ['welcome', 'personal_info']
                session_data['progress_percentage'] = 11.1
                session_data['completed_forms'] = {
                    'personal_info': {
                        'first_name': first_name,
                        'last_name': last_name,
                        'middle_name': '',
                        'email': email,
                        'phone': '555-1234',
                        'ssn': '***-**-1234',
                        'date_of_birth': '1990-01-01',
                        'address': '123 Test St',
                        'city': 'Test City',
                        'state': 'TC',
                        'zip_code': '12345'
                    }
                }
                session_data['status'] = 'in_progress'

            elif progress == 'i9_completed':
                session_data['current_step'] = 'w4_form'
                session_data['steps_completed'] = ['welcome', 'personal_info', 'i9_section1']
                session_data['progress_percentage'] = 16.7
                session_data['status'] = 'in_progress'
                session_data['federal_compliance_checks'] = {
                    'i9_section1': {
                        'completed': True,
                        'completed_at': datetime.now(timezone.utc).isoformat(),
                        'deadline': (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
                    }
                }

            elif progress == 'halfway':
                session_data['current_step'] = 'health_insurance'
                session_data['steps_completed'] = ['welcome', 'personal_info', 'i9_section1', 'w4_form', 'emergency_contacts', 'direct_deposit']
                session_data['progress_percentage'] = 33.3
                session_data['status'] = 'in_progress'

            elif progress == 'employee_completed':
                session_data['current_step'] = 'manager_review'
                session_data['phase'] = 'manager'
                session_data['steps_completed'] = [
                    'welcome', 'personal_info', 'i9_section1', 'w4_form',
                    'emergency_contacts', 'direct_deposit', 'health_insurance',
                    'company_policies', 'trafficking_awareness', 'weapons_policy',
                    'background_check', 'employee_signature'
                ]
                session_data['progress_percentage'] = 66.7
                session_data['status'] = 'employee_completed'
                session_data['employee_completed_at'] = datetime.now(timezone.utc).isoformat()

            elif progress == 'manager_approved':
                session_data['current_step'] = 'hr_review'
                session_data['phase'] = 'hr'
                session_data['steps_completed'] = [
                    'welcome', 'personal_info', 'i9_section1', 'w4_form',
                    'emergency_contacts', 'direct_deposit', 'health_insurance',
                    'company_policies', 'trafficking_awareness', 'weapons_policy',
                    'background_check', 'employee_signature', 'manager_review',
                    'i9_section2', 'manager_signature'
                ]
                session_data['progress_percentage'] = 83.3
                session_data['status'] = 'manager_review'
                session_data['reviewed_by'] = self.created_users.get('manager@demo.com')
                session_data['manager_review_started_at'] = datetime.now(timezone.utc).isoformat()

            elif progress == 'completed':
                session_data['current_step'] = 'completed'
                session_data['phase'] = 'hr'
                session_data['steps_completed'] = [
                    'welcome', 'personal_info', 'i9_section1', 'w4_form',
                    'emergency_contacts', 'direct_deposit', 'health_insurance',
                    'company_policies', 'trafficking_awareness', 'weapons_policy',
                    'background_check', 'employee_signature', 'manager_review',
                    'i9_section2', 'manager_signature', 'hr_review',
                    'compliance_check', 'hr_approval', 'completed'
                ]
                session_data['progress_percentage'] = 100.0
                session_data['status'] = 'approved'
                session_data['approved_at'] = datetime.now(timezone.utc).isoformat()
                session_data['approved_by'] = self.created_users.get('hr@demo.com')

            result = await self.service.supabase.table('onboarding_sessions').insert(session_data).execute()

            if result.data:
                self.created_sessions.append(session_id)
                print(f"    → Created onboarding session (Progress: {progress})")
                return session_id
        except Exception as e:
            print(f"❌ Error creating onboarding session: {e}")
            return None

    async def setup_all_test_data(self):
        """Main function to set up all test data"""
        print("\n" + "="*60)
        print("🚀 HOTEL ONBOARDING SYSTEM - TEST DATA SETUP")
        print("="*60)

        # Clean up existing test data
        await self.cleanup_existing_data()

        # Step 1: Create test properties
        print("\n📍 Creating Test Properties...")
        property1_id = await self.create_test_property(TEST_PROPERTY)
        property2_id = await self.create_test_property(TEST_PROPERTY_2)

        # Step 2: Create user accounts
        print("\n👤 Creating User Accounts...")
        hr_id = await self.create_user_account(TEST_ACCOUNTS['hr'])
        manager1_id = await self.create_user_account(TEST_ACCOUNTS['manager'], property1_id)
        manager2_id = await self.create_user_account(TEST_ACCOUNTS['manager2'], property2_id)

        # Step 3: Create job applications in various states
        print("\n📝 Creating Job Applications...")

        # Pending applications
        await self.create_job_application(property1_id, 'pending', 'Sarah', 'Johnson', 'sarah.test@demo.com')
        await self.create_job_application(property1_id, 'pending', 'Michael', 'Chen', 'michael.test@demo.com')
        await self.create_job_application(property2_id, 'pending', 'Emily', 'Rodriguez', 'emily.test@demo.com')

        # Approved applications (will create employees)
        app1 = await self.create_job_application(property1_id, 'approved', 'David', 'Smith', 'david.test@demo.com')
        app2 = await self.create_job_application(property1_id, 'approved', 'Jennifer', 'Davis', 'jennifer.test@demo.com')
        app3 = await self.create_job_application(property2_id, 'approved', 'Robert', 'Wilson', 'robert.test@demo.com')
        app4 = await self.create_job_application(property1_id, 'approved', 'Maria', 'Garcia', 'maria.test@demo.com')
        app5 = await self.create_job_application(property2_id, 'approved', 'James', 'Martinez', 'james.test@demo.com')

        # Rejected applications
        await self.create_job_application(property1_id, 'rejected', 'Lisa', 'Anderson', 'lisa.test@demo.com')
        await self.create_job_application(property2_id, 'rejected', 'Kevin', 'Taylor', 'kevin.test@demo.com')

        # Step 4: Create employees with various onboarding states
        print("\n👥 Creating Employees with Onboarding Sessions...")

        # Employee just started onboarding
        await self.create_employee_with_onboarding(app1, property1_id, 'David', 'Smith', 'david.test@demo.com', 'personal_info_completed')

        # Employee completed I-9 Section 1
        await self.create_employee_with_onboarding(app2, property1_id, 'Jennifer', 'Davis', 'jennifer.test@demo.com', 'i9_completed')

        # Employee halfway through
        await self.create_employee_with_onboarding(app3, property2_id, 'Robert', 'Wilson', 'robert.test@demo.com', 'halfway')

        # Employee completed their part, waiting for manager
        await self.create_employee_with_onboarding(app4, property1_id, 'Maria', 'Garcia', 'maria.test@demo.com', 'employee_completed')

        # Fully completed onboarding
        await self.create_employee_with_onboarding(app5, property2_id, 'James', 'Martinez', 'james.test@demo.com', 'completed')

        # Print summary
        print("\n" + "="*60)
        print("✅ TEST DATA SETUP COMPLETE!")
        print("="*60)
        print("\n📊 Summary:")
        print(f"  • Properties created: {len(self.created_properties)}")
        print(f"  • User accounts created: {len(self.created_users)}")
        print(f"  • Job applications created: {len(self.created_applications)}")
        print(f"  • Employees created: {len(self.created_employees)}")
        print(f"  • Onboarding sessions created: {len(self.created_sessions)}")

        print("\n🔑 Test Account Credentials:")
        print("  HR Account:")
        print(f"    Email: {TEST_ACCOUNTS['hr']['email']}")
        print(f"    Password: {TEST_ACCOUNTS['hr']['password']}")
        print("\n  Manager Account (Property 1):")
        print(f"    Email: {TEST_ACCOUNTS['manager']['email']}")
        print(f"    Password: {TEST_ACCOUNTS['manager']['password']}")
        print(f"    Property: {TEST_PROPERTY['name']}")
        print("\n  Manager Account (Property 2):")
        print(f"    Email: {TEST_ACCOUNTS['manager2']['email']}")
        print(f"    Password: {TEST_ACCOUNTS['manager2']['password']}")
        print(f"    Property: {TEST_PROPERTY_2['name']}")

        print("\n🏢 Test Properties:")
        print(f"  1. {TEST_PROPERTY['name']} (ID: {TEST_PROPERTY['id']})")
        print(f"  2. {TEST_PROPERTY_2['name']} (ID: {TEST_PROPERTY_2['id']})")

        print("\n📝 Application States:")
        print("  • 3 Pending applications")
        print("  • 5 Approved applications (with employees)")
        print("  • 2 Rejected applications")

        print("\n👥 Onboarding Progress:")
        print("  • 1 Employee at personal info stage")
        print("  • 1 Employee completed I-9 Section 1")
        print("  • 1 Employee halfway through")
        print("  • 1 Employee completed, awaiting manager")
        print("  • 1 Employee fully onboarded")

        print("\n🎯 Ready for Testing!")
        print("  You can now:")
        print("  1. Login as HR to see all system data")
        print("  2. Login as Manager to see property-specific data")
        print("  3. Test the job application flow")
        print("  4. Test the complete onboarding process")
        print("  5. Test manager review and HR approval workflows")
        print("\n" + "="*60 + "\n")

async def main():
    """Main entry point"""
    setup = TestDataSetup()
    await setup.setup_all_test_data()

if __name__ == "__main__":
    asyncio.run(main())