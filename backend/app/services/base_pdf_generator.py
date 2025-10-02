"""
Base PDF Generator Class
Abstract base class for all PDF generators providing consistent data retrieval and common functionality
"""
import logging
import base64
import io
import os
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple, Union, List, Callable
from datetime import datetime
from PIL import Image

from app.services.employee_data_service import get_employee_data_service
from app.supabase_service_enhanced import EnhancedSupabaseService
from app.employee_models import PDFGenerationData

# Import PDF libraries
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

logger = logging.getLogger(__name__)

class BasePDFGenerator(ABC):
    """
    Abstract base class for all PDF generators.
    Provides consistent employee data retrieval and common PDF operations.
    """
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        """
        Initialize the base PDF generator
        
        Args:
            supabase_service: Instance of the enhanced Supabase service
        """
        self.supabase = supabase_service
        self.employee_data_service = get_employee_data_service(supabase_service)
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def get_employee_data(
        self, 
        employee_id: str, 
        property_id: Optional[str] = None
    ) -> PDFGenerationData:
        """
        Get employee data formatted for PDF generation
        
        Args:
            employee_id: The employee's ID
            property_id: Optional property ID for access control
            
        Returns:
            PDFGenerationData object with all employee information
        """
        try:
            # Get complete employee data from centralized service
            employee_data = await self.employee_data_service.get_employee_for_pdf(
                employee_id, 
                property_id
            )
            
            if not employee_data:
                raise ValueError(f"No data found for employee {employee_id}")
            
            # Convert to PDF generation data model
            pdf_data = PDFGenerationData.from_employee_data(employee_data)
            
            self.logger.info(f"Retrieved employee data for {pdf_data.full_name} ({employee_id})")
            
            return pdf_data
            
        except Exception as e:
            self.logger.error(f"Error getting employee data for PDF: {e}")
            raise
    
    def get_employee_name(self, pdf_data: PDFGenerationData) -> str:
        """
        Get formatted employee name from PDF data
        
        Args:
            pdf_data: PDFGenerationData object
            
        Returns:
            Formatted full name string
        """
        return pdf_data.full_name or f"{pdf_data.first_name} {pdf_data.last_name}".strip()
    
    def get_employee_name_components(self, pdf_data: PDFGenerationData) -> Tuple[str, str, str]:
        """
        Get employee name components
        
        Args:
            pdf_data: PDFGenerationData object
            
        Returns:
            Tuple of (first_name, last_name, middle_initial)
        """
        return (
            pdf_data.first_name or '',
            pdf_data.last_name or '',
            pdf_data.middle_initial or ''
        )
    
    def format_date(self, date_str: Optional[str], format: str = "%m/%d/%Y") -> str:
        """
        Format a date string for PDF display
        
        Args:
            date_str: ISO format date string
            format: Output format (default MM/DD/YYYY)
            
        Returns:
            Formatted date string
        """
        if not date_str:
            return ""
        
        try:
            # Handle various input formats
            if "T" in date_str:
                # ISO format with time
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                # Date only
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            
            return dt.strftime(format)
        except Exception as e:
            self.logger.warning(f"Error formatting date {date_str}: {e}")
            return date_str
    
    def format_ssn(self, ssn: Optional[str], mask: bool = False) -> str:
        """
        Format SSN for display
        
        Args:
            ssn: Social Security Number
            mask: Whether to mask the SSN
            
        Returns:
            Formatted SSN (XXX-XX-XXXX or ***-**-XXXX)
        """
        if not ssn:
            return ""
        
        # Remove any existing formatting
        clean_ssn = ''.join(c for c in ssn if c.isdigit())
        
        if len(clean_ssn) != 9:
            return ssn  # Return as-is if invalid length
        
        if mask:
            return f"***-**-{clean_ssn[-4:]}"
        else:
            return f"{clean_ssn[:3]}-{clean_ssn[3:5]}-{clean_ssn[5:]}"
    
    def format_phone(self, phone: Optional[str]) -> str:
        """
        Format phone number for display
        
        Args:
            phone: Phone number
            
        Returns:
            Formatted phone number (XXX) XXX-XXXX
        """
        if not phone:
            return ""
        
        # Remove any non-digit characters
        clean_phone = ''.join(c for c in phone if c.isdigit())
        
        if len(clean_phone) == 10:
            return f"({clean_phone[:3]}) {clean_phone[3:6]}-{clean_phone[6:]}"
        elif len(clean_phone) == 11 and clean_phone[0] == '1':
            # Remove country code
            clean_phone = clean_phone[1:]
            return f"({clean_phone[:3]}) {clean_phone[3:6]}-{clean_phone[6:]}"
        else:
            return phone  # Return as-is if invalid format
    
    def format_address(self, pdf_data: PDFGenerationData) -> str:
        """
        Format address as a single line
        
        Args:
            pdf_data: PDFGenerationData object
            
        Returns:
            Formatted address string
        """
        parts = []
        
        if pdf_data.address_street:
            parts.append(pdf_data.address_street)
        if pdf_data.address_apt:
            parts.append(f"Apt {pdf_data.address_apt}")
        
        if parts:
            address_line1 = " ".join(parts)
        else:
            address_line1 = ""
        
        address_line2_parts = []
        if pdf_data.address_city:
            address_line2_parts.append(pdf_data.address_city)
        if pdf_data.address_state:
            address_line2_parts.append(pdf_data.address_state)
        if pdf_data.address_zip:
            address_line2_parts.append(pdf_data.address_zip)
        
        address_line2 = ", ".join(address_line2_parts)
        
        if address_line1 and address_line2:
            return f"{address_line1}, {address_line2}"
        else:
            return address_line1 or address_line2
    
    def embed_signature(
        self, 
        pdf_bytes: bytes, 
        signature_data: str,
        x: int,
        y: int,
        width: int = 200,
        height: int = 50,
        page_number: int = 0
    ) -> bytes:
        """
        Embed a signature image into a PDF at specified coordinates
        
        Args:
            pdf_bytes: The PDF document bytes
            signature_data: Base64 encoded signature image
            x: X coordinate (from left)
            y: Y coordinate (from bottom in PyMuPDF)
            width: Signature width
            height: Signature height
            page_number: Page number to add signature (0-indexed)
            
        Returns:
            PDF bytes with embedded signature
        """
        if not HAS_PYMUPDF:
            self.logger.warning("PyMuPDF not available, returning PDF without signature")
            return pdf_bytes
        
        try:
            # Decode base64 signature
            if signature_data.startswith('data:image'):
                # Remove data URL prefix
                signature_data = signature_data.split(',')[1]
            
            signature_bytes = base64.b64decode(signature_data)
            
            # Open PDF document
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Get the specified page
            if page_number >= len(doc):
                self.logger.error(f"Page {page_number} does not exist in PDF")
                return pdf_bytes
            
            page = doc[page_number]
            
            # Process signature image with PIL to handle transparency properly
            try:
                from PIL import Image as PILImage
                import io
                
                # Load and process signature image
                img = PILImage.open(io.BytesIO(signature_bytes))
                
                # Convert to RGBA to handle transparency
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Process image to make white/light pixels transparent
                data = img.getdata()
                new_data = []
                for r, g, b, a in data:
                    # Make white/light background transparent
                    if r > 240 and g > 240 and b > 240:
                        new_data.append((255, 255, 255, 0))  # Transparent
                    else:
                        new_data.append((r, g, b, 255))  # Keep signature ink opaque
                
                img.putdata(new_data)
                
                # Save processed image to buffer
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                # Define rectangle for signature placement
                rect = fitz.Rect(x, y, x + width, y + height)
                
                # Insert signature using stream method (preserves transparency)
                page.insert_image(rect, stream=img_buffer.getvalue(), keep_proportion=False)
                
            except ImportError:
                self.logger.warning("PIL not available, using fallback pixmap method (may show black rectangles)")
                # Fallback: use pixmap but this may create black rectangles
                img = fitz.Pixmap(signature_bytes)
                rect = fitz.Rect(x, y, x + width, y + height)
                page.insert_image(rect, pixmap=img)
            
            # Save modified PDF
            modified_pdf = doc.write()
            doc.close()
            
            self.logger.info(f"Successfully embedded signature at ({x}, {y})")
            
            return modified_pdf
            
        except Exception as e:
            self.logger.error(f"Error embedding signature: {e}")
            return pdf_bytes
    
    def add_timestamp(
        self,
        pdf_bytes: bytes,
        timestamp: Optional[datetime] = None,
        x: int = 50,
        y: int = 50,
        page_number: int = 0
    ) -> bytes:
        """
        Add a timestamp to the PDF
        
        Args:
            pdf_bytes: The PDF document bytes
            timestamp: Timestamp to add (default: current time)
            x: X coordinate
            y: Y coordinate
            page_number: Page number to add timestamp
            
        Returns:
            PDF bytes with timestamp
        """
        if not HAS_PYMUPDF:
            return pdf_bytes
        
        try:
            if timestamp is None:
                timestamp = datetime.now()
            
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page = doc[page_number]
            
            # Format timestamp
            timestamp_text = timestamp.strftime("%m/%d/%Y %I:%M %p")
            
            # Add text
            page.insert_text(
                (x, y),
                timestamp_text,
                fontsize=8,
                color=(0, 0, 0)
            )
            
            modified_pdf = doc.write()
            doc.close()
            
            return modified_pdf
            
        except Exception as e:
            self.logger.error(f"Error adding timestamp: {e}")
            return pdf_bytes
    
    def pdf_to_base64(self, pdf_bytes: bytes) -> str:
        """
        Convert PDF bytes to base64 string
        
        Args:
            pdf_bytes: PDF document bytes
            
        Returns:
            Base64 encoded string
        """
        return base64.b64encode(pdf_bytes).decode('utf-8')
    
    def create_pdf_response(
        self, 
        pdf_bytes: bytes, 
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized PDF response
        
        Args:
            pdf_bytes: PDF document bytes
            filename: Optional filename for the PDF
            
        Returns:
            Response dictionary with PDF data
        """
        return {
            'success': True,
            'pdf_base64': self.pdf_to_base64(pdf_bytes),
            'filename': filename or f"document_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            'content_type': 'application/pdf',
            'size': len(pdf_bytes)
        }
    
    @abstractmethod
    async def generate_pdf(
        self, 
        employee_id: str,
        form_data: Optional[Dict[str, Any]] = None,
        signature_data: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Abstract method to generate PDF - must be implemented by subclasses
        
        Args:
            employee_id: The employee's ID
            form_data: Optional form-specific data
            signature_data: Optional signature image data
            **kwargs: Additional generator-specific parameters
            
        Returns:
            Response dictionary with PDF data
        """
        pass
    
    async def generate_preview(
        self,
        employee_id: str,
        form_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a preview PDF without signatures
        
        Args:
            employee_id: The employee's ID
            form_data: Optional form-specific data
            **kwargs: Additional parameters
            
        Returns:
            Response dictionary with preview PDF
        """
        # Default implementation - can be overridden by subclasses
        return await self.generate_pdf(
            employee_id=employee_id,
            form_data=form_data,
            signature_data=None,
            is_preview=True,
            **kwargs
        )
    
    def validate_required_fields(
        self,
        pdf_data: PDFGenerationData,
        required_fields: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Validate that required fields are present
        
        Args:
            pdf_data: PDFGenerationData object
            required_fields: List of required field names
            
        Returns:
            Tuple of (is_valid, missing_fields)
        """
        missing_fields = []
        data_dict = pdf_data.to_dict()
        
        for field in required_fields:
            value = data_dict.get(field)
            if value is None or value == '':
                missing_fields.append(field)
        
        return len(missing_fields) == 0, missing_fields
    
    def log_generation_event(
        self,
        employee_id: str,
        document_type: str,
        success: bool,
        error: Optional[str] = None
    ):
        """
        Log PDF generation event for audit trail
        
        Args:
            employee_id: The employee's ID
            document_type: Type of document generated
            success: Whether generation was successful
            error: Optional error message
        """
        if success:
            self.logger.info(
                f"Successfully generated {document_type} for employee {employee_id}"
            )
        else:
            self.logger.error(
                f"Failed to generate {document_type} for employee {employee_id}: {error}"
            )