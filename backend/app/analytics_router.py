"""
Analytics API Router for Task 5
Provides endpoints for HR analytics, reporting, and performance metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

from .auth import get_current_user
from .analytics_service import AnalyticsService, TimeRange, ReportFormat, MetricType
from .supabase_service_enhanced import EnhancedSupabaseService
from .response_models import APIResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Request/Response Models
class DashboardRequest(BaseModel):
    time_range: str = "last_30_days"
    property_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CustomReportRequest(BaseModel):
    report_type: str
    parameters: Dict[str, Any]
    format: str = "json"

class ManagerPerformanceRequest(BaseModel):
    manager_id: Optional[str] = None
    time_range: str = "30days"

class PropertyPerformanceRequest(BaseModel):
    property_id: Optional[str] = None
    time_range: str = "30days"
    compare_to: Optional[str] = None  # 'company_avg' or another property_id

class ExportRequest(BaseModel):
    report_type: str
    format: str  # csv, excel, pdf
    parameters: Dict[str, Any]

# Initialize services
supabase_service = EnhancedSupabaseService()
analytics_service = AnalyticsService(supabase_service)

@router.get("/dashboard")
async def get_dashboard_metrics(
    time_range: str = Query("last_30_days"),
    property_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get comprehensive dashboard metrics"""
    try:
        # Convert string time_range to enum
        time_range_enum = {
            "last_7_days": TimeRange.LAST_7_DAYS,
            "last_30_days": TimeRange.LAST_30_DAYS,
            "last_90_days": TimeRange.LAST_90_DAYS,
            "last_year": TimeRange.LAST_YEAR,
            "custom": TimeRange.CUSTOM
        }.get(time_range, TimeRange.LAST_30_DAYS)
        
        # Check if user has access to property
        if property_id and current_user.get("role") == "manager":
            # Managers can only see their own property
            if property_id != current_user.get("property_id"):
                raise HTTPException(status_code=403, detail="Access denied to this property")
        
        # Get metrics - using mock data for now
        metrics = {
            "overview": {
                "total_applications": 245,
                "active_applications": 32,
                "pending_onboarding": 18,
                "completed_this_month": 28,
                "completion_rate": 87.5,
                "average_time_to_hire": 14.3,
                "total_properties": 5,
                "total_employees": 523
            },
            "applications": {
                "by_status": [
                    {"status": "submitted", "count": 12},
                    {"status": "screening", "count": 8},
                    {"status": "interview", "count": 6},
                    {"status": "offer", "count": 4},
                    {"status": "onboarding", "count": 2}
                ],
                "by_property": [
                    {"property": "Downtown Hotel", "count": 15},
                    {"property": "Airport Hotel", "count": 10},
                    {"property": "Beach Resort", "count": 7}
                ],
                "funnel": {
                    "submitted": 245,
                    "screening": 180,
                    "interview": 120,
                    "offer": 85,
                    "onboarding": 60,
                    "completed": 52
                }
            },
            "trends": {
                "daily": [
                    {"date": "2025-08-01", "applications": 8, "completions": 3},
                    {"date": "2025-08-02", "applications": 12, "completions": 5},
                    {"date": "2025-08-03", "applications": 6, "completions": 2},
                    {"date": "2025-08-04", "applications": 10, "completions": 4},
                    {"date": "2025-08-05", "applications": 15, "completions": 6},
                    {"date": "2025-08-06", "applications": 9, "completions": 3},
                    {"date": "2025-08-07", "applications": 11, "completions": 4}
                ],
                "weekly": [],
                "monthly": []
            },
            "performance": {
                "by_manager": [
                    {
                        "manager": "John Smith",
                        "reviewed": 45,
                        "approved": 38,
                        "approval_rate": 84.4,
                        "avg_review_time": 4.2
                    },
                    {
                        "manager": "Jane Doe",
                        "reviewed": 52,
                        "approved": 48,
                        "approval_rate": 92.3,
                        "avg_review_time": 3.8
                    }
                ],
                "by_department": [
                    {
                        "department": "Front Desk",
                        "positions_filled": 8,
                        "time_to_fill": 12,
                        "retention_rate": 88
                    },
                    {
                        "department": "Housekeeping",
                        "positions_filled": 15,
                        "time_to_fill": 10,
                        "retention_rate": 85
                    }
                ]
            },
            "compliance": {
                "i9_compliance": 94,
                "w4_compliance": 98,
                "document_completion": 91,
                "expiring_documents": 5,
                "overdue_tasks": 3
            }
        }
        
        return APIResponse(
            success=True,
            data=metrics,
            message="Dashboard metrics retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve dashboard metrics: {str(e)}"
        )

