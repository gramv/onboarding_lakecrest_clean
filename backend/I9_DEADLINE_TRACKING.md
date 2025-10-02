# I-9 Deadline Tracking System

## Overview
Comprehensive I-9 deadline tracking system with automated manager assignment for federal compliance.

## Federal Compliance Requirements
- **I-9 Section 1**: MUST be completed by/before the first day of work
- **I-9 Section 2**: MUST be completed within 3 business days of employment
- System automatically tracks and enforces these deadlines
- Weekends are excluded from business day calculations

## Key Features

### 1. Automatic Deadline Calculation
- Section 1 deadline set to employee's start date
- Section 2 deadline calculated as 3 business days after start date
- Business days exclude weekends (Saturday/Sunday)

### 2. Manager Auto-Assignment
Three assignment methods available:
- **Least Workload**: Assigns to manager with fewest active I-9s
- **Round Robin**: Rotates assignments among available managers
- **Default**: Assigns to first available manager

### 3. Status Tracking
- **ON_TRACK**: Deadline not yet approaching
- **APPROACHING**: Within 24 hours of deadline
- **DUE_TODAY**: Due on current date
- **OVERDUE**: Past deadline
- **COMPLETED**: Section completed

### 4. Notifications
- Automatic notifications when deadlines approach
- Alerts sent to assigned managers for Section 2
- Compliance alerts for late completions

## Database Schema Updates

### Employee Table Fields
```sql
-- I-9 Deadline Tracking Fields
i9_section1_deadline TIMESTAMP WITH TIME ZONE,
i9_section2_deadline TIMESTAMP WITH TIME ZONE,
i9_section1_completed_at TIMESTAMP WITH TIME ZONE,
i9_section2_completed_at TIMESTAMP WITH TIME ZONE,
i9_assigned_manager_id UUID REFERENCES users(id),
i9_is_overdue BOOLEAN DEFAULT FALSE,
i9_deadline_notifications JSONB DEFAULT '[]'
```

## API Endpoints

### 1. Get Pending I-9 Deadlines
```http
GET /api/i9/pending-deadlines
```
Query Parameters:
- `property_id` (optional): Filter by property
- `include_overdue` (optional): Include overdue I-9s (default: true)

Response includes:
- List of pending I-9s sorted by urgency
- Summary statistics (total, overdue, due today, approaching)

### 2. Set I-9 Deadlines
```http
POST /api/i9/set-deadlines
```
Request Body:
```json
{
  "employee_id": "string",
  "start_date": "2025-01-15",
  "auto_assign_manager": true,
  "assignment_method": "least_workload"
}
```

### 3. Auto-Assign Manager
```http
POST /api/i9/auto-assign-manager
```
Request Body:
```json
{
  "employee_id": "string",
  "method": "least_workload"
}
```

### 4. Mark Section Complete
```http
POST /api/i9/mark-complete
```
Request Body:
```json
{
  "employee_id": "string",
  "section": 1
}
```

### 5. Check Deadlines (Manual Trigger)
```http
POST /api/i9/check-deadlines
```
Manually triggers deadline checks and sends notifications.

### 6. Compliance Report
```http
GET /api/i9/compliance-report
```
Query Parameters:
- `property_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

Returns compliance statistics showing on-time vs late completions.

## Implementation Details

### Deadline Calculation Logic
```python
def calculate_business_days_from(start_date: date, business_days: int) -> date:
    """Calculate future date adding only business days (excluding weekends)"""
    current_date = start_date
    days_added = 0
    
    while days_added < business_days:
        current_date += timedelta(days=1)
        # Skip weekends (Saturday=5, Sunday=6)
        if current_date.weekday() < 5:
            days_added += 1
    
    return current_date
```

### Manager Workload Balancing
The system tracks active I-9 assignments per manager and can:
- Distribute new assignments based on current workload
- Ensure no manager is overloaded
- Maintain audit trail of assignments

### Compliance Tracking
- All completions are timestamped
- System tracks whether deadlines were met
- Audit logs created for all I-9 operations
- Compliance reports available for HR review

## Single-Step Invitation Support

For single-step invitations (where employee is invited directly to onboarding):
- Provisional deadlines set based on expected start date
- Deadlines updated when employee is officially hired
- Manager auto-assigned at invitation creation

## Notification System

### Email Notifications
- **24 hours before deadline**: Reminder sent
- **On deadline day**: Urgent reminder
- **After deadline**: Overdue alert to HR and manager

### In-App Notifications
- Dashboard alerts for approaching deadlines
- Manager notifications for new assignments
- HR alerts for compliance issues

## Testing

Use the provided test script to verify functionality:
```bash
python test_i9_deadlines.py
```

## Compliance Notes

1. **Federal Law Compliance**: System enforces USCIS I-9 requirements
2. **Audit Trail**: All actions logged with timestamps and user IDs
3. **Data Security**: Sensitive data encrypted at rest
4. **Retention**: I-9 records retained per federal requirements (3 years after hire or 1 year after termination)

## Manager Dashboard Integration

Managers can:
- View assigned I-9 Section 2 tasks
- See approaching deadlines
- Complete Section 2 verification
- Track completion status

## HR Dashboard Features

HR users can:
- Monitor all I-9 deadlines across properties
- Generate compliance reports
- Manually assign/reassign managers
- Override automatic assignments
- Trigger manual deadline checks

## Error Handling

- Invalid date formats rejected with clear error messages
- Manager assignment failures logged and HR notified
- Deadline calculation errors trigger alerts
- All errors logged with context for debugging

## Future Enhancements

1. **Scheduled Jobs**: Automatic daily deadline checks
2. **SMS Notifications**: Text message alerts for urgent deadlines
3. **Predictive Analytics**: Forecast compliance issues
4. **Bulk Operations**: Set deadlines for multiple employees
5. **Holiday Calendar**: Account for federal holidays in deadline calculations