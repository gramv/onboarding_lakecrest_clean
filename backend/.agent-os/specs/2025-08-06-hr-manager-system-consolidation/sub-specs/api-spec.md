# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-06-hr-manager-system-consolidation/spec.md

> Created: 2025-08-06
> Version: 1.0.0

## Endpoints

### Enhanced Analytics Endpoints

#### GET /api/analytics/dashboard
**Purpose:** Retrieve comprehensive dashboard analytics with caching
**Parameters:** 
- `property_id` (optional): Filter by specific property (managers only see their property)
- `date_range`: start_date,end_date (ISO format)
- `cache`: boolean (default: true)
**Response:** Dashboard metrics with performance data
**Errors:** 401 Unauthorized, 403 Forbidden, 400 Bad Request

```json
{
  "data": {
    "applications": {
      "total": 150,
      "pending": 25,
      "approved": 100,
      "rejected": 25,
      "approval_rate": 80.0,
      "avg_processing_time": 2.5
    },
    "employees": {
      "total": 85,
      "active": 80,
      "onboarding": 5
    },
    "properties": {
      "total": 5,
      "active": 5
    },
    "trends": {
      "applications_by_day": [...],
      "approval_rate_trend": [...]
    }
  },
  "cache_info": {
    "cached": true,
    "cache_age": 300
  }
}
```

#### GET /api/analytics/reports/custom
**Purpose:** Generate custom reports with flexible parameters
**Parameters:**
- `report_type`: 'applications', 'employees', 'performance'
- `filters`: JSON object with filter criteria
- `format`: 'json', 'csv', 'pdf'
- `date_range`: start_date,end_date
**Response:** Custom report data or file download
**Errors:** 401 Unauthorized, 400 Bad Request, 422 Invalid Parameters

#### POST /api/analytics/export
**Purpose:** Export data in various formats
**Parameters:** 
- `data_type`: 'applications', 'employees', 'analytics'
- `format`: 'csv', 'xlsx', 'pdf'
- `filters`: JSON object with criteria
**Response:** File download or async job ID
**Errors:** 401 Unauthorized, 400 Bad Request

### Real-Time Notification Endpoints

#### GET /api/notifications
**Purpose:** Retrieve user notifications with pagination
**Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 20, max: 100)
- `type`: notification type filter
- `unread_only`: boolean (default: false)
**Response:** Paginated list of notifications
**Errors:** 401 Unauthorized

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "new_application",
      "title": "New Job Application",
      "message": "John Doe applied for Housekeeping position",
      "data": {
        "application_id": "uuid",
        "property_id": "uuid"
      },
      "is_read": false,
      "created_at": "2025-08-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### POST /api/notifications/mark-read
**Purpose:** Mark notifications as read
**Parameters:** 
- `notification_ids`: array of UUIDs
- `mark_all`: boolean (mark all as read)
**Response:** Success confirmation
**Errors:** 401 Unauthorized, 400 Bad Request

#### GET /api/notifications/preferences
**Purpose:** Get user notification preferences
**Response:** User notification settings
**Errors:** 401 Unauthorized

#### PUT /api/notifications/preferences
**Purpose:** Update user notification preferences
**Parameters:** Notification preference object
**Response:** Updated preferences
**Errors:** 401 Unauthorized, 400 Bad Request

### Bulk Operations Endpoints

#### POST /api/bulk/applications/approve
**Purpose:** Bulk approve multiple applications
**Parameters:**
- `application_ids`: array of UUIDs
- `reason`: optional approval reason
**Response:** Bulk operation job ID and initial status
**Errors:** 401 Unauthorized, 400 Bad Request

```json
{
  "job_id": "uuid",
  "status": "processing",
  "total_items": 5,
  "estimated_completion": "2025-08-06T10:05:00Z"
}
```

#### POST /api/bulk/applications/reject
**Purpose:** Bulk reject multiple applications
**Parameters:**
- `application_ids`: array of UUIDs
- `reason`: required rejection reason
**Response:** Bulk operation job ID
**Errors:** 401 Unauthorized, 400 Bad Request

#### GET /api/bulk/operations/{job_id}/status
**Purpose:** Get bulk operation status and progress
**Response:** Operation progress and results
**Errors:** 401 Unauthorized, 404 Not Found

```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 100,
  "total_items": 5,
  "completed_items": 5,
  "failed_items": 0,
  "results": [
    {
      "item_id": "uuid",
      "status": "success",
      "message": "Application approved successfully"
    }
  ]
}
```

### Enhanced Search Endpoints

#### GET /api/search/global
**Purpose:** Global search across applications, employees, and properties
**Parameters:**
- `query`: search term
- `entity_types`: array of entity types to search
- `property_id`: optional property filter
- `limit`: integer (default: 10, max: 50)
**Response:** Combined search results
**Errors:** 401 Unauthorized, 400 Bad Request

```json
{
  "results": {
    "applications": [...],
    "employees": [...],
    "properties": [...]
  },
  "total_results": 15,
  "search_time_ms": 45
}
```

#### POST /api/search/saved
**Purpose:** Save search query for later use
**Parameters:** Search query object
**Response:** Saved search ID
**Errors:** 401 Unauthorized, 400 Bad Request

