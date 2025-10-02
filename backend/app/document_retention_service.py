"""
Document Retention Service for Federal Compliance

This service manages document retention policies in accordance with federal law:
- I-9: 3 years after hire date or 1 year after termination (whichever is later)
- W-4: Current year + 4 years
- Background checks: Varies by state and position
- General employment records: 3 years from termination
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, date, timedelta
from enum import Enum
import uuid
from dataclasses import dataclass
import logging

# Import models
from .models import DocumentType, User, UserRole

logger = logging.getLogger(__name__)

class RetentionPeriodType(str, Enum):
    """Types of retention periods"""
    I9_EMPLOYMENT = "i9_employment"
    I9_TERMINATION = "i9_termination"
    W4_TAX = "w4_tax"
    BACKGROUND_CHECK = "background_check"
    GENERAL_EMPLOYMENT = "general_employment"
    DIGITAL_SIGNATURE = "digital_signature"
    AUDIT_TRAIL = "audit_trail"

class RetentionStatus(str, Enum):
    """Document retention status"""
    ACTIVE = "active"  # Within retention period
    EXPIRING_SOON = "expiring_soon"  # 30 days from expiration
    EXPIRED = "expired"  # Past retention period
    DESTROYED = "destroyed"  # Document has been purged
    HOLD = "hold"  # Legal hold preventing destruction

@dataclass
class RetentionPolicy:
    """Defines a document retention policy"""
    policy_id: str
    document_type: DocumentType
    retention_type: RetentionPeriodType
    retention_years: int
    retention_days: int
    description: str
    federal_reference: str
    conditional_rule: Optional[str] = None  # e.g., "whichever is later"

@dataclass
class DocumentRetentionRecord:
    """Tracks retention for a specific document"""
    record_id: str
    document_id: str
    document_type: DocumentType
    employee_id: str
    employee_name: str
    created_date: date
    hire_date: Optional[date]
    termination_date: Optional[date]
    retention_policy_id: str
    retention_end_date: date
    retention_status: RetentionStatus
    last_reviewed: datetime
    review_notes: Optional[str] = None
    legal_hold: bool = False
    destroyed_date: Optional[date] = None

class DocumentRetentionService:
    """Service for managing document retention compliance"""
    
    def __init__(self):
        self.retention_policies = self._initialize_retention_policies()
        self.retention_records: Dict[str, DocumentRetentionRecord] = {}
        
    def _initialize_retention_policies(self) -> Dict[str, RetentionPolicy]:
        """Initialize federal retention policies"""
        policies = {}
        
        # I-9 Employment Policy
        i9_employment = RetentionPolicy(
            policy_id="POL-I9-001",
            document_type=DocumentType.I9_FORM,
            retention_type=RetentionPeriodType.I9_EMPLOYMENT,
            retention_years=3,
            retention_days=0,
            description="I-9 forms must be retained for 3 years after hire date",
            federal_reference="8 CFR 274a.2(b)(2)(i)(A)"
        )
        policies[i9_employment.policy_id] = i9_employment
        
        # I-9 Termination Policy
        i9_termination = RetentionPolicy(
            policy_id="POL-I9-002",
            document_type=DocumentType.I9_FORM,
            retention_type=RetentionPeriodType.I9_TERMINATION,
            retention_years=1,
            retention_days=0,
            description="I-9 forms must be retained for 1 year after termination",
            federal_reference="8 CFR 274a.2(b)(2)(i)(A)",
            conditional_rule="whichever_is_later"
        )
        policies[i9_termination.policy_id] = i9_termination
        
        # W-4 Policy
        w4_policy = RetentionPolicy(
            policy_id="POL-W4-001",
            document_type=DocumentType.W4_FORM,
            retention_type=RetentionPeriodType.W4_TAX,
            retention_years=4,
            retention_days=0,
            description="W-4 forms must be retained for 4 years after the tax year",
            federal_reference="Internal Revenue Code Section 6001"
        )
        policies[w4_policy.policy_id] = w4_policy
        
        # Background Check Policy
        background_policy = RetentionPolicy(
            policy_id="POL-BG-001",
            document_type=DocumentType.BACKGROUND_CHECK,
            retention_type=RetentionPeriodType.BACKGROUND_CHECK,
            retention_years=5,
            retention_days=0,
            description="Background check records retention varies by state; 5 years is standard",
            federal_reference="Fair Credit Reporting Act (FCRA) 15 U.S.C. §1681"
        )
        policies[background_policy.policy_id] = background_policy
        
        # Digital Signature Policy
        signature_policy = RetentionPolicy(
            policy_id="POL-SIG-001",
            document_type=DocumentType.COMPANY_POLICIES,
            retention_type=RetentionPeriodType.DIGITAL_SIGNATURE,
            retention_years=7,
            retention_days=0,
            description="Digital signatures and audit trails must be retained for 7 years",
            federal_reference="Electronic Signatures in Global and National Commerce Act"
        )
        policies[signature_policy.policy_id] = signature_policy
        
        # Audit Trail Policy
        audit_policy = RetentionPolicy(
            policy_id="POL-AUD-001",
            document_type=DocumentType.COMPANY_POLICIES,
            retention_type=RetentionPeriodType.AUDIT_TRAIL,
            retention_years=7,
            retention_days=0,
            description="Compliance audit trails must be retained for 7 years",
            federal_reference="Sarbanes-Oxley Act Section 802"
        )
        policies[audit_policy.policy_id] = audit_policy
        
        return policies
    
    def calculate_i9_retention_date(self, hire_date: date, termination_date: Optional[date] = None) -> Tuple[date, str]:
        """
        Calculate I-9 retention date based on federal requirements.
        Returns tuple of (retention_date, calculation_method)
        """
        # Calculate 3 years from hire date
        three_years_from_hire = hire_date + timedelta(days=3*365)
        
        if termination_date is None:
            # Employee is still active
            return three_years_from_hire, "3 years from hire date (active employee)"
        
        # Calculate 1 year from termination
        one_year_from_termination = termination_date + timedelta(days=365)
        
        # Return whichever is later
        if three_years_from_hire > one_year_from_termination:
            return three_years_from_hire, "3 years from hire date"
        else:
            return one_year_from_termination, "1 year from termination date"
    
    def calculate_w4_retention_date(self, tax_year: int) -> Tuple[date, str]:
        """
        Calculate W-4 retention date (4 years after the tax year).
        Returns tuple of (retention_date, calculation_method)
        """
        # W-4s must be kept for 4 years after the tax year
        retention_date = date(tax_year + 5, 1, 1)  # Beginning of year after 4-year period
        return retention_date, f"4 years after tax year {tax_year}"
    
    def create_retention_record(self, document_id: str, document_type: DocumentType,
                              employee_id: str, employee_name: str, 
                              created_date: date, hire_date: date,
                              termination_date: Optional[date] = None) -> DocumentRetentionRecord:
        """Create a new document retention record"""
        
        # Determine retention end date based on document type
        if document_type == DocumentType.I9_FORM:
            retention_end_date, method = self.calculate_i9_retention_date(hire_date, termination_date)
            policy_id = "POL-I9-001"
        elif document_type == DocumentType.W4_FORM:
            retention_end_date, method = self.calculate_w4_retention_date(created_date.year)
            policy_id = "POL-W4-001"
        elif document_type == DocumentType.BACKGROUND_CHECK:
            retention_end_date = created_date + timedelta(days=5*365)
            method = "5 years from creation"
            policy_id = "POL-BG-001"
        else:
            # Default to 3 years
            retention_end_date = created_date + timedelta(days=3*365)
            method = "3 years from creation (default)"
            policy_id = "POL-GEN-001"
        
        # Determine initial status
        days_until_expiration = (retention_end_date - date.today()).days
        if days_until_expiration < 0:
            status = RetentionStatus.EXPIRED
        elif days_until_expiration <= 30:
            status = RetentionStatus.EXPIRING_SOON
        else:
            status = RetentionStatus.ACTIVE
        
        record = DocumentRetentionRecord(
            record_id=str(uuid.uuid4()),
            document_id=document_id,
            document_type=document_type,
            employee_id=employee_id,
            employee_name=employee_name,
            created_date=created_date,
            hire_date=hire_date,
            termination_date=termination_date,
            retention_policy_id=policy_id,
            retention_end_date=retention_end_date,
            retention_status=status,
            last_reviewed=datetime.now(),
            review_notes=f"Retention calculated: {method}"
        )
        
        self.retention_records[record.record_id] = record
        logger.info(f"Created retention record {record.record_id} for document {document_id}")
        
        return record
    
    def update_employee_termination(self, employee_id: str, termination_date: date) -> List[DocumentRetentionRecord]:
        """Update retention records when an employee is terminated"""
        updated_records = []
        
        for record in self.retention_records.values():
            if record.employee_id == employee_id and record.document_type == DocumentType.I9_FORM:
                # Recalculate I-9 retention date
                new_retention_date, method = self.calculate_i9_retention_date(
                    record.hire_date, termination_date
                )
                
                if new_retention_date != record.retention_end_date:
                    record.termination_date = termination_date
                    record.retention_end_date = new_retention_date
                    record.last_reviewed = datetime.now()
                    record.review_notes = f"Updated due to termination: {method}"
                    
                    # Update status
                    days_until_expiration = (new_retention_date - date.today()).days
                    if days_until_expiration < 0:
                        record.retention_status = RetentionStatus.EXPIRED
                    elif days_until_expiration <= 30:
                        record.retention_status = RetentionStatus.EXPIRING_SOON
                    else:
                        record.retention_status = RetentionStatus.ACTIVE
                    
                    updated_records.append(record)
                    logger.info(f"Updated retention for I-9 document {record.document_id} due to termination")
        
        return updated_records
    
    def place_legal_hold(self, document_id: str, reason: str) -> bool:
        """Place a legal hold on a document to prevent destruction"""
        for record in self.retention_records.values():
            if record.document_id == document_id:
                record.legal_hold = True
                record.retention_status = RetentionStatus.HOLD
                record.last_reviewed = datetime.now()
                record.review_notes = f"Legal hold placed: {reason}"
                logger.info(f"Legal hold placed on document {document_id}")
                return True
        return False
    
    def remove_legal_hold(self, document_id: str, reason: str) -> bool:
        """Remove legal hold from a document"""
        for record in self.retention_records.values():
            if record.document_id == document_id:
                record.legal_hold = False
                record.last_reviewed = datetime.now()
                record.review_notes = f"Legal hold removed: {reason}"
                
                # Recalculate status
                days_until_expiration = (record.retention_end_date - date.today()).days
                if days_until_expiration < 0:
                    record.retention_status = RetentionStatus.EXPIRED
                elif days_until_expiration <= 30:
                    record.retention_status = RetentionStatus.EXPIRING_SOON
                else:
                    record.retention_status = RetentionStatus.ACTIVE
                
                logger.info(f"Legal hold removed from document {document_id}")
                return True
        return False
    
    def get_retention_dashboard(self, user_role: UserRole) -> Dict[str, any]:
        """Get retention dashboard data based on user role"""
        dashboard = {
            "summary": {
                "total_documents": len(self.retention_records),
                "active_documents": 0,
                "expiring_soon": 0,
                "expired_awaiting_destruction": 0,
                "legal_holds": 0,
                "destroyed": 0
            },
            "by_document_type": {},
            "expiring_documents": [],
            "compliance_alerts": []
        }
        
        # Count documents by status
        for record in self.retention_records.values():
            if record.retention_status == RetentionStatus.ACTIVE:
                dashboard["summary"]["active_documents"] += 1
            elif record.retention_status == RetentionStatus.EXPIRING_SOON:
                dashboard["summary"]["expiring_soon"] += 1
                dashboard["expiring_documents"].append({
                    "document_id": record.document_id,
                    "document_type": record.document_type.value,
                    "employee_name": record.employee_name,
                    "expiration_date": record.retention_end_date.isoformat(),
                    "days_until_expiration": (record.retention_end_date - date.today()).days
                })
            elif record.retention_status == RetentionStatus.EXPIRED:
                dashboard["summary"]["expired_awaiting_destruction"] += 1
            elif record.retention_status == RetentionStatus.HOLD:
                dashboard["summary"]["legal_holds"] += 1
            elif record.retention_status == RetentionStatus.DESTROYED:
                dashboard["summary"]["destroyed"] += 1
            
            # Count by document type
            doc_type = record.document_type.value
            if doc_type not in dashboard["by_document_type"]:
                dashboard["by_document_type"][doc_type] = {
                    "total": 0,
                    "active": 0,
                    "expired": 0
                }
            dashboard["by_document_type"][doc_type]["total"] += 1
            if record.retention_status == RetentionStatus.ACTIVE:
                dashboard["by_document_type"][doc_type]["active"] += 1
            elif record.retention_status == RetentionStatus.EXPIRED:
                dashboard["by_document_type"][doc_type]["expired"] += 1
        
        # Generate compliance alerts
        if dashboard["summary"]["expired_awaiting_destruction"] > 0:
            dashboard["compliance_alerts"].append({
                "severity": "warning",
                "message": f"{dashboard['summary']['expired_awaiting_destruction']} documents have exceeded retention period and await destruction",
                "action": "Review and approve document destruction"
            })
        
        if dashboard["summary"]["expiring_soon"] > 0:
            dashboard["compliance_alerts"].append({
                "severity": "info",
                "message": f"{dashboard['summary']['expiring_soon']} documents will expire within 30 days",
                "action": "Review retention policies and prepare for document lifecycle"
            })
        
        return dashboard
    
    def mark_document_destroyed(self, document_id: str, destruction_method: str, 
                              authorized_by: str) -> bool:
        """Mark a document as destroyed"""
        for record in self.retention_records.values():
            if record.document_id == document_id:
                if record.legal_hold:
                    logger.warning(f"Cannot destroy document {document_id} - under legal hold")
                    return False
                
                if record.retention_status != RetentionStatus.EXPIRED:
                    logger.warning(f"Cannot destroy document {document_id} - not expired")
                    return False
                
                record.retention_status = RetentionStatus.DESTROYED
                record.destroyed_date = date.today()
                record.last_reviewed = datetime.now()
                record.review_notes = f"Destroyed via {destruction_method} by {authorized_by}"
                
                logger.info(f"Document {document_id} marked as destroyed")
                return True
        
        return False
    
    def generate_retention_report(self, start_date: date, end_date: date) -> Dict[str, any]:
        """Generate retention compliance report for date range"""
        report = {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "generated_at": datetime.now().isoformat()
            },
            "retention_actions": {
                "documents_created": 0,
                "documents_expired": 0,
                "documents_destroyed": 0,
                "legal_holds_placed": 0,
                "termination_updates": 0
            },
            "compliance_summary": {
                "documents_within_retention": 0,
                "documents_past_retention": 0,
                "average_retention_days": 0,
                "longest_retained_document": None
            },
            "policy_adherence": {
                "i9_compliance": True,
                "w4_compliance": True,
                "audit_findings": []
            }
        }
        
        retention_days = []
        
        for record in self.retention_records.values():
            # Check if record falls within report period
            if record.created_date >= start_date and record.created_date <= end_date:
                report["retention_actions"]["documents_created"] += 1
            
            if record.retention_status == RetentionStatus.ACTIVE:
                report["compliance_summary"]["documents_within_retention"] += 1
            elif record.retention_status == RetentionStatus.EXPIRED:
                report["compliance_summary"]["documents_past_retention"] += 1
            
            # Calculate retention days
            if record.destroyed_date:
                days_retained = (record.destroyed_date - record.created_date).days
            else:
                days_retained = (date.today() - record.created_date).days
            retention_days.append(days_retained)
            
            # Check for policy violations
            if record.document_type == DocumentType.I9_FORM:
                expected_retention, _ = self.calculate_i9_retention_date(
                    record.hire_date, record.termination_date
                )
                if record.retention_end_date != expected_retention:
                    report["policy_adherence"]["i9_compliance"] = False
                    report["policy_adherence"]["audit_findings"].append(
                        f"I-9 document {record.document_id} has incorrect retention date"
                    )
        
        if retention_days:
            report["compliance_summary"]["average_retention_days"] = sum(retention_days) // len(retention_days)
        
        return report

# Create global retention service instance
retention_service = DocumentRetentionService()