@router.post("/custom-report")
async def generate_custom_report(
    request: CustomReportRequest,
    current_user = Depends(get_current_user)
):
    """Generate a custom report with specified parameters"""
    try:
        # Convert format string to enum
        format_enum = {
            "json": ReportFormat.JSON,
            "csv": ReportFormat.CSV,
            "excel": ReportFormat.EXCEL,
            "pdf": ReportFormat.PDF
        }.get(request.format.lower(), ReportFormat.JSON)
        
        # Generate report using analytics service
        report_data = await analytics_service.generate_custom_report(
            report_type=request.report_type,
            parameters=request.parameters,
            format=format_enum
        )
        
        # Set appropriate response headers based on format
        if format_enum == ReportFormat.CSV:
            return Response(
                content=report_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={request.report_type}_{datetime.now().strftime('%Y%m%d')}.csv"
                }
            )
        elif format_enum == ReportFormat.EXCEL:
            return Response(
                content=report_data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={request.report_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
                }
            )
        elif format_enum == ReportFormat.PDF:
            return Response(
                content=report_data,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={request.report_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
                }
            )
        else:
            return APIResponse(
                success=True,
                data=report_data,
                message="Report generated successfully"
            )
    except ValueError as e:
        return APIResponse(
            success=False,
            message=f"Invalid report parameters: {str(e)}"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to generate report: {str(e)}"
        )

@router.get("/manager-performance")
async def get_manager_performance(
    time_range: str = Query("30days"),
    manager_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get manager performance metrics"""
    try:
        # Mock data for demonstration
        performance_data = [
            {
                "manager_id": "mgr_001",
                "manager_name": "John Smith",
                "metrics": {
                    "applications_reviewed": 45,
                    "applications_approved": 38,
                    "approval_rate": 84.4,
                    "avg_review_time_hours": 4.2,
                    "onboarding_completion_rate": 92,
                    "employee_retention_rate": 88,
                    "compliance_score": 95
                },
                "trends": [
                    {"date": "2025-01", "reviewed": 12, "approved": 10, "avg_time": 4.5},
                    {"date": "2025-02", "reviewed": 15, "approved": 13, "avg_time": 4.0},
                    {"date": "2025-03", "reviewed": 18, "approved": 15, "avg_time": 4.2}
                ],
                "ranking": 2,
                "improvement_areas": ["Review time optimization", "Approval rate improvement"]
            }
        ]
        
        if manager_id:
            performance_data = [p for p in performance_data if p["manager_id"] == manager_id]
        
        return APIResponse(
            success=True,
            data=performance_data,
            message="Manager performance data retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve manager performance: {str(e)}"
        )

@router.get("/property-performance")
async def get_property_performance(
    time_range: str = Query("30days"),
    property_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get property performance metrics"""
    try:
        # Mock data for demonstration
        performance_data = [
            {
                "property_id": "prop_001",
                "property_name": "Downtown Hotel",
                "metrics": {
                    "total_employees": 125,
                    "open_positions": 8,
                    "time_to_fill_avg": 18,
                    "turnover_rate": 12,
                    "satisfaction_score": 4.2,
                    "compliance_rate": 96
                },
                "comparison": {
                    "vs_company_avg": 5,
                    "vs_last_period": -3,
                    "ranking": 3
                },
                "departments": [
                    {"name": "Front Desk", "performance_score": 88, "headcount": 25, "efficiency": 92},
                    {"name": "Housekeeping", "performance_score": 85, "headcount": 40, "efficiency": 88},
                    {"name": "Food Service", "performance_score": 90, "headcount": 35, "efficiency": 94},
                    {"name": "Maintenance", "performance_score": 82, "headcount": 15, "efficiency": 86}
                ]
            }
        ]
        
        if property_id:
            performance_data = [p for p in performance_data if p["property_id"] == property_id]
        
        return APIResponse(
            success=True,
            data=performance_data,
            message="Property performance data retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve property performance: {str(e)}"
        )

@router.post("/export")
async def export_data(
    request: ExportRequest,
    current_user = Depends(get_current_user)
):
    """Export analytics data in various formats"""
    try:
        # Convert format string to enum
        format_enum = {
            "csv": ReportFormat.CSV,
            "excel": ReportFormat.EXCEL,
            "pdf": ReportFormat.PDF
        }.get(request.format.lower(), ReportFormat.CSV)
        
        # Generate report
        report_data = await analytics_service.generate_custom_report(
            report_type=request.report_type,
            parameters=request.parameters,
            format=format_enum
        )
        
        # Return appropriate response based on format
        if format_enum == ReportFormat.CSV:
            return Response(
                content=report_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
        elif format_enum == ReportFormat.EXCEL:
            return Response(
                content=report_data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                }
            )
        elif format_enum == ReportFormat.PDF:
            return Response(
                content=report_data,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                }
            )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to export data: {str(e)}"
        )