#### GET /api/search/saved
**Purpose:** Get user's saved searches
**Response:** List of saved searches
**Errors:** 401 Unauthorized

### Audit Trail Endpoints

#### GET /api/audit/logs
**Purpose:** Retrieve audit logs with filtering
**Parameters:**
- `user_id`: optional user filter
- `entity_type`: optional entity type filter
- `action`: optional action filter
- `date_range`: start_date,end_date
- `property_id`: optional property filter
- `page`: integer (default: 1)
- `limit`: integer (default: 20, max: 100)
**Response:** Paginated audit logs
**Errors:** 401 Unauthorized, 403 Forbidden (HR only)

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_type": "manager",
      "action": "approve",
      "entity_type": "application",
      "entity_id": "uuid",
      "property_id": "uuid",
      "details": {
        "before": {...},
        "after": {...}
      },
      "ip_address": "192.168.1.1",
      "created_at": "2025-08-06T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### GET /api/audit/reports/compliance
**Purpose:** Generate compliance audit reports
**Parameters:**
- `report_type`: 'access_log', 'data_changes', 'security_events'
- `date_range`: start_date,end_date
- `format`: 'json', 'pdf', 'csv'
**Response:** Compliance report or file download
**Errors:** 401 Unauthorized, 403 Forbidden (HR only)

### WebSocket Real-Time Updates

#### WS /ws/dashboard
**Purpose:** Real-time dashboard updates
**Authentication:** JWT token via query parameter
**Events:**
- `application_created`: New application submitted
- `application_status_changed`: Application approved/rejected
- `onboarding_completed`: Employee completed onboarding
- `notification_created`: New notification for user
- `system_alert`: System-wide alerts

```json
{
  "event": "application_created",
  "data": {
    "application_id": "uuid",
    "property_id": "uuid",
    "applicant_name": "John Doe",
    "position": "Housekeeping"
  },
  "timestamp": "2025-08-06T10:00:00Z"
}
```

### Enhanced Manager Endpoints

#### GET /api/manager/dashboard/metrics
**Purpose:** Real-time manager dashboard metrics
**Response:** Current property metrics with caching
**Errors:** 401 Unauthorized, 403 Forbidden

#### POST /api/manager/onboarding/bulk-review
**Purpose:** Bulk review multiple onboarding sessions
**Parameters:**
- `session_ids`: array of UUIDs
- `action`: 'approve', 'request_changes', 'reject'
- `comments`: optional comments
**Response:** Bulk operation job ID
**Errors:** 401 Unauthorized, 400 Bad Request

### Enhanced HR Endpoints

#### GET /api/hr/analytics/performance
**Purpose:** Manager and property performance analytics
**Parameters:**
- `manager_id`: optional specific manager
- `property_id`: optional specific property
- `date_range`: start_date,end_date
**Response:** Performance metrics and comparisons
**Errors:** 401 Unauthorized, 403 Forbidden (HR only)

#### POST /api/hr/notifications/broadcast
**Purpose:** Send broadcast notifications
**Parameters:**
- `user_type`: 'managers', 'all'
- `property_ids`: optional property filter
- `title`: notification title
- `message`: notification content
- `channels`: delivery channels array
**Response:** Broadcast job ID
**Errors:** 401 Unauthorized, 403 Forbidden (HR only)

## Controllers

### Enhanced Analytics Controller
**Purpose:** Handle all analytics and reporting functionality
**Methods:**
- `get_dashboard_analytics()`: Aggregate dashboard data with caching
- `generate_custom_report()`: Create custom reports with flexible parameters
- `export_data()`: Handle data exports in multiple formats
- `cache_analytics_data()`: Manage analytics caching

### Real-Time Notification Controller
**Purpose:** Manage notification system and real-time updates
**Methods:**
- `get_notifications()`: Retrieve user notifications with filtering
- `mark_notifications_read()`: Update notification read status
- `manage_preferences()`: Handle notification preferences
- `send_notification()`: Create and dispatch notifications
- `broadcast_notification()`: Send notifications to multiple users

### Bulk Operations Controller
**Purpose:** Handle bulk operations with progress tracking
**Methods:**
- `bulk_approve_applications()`: Process bulk application approvals
- `bulk_reject_applications()`: Process bulk application rejections
- `get_operation_status()`: Track bulk operation progress
- `process_bulk_operation()`: Background job processor

### Enhanced Search Controller
**Purpose:** Provide advanced search capabilities
**Methods:**
- `global_search()`: Search across multiple entity types
- `save_search_query()`: Store user search preferences
- `get_saved_searches()`: Retrieve user's saved searches
- `advanced_filter()`: Handle complex filtering scenarios

### Audit Trail Controller
**Purpose:** Manage comprehensive audit logging and reporting
**Methods:**
- `log_audit_event()`: Record audit events
- `get_audit_logs()`: Retrieve filtered audit logs
- `generate_compliance_report()`: Create compliance audit reports
- `cleanup_old_logs()`: Maintenance for audit log retention

### WebSocket Controller
**Purpose:** Handle real-time communication
**Methods:**
- `handle_connection()`: Manage WebSocket connections
- `broadcast_update()`: Send real-time updates to clients
- `authenticate_websocket()`: Validate WebSocket authentication
- `manage_subscriptions()`: Handle client event subscriptions