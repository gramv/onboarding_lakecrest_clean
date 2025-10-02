# Manager Employee Setup API Documentation

## Overview

The Manager Employee Setup API provides endpoints for managers to complete the initial employee setup process, matching pages 1-2 of the "2025+ New Employee Hire Packet". This includes creating employee records, setting up onboarding sessions, and generating secure onboarding links.

## Authentication

All endpoints require manager authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Enhanced Application Approval

Approve a job application with additional setup information that redirects to employee setup.

**Endpoint:** `POST /applications/{id}/approve-enhanced`

**Request Body:**
```json
{
  "job_offer": {
    "job_title": "Front Desk Agent",
    "start_date": "2024-02-15",
    "pay_rate": 18.50,
    "pay_frequency": "hourly",
    "employment_type": "full_time",
    "supervisor": "John Smith",
    "benefits_eligible": true
  },
  "orientation_date": "2024-02-10",
  "orientation_time": "9:00 AM",
  "orientation_location": "Main Conference Room",
  "uniform_size": "Medium",
  "parking_location": "Employee Lot A",
  "locker_number": "42",
  "training_requirements": "Customer service training, PMS system training",
  "special_instructions": "Please bring two forms of ID for I-9 verification",
  "health_plan_selection": "hra_4k",
  "dental_coverage": true,
  "vision_coverage": false,
  "send_onboarding_email": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application approved - proceed to employee setup",
  "data": {
    "redirect_to": "employee_setup",
    "application_id": "app-123",
    "approval_data": { ... },
    "message": "Please complete employee setup to finalize approval"
  }
}
```

### 2. Enhanced Application Rejection

Reject an application with options for talent pool and email notifications.

**Endpoint:** `POST /applications/{id}/reject-enhanced`

**Request Body:**
```json
{
  "rejection_reason": "Position has been filled",
  "add_to_talent_pool": true,
  "talent_pool_notes": "Strong candidate for future openings",
  "send_rejection_email": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application moved to talent pool successfully",
  "data": {
    "status": "talent_pool",
    "rejection_reason": "Position has been filled",
    "talent_pool": true,
    "email_sent": true
  }
}
```

### 3. Create Employee Setup

Complete initial employee setup and generate onboarding link.

**Endpoint:** `POST /api/manager/employee-setup`

**Request Body:**
```json
{
  "property_id": "prop-001",
  "property_name": "Grand Plaza Hotel",
  "property_address": "123 Main Street",
  "property_city": "Downtown",
  "property_state": "CA",
  "property_zip": "90210",
  "property_phone": "(555) 123-4567",
  
  "employee_first_name": "Jane",
  "employee_middle_initial": "M",
  "employee_last_name": "Doe",
  "employee_email": "jane.doe@example.com",
  "employee_phone": "(555) 987-6543",
  "employee_address": "456 Oak Avenue",
  "employee_city": "Suburbia",
  "employee_state": "CA",
  "employee_zip": "90211",
  
  "department": "Front Office",
  "position": "Front Desk Agent",
  "job_title": "Front Desk Agent",
  "hire_date": "2024-02-01",
  "start_date": "2024-02-15",
  "employment_type": "full_time",
  "work_schedule": "Monday-Friday 7AM-3PM",
  
  "pay_rate": 18.50,
  "pay_frequency": "hourly",
  "overtime_eligible": true,
  
  "supervisor_name": "John Smith",
  "supervisor_title": "Front Office Manager",
  "supervisor_email": "john.smith@hotel.com",
  "supervisor_phone": "(555) 123-4568",
  "reporting_location": "Front Desk",
  
  "benefits_eligible": true,
  "health_insurance_eligible": true,
  "health_insurance_start_date": "2024-03-01",
  "pto_eligible": true,
  "pto_accrual_rate": "1 day per month",
  
  "health_plan_selection": "hra_4k",
  "dental_coverage": true,
  "vision_coverage": false,
  
  "uniform_required": true,
  "uniform_size": "Medium",
  "parking_assigned": true,
  "parking_location": "Employee Lot A",
  "locker_assigned": true,
  "locker_number": "42",
  
  "orientation_date": "2024-02-10",
  "orientation_time": "9:00 AM",
  "orientation_location": "Main Conference Room",
  "training_requirements": "Customer service training, PMS system training",
  
  "manager_id": "mgr-001",
  "manager_name": "Mike Wilson",
  "manager_signature": "data:image/svg+xml;base64,...",
  "manager_signature_date": "2024-02-01T10:30:00Z",
  
  "application_id": "app-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee setup completed successfully. Onboarding invitation sent.",
  "data": {
    "employee_id": "emp-456",
    "employee_name": "Jane M Doe",
    "employee_email": "jane.doe@example.com",
    "onboarding_url": "https://hotel.com/onboarding/emp-456?token=abc123",
    "token": "abc123",
    "expires_at": "2024-02-04T10:30:00Z",
    "session_id": "session-789",
    "property_name": "Grand Plaza Hotel",
    "position": "Front Desk Agent",
    "start_date": "2024-02-15"
  }
}
```

