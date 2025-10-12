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

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("Warning: Pillow (PIL) not available. Image processing will not work.")

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

logger = logging.getLogger(__name__)


class DocumentMergerService:
    """Service for merging multiple PDF documents into a single package"""
    
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service
        self.page_width, self.page_height = letter
    
    def _compress_image(self, image_bytes: bytes, max_width: int = 1700, max_height: int = 2200) -> bytes:
        """Compress image to reasonable size for PDF inclusion"""
        if not HAS_PIL:
            return image_bytes
        
        try:
            img = Image.open(io.BytesIO(image_bytes))
            
            # Convert RGBA to RGB
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize if too large
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                logger.info(f"[MERGER] Resized image: {img.width}x{img.height}")
            
            # Save as JPEG
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            compressed = output.getvalue()
            
            compression_ratio = (1 - len(compressed) / len(image_bytes)) * 100
            logger.info(f"[MERGER] Compressed: {len(image_bytes)} → {len(compressed)} bytes ({compression_ratio:.1f}% reduction)")
            
            return compressed
        except Exception as e:
            logger.error(f"[MERGER] Image compression failed: {e}")
            return image_bytes
    
    def _convert_image_to_pdf(self, image_bytes: bytes, label: str = "") -> bytes:
        """Convert image file to PDF page"""
        try:
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            
            # Compress image
            compressed = self._compress_image(image_bytes)
            img_reader = ImageReader(io.BytesIO(compressed))
            img_width, img_height = img_reader.getSize()
            
            # Calculate scaling (1" margins)
            margin = 72
            max_width = self.page_width - (2 * margin)
            max_height = self.page_height - (2 * margin)
            
            scale = min(max_width / img_width, max_height / img_height, 1.0)
            final_width = img_width * scale
            final_height = img_height * scale
            
            # Center image
            x = (self.page_width - final_width) / 2
            y = (self.page_height - final_height) / 2
            
            c.drawImage(img_reader, x, y, width=final_width, height=final_height)
            
            # Add label if provided
            if label:
                c.setFont("Helvetica", 8)
                c.setFillColor(colors.HexColor("#6B7280"))
                c.drawCentredString(self.page_width / 2, margin / 2, label)
            
            c.showPage()
            c.save()
            buffer.seek(0)
            return buffer.read()
        except Exception as e:
            logger.error(f"[MERGER] Image to PDF conversion failed: {e}")
            raise
    
    def _create_id_separator_page(self) -> bytes:
        """Create separator page for ID documents section"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor("#1F2937"))
        c.drawCentredString(self.page_width / 2, 500, "SUPPORTING DOCUMENTS")
        
        c.setFont("Helvetica", 14)
        c.setFillColor(colors.HexColor("#374151"))
        c.drawCentredString(self.page_width / 2, 470, "I-9 Employment Eligibility Verification")
        c.drawCentredString(self.page_width / 2, 450, "Uploaded Identification Documents")
        
        c.setStrokeColor(colors.HexColor("#D1D5DB"))
        c.setLineWidth(2)
        c.line(150, 430, self.page_width - 150, 430)
        
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(colors.HexColor("#6B7280"))
        c.drawCentredString(self.page_width / 2, 400, "The following documents were submitted by the employee")
        c.drawCentredString(self.page_width / 2, 385, "for identity and work authorization verification per federal I-9 requirements.")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    async def append_id_documents_to_summary(
        self,
        base_pdf_bytes: bytes,
        uploaded_documents: List[Dict[str, Any]]
    ) -> bytes:
        """
        Append uploaded ID documents to new hire summary PDF
        
        Args:
            base_pdf_bytes: The new hire summary PDF
            uploaded_documents: List of documents from IDDocumentRetriever
            
        Returns:
            Merged PDF with ID documents attached at the end
        """
        if not HAS_PYPDF2:
            logger.error("[MERGER] PyPDF2 not available, cannot merge")
            return base_pdf_bytes
        
        if not uploaded_documents:
            logger.info("[MERGER] No ID documents to append")
            return base_pdf_bytes
        
        try:
            logger.info(f"[MERGER] Appending {len(uploaded_documents)} ID documents to summary")
            
            merger = PdfMerger()
            
            # Add base PDF
            merger.append(io.BytesIO(base_pdf_bytes))
            logger.info("[MERGER] ✅ Added base summary PDF")
            
            # Add separator page
            separator_pdf = self._create_id_separator_page()
            merger.append(io.BytesIO(separator_pdf))
            logger.info("[MERGER] ✅ Added separator page")
            
            # Add each document
            for idx, doc in enumerate(uploaded_documents, 1):
                try:
                    file_name = doc.get('file_name', 'unknown')
                    mime_type = doc.get('mime_type', 'application/pdf')
                    file_bytes = doc.get('file_bytes')
                    display_name = doc.get('display_name', 'Document')
                    
                    if not file_bytes:
                        logger.warning(f"[MERGER] No bytes for document {file_name}, skipping")
                        continue
                    
                    logger.info(f"[MERGER] Processing document {idx}/{len(uploaded_documents)}: {file_name}")
                    
                    if mime_type == 'application/pdf':
                        # PDF - merge directly
                        merger.append(io.BytesIO(file_bytes))
                        logger.info(f"[MERGER] ✅ Merged PDF: {file_name}")
                    else:
                        # Image - convert to PDF first
                        label = f"{display_name} - {file_name}"
                        image_pdf = self._convert_image_to_pdf(file_bytes, label)
                        merger.append(io.BytesIO(image_pdf))
                        logger.info(f"[MERGER] ✅ Converted and merged image: {file_name}")
                    
                except Exception as doc_err:
                    logger.error(f"[MERGER] ❌ Failed to add document {file_name}: {doc_err}")
                    continue
            
            # Write merged PDF
            output = io.BytesIO()
            merger.write(output)
            merger.close()
            
            merged_bytes = output.getvalue()
            logger.info(f"[MERGER] ✅ Merge complete: {len(base_pdf_bytes)} → {len(merged_bytes)} bytes")
            
            return merged_bytes
            
        except Exception as e:
            logger.error(f"[MERGER] ❌ Failed to append ID documents: {e}")
            logger.warning("[MERGER] Returning base PDF without attachments")
            return base_pdf_bytes
        
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

