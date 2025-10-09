"""
Document Merger Service
Merges all employee onboarding documents into a single comprehensive PDF package
"""
import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from PyPDF2 import PdfMerger, PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False
    print("Warning: PyPDF2 not available. PDF merging will not work.")

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors

logger = logging.getLogger(__name__)


class DocumentMergerService:
    """Service for merging multiple PDF documents into a single package"""
    
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service
        
    async def create_complete_onboarding_package(
        self,
        employee_id: str,
        property_id: str,
        new_hire_summary_pdf: bytes
    ) -> bytes:
        """
        Create a complete onboarding package with all documents
        
        Args:
            employee_id: Employee ID
            property_id: Property ID
            new_hire_summary_pdf: The generated new hire summary PDF (first page)
            
        Returns:
            bytes: Complete merged PDF package
        """
        if not HAS_PYPDF2:
            logger.error("PyPDF2 not available, cannot merge documents")
            return new_hire_summary_pdf
            
        try:
            logger.info(f"[MERGER] Creating complete onboarding package for employee {employee_id}")
            
            # Get employee info for cover page
            employee_response = self.supabase_service.admin_client.table('employees') \
                .select('*') \
                .eq('id', employee_id) \
                .single() \
                .execute()
            
            employee = employee_response.data if employee_response else None
            if not employee:
                logger.error(f"[MERGER] Employee {employee_id} not found")
                return new_hire_summary_pdf
            
            # Get property info
            property_response = self.supabase_service.admin_client.table('properties') \
                .select('*') \
                .eq('id', property_id) \
                .single() \
                .execute()
            
            property_data = property_response.data if property_response else {}
            
            # Create PDF merger
            merger = PdfMerger()
            
            # Add new hire summary as first page
            logger.info("[MERGER] Adding new hire summary (page 1)")
            merger.append(io.BytesIO(new_hire_summary_pdf))
            
            # Define document order for the package
            document_order = [
                ('i9_form_completed', 'I-9 Employment Eligibility Verification (Completed)'),
                ('w4_form_completed', 'W-4 Federal Tax Withholding (Completed)'),
                ('direct_deposit', 'Direct Deposit Authorization'),
                ('health_insurance_completed', 'Health Insurance Enrollment (Completed)'),
                ('company_policies', 'Company Policies Acknowledgment'),
                ('weapons_policy', 'Weapons Policy Acknowledgment'),
                ('human_trafficking', 'Human Trafficking Awareness'),
            ]
            
            # Get all signed documents for this employee
            signed_docs_response = self.supabase_service.admin_client.table('signed_documents') \
                .select('*') \
                .eq('employee_id', employee_id) \
                .order('created_at', desc=True) \
                .execute()
            
            signed_docs = signed_docs_response.data if signed_docs_response else []
            
            # Create a map of document_type -> latest document
            doc_map: Dict[str, Dict[str, Any]] = {}
            for doc in signed_docs:
                doc_type = doc['document_type']
                # Keep only the latest version of each document type
                if doc_type not in doc_map:
                    doc_map[doc_type] = doc
            
            logger.info(f"[MERGER] Found {len(doc_map)} unique document types")
            
            # Add documents in order
            added_count = 0
            for doc_type, doc_title in document_order:
                if doc_type in doc_map:
                    doc = doc_map[doc_type]
                    metadata = doc.get('metadata', {})
                    bucket = metadata.get('bucket', 'onboarding-documents')
                    path = metadata.get('path')
                    
                    if path:
                        try:
                            logger.info(f"[MERGER] Adding document: {doc_title}")
                            
                            # Download the PDF from storage
                            pdf_bytes = self.supabase_service.admin_client.storage \
                                .from_(bucket) \
                                .download(path)
                            
                            if pdf_bytes:
                                # Add to merger
                                merger.append(io.BytesIO(pdf_bytes))
                                added_count += 1
                                logger.info(f"[MERGER] Successfully added {doc_title}")
                            else:
                                logger.warning(f"[MERGER] No bytes returned for {doc_title}")
                                
                        except Exception as doc_exc:
                            logger.error(f"[MERGER] Failed to add {doc_title}: {doc_exc}")
                    else:
                        logger.warning(f"[MERGER] No path found for {doc_title}")
                else:
                    logger.info(f"[MERGER] Document not found: {doc_title}")
            
            logger.info(f"[MERGER] Successfully added {added_count} documents to package")
            
            # Write merged PDF to bytes
            output = io.BytesIO()
            merger.write(output)
            merger.close()
            output.seek(0)
            
            merged_pdf = output.read()
            logger.info(f"[MERGER] Complete package created: {len(merged_pdf)} bytes")
            
            return merged_pdf
            
        except Exception as exc:
            logger.exception(f"[MERGER] Failed to create complete package: {exc}")
            # Return just the summary if merging fails
            return new_hire_summary_pdf
    
    def generate_cover_page(
        self,
        employee_name: str,
        property_name: str,
        document_count: int
    ) -> bytes:
        """
        Generate a cover page for the document package
        
        Args:
            employee_name: Employee's full name
            property_name: Property name
            document_count: Number of documents in package
            
        Returns:
            bytes: Cover page PDF
        """
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        page_width, page_height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor("#1F2937"))
        c.drawCentredString(page_width / 2, page_height - 2 * inch, "Employee Onboarding Package")
        
        # Subtitle
        c.setFont("Helvetica", 14)
        c.setFillColor(colors.HexColor("#4B5563"))
        c.drawCentredString(page_width / 2, page_height - 2.5 * inch, "Complete Documentation")
        
        # Employee info box
        y = page_height - 3.5 * inch
        c.setFillColor(colors.HexColor("#F3F4F6"))
        c.rect(1.5 * inch, y - 1.5 * inch, page_width - 3 * inch, 1.5 * inch, fill=1, stroke=0)
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * inch, y - 0.5 * inch, "Employee:")
        c.setFont("Helvetica", 12)
        c.drawString(3.5 * inch, y - 0.5 * inch, employee_name)
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * inch, y - 0.9 * inch, "Property:")
        c.setFont("Helvetica", 12)
        c.drawString(3.5 * inch, y - 0.9 * inch, property_name)
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * inch, y - 1.3 * inch, "Documents:")
        c.setFont("Helvetica", 12)
        c.drawString(3.5 * inch, y - 1.3 * inch, f"{document_count} pages")
        
        # Document list
        y = y - 2.5 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1.5 * inch, y, "Package Contents:")
        
        y -= 0.3 * inch
        c.setFont("Helvetica", 10)
        documents = [
            "1. New Hire Summary",
            "2. I-9 Employment Eligibility Verification",
            "3. W-4 Federal Tax Withholding",
            "4. Direct Deposit Authorization",
            "5. Health Insurance Enrollment",
            "6. Company Policies Acknowledgment",
            "7. Additional Required Forms"
        ]
        
        for doc in documents:
            c.drawString(2 * inch, y, doc)
            y -= 0.25 * inch
        
        # Footer
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#6B7280"))
        timestamp = datetime.utcnow().strftime("Generated %B %d, %Y at %I:%M %p UTC")
        c.drawCentredString(page_width / 2, 0.75 * inch, timestamp)
        c.drawCentredString(page_width / 2, 0.5 * inch, "This is a complete and official record of employee onboarding")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer.read()


__all__ = ["DocumentMergerService"]

