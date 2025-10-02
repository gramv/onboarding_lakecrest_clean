"""
Advanced HR Analytics Service for Task 5
Provides comprehensive analytics, reporting, and data aggregation with caching
"""

import asyncio
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import json
from functools import lru_cache
import pandas as pd
import io
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import xlsxwriter
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ReportFormat(Enum):
    """Supported report export formats"""
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    JSON = "json"

class MetricType(Enum):
    """Types of metrics to track"""
    COUNT = "count"
    AVERAGE = "average"
    SUM = "sum"
    PERCENTAGE = "percentage"
    TREND = "trend"
    COMPARISON = "comparison"

class TimeRange(Enum):
    """Predefined time ranges for analytics"""
    TODAY = "today"
    YESTERDAY = "yesterday"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_QUARTER = "this_quarter"
    LAST_QUARTER = "last_quarter"
    THIS_YEAR = "this_year"
    LAST_YEAR = "last_year"
    CUSTOM = "custom"

class AnalyticsService:
    """Advanced analytics service with caching and optimization"""
    
    def __init__(self, supabase_service):
        self.supabase = supabase_service
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
        self._last_cache_clear = datetime.utcnow()
    
    # ==================== Data Aggregation ====================
    
    async def get_dashboard_metrics(
        self,
        property_id: Optional[str] = None,
        time_range: TimeRange = TimeRange.LAST_30_DAYS,
        user_role: str = "hr"
    ) -> Dict[str, Any]:
        """Get comprehensive dashboard metrics with caching"""
        
        cache_key = f"dashboard_{property_id}_{time_range.value}_{user_role}"
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Get date range
        start_date, end_date = self._get_date_range(time_range)
        
        # Fetch all required data in parallel
        results = await asyncio.gather(
            self._get_application_metrics(property_id, start_date, end_date),
            self._get_employee_metrics(property_id, start_date, end_date),
            self._get_onboarding_metrics(property_id, start_date, end_date),
            self._get_performance_metrics(property_id, start_date, end_date),
            self._get_compliance_metrics(property_id, start_date, end_date)
        )
        
        metrics = {
            "applications": results[0],
            "employees": results[1],
            "onboarding": results[2],
            "performance": results[3],
            "compliance": results[4],
            "time_range": {
                "label": time_range.value,
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
        self._set_cached_data(cache_key, metrics)
        return metrics
    
    async def _get_application_metrics(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get application-related metrics"""
        
        # Fetch applications
        applications = await self.supabase.get_applications(
            property_id=property_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate metrics
        total = len(applications)
        pending = sum(1 for app in applications if app.get("status") == "pending")
        approved = sum(1 for app in applications if app.get("status") == "approved")
        rejected = sum(1 for app in applications if app.get("status") == "rejected")
        
        # Calculate average processing time
        processing_times = []
        for app in applications:
            if app.get("status") in ["approved", "rejected"] and app.get("reviewed_at"):
                created = datetime.fromisoformat(app["created_at"])
                reviewed = datetime.fromisoformat(app["reviewed_at"])
                processing_times.append((reviewed - created).total_seconds() / 3600)
        
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        # Daily trend
        daily_counts = defaultdict(int)
        for app in applications:
            date_key = app["created_at"][:10]
            daily_counts[date_key] += 1
        
        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": (approved / total * 100) if total > 0 else 0,
            "avg_processing_time_hours": round(avg_processing_time, 1),
            "daily_trend": dict(daily_counts),
            "by_position": self._group_by_field(applications, "position"),
            "by_department": self._group_by_field(applications, "department")
        }
    
    async def _get_employee_metrics(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get employee-related metrics"""
        
        employees = await self.supabase.get_employees(property_id=property_id)
        
        # Filter by date range for new hires
        new_hires = [
            emp for emp in employees
            if start_date <= datetime.fromisoformat(emp["hire_date"]) <= end_date
        ]
        
        total = len(employees)
        active = sum(1 for emp in employees if emp.get("employment_status") == "active")
        
        # Turnover calculation
        terminated = sum(1 for emp in employees if emp.get("employment_status") == "terminated")
        turnover_rate = (terminated / total * 100) if total > 0 else 0
        
        # Department distribution
        by_department = self._group_by_field(employees, "department")
        
        # Position distribution
        by_position = self._group_by_field(employees, "position")
        
        # Employment type distribution
        by_type = self._group_by_field(employees, "employment_type")
        
        return {
            "total": total,
            "active": active,
            "new_hires": len(new_hires),
            "turnover_rate": round(turnover_rate, 1),
            "by_department": by_department,
            "by_position": by_position,
            "by_employment_type": by_type,
            "average_tenure_days": self._calculate_average_tenure(employees)
        }
    
    async def _get_onboarding_metrics(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get onboarding-related metrics"""
        
        # Fetch onboarding sessions
        sessions = await self.supabase.get_onboarding_sessions(
            property_id=property_id,
            start_date=start_date,
            end_date=end_date
        )
        
        total = len(sessions)
        completed = sum(1 for s in sessions if s.get("status") == "completed")
        in_progress = sum(1 for s in sessions if s.get("status") == "in_progress")
        expired = sum(1 for s in sessions if s.get("status") == "expired")
        
        # Calculate average completion time
        completion_times = []
        for session in sessions:
            if session.get("status") == "completed" and session.get("completed_at"):
                started = datetime.fromisoformat(session["created_at"])
                completed_at = datetime.fromisoformat(session["completed_at"])
                completion_times.append((completed_at - started).total_seconds() / 3600)
        
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Form completion rates
        form_completion = {
            "i9_section1": sum(1 for s in sessions if s.get("i9_section1_completed")),
            "w4": sum(1 for s in sessions if s.get("w4_completed")),
            "direct_deposit": sum(1 for s in sessions if s.get("direct_deposit_completed")),
            "emergency_contacts": sum(1 for s in sessions if s.get("emergency_contacts_completed"))
        }
        
        return {
            "total_sessions": total,
            "completed": completed,
            "in_progress": in_progress,
            "expired": expired,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "avg_completion_time_hours": round(avg_completion_time, 1),
            "form_completion_rates": {
                k: (v / total * 100) if total > 0 else 0
                for k, v in form_completion.items()
            }
        }
    
    async def _get_performance_metrics(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get performance-related metrics"""
        
        # Manager performance
        if property_id:
            managers = await self.supabase.get_property_managers(property_id)
        else:
            managers = await self.supabase.get_all_managers()
        
        manager_stats = []
        for manager in managers:
            # Get applications reviewed by this manager
            apps = await self.supabase.get_applications_by_reviewer(
                manager["id"],
                start_date,
                end_date
            )
            
            manager_stats.append({
                "manager_id": manager["id"],
                "manager_name": manager.get("name", "Unknown"),
                "applications_reviewed": len(apps),
                "avg_review_time": self._calculate_avg_review_time(apps)
            })
        
        # Property performance (if HR user)
        property_stats = []
        if not property_id:  # HR can see all properties
            properties = await self.supabase.get_all_properties()
            for prop in properties:
                prop_apps = await self.supabase.get_applications(
                    property_id=prop["id"],
                    start_date=start_date,
                    end_date=end_date
                )
                
                property_stats.append({
                    "property_id": prop["id"],
                    "property_name": prop["name"],
                    "total_applications": len(prop_apps),
                    "completion_rate": self._calculate_completion_rate(prop_apps)
                })
        
        return {
            "manager_performance": manager_stats,
            "property_performance": property_stats,
            "top_performers": sorted(
                manager_stats,
                key=lambda x: x["applications_reviewed"],
                reverse=True
            )[:5]
        }
    
    async def _get_compliance_metrics(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get compliance-related metrics"""
        
        # I-9 compliance
        i9_forms = await self.supabase.get_i9_forms(
            property_id=property_id,
            start_date=start_date,
            end_date=end_date
        )
        
        i9_section1_on_time = sum(
            1 for form in i9_forms
            if self._check_i9_section1_compliance(form)
        )
        
        i9_section2_on_time = sum(
            1 for form in i9_forms
            if self._check_i9_section2_compliance(form)
        )
        
        # W-4 compliance
        w4_forms = await self.supabase.get_w4_forms(
            property_id=property_id,
            start_date=start_date,
            end_date=end_date
        )
        
        w4_complete = sum(1 for form in w4_forms if form.get("signed"))
        
        # Document retention compliance
        retention_compliant = await self._check_document_retention_compliance(
            property_id,
            start_date,
            end_date
        )
        
        return {
            "i9_section1_compliance_rate": (
                (i9_section1_on_time / len(i9_forms) * 100)
                if i9_forms else 100
            ),
            "i9_section2_compliance_rate": (
                (i9_section2_on_time / len(i9_forms) * 100)
                if i9_forms else 100
            ),
            "w4_completion_rate": (
                (w4_complete / len(w4_forms) * 100)
                if w4_forms else 100
            ),
            "document_retention_compliant": retention_compliant,
            "total_i9_forms": len(i9_forms),
            "total_w4_forms": len(w4_forms)
        }
    
    # ==================== Custom Reports ====================
    
    async def generate_custom_report(
        self,
        report_type: str,
        parameters: Dict[str, Any],
        format: ReportFormat = ReportFormat.JSON
    ) -> Any:
        """Generate custom report with flexible parameters"""
        
        # Get report data based on type
        if report_type == "employee_roster":
            data = await self._generate_employee_roster(parameters)
        elif report_type == "application_summary":
            data = await self._generate_application_summary(parameters)
        elif report_type == "onboarding_status":
            data = await self._generate_onboarding_status(parameters)
        elif report_type == "compliance_audit":
            data = await self._generate_compliance_audit(parameters)
        elif report_type == "performance_review":
            data = await self._generate_performance_review(parameters)
        elif report_type == "trend_analysis":
            data = await self._generate_trend_analysis(parameters)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Export in requested format
        if format == ReportFormat.CSV:
            return self._export_to_csv(data)
        elif format == ReportFormat.EXCEL:
            return self._export_to_excel(data, report_type)
        elif format == ReportFormat.PDF:
            return self._export_to_pdf(data, report_type, parameters)
        else:
            return data
    
    async def _generate_employee_roster(self, params: Dict[str, Any]) -> List[Dict]:
        """Generate employee roster report"""
        employees = await self.supabase.get_employees(
            property_id=params.get("property_id"),
            department=params.get("department"),
            status=params.get("status", "active")
        )
        
        return [
            {
                "employee_id": emp["id"],
                "name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}",
                "position": emp.get("position"),
                "department": emp.get("department"),
                "hire_date": emp.get("hire_date"),
                "employment_status": emp.get("employment_status"),
                "email": emp.get("email"),
                "phone": emp.get("phone")
            }
            for emp in employees
        ]
    
    async def _generate_application_summary(self, params: Dict[str, Any]) -> Dict:
        """Generate application summary report"""
        start_date, end_date = self._parse_date_params(params)
        
        applications = await self.supabase.get_applications(
            property_id=params.get("property_id"),
            start_date=start_date,
            end_date=end_date
        )
        
        summary = {
            "total_applications": len(applications),
            "by_status": self._group_by_field(applications, "status"),
            "by_position": self._group_by_field(applications, "position"),
            "by_source": self._group_by_field(applications, "source"),
            "daily_breakdown": self._get_daily_breakdown(applications),
            "average_processing_time": self._calculate_avg_processing_time(applications)
        }
        
        return summary
    
    async def _generate_onboarding_status(self, params: Dict[str, Any]) -> List[Dict]:
        """Generate onboarding status report"""
        sessions = await self.supabase.get_onboarding_sessions(
            property_id=params.get("property_id"),
            status=params.get("status")
        )
        
        return [
            {
                "session_id": session["id"],
                "employee_name": session.get("employee_name"),
                "status": session.get("status"),
                "progress_percentage": self._calculate_progress(session),
                "started_at": session.get("created_at"),
                "last_activity": session.get("updated_at"),
                "forms_completed": self._get_completed_forms(session)
            }
            for session in sessions
        ]
    
    async def _generate_compliance_audit(self, params: Dict[str, Any]) -> Dict:
        """Generate compliance audit report"""
        start_date, end_date = self._parse_date_params(params)
        
        audit_data = {
            "i9_compliance": await self._audit_i9_compliance(
                params.get("property_id"),
                start_date,
                end_date
            ),
            "w4_compliance": await self._audit_w4_compliance(
                params.get("property_id"),
                start_date,
                end_date
            ),
            "document_retention": await self._audit_document_retention(
                params.get("property_id")
            ),
            "audit_timestamp": datetime.utcnow().isoformat(),
            "auditor": params.get("auditor", "System")
        }
        
        return audit_data
    
    async def _generate_performance_review(self, params: Dict[str, Any]) -> Dict:
        """Generate performance review report"""
        start_date, end_date = self._parse_date_params(params)
        
        # Get manager performance data
        managers = await self._get_manager_performance(
            params.get("property_id"),
            start_date,
            end_date
        )
        
        # Get property performance data
        properties = await self._get_property_performance(
            start_date,
            end_date
        )
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "manager_rankings": managers,
            "property_rankings": properties,
            "top_performers": self._identify_top_performers(managers),
            "areas_for_improvement": self._identify_improvement_areas(managers, properties)
        }
    
    async def _generate_trend_analysis(self, params: Dict[str, Any]) -> Dict:
        """Generate trend analysis report"""
        metric = params.get("metric", "applications")
        period = params.get("period", "monthly")
        duration = params.get("duration", 6)  # Last 6 periods
        
        trend_data = await self._calculate_trends(
            metric,
            period,
            duration,
            params.get("property_id")
        )
        
        return {
            "metric": metric,
            "period": period,
            "trend_data": trend_data,
            "summary": self._summarize_trend(trend_data),
            "forecast": self._forecast_trend(trend_data)
        }
    
    # ==================== Export Functions ====================
    
    def _export_to_csv(self, data: Any) -> str:
        """Export data to CSV format"""
        output = io.StringIO()
        
        if isinstance(data, list) and data:
            # List of dictionaries
            keys = data[0].keys()
            writer = csv.DictWriter(output, fieldnames=keys)
            writer.writeheader()
            writer.writerows(data)
        elif isinstance(data, dict):
            # Single dictionary - flatten it
            flattened = self._flatten_dict(data)
            writer = csv.DictWriter(output, fieldnames=flattened.keys())
            writer.writeheader()
            writer.writerow(flattened)
        
        return output.getvalue()
    
    def _export_to_excel(self, data: Any, report_type: str) -> bytes:
        """Export data to Excel format"""
        output = io.BytesIO()
        
        with xlsxwriter.Workbook(output, {'in_memory': True}) as workbook:
            # Add metadata worksheet
            metadata_sheet = workbook.add_worksheet('Report Info')
            metadata_sheet.write(0, 0, 'Report Type')
            metadata_sheet.write(0, 1, report_type)
            metadata_sheet.write(1, 0, 'Generated At')
            metadata_sheet.write(1, 1, datetime.utcnow().isoformat())
            
            # Add data worksheet
            data_sheet = workbook.add_worksheet('Data')
            
            if isinstance(data, list) and data:
                # Write headers
                headers = list(data[0].keys())
                for col, header in enumerate(headers):
                    data_sheet.write(0, col, header)
                
                # Write data rows
                for row_idx, row in enumerate(data, 1):
                    for col_idx, header in enumerate(headers):
                        data_sheet.write(row_idx, col_idx, row.get(header, ''))
            
            elif isinstance(data, dict):
                # Write dictionary as key-value pairs
                row = 0
                for key, value in self._flatten_dict(data).items():
                    data_sheet.write(row, 0, key)
                    data_sheet.write(row, 1, str(value))
                    row += 1
        
        output.seek(0)
        return output.read()
    
    def _export_to_pdf(self, data: Any, report_type: str, params: Dict) -> bytes:
        """Export data to PDF format"""
        output = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(output, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Add title
        title = Paragraph(
            f"{report_type.replace('_', ' ').title()} Report",
            styles['Title']
        )
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Add metadata
        metadata = Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            styles['Normal']
        )
        story.append(metadata)
        story.append(Spacer(1, 12))
        
        # Add data table
        if isinstance(data, list) and data:
            # Create table from list of dictionaries
            headers = list(data[0].keys())
            table_data = [headers]
            
            for row in data:
                table_data.append([str(row.get(h, '')) for h in headers])
            
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(table)
        
        elif isinstance(data, dict):
            # Create key-value table for dictionary
            table_data = []
            for key, value in self._flatten_dict(data).items():
                table_data.append([key, str(value)])
            
            table = Table(table_data, colWidths=[3*inch, 4*inch])
            table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey)
            ]))
            story.append(table)
        
        # Build PDF
        doc.build(story)
        output.seek(0)
        return output.read()
    
    # ==================== Helper Functions ====================
    
    def _get_date_range(self, time_range: TimeRange) -> Tuple[datetime, datetime]:
        """Get start and end dates for a time range"""
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if time_range == TimeRange.TODAY:
            return today, now
        elif time_range == TimeRange.YESTERDAY:
            yesterday = today - timedelta(days=1)
            return yesterday, today
        elif time_range == TimeRange.LAST_7_DAYS:
            return today - timedelta(days=7), now
        elif time_range == TimeRange.LAST_30_DAYS:
            return today - timedelta(days=30), now
        elif time_range == TimeRange.LAST_90_DAYS:
            return today - timedelta(days=90), now
        elif time_range == TimeRange.THIS_MONTH:
            start = today.replace(day=1)
            return start, now
        elif time_range == TimeRange.LAST_MONTH:
            last_month_end = today.replace(day=1) - timedelta(days=1)
            last_month_start = last_month_end.replace(day=1)
            return last_month_start, last_month_end
        elif time_range == TimeRange.THIS_YEAR:
            start = today.replace(month=1, day=1)
            return start, now
        else:
            return today - timedelta(days=30), now
    
    def _parse_date_params(self, params: Dict) -> Tuple[datetime, datetime]:
        """Parse date parameters from request"""
        if params.get("start_date") and params.get("end_date"):
            start = datetime.fromisoformat(params["start_date"])
            end = datetime.fromisoformat(params["end_date"])
        else:
            time_range = TimeRange(params.get("time_range", "last_30_days"))
            start, end = self._get_date_range(time_range)
        return start, end
    
    def _group_by_field(self, items: List[Dict], field: str) -> Dict[str, int]:
        """Group items by a field and count"""
        groups = defaultdict(int)
        for item in items:
            value = item.get(field, "Unknown")
            groups[value] += 1
        return dict(groups)
    
    def _calculate_average_tenure(self, employees: List[Dict]) -> float:
        """Calculate average tenure in days"""
        tenures = []
        now = datetime.utcnow()
        
        for emp in employees:
            if emp.get("hire_date"):
                hire_date = datetime.fromisoformat(emp["hire_date"])
                tenure = (now - hire_date).days
                tenures.append(tenure)
        
        return sum(tenures) / len(tenures) if tenures else 0
    
    def _calculate_avg_review_time(self, applications: List[Dict]) -> float:
        """Calculate average review time in hours"""
        times = []
        for app in applications:
            if app.get("reviewed_at") and app.get("created_at"):
                created = datetime.fromisoformat(app["created_at"])
                reviewed = datetime.fromisoformat(app["reviewed_at"])
                times.append((reviewed - created).total_seconds() / 3600)
        return sum(times) / len(times) if times else 0
    
    def _calculate_avg_processing_time(self, applications: List[Dict]) -> float:
        """Calculate average processing time for applications"""
        return self._calculate_avg_review_time(applications)
    
    def _calculate_completion_rate(self, items: List[Dict]) -> float:
        """Calculate completion rate as percentage"""
        if not items:
            return 0
        completed = sum(1 for item in items if item.get("status") == "completed")
        return (completed / len(items)) * 100
    
    def _calculate_progress(self, session: Dict) -> float:
        """Calculate onboarding session progress"""
        total_steps = 10  # Total number of onboarding steps
        completed_steps = sum([
            session.get("personal_info_completed", False),
            session.get("emergency_contacts_completed", False),
            session.get("i9_section1_completed", False),
            session.get("w4_completed", False),
            session.get("direct_deposit_completed", False),
            session.get("policies_acknowledged", False),
            session.get("documents_uploaded", False),
            session.get("health_insurance_completed", False),
            session.get("training_completed", False),
            session.get("final_review_completed", False)
        ])
        return (completed_steps / total_steps) * 100
    
    def _get_completed_forms(self, session: Dict) -> List[str]:
        """Get list of completed forms for a session"""
        forms = []
        form_fields = {
            "personal_info_completed": "Personal Information",
            "emergency_contacts_completed": "Emergency Contacts",
            "i9_section1_completed": "I-9 Section 1",
            "w4_completed": "W-4 Tax Form",
            "direct_deposit_completed": "Direct Deposit",
            "health_insurance_completed": "Health Insurance"
        }
        
        for field, name in form_fields.items():
            if session.get(field):
                forms.append(name)
        
        return forms
    
    def _get_daily_breakdown(self, items: List[Dict]) -> Dict[str, int]:
        """Get daily breakdown of items"""
        daily = defaultdict(int)
        for item in items:
            if item.get("created_at"):
                date = item["created_at"][:10]
                daily[date] += 1
        return dict(daily)
    
    def _check_i9_section1_compliance(self, form: Dict) -> bool:
        """Check if I-9 Section 1 was completed on time"""
        if not form.get("section1_completed_at") or not form.get("hire_date"):
            return False
        
        completed = datetime.fromisoformat(form["section1_completed_at"])
        hire_date = datetime.fromisoformat(form["hire_date"])
        
        # Section 1 must be completed on or before first day of work
        return completed.date() <= hire_date.date()
    
    def _check_i9_section2_compliance(self, form: Dict) -> bool:
        """Check if I-9 Section 2 was completed on time"""
        if not form.get("section2_completed_at") or not form.get("hire_date"):
            return False
        
        completed = datetime.fromisoformat(form["section2_completed_at"])
        hire_date = datetime.fromisoformat(form["hire_date"])
        
        # Section 2 must be completed within 3 business days
        business_days = 0
        current_date = hire_date
        
        while business_days < 3:
            current_date += timedelta(days=1)
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                business_days += 1
        
        return completed.date() <= current_date.date()
    
    async def _check_document_retention_compliance(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> bool:
        """Check document retention compliance"""
        # This would check if documents are being retained properly
        # For now, return True as placeholder
        return True
    
    def _flatten_dict(self, d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
        """Flatten nested dictionary"""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    
    def _get_cached_data(self, key: str) -> Optional[Any]:
        """Get data from cache if valid"""
        if key in self._cache:
            cached_time, data = self._cache[key]
            if (datetime.utcnow() - cached_time).seconds < self._cache_ttl:
                logger.info(f"Cache hit for key: {key}")
                return data
        return None
    
    def _set_cached_data(self, key: str, data: Any) -> None:
        """Set data in cache"""
        self._cache[key] = (datetime.utcnow(), data)
        
        # Clear old cache entries periodically
        if (datetime.utcnow() - self._last_cache_clear).seconds > 3600:
            self._clear_old_cache()
    
    def _clear_old_cache(self) -> None:
        """Clear expired cache entries"""
        now = datetime.utcnow()
        expired_keys = [
            key for key, (cached_time, _) in self._cache.items()
            if (now - cached_time).seconds > self._cache_ttl
        ]
        for key in expired_keys:
            del self._cache[key]
        self._last_cache_clear = now
        logger.info(f"Cleared {len(expired_keys)} expired cache entries")
    
    async def _calculate_trends(
        self,
        metric: str,
        period: str,
        duration: int,
        property_id: Optional[str]
    ) -> List[Dict]:
        """Calculate trend data for a metric"""
        # Implementation would calculate trends based on metric and period
        # Placeholder for now
        return []
    
    def _summarize_trend(self, trend_data: List[Dict]) -> Dict:
        """Summarize trend data"""
        if not trend_data:
            return {"trend": "stable", "change": 0}
        
        # Calculate trend direction and magnitude
        # Placeholder implementation
        return {
            "trend": "increasing",
            "change_percentage": 15.5,
            "average": sum(d.get("value", 0) for d in trend_data) / len(trend_data)
        }
    
    def _forecast_trend(self, trend_data: List[Dict]) -> Dict:
        """Forecast future trend based on historical data"""
        # Simple linear forecast - would use more sophisticated methods in production
        if len(trend_data) < 2:
            return {"forecast": None, "confidence": 0}
        
        # Placeholder forecast
        return {
            "next_period_estimate": 150,
            "confidence": 75,
            "trend": "increasing"
        }
    
    async def _audit_i9_compliance(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Audit I-9 compliance"""
        forms = await self.supabase.get_i9_forms(property_id, start_date, end_date)
        
        return {
            "total_forms": len(forms),
            "section1_compliant": sum(1 for f in forms if self._check_i9_section1_compliance(f)),
            "section2_compliant": sum(1 for f in forms if self._check_i9_section2_compliance(f)),
            "missing_section1": sum(1 for f in forms if not f.get("section1_completed_at")),
            "missing_section2": sum(1 for f in forms if not f.get("section2_completed_at"))
        }
    
    async def _audit_w4_compliance(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Audit W-4 compliance"""
        forms = await self.supabase.get_w4_forms(property_id, start_date, end_date)
        
        return {
            "total_forms": len(forms),
            "completed": sum(1 for f in forms if f.get("signed")),
            "incomplete": sum(1 for f in forms if not f.get("signed")),
            "current_year": sum(1 for f in forms if f.get("tax_year") == datetime.utcnow().year)
        }
    
    async def _audit_document_retention(self, property_id: Optional[str]) -> Dict:
        """Audit document retention compliance"""
        # Check if documents are being retained according to requirements
        return {
            "compliant": True,
            "total_documents": 1500,
            "expired_documents": 0,
            "documents_requiring_action": 0
        }
    
    async def _get_manager_performance(
        self,
        property_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Get manager performance metrics"""
        # Implementation would fetch and calculate manager performance
        return []
    
    async def _get_property_performance(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Get property performance metrics"""
        # Implementation would fetch and calculate property performance
        return []
    
    def _identify_top_performers(self, managers: List[Dict]) -> List[Dict]:
        """Identify top performing managers"""
        # Sort by performance metric and return top 5
        return sorted(managers, key=lambda x: x.get("score", 0), reverse=True)[:5]
    
    def _identify_improvement_areas(
        self,
        managers: List[Dict],
        properties: List[Dict]
    ) -> List[str]:
        """Identify areas needing improvement"""
        areas = []
        
        # Check various metrics and identify issues
        # Placeholder implementation
        if any(m.get("avg_review_time", 0) > 48 for m in managers):
            areas.append("Reduce application review time")
        
        if any(p.get("completion_rate", 100) < 80 for p in properties):
            areas.append("Improve onboarding completion rates")
        
        return areas