@router.get("/trends")
async def get_hiring_trends(
    property_id: Optional[str] = Query(None),
    lookback_days: int = Query(90),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get hiring trends and forecasting data"""
    try:
        # Mock trend data
        trends = {
            "daily_applications": [
                {"date": "2025-08-01", "count": 8},
                {"date": "2025-08-02", "count": 12},
                {"date": "2025-08-03", "count": 6},
                {"date": "2025-08-04", "count": 10},
                {"date": "2025-08-05", "count": 15},
                {"date": "2025-08-06", "count": 9},
                {"date": "2025-08-07", "count": 11}
            ],
            "weekly_average": 10.1,
            "trend_direction": "increasing",
            "growth_rate": 5.2,
            "forecast": {
                "next_week": 75,
                "next_month": 320,
                "confidence": 0.85
            },
            "seasonality": {
                "peak_months": ["June", "July", "August"],
                "low_months": ["January", "February"],
                "current_position": "peak"
            }
        }
        
        return APIResponse(
            success=True,
            data=trends,
            message="Hiring trends retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve trends: {str(e)}"
        )

@router.get("/compliance-summary")
async def get_compliance_summary(
    property_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get compliance summary and alerts"""
    try:
        # Mock compliance data
        compliance = {
            "overall_score": 94.5,
            "by_category": {
                "i9_forms": {
                    "compliant": 245,
                    "pending": 12,
                    "overdue": 3,
                    "compliance_rate": 94.2
                },
                "w4_forms": {
                    "compliant": 252,
                    "pending": 8,
                    "overdue": 0,
                    "compliance_rate": 96.9
                },
                "background_checks": {
                    "completed": 238,
                    "pending": 15,
                    "expired": 7,
                    "compliance_rate": 91.5
                }
            },
            "alerts": [
                {
                    "type": "warning",
                    "category": "i9",
                    "message": "3 I-9 forms are overdue for completion",
                    "affected_employees": 3
                },
                {
                    "type": "info",
                    "category": "background",
                    "message": "7 background checks will expire within 30 days",
                    "affected_employees": 7
                }
            ],
            "upcoming_deadlines": [
                {
                    "employee": "John Doe",
                    "document": "I-9 Section 2",
                    "deadline": "2025-08-10",
                    "days_remaining": 3
                },
                {
                    "employee": "Jane Smith",
                    "document": "Background Check",
                    "deadline": "2025-08-15",
                    "days_remaining": 8
                }
            ]
        }
        
        return APIResponse(
            success=True,
            data=compliance,
            message="Compliance summary retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve compliance summary: {str(e)}"
        )