### 4. Get Application Data for Setup

Retrieve application data pre-filled for employee setup.

**Endpoint:** `GET /api/manager/employee-setup/{application_id}`

**Response:**
```json
{
  "success": true,
  "message": "Application data retrieved for employee setup",
  "data": {
    "application_id": "app-123",
    "property_id": "prop-001",
    "property_name": "Grand Plaza Hotel",
    "property_address": "123 Main Street",
    "property_city": "Downtown",
    "property_state": "CA",
    "property_zip": "90210",
    "property_phone": "(555) 123-4567",
    "employee_first_name": "Jane",
    "employee_middle_initial": "M",
    "employee_last_name": "Doe",
    "employee_email": "jane.doe@example.com",
    "employee_phone": "(555) 987-6543",
    "employee_address": "456 Oak Avenue",
    "employee_city": "Suburbia",
    "employee_state": "CA",
    "employee_zip": "90211",
    "department": "Front Office",
    "position": "Front Desk Agent",
    "employment_type": "full_time",
    "health_plan_selection": "hra_4k",
    "dental_coverage": true,
    "vision_coverage": false,
    "manager_id": "mgr-001",
    "manager_name": "Mike Wilson"
  }
}
```

## Workflow

### Standard Application Approval Flow

1. Manager reviews pending application
2. Manager calls `POST /applications/{id}/approve-enhanced` with job offer details
3. System returns redirect information to employee setup form
4. Manager completes employee setup form with all details from pages 1-2
5. Manager calls `POST /api/manager/employee-setup` to create employee record
6. System generates onboarding token and session
7. System sends welcome email to employee with onboarding link
8. Application status is updated to "approved"

### Direct Employee Setup Flow (No Application)

1. Manager initiates new employee setup directly
2. Manager fills out complete employee setup form
3. Manager calls `POST /api/manager/employee-setup` with all required data
4. System creates user account, employee record, and onboarding session
5. System sends welcome email to employee with onboarding link

### Application Rejection Flow

1. Manager reviews application
2. Manager calls `POST /applications/{id}/reject-enhanced` with rejection details
3. If `add_to_talent_pool` is true, application moves to talent pool
4. If `send_rejection_email` is true, appropriate email is sent
5. Application status is updated accordingly

## Email Notifications

### Onboarding Welcome Email

Sent when employee setup is completed. Includes:
- Welcome message with position and property details
- Start date and orientation information
- Secure onboarding link
- Expiration notice (72 hours)
- Manager contact information

### Rejection Email

Standard rejection notification with professional message.

### Talent Pool Email

Positive message about being kept in talent pool for future opportunities.

## Data Models

### ManagerEmployeeSetup

Complete employee setup data matching pages 1-2 of hire packet:
- Property information
- Employee personal details
- Position and employment details
- Compensation information
- Reporting structure
- Benefits eligibility
- Special requirements (uniform, parking, locker)
- Orientation and training details
- Manager signature

### OnboardingToken

Secure token for employee access:
- Unique token string
- Employee ID
- Expiration time
- Usage tracking
- Security metadata

### OnboardingLinkGeneration

Response data for successful employee setup:
- Employee information
- Onboarding URL with token
- Session details
- Expiration information

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "detail": "Detailed error information",
    "timestamp": "2024-02-01T10:30:00Z"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid request data
- `AUTHENTICATION_ERROR`: Invalid or missing token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Application or property not found
- `RESOURCE_CONFLICT`: Employee email already exists
- `INTERNAL_SERVER_ERROR`: Server error

## Security Considerations

1. **Authentication**: All endpoints require valid manager JWT token
2. **Authorization**: Managers can only access applications for their assigned properties
3. **Token Security**: Onboarding tokens are single-use with expiration
4. **Email Validation**: Employee emails are validated and must be unique
5. **Audit Trail**: All actions are logged with manager ID and timestamp

## Testing

Use the provided test script `test_manager_setup.py` to verify endpoint functionality:

```bash
python test_manager_setup.py
```

This will test:
1. Manager authentication
2. Enhanced application approval
3. Application data retrieval
4. Complete employee setup creation