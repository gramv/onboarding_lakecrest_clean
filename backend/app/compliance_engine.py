"""
Phase 1: Federal Compliance Engine with I-9 Deadline Tracking

This engine provides:
1. I-9 3-day deadline tracking and validation
2. Supplement A/B access control
3. Auto-fill restriction enforcement
4. Legal attestation and signature validation
5. Federal compliance monitoring and alerts
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, timedelta
from enum import Enum
import uuid
from dataclasses import dataclass

# Import models
from .models import (
    User, UserRole, DocumentCategory, I9Section1Data, I9Section2Data,
    I9SupplementAData, I9SupplementBData, W4FormData,
    FederalValidationResult, FederalValidationError, ComplianceAuditEntry
)

class ComplianceViolationType(str, Enum):
    """Types of compliance violations"""
    CRITICAL = "critical"  # Blocks processing
    WARNING = "warning"   # Logged but allows processing
    INFO = "info"        # Informational only

class ComplianceDeadlineType(str, Enum):
    """Types of compliance deadlines"""
    I9_SECTION2_THREE_DAY = "i9_section2_three_day"
    I9_REVERIFICATION = "i9_reverification"
    W4_SUBMISSION = "w4_submission"
    DOCUMENT_RETENTION = "document_retention"

@dataclass
class ComplianceDeadline:
    """Represents a compliance deadline"""
    deadline_type: ComplianceDeadlineType
    employee_id: str
    document_id: str
    deadline_date: date
    is_met: bool = False
    completion_date: Optional[date] = None
    business_days_remaining: int = 0
    violations: List[str] = None
    
    def __post_init__(self):
        if self.violations is None:
            self.violations = []

@dataclass
class ComplianceViolation:
    """Represents a compliance violation"""
    violation_id: str
    violation_type: ComplianceViolationType
    document_category: DocumentCategory
    employee_id: str
    document_id: Optional[str]
    violation_message: str
    legal_reference: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

class FederalComplianceEngine:
    """Federal compliance engine for hotel onboarding system"""
    
    def __init__(self):
        self.compliance_deadlines = {}  # document_id -> ComplianceDeadline
        self.compliance_violations = {}  # violation_id -> ComplianceViolation
        self.business_calendar = self._initialize_business_calendar()
        
        # Federal holidays that don't count as business days
        self.federal_holidays_2025 = [
            date(2025, 1, 1),   # New Year's Day
            date(2025, 1, 20),  # Martin Luther King Jr. Day
            date(2025, 2, 17),  # Presidents' Day
            date(2025, 5, 26),  # Memorial Day
            date(2025, 7, 4),   # Independence Day
            date(2025, 9, 1),   # Labor Day
            date(2025, 10, 13), # Columbus Day
            date(2025, 11, 11), # Veterans Day
            date(2025, 11, 27), # Thanksgiving
            date(2025, 12, 25), # Christmas Day
        ]
    
    def _initialize_business_calendar(self) -> Dict[int, List[date]]:
        """Initialize business calendar with federal holidays"""
        return {
            2025: self.federal_holidays_2025,
            # Additional years can be added as needed
        }
    
    def calculate_business_days(self, start_date: date, business_days: int) -> date:
        """Calculate business days from start date, excluding weekends and federal holidays"""
        current_date = start_date
        days_added = 0
        
        while days_added < business_days:
            current_date += timedelta(days=1)
            
            # Skip weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() >= 5:
                continue
            
            # Skip federal holidays
            holidays = self.business_calendar.get(current_date.year, [])
            if current_date in holidays:
                continue
            
            days_added += 1
        
        return current_date
    
    def calculate_business_days_between(self, start_date: date, end_date: date) -> int:
        """Calculate number of business days between two dates"""
        if start_date >= end_date:
            return 0
        
        business_days = 0
        current_date = start_date
        
        while current_date < end_date:
            current_date += timedelta(days=1)
            
            # Skip weekends
            if current_date.weekday() >= 5:
                continue
            
            # Skip federal holidays
            holidays = self.business_calendar.get(current_date.year, [])
            if current_date in holidays:
                continue
            
            business_days += 1
        
        return business_days
    
    # =====================================
    # I-9 COMPLIANCE TRACKING
    # =====================================
    
    def create_i9_section2_deadline(self, employee_id: str, document_id: str, hire_date: date) -> ComplianceDeadline:
        """Create I-9 Section 2 three-day deadline"""
        deadline_date = self.calculate_business_days(hire_date, 3)
        
        deadline = ComplianceDeadline(
            deadline_type=ComplianceDeadlineType.I9_SECTION2_THREE_DAY,
            employee_id=employee_id,
            document_id=document_id,
            deadline_date=deadline_date,
            business_days_remaining=self.calculate_business_days_between(date.today(), deadline_date)
        )
        
        self.compliance_deadlines[document_id] = deadline
        return deadline
    
    def validate_i9_three_day_compliance(self, employee_id: str, document_id: str, hire_date: date, 
                                       section2_completion_date: Optional[date] = None) -> Tuple[bool, ComplianceDeadline, List[str]]:
        """Validate I-9 Section 2 three-day rule compliance"""
        warnings = []
        
        # Get or create deadline
        if document_id in self.compliance_deadlines:
            deadline = self.compliance_deadlines[document_id]
        else:
            deadline = self.create_i9_section2_deadline(employee_id, document_id, hire_date)
        
        # Update business days remaining
        deadline.business_days_remaining = self.calculate_business_days_between(date.today(), deadline.deadline_date)
        
        if section2_completion_date is None:
            # Not yet completed - check if deadline is approaching or passed
            if date.today() > deadline.deadline_date:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.CRITICAL,
                    document_category=DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message=f"I-9 Section 2 deadline ({deadline.deadline_date}) has passed. Federal law requires completion within 3 business days of hire date ({hire_date}).",
                    legal_reference="Immigration and Nationality Act Section 274A(b)(1)(A)"
                )
                warnings.append(violation.violation_message)
                return False, deadline, warnings
            
            elif deadline.business_days_remaining <= 1:
                if deadline.business_days_remaining == 0:
                    warnings.append(f"URGENT: I-9 Section 2 must be completed TODAY ({deadline.deadline_date})")
                else:
                    warnings.append(f"WARNING: I-9 Section 2 deadline is tomorrow ({deadline.deadline_date})")
            
            return True, deadline, warnings
        
        # Check if completed on time
        deadline.completion_date = section2_completion_date
        deadline.is_met = section2_completion_date <= deadline.deadline_date
        
        if not deadline.is_met:
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.CRITICAL,
                document_category=DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY,
                employee_id=employee_id,
                document_id=document_id,
                violation_message=f"I-9 Section 2 completed late ({section2_completion_date}) after deadline ({deadline.deadline_date})",
                legal_reference="Immigration and Nationality Act Section 274A(b)(1)(A)"
            )
            warnings.append(violation.violation_message)
            return False, deadline, warnings
        
        return True, deadline, warnings
    
    def validate_i9_supplement_a_restrictions(self, form_data: Dict[str, Any], user_role: UserRole, 
                                            employee_id: str, document_id: str) -> Tuple[bool, List[str]]:
        """Validate I-9 Supplement A auto-fill restrictions"""
        violations = []
        
        # Check if any data appears to be auto-filled
        auto_filled_indicators = [
            "auto_fill_disabled",
            "manual_entry_required", 
            "federal_compliance_note"
        ]
        
        # If these fields are missing or set to allow auto-fill, it's a violation
        if not form_data.get("auto_fill_disabled", False):
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.CRITICAL,
                document_category=DocumentCategory.I9_SUPPLEMENT_A,
                employee_id=employee_id,
                document_id=document_id,
                violation_message="I-9 Supplement A auto-fill must be disabled. This form must be completed manually by preparer/translator.",
                legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vi)"
            )
            violations.append(violation.violation_message)
        
        if not form_data.get("manual_entry_required", False):
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.CRITICAL,
                document_category=DocumentCategory.I9_SUPPLEMENT_A,
                employee_id=employee_id,
                document_id=document_id,
                violation_message="I-9 Supplement A requires manual entry by preparer/translator only.",
                legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vi)"
            )
            violations.append(violation.violation_message)
        
        # Only preparer/translator should complete this form (not employee, manager, or HR)
        if user_role in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR]:
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.WARNING,
                document_category=DocumentCategory.I9_SUPPLEMENT_A,
                employee_id=employee_id,
                document_id=document_id,
                violation_message=f"I-9 Supplement A should only be completed by preparer/translator, not {user_role.value}",
                legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vi)"
            )
            violations.append(violation.violation_message)
        
        return len(violations) == 0, violations
    
    def validate_i9_supplement_b_access(self, user_role: UserRole, employee_id: str, 
                                      document_id: str) -> Tuple[bool, List[str]]:
        """Validate I-9 Supplement B access control (manager use only)"""
        violations = []
        
        # Only managers and HR should complete Supplement B
        if user_role == UserRole.EMPLOYEE:
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.CRITICAL,
                document_category=DocumentCategory.I9_SUPPLEMENT_B,
                employee_id=employee_id,
                document_id=document_id,
                violation_message="I-9 Supplement B (Reverification) can only be completed by employer/manager, not employee",
                legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vii)"
            )
            violations.append(violation.violation_message)
        
        return len(violations) == 0, violations
    
    # =====================================
    # AUTO-FILL COMPLIANCE VALIDATION
    # =====================================
    
    def validate_auto_fill_compliance(self, document_category: DocumentCategory, 
                                    form_data: Dict[str, Any], auto_filled_fields: List[str],
                                    user_role: UserRole, employee_id: str, 
                                    document_id: str) -> Tuple[bool, List[str]]:
        """Comprehensive auto-fill compliance validation"""
        violations = []
        
        # I-9 Supplement A: NO auto-fill allowed
        if document_category == DocumentCategory.I9_SUPPLEMENT_A:
            if auto_filled_fields:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.CRITICAL,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message=f"FEDERAL LAW VIOLATION: Auto-filled fields detected in I-9 Supplement A: {auto_filled_fields}",
                    legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vi)"
                )
                violations.append(violation.violation_message)
            
            # Additional validation for Supplement A
            is_valid, supplement_violations = self.validate_i9_supplement_a_restrictions(
                form_data, user_role, employee_id, document_id
            )
            violations.extend(supplement_violations)
        
        # I-9 Supplement B: Limited auto-fill
        elif document_category == DocumentCategory.I9_SUPPLEMENT_B:
            is_valid, access_violations = self.validate_i9_supplement_b_access(
                user_role, employee_id, document_id
            )
            violations.extend(access_violations)
            
            # Check restricted fields
            restricted_fields = ["reverify_document_title", "reverify_document_number", 
                               "reverify_expiration_date", "date_of_rehire", "date_of_termination"]
            
            auto_filled_restricted = [field for field in auto_filled_fields if field in restricted_fields]
            if auto_filled_restricted:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.WARNING,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message=f"Restricted fields should not be auto-filled in I-9 Supplement B: {auto_filled_restricted}",
                    legal_reference="Immigration and Nationality Act Section 274A; 8 CFR 274a.2(b)(1)(vii)"
                )
                violations.append(violation.violation_message)
        
        # I-9 Section 1: Validate citizenship status not auto-filled
        elif document_category == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            critical_manual_fields = ["citizenship_status", "uscis_number", "i94_admission_number", 
                                    "passport_number", "passport_country"]
            
            auto_filled_critical = [field for field in auto_filled_fields if field in critical_manual_fields]
            if auto_filled_critical:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.CRITICAL,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message=f"Critical fields must be manually selected/entered in I-9 Section 1: {auto_filled_critical}",
                    legal_reference="Immigration and Nationality Act Section 274A(b)(1)(A)"
                )
                violations.append(violation.violation_message)
        
        # W-4: Validate tax elections not auto-filled
        elif document_category == DocumentCategory.W4_TAX_WITHHOLDING:
            tax_election_fields = ["filing_status", "multiple_jobs_checkbox", "dependents_amount", 
                                 "other_income", "deductions", "extra_withholding"]
            
            auto_filled_tax_elections = [field for field in auto_filled_fields if field in tax_election_fields]
            if auto_filled_tax_elections:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.WARNING,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message=f"Tax election fields should be manually selected in W-4: {auto_filled_tax_elections}",
                    legal_reference="Internal Revenue Code Section 3402"
                )
                violations.append(violation.violation_message)
        
        return len(violations) == 0, violations
    
    # =====================================
    # SIGNATURE VALIDATION
    # =====================================
    
    def validate_digital_signature_compliance(self, document_category: DocumentCategory,
                                            signature_data: Dict[str, Any], user_role: UserRole,
                                            employee_id: str, document_id: str) -> Tuple[bool, List[str]]:
        """Validate digital signature compliance requirements"""
        violations = []
        
        # Check required signature metadata
        required_metadata = ["signature_hash", "timestamp", "ip_address", "user_agent"]
        missing_metadata = [field for field in required_metadata if not signature_data.get(field)]
        
        if missing_metadata:
            violation = self._create_compliance_violation(
                violation_type=ComplianceViolationType.WARNING,
                document_category=document_category,
                employee_id=employee_id,
                document_id=document_id,
                violation_message=f"Digital signature missing required metadata: {missing_metadata}",
                legal_reference="Electronic Signatures in Global and National Commerce Act"
            )
            violations.append(violation.violation_message)
        
        # Validate signature timestamp is reasonable (not future, not too old)
        if signature_data.get("timestamp"):
            sig_timestamp = datetime.fromisoformat(signature_data["timestamp"])
            now = datetime.now()
            
            if sig_timestamp > now:
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.CRITICAL,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message="Digital signature timestamp cannot be in the future",
                    legal_reference="Electronic Signatures in Global and National Commerce Act"
                )
                violations.append(violation.violation_message)
            
            # Warn if signature is more than 24 hours old
            if (now - sig_timestamp).total_seconds() > 86400:  # 24 hours
                violation = self._create_compliance_violation(
                    violation_type=ComplianceViolationType.WARNING,
                    document_category=document_category,
                    employee_id=employee_id,
                    document_id=document_id,
                    violation_message="Digital signature is more than 24 hours old",
                    legal_reference="Electronic Signatures in Global and National Commerce Act"
                )
                violations.append(violation.violation_message)
        
        return len(violations) == 0, violations
    
    # =====================================
    # COMPLIANCE MONITORING
    # =====================================
    
    def get_compliance_dashboard(self, user_role: UserRole, property_id: Optional[str] = None) -> Dict[str, Any]:
        """Get compliance dashboard data based on user role"""
        dashboard = {
            "overview": {
                "total_deadlines": len(self.compliance_deadlines),
                "overdue_deadlines": 0,
                "approaching_deadlines": 0,
                "total_violations": len(self.compliance_violations),
                "critical_violations": 0,
                "resolved_violations": 0
            },
            "deadlines": [],
            "violations": [],
            "compliance_alerts": []
        }
        
        # Count deadline statuses
        for deadline in self.compliance_deadlines.values():
            if deadline.deadline_date < date.today() and not deadline.is_met:
                dashboard["overview"]["overdue_deadlines"] += 1
                dashboard["compliance_alerts"].append({
                    "type": "overdue_deadline",
                    "message": f"I-9 Section 2 overdue for employee {deadline.employee_id}",
                    "severity": "critical",
                    "deadline_date": deadline.deadline_date.isoformat()
                })
            elif deadline.business_days_remaining <= 1 and not deadline.is_met:
                dashboard["overview"]["approaching_deadlines"] += 1
                dashboard["compliance_alerts"].append({
                    "type": "approaching_deadline",
                    "message": f"I-9 Section 2 due {'today' if deadline.business_days_remaining == 0 else 'tomorrow'} for employee {deadline.employee_id}",
                    "severity": "warning",
                    "deadline_date": deadline.deadline_date.isoformat()
                })
        
        # Count violation types
        for violation in self.compliance_violations.values():
            if violation.violation_type == ComplianceViolationType.CRITICAL:
                dashboard["overview"]["critical_violations"] += 1
            if violation.resolved_at:
                dashboard["overview"]["resolved_violations"] += 1
        
        # Filter data based on user role
        if user_role == UserRole.HR:
            # HR sees all compliance data
            dashboard["deadlines"] = list(self.compliance_deadlines.values())
            dashboard["violations"] = list(self.compliance_violations.values())
        elif user_role == UserRole.MANAGER:
            # Manager sees data for their property only
            # This would filter based on property_id in real implementation
            dashboard["deadlines"] = list(self.compliance_deadlines.values())
            dashboard["violations"] = list(self.compliance_violations.values())
        else:
            # Employees see limited compliance info
            dashboard["deadlines"] = []
            dashboard["violations"] = []
        
        return dashboard
    
    def _create_compliance_violation(self, violation_type: ComplianceViolationType,
                                   document_category: DocumentCategory, employee_id: str,
                                   document_id: Optional[str], violation_message: str,
                                   legal_reference: str) -> ComplianceViolation:
        """Create and store a compliance violation"""
        violation_id = str(uuid.uuid4())
        
        violation = ComplianceViolation(
            violation_id=violation_id,
            violation_type=violation_type,
            document_category=document_category,
            employee_id=employee_id,
            document_id=document_id,
            violation_message=violation_message,
            legal_reference=legal_reference,
            detected_at=datetime.now()
        )
        
        self.compliance_violations[violation_id] = violation
        return violation
    
    def resolve_violation(self, violation_id: str, resolution_notes: str) -> bool:
        """Mark a compliance violation as resolved"""
        if violation_id in self.compliance_violations:
            violation = self.compliance_violations[violation_id]
            violation.resolved_at = datetime.now()
            violation.resolution_notes = resolution_notes
            return True
        return False
    
    def generate_compliance_report(self, start_date: date, end_date: date,
                                 user_role: UserRole) -> Dict[str, Any]:
        """Generate compliance report for date range"""
        report = {
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "generated_at": datetime.now().isoformat(),
                "generated_by_role": user_role.value
            },
            "summary": {
                "total_documents_processed": 0,
                "i9_section2_deadlines_met": 0,
                "i9_section2_deadlines_missed": 0,
                "supplement_a_violations": 0,
                "auto_fill_violations": 0,
                "signature_violations": 0
            },
            "violations_by_type": {},
            "deadlines_analysis": {},
            "recommendations": []
        }
        
        # Filter violations and deadlines by date range
        period_violations = [
            v for v in self.compliance_violations.values()
            if start_date <= v.detected_at.date() <= end_date
        ]
        
        period_deadlines = [
            d for d in self.compliance_deadlines.values()
            if start_date <= d.deadline_date <= end_date
        ]
        
        # Analyze violations
        for violation in period_violations:
            violation_type = violation.violation_type.value
            if violation_type not in report["violations_by_type"]:
                report["violations_by_type"][violation_type] = 0
            report["violations_by_type"][violation_type] += 1
            
            # Count specific violation types
            if "Supplement A" in violation.violation_message:
                report["summary"]["supplement_a_violations"] += 1
            if "auto-fill" in violation.violation_message.lower():
                report["summary"]["auto_fill_violations"] += 1
            if "signature" in violation.violation_message.lower():
                report["summary"]["signature_violations"] += 1
        
        # Analyze deadlines
        for deadline in period_deadlines:
            if deadline.deadline_type == ComplianceDeadlineType.I9_SECTION2_THREE_DAY:
                if deadline.is_met:
                    report["summary"]["i9_section2_deadlines_met"] += 1
                else:
                    report["summary"]["i9_section2_deadlines_missed"] += 1
        
        # Generate recommendations
        if report["summary"]["i9_section2_deadlines_missed"] > 0:
            report["recommendations"].append(
                "Implement automated I-9 Section 2 deadline reminders to prevent missed deadlines"
            )
        
        if report["summary"]["supplement_a_violations"] > 0:
            report["recommendations"].append(
                "Review I-9 Supplement A access controls to prevent unauthorized auto-fill"
            )
        
        if report["summary"]["auto_fill_violations"] > 0:
            report["recommendations"].append(
                "Audit auto-fill compliance rules to ensure federal law adherence"
            )
        
        return report

# Create global compliance engine instance
compliance_engine = FederalComplianceEngine()