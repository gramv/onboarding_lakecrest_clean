"""
Pytest configuration and fixtures for hotel onboarding backend tests
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from typing import Dict, Any

from app.main_enhanced import app
from app.models import User, Property, JobApplication, OnboardingSession, UserRole
from app.auth import create_token
from app.supabase_service_enhanced import SupabaseService


@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture(scope="function")
def clean_database():
    """Clean database before and after tests"""
    # For in-memory database, we can reset the dictionaries
    # In production, this would truncate tables or use transactions
    
    # Store original state
    original_users = app.state.users.copy() if hasattr(app.state, 'users') else {}
    original_properties = app.state.properties.copy() if hasattr(app.state, 'properties') else {}
    original_applications = app.state.applications.copy() if hasattr(app.state, 'applications') else {}
    original_sessions = app.state.onboarding_sessions.copy() if hasattr(app.state, 'onboarding_sessions') else {}
    
    yield
    
    # Restore original state
    if hasattr(app.state, 'users'):
        app.state.users = original_users
    if hasattr(app.state, 'properties'):
        app.state.properties = original_properties
    if hasattr(app.state, 'applications'):
        app.state.applications = original_applications
    if hasattr(app.state, 'onboarding_sessions'):
        app.state.onboarding_sessions = original_sessions


@pytest.fixture
def test_property():
    """Create a test property"""
    property_data = Property(
        id="test-property-1",
        name="Test Hotel",
        address="123 Test Street",
        city="Test City",
        state="TS",
        zip_code="12345",
        phone="555-0100",
        is_active=True,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    if hasattr(app.state, 'properties'):
        app.state.properties[property_data.id] = property_data
    
    return property_data


@pytest.fixture
def hr_user(test_property):
    """Create an HR test user"""
    user = User(
        id="hr-test-user",
        email="hr.test@hoteltest.com",
        hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCrXFmBaC",  # "password123"
        role=UserRole.HR,
        name="HR Test User",
        property_id=test_property.id,
        is_active=True,
        created_at=datetime.now()
    )
    
    if hasattr(app.state, 'users'):
        app.state.users[user.id] = user
    
    return user


@pytest.fixture
def manager_user(test_property):
    """Create a manager test user"""
    user = User(
        id="manager-test-user",
        email="manager.test@hoteltest.com",
        hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCrXFmBaC",  # "password123"
        role=UserRole.MANAGER,
        name="Manager Test User",
        property_id=test_property.id,
        is_active=True,
        created_at=datetime.now()
    )
    
    if hasattr(app.state, 'users'):
        app.state.users[user.id] = user
    
    return user


@pytest.fixture
def employee_user(test_property):
    """Create an employee test user"""
    user = User(
        id="employee-test-user",
        email="employee.test@hoteltest.com",
        hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCrXFmBaC",  # "password123"
        role=UserRole.EMPLOYEE,
        name="Employee Test User",
        property_id=test_property.id,
        is_active=True,
        created_at=datetime.now()
    )
    
    if hasattr(app.state, 'users'):
        app.state.users[user.id] = user
    
    return user


@pytest.fixture
def hr_token(hr_user):
    """Create an HR authentication token"""
    return create_token(hr_user.id, hr_user.role)


@pytest.fixture
def manager_token(manager_user):
    """Create a manager authentication token"""
    return create_token(manager_user.id, manager_user.role)


@pytest.fixture
def employee_token(employee_user):
    """Create an employee authentication token"""
    return create_token(employee_user.id, employee_user.role)


@pytest.fixture
def test_application(test_property):
    """Create a test job application"""
    application = JobApplication(
        id="test-app-1",
        property_id=test_property.id,
        position="Front Desk Agent",
        status="pending",
        applicant_data={
            "firstName": "Test",
            "lastName": "Applicant",
            "email": "test.applicant@example.com",
            "phone": "555-0123",
            "availability": "full-time",
            "startDate": "2025-08-01"
        },
        applied_at=datetime.now()
    )
    
    if hasattr(app.state, 'applications'):
        app.state.applications[application.id] = application
    
    return application


@pytest.fixture
def test_onboarding_session(test_property, test_application):
    """Create a test onboarding session"""
    session = OnboardingSession(
        id="test-session-1",
        application_id=test_application.id,
        property_id=test_property.id,
        token="test-onboarding-token-123",
        employee_data={
            "firstName": test_application.applicant_data["firstName"],
            "lastName": test_application.applicant_data["lastName"],
            "email": test_application.applicant_data["email"],
            "phone": test_application.applicant_data["phone"]
        },
        job_details={
            "position": test_application.position,
            "startDate": "2025-08-01",
            "payRate": "18.50",
            "supervisor": "Test Manager"
        },
        status="in_progress",
        current_step="welcome",
        completed_steps=[],
        step_data={},
        expires_at=datetime.now() + timedelta(days=7),
        created_at=datetime.now()
    )
    
    if hasattr(app.state, 'onboarding_sessions'):
        app.state.onboarding_sessions[session.id] = session
    
    return session


@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email service to prevent actual emails being sent"""
    sent_emails = []
    
    def mock_send_email(to: str, subject: str, body: str, **kwargs):
        sent_emails.append({
            "to": to,
            "subject": subject,
            "body": body,
            "timestamp": datetime.now(),
            **kwargs
        })
        return True
    
    monkeypatch.setattr("app.email_service.send_email", mock_send_email)
    return sent_emails


