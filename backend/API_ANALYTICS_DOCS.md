# HR Analytics API Documentation

## Overview
These endpoints provide analytics and reporting capabilities for the HR dashboard.

## Authentication
All endpoints require HR role authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. GET /api/hr/analytics/overview
Get a comprehensive overview of HR analytics with general statistics.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalProperties": 10,
      "totalManagers": 15,
      "totalEmployees": 250,
      "activeEmployees": 230,
      "onboardingInProgress": 20
    },
    "applications": {
      "total": 500,
      "pending": 45,
      "approved": 400,
      "approvalRate": 80.0
    },
    "metrics": {
      "employeeRetentionRate": 85.5,
      "averageOnboardingDays": 3.2,
      "completionRate": 92.0,
      "propertiesWithoutManagers": 2
    },
    "alerts": {
      "pendingApplications": true,
      "onboardingOverdue": false,
      "propertiesNeedingManagers": false
    }
  },
  "message": "Analytics overview retrieved successfully"
}
```

### 2. GET /api/hr/analytics/employee-trends
Get employee trending data over a specified time period.

**Query Parameters:**
- `days` (optional, default: 30): Number of days to analyze

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2025-08-01",
      "endDate": "2025-08-30"
    },
    "trends": [
      {
        "date": "2025-08-01",
        "newApplications": 12,
        "approvedApplications": 8,
        "completedOnboarding": 6,
        "activeEmployees": 150
      }
    ],
    "summary": {
      "totalApplications": 350,
      "totalApprovals": 280,
      "totalCompletions": 250,
      "averagePerDay": {
        "applications": 11.67,
        "approvals": 9.33,
        "completions": 8.33
      }
    },
    "weekly": {
      "currentWeek": {
        "applications": 85,
        "approvals": 72,
        "completions": 65
      },
      "previousWeek": {
        "applications": 78,
        "approvals": 68,
        "completions": 60
      }
    },
    "growth": {
      "applicationGrowth": 8.97,
      "trend": "increasing"
    }
  },
  "message": "Employee trends retrieved successfully"
}
```

### 3. GET /api/hr/analytics/property-performance
Get performance metrics broken down by property.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "property": {
          "id": "prop-001",
          "name": "Downtown Hotel",
          "city": "New York",
          "state": "NY",
          "status": "active"
        },
        "staffing": {
          "managers": 3,
          "employees": 45,
          "activeEmployees": 42,
          "pendingOnboarding": 3
        },
        "performance": {
          "score": 95.5,
          "rating": "excellent",
          "onboardingCompletionRate": 93.3,
          "averageOnboardingDays": 2.8
        },
        "activity": {
          "applicationsThisMonth": 15,
          "hiredThisMonth": 12,
          "lastActivityDate": "2025-08-30"
        }
      }
    ],
    "summary": {
      "totalProperties": 10,
      "totalEmployees": 450,
      "totalManagers": 35,
      "averagePerformanceScore": 82.3,
      "topPerformers": ["Downtown Hotel", "Airport Plaza", "Beach Resort"],
      "needsAttention": ["Old Town Inn"]
    },
    "benchmarks": {
      "targetManagerRatio": 1,
      "targetCompletionRate": 80,
      "targetOnboardingDays": 3
    }
  },
  "message": "Property performance metrics retrieved successfully"
}
```

## Error Responses
All endpoints return standardized error responses:
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "DATABASE_ERROR",
  "status_code": 500,
  "message": "Failed to retrieve data"
}
```

## Usage Notes

1. **Performance**: The overview and property-performance endpoints use parallel queries for optimal performance.

2. **Data Sources**: Currently, the employee-trends endpoint returns demo data. In production, this would be replaced with actual database queries.

3. **Metrics Calculation**:
   - Approval Rate: (Approved Applications / Total Applications) × 100
   - Completion Rate: (Active Employees / Total Employees) × 100
   - Performance Score: Based on staffing levels, onboarding completion, and activity

4. **Caching**: Consider implementing caching for these endpoints as the data doesn't change frequently.

## Integration with Frontend

These endpoints are designed to power the HR dashboard analytics views:
- Overview endpoint → Dashboard summary cards
- Employee trends → Line charts and growth indicators
- Property performance → Data tables and performance rankings