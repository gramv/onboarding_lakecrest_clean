"""
Health Insurance PDF Generator
Generates health insurance enrollment forms with consistent employee data
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from ..services.base_pdf_generator import BasePDFGenerator
from ..supabase_service_enhanced import EnhancedSupabaseService
from ..pdf_forms import PDFFormFiller

logger = logging.getLogger(__name__)

class HealthInsurancePDFGenerator(BasePDFGenerator):
    """
    Health insurance form PDF generator with centralized data retrieval
    """
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        """Initialize Health Insurance PDF generator"""
        super().__init__(supabase_service)
        self.pdf_filler = PDFFormFiller()
    
    async def generate_pdf(
        self,
        employee_id: str,
        form_data: Optional[Dict[str, Any]] = None,
        signature_data: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate Health Insurance PDF with employee data
        
        Args:
            employee_id: The employee's ID
            form_data: Health insurance specific form data
            signature_data: Optional signature image data
            **kwargs: Additional parameters
            
        Returns:
            Response dictionary with PDF data
        """
        try:
            logger.info(f"🔍 PDF Generator - Starting health insurance PDF generation")
            logger.info(f"🔍 PDF Generator - employee_id: {employee_id}")
            logger.info(f"🔍 PDF Generator - form_data provided: {form_data is not None}")
            if form_data:
                logger.info(f"🔍 PDF Generator - form_data keys: {list(form_data.keys())}")

            # Try to get employee data from centralized service
            # This may return empty during normal onboarding when data is saved with session_id
            try:
                logger.info(f"🔍 PDF Generator - Calling get_employee_data")
                pdf_data = await self.get_employee_data(employee_id)
                has_pdf_data = pdf_data and (pdf_data.first_name or pdf_data.last_name)
                logger.info(f"🔍 PDF Generator - has_pdf_data: {has_pdf_data}")
            except Exception as e:
                logger.info(f"Could not get employee data from centralized service: {e}")
                pdf_data = None
                has_pdf_data = False
            
            # Get health insurance form data
            if form_data:
                hi_form_data = form_data
                logger.info(f"🔍 PDF Generator - Using form_data directly")
            elif pdf_data:
                hi_form_data = pdf_data.form_data.get('health-insurance', {})
                logger.info(f"🔍 PDF Generator - Using pdf_data.form_data")
            else:
                hi_form_data = {}
                logger.info(f"🔍 PDF Generator - No form data available, using empty dict")
            
            # Extract personal info from form_data if provided (during normal onboarding)
            personal_info = hi_form_data.get('personalInfo', {})
            
            # Prepare data for PDF generation
            # Prioritize form_data when health insurance data is provided
            if form_data and ('medicalPlan' in form_data or 'personalInfo' in form_data):
                # Use form_data when health insurance data is provided (normal onboarding flow)
                logger.info(f"🔍 PDF Generator - Using form_data for health insurance PDF generation")
                personal_info = form_data.get('personalInfo', {})
                employee_data = {
                    # Employee info - using form_data
                    'employee_name': f"{personal_info.get('firstName', '')} {personal_info.get('lastName', '')}".strip(),
                    'full_name': f"{personal_info.get('firstName', '')} {personal_info.get('lastName', '')}".strip(),
                    'first_name': personal_info.get('firstName', ''),
                    'last_name': personal_info.get('lastName', ''),
                    'middle_initial': personal_info.get('middleInitial', ''),
                    'ssn': personal_info.get('ssn', ''),
                    'social_security_number': personal_info.get('ssn', ''),
                    'date_of_birth': personal_info.get('dateOfBirth', ''),
                    'gender': personal_info.get('gender', ''),
                    'marital_status': personal_info.get('maritalStatus', ''),
                    'email': personal_info.get('email', ''),
                    'phone': personal_info.get('phone', ''),
                    'address': personal_info.get('address', ''),
                    'street_address': personal_info.get('streetAddress', ''),
                    'city': personal_info.get('city', ''),
                    'state': personal_info.get('state', ''),
                    'zip': personal_info.get('zipCode', ''),

                    # Health insurance specific fields from form_data
                    'medicalPlan': form_data.get('medicalPlan', ''),
                    'medicalTier': form_data.get('medicalTier', 'employee'),
                    'medicalWaived': form_data.get('medicalWaived', False),
                    'dentalCoverage': form_data.get('dentalCoverage', False),
                    'dentalEnrolled': form_data.get('dentalEnrolled', False),
                    'dentalTier': form_data.get('dentalTier', 'employee'),
                    'dentalWaived': form_data.get('dentalWaived', False),
                    'visionCoverage': form_data.get('visionCoverage', False),
                    'visionEnrolled': form_data.get('visionEnrolled', False),
                    'visionTier': form_data.get('visionTier', 'employee'),
                    'visionWaived': form_data.get('visionWaived', False),
                    'dependents': form_data.get('dependents', []),
                    'hasStepchildren': form_data.get('hasStepchildren', False),
                    'stepchildrenNames': form_data.get('stepchildrenNames', ''),
                    'dependentsSupported': form_data.get('dependentsSupported', False),
                    'irsDependentConfirmation': form_data.get('irsDependentConfirmation', False),
                    'section125Acknowledged': form_data.get('section125Acknowledged', False),
                    'effectiveDate': form_data.get('effectiveDate', ''),
                    'isWaived': form_data.get('isWaived', False),
                    'waiveReason': form_data.get('waiveReason', ''),
                    'otherCoverageDetails': form_data.get('otherCoverageDetails', ''),
                    'otherCoverageType': form_data.get('otherCoverageType', ''),
                    'totalBiweeklyCost': form_data.get('totalBiweeklyCost', 0),
                    'totalMonthlyCost': form_data.get('totalMonthlyCost', 0),
                    'totalAnnualCost': form_data.get('totalAnnualCost', 0),
                }
            elif has_pdf_data:
                # Use centralized data when available (single-step mode)
                logger.info(f"🔍 PDF Generator - Using centralized data for health insurance PDF generation")
                employee_data = {
                    # Employee info - using centralized data
                    'employee_name': self.get_employee_name(pdf_data),
                    'full_name': self.get_employee_name(pdf_data),
                    'first_name': pdf_data.first_name,
                    'last_name': pdf_data.last_name,
                    'middle_initial': pdf_data.middle_initial or '',
                    
                    # Personal info
                    'ssn': self.format_ssn(pdf_data.ssn),
                    'social_security_number': self.format_ssn(pdf_data.ssn),
                    'date_of_birth': self.format_date(pdf_data.date_of_birth),
                    'gender': pdf_data.gender or '',
                    'marital_status': pdf_data.marital_status or '',
                    
                    # Contact info
                    'email': pdf_data.email,
                    'phone': self.format_phone(pdf_data.phone),
                    
                    # Address
                    'address': self.format_address(pdf_data),
                    'street_address': pdf_data.address_street,
                    'city': pdf_data.address_city,
                    'state': pdf_data.address_state,
                    'zip': pdf_data.address_zip,
                }
            else:
                # No form data and no centralized data available
                logger.error(f"🔍 PDF Generator - No form data or centralized data available for health insurance PDF")
                raise ValueError("No health insurance form data or employee data available for PDF generation")
            
            # Add health insurance fields for centralized data case only
            if has_pdf_data and not (form_data and ('medicalPlan' in form_data or 'personalInfo' in form_data)):
                # Only add health insurance fields from centralized data if form_data doesn't have them
                employee_data.update({
                    # Health insurance specific fields from centralized data
                    'enrollment_type': hi_form_data.get('enrollmentType', 'employee_only'),
                    'coverage_type': hi_form_data.get('coverageType', 'medical'),
                    'effective_date': self.format_date(
                        hi_form_data.get('effectiveDate') or datetime.now().isoformat()
                    ),
                    'primary_care_physician': hi_form_data.get('primaryCarePhysician', ''),

                    # Dependents
                    'dependents': hi_form_data.get('dependents', []),
                    'spouse': hi_form_data.get('spouse', {}),
                    'children': hi_form_data.get('children', []),

                    # Medical history (if included)
                    'medical_conditions': hi_form_data.get('medicalConditions', []),
                    'medications': hi_form_data.get('medications', []),
                    'allergies': hi_form_data.get('allergies', []),

                    # Beneficiary information
                    'beneficiary_name': hi_form_data.get('beneficiaryName', ''),
                    'beneficiary_relationship': hi_form_data.get('beneficiaryRelationship', ''),
                    'beneficiary_phone': hi_form_data.get('beneficiaryPhone', ''),
                
                # Date
                'signature_date': self.format_date(
                    hi_form_data.get('signatureDate') or datetime.now().isoformat()
                ),
                'employee_date': self.format_date(datetime.now().isoformat())
            })
            
            # Process dependents for better formatting
            if employee_data['dependents']:
                for i, dep in enumerate(employee_data['dependents']):
                    if isinstance(dep, dict):
                        dep['formatted_dob'] = self.format_date(dep.get('dateOfBirth'))
                        dep['formatted_ssn'] = self.format_ssn(dep.get('ssn')) if dep.get('ssn') else ''
            
            logger.info(f"Generating Health Insurance PDF for {employee_data['full_name']} ({employee_id})")

            # ✅ FIX: Support both 'signatureData' and 'signature' keys for consistency
            if not signature_data and employee_data.get('signature'):
                signature_data = employee_data.get('signature')
                logger.info(f"✅ Health Insurance - Using 'signature' key as fallback")

            # Include signature data in employee_data for PDF filler
            if signature_data:
                employee_data['signatureData'] = signature_data
                logger.info(f"🖊️ Added signature data to employee_data for PDF filler")

            # Generate the PDF
            pdf_bytes = self.pdf_filler.fill_health_insurance_form(employee_data)
            
            # Note: Signature embedding is handled by the PDF forms layer (pdf_forms.py)
            # The overlay.generate() method in pdf_forms.py already embeds the signature
            # in the proper signature field, so we don't need duplicate signature embedding here
            if signature_data:
                logger.info(f"🖊️ Signature data provided - will be embedded by PDF forms layer")
                
                # Add timestamp
                pdf_bytes = self.add_timestamp(pdf_bytes)
            
            # Log generation event
            self.log_generation_event(
                employee_id=employee_id,
                document_type='Health Insurance',
                success=True
            )
            
            # Return response
            # Use employee number from pdf_data if available, otherwise use employee_id
            employee_number = employee_id
            if pdf_data and hasattr(pdf_data, 'employee_number') and pdf_data.employee_number:
                employee_number = pdf_data.employee_number

            return self.create_pdf_response(
                pdf_bytes=pdf_bytes,
                filename=f"health_insurance_{employee_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
            )
            
        except Exception as e:
            logger.error(f"Error generating Health Insurance PDF for employee {employee_id}: {e}")
            self.log_generation_event(
                employee_id=employee_id,
                document_type='Health Insurance',
                success=False,
                error=str(e)
            )
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to generate Health Insurance PDF'
            }