@pytest.fixture
def mock_groq_service(monkeypatch):
    """Mock Groq OCR service"""
    def mock_process_document(file_data: bytes, document_type: str):
        # Return mock OCR results based on document type
        mock_results = {
            "drivers_license": {
                "name": "John Doe",
                "license_number": "D123456789",
                "date_of_birth": "1990-01-01",
                "expiration_date": "2028-12-31",
                "address": "123 Main St, Anytown, ST 12345"
            },
            "passport": {
                "name": "John Doe",
                "passport_number": "P123456789",
                "date_of_birth": "1990-01-01",
                "expiration_date": "2030-12-31",
                "nationality": "USA"
            },
            "ssn_card": {
                "name": "John Doe",
                "ssn": "123-45-6789"
            }
        }
        
        return mock_results.get(document_type, {"error": "Unknown document type"})
    
    monkeypatch.setattr("app.services.ocr_service.process_document", mock_process_document)


@pytest.fixture
def complete_i9_data():
    """Complete I-9 Section 1 test data"""
    return {
        "lastName": "Doe",
        "firstName": "John",
        "middleInitial": "A",
        "otherLastNames": "",
        "address": "123 Main Street",
        "apartmentNumber": "4B",
        "city": "Anytown",
        "state": "ST",
        "zipCode": "12345",
        "birthDate": "1990-01-01",
        "ssn": "123-45-6789",
        "email": "john.doe@example.com",
        "phone": "555-0123",
        "citizenshipStatus": "citizen",
        "signature": "John A. Doe",
        "signatureDate": datetime.now().isoformat(),
        "digitalSignature": {
            "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
            "ipAddress": "192.168.1.100",
            "userAgent": "Mozilla/5.0..."
        }
    }


@pytest.fixture
def complete_w4_data():
    """Complete W-4 test data"""
    return {
        "firstName": "John",
        "lastName": "Doe",
        "ssn": "123-45-6789",
        "address": "123 Main Street",
        "city": "Anytown",
        "state": "ST",
        "zipCode": "12345",
        "filingStatus": "single",
        "multipleJobs": False,
        "dependentsAmount": 0,
        "otherIncome": 0,
        "deductions": 0,
        "extraWithholding": 0,
        "signature": "John Doe",
        "signatureDate": datetime.now().isoformat(),
        "digitalSignature": {
            "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
            "ipAddress": "192.168.1.100",
            "userAgent": "Mozilla/5.0..."
        }
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "compliance: mark test as a compliance test"
    )
    config.addinivalue_line(
        "markers", "security: mark test as a security test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as a performance test"
    )