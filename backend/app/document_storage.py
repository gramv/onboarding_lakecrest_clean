"""
Document Storage Service for Legal Compliance
Handles secure storage and retrieval of onboarding documents
"""

import os
import uuid
import hashlib
import mimetypes
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import aiofiles
import PyPDF2
from PIL import Image
import io
import base64
from cryptography.fernet import Fernet
import logging

from .models import DocumentType, DocumentMetadata, DocumentCategory

logger = logging.getLogger(__name__)

class DocumentStorageService:
    """
    Secure document storage service with encryption and compliance features
    """
    
    def __init__(self, storage_path: str = "./document_storage", encryption_key: Optional[bytes] = None):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        
        # Create subdirectories for different document types
        for doc_type in DocumentType:
            (self.storage_path / doc_type.value).mkdir(exist_ok=True)
        
        # Initialize encryption
        if encryption_key:
            self.cipher = Fernet(encryption_key)
        else:
            # Generate a new key for this instance (in production, use a persistent key)
            self.cipher = Fernet(Fernet.generate_key())
            
        # Supported file types for legal documents
        self.allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.doc', '.docx'}
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        
    async def store_document(
        self,
        file_content: bytes,
        filename: str,
        document_type: DocumentType,
        employee_id: str,
        property_id: str,
        uploaded_by: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DocumentMetadata:
        """
        Store a document with encryption and metadata for legal compliance
        """
        try:
            # Validate file
            file_ext = Path(filename).suffix.lower()
            if file_ext not in self.allowed_extensions:
                raise ValueError(f"File type {file_ext} not allowed. Allowed types: {self.allowed_extensions}")
            
            if len(file_content) > self.max_file_size:
                raise ValueError(f"File size exceeds maximum allowed size of {self.max_file_size/1024/1024}MB")
            
            # Generate unique document ID
            document_id = str(uuid.uuid4())
            
            # Calculate file hash for integrity verification
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Encrypt the file content
            encrypted_content = self.cipher.encrypt(file_content)
            
            # Create storage path
            storage_dir = self.storage_path / document_type.value / employee_id
            storage_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate secure filename
            secure_filename = f"{document_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
            file_path = storage_dir / secure_filename
            
            # Write encrypted file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(encrypted_content)
            
            # Create document metadata
            doc_metadata = DocumentMetadata(
                document_id=document_id,
                document_type=document_type,
                original_filename=filename,
                stored_filename=secure_filename,
                file_path=str(file_path),
                file_size=len(file_content),
                file_hash=file_hash,
                mime_type=mimetypes.guess_type(filename)[0] or 'application/octet-stream',
                employee_id=employee_id,
                property_id=property_id,
                uploaded_by=uploaded_by,
                uploaded_at=datetime.now(timezone.utc),
                encryption_status="encrypted",
                verification_status="pending",
                retention_date=self._calculate_retention_date(document_type),
                metadata=metadata or {},
                access_log=[]
            )
            
            # Log the document storage for audit trail
            logger.info(f"Document stored: {document_id} - Type: {document_type.value} - Employee: {employee_id}")
            
            return doc_metadata
            
        except Exception as e:
            logger.error(f"Failed to store document: {str(e)}")
            raise
    
    async def retrieve_document(
        self,
        document_id: str,
        requester_id: str,
        purpose: str = "view"
    ) -> Tuple[bytes, DocumentMetadata]:
        """
        Retrieve and decrypt a document with access logging
        """
        try:
            # Find the document file
            document_path = None
            for doc_type_dir in self.storage_path.iterdir():
                if doc_type_dir.is_dir():
                    for employee_dir in doc_type_dir.iterdir():
                        if employee_dir.is_dir():
                            for file_path in employee_dir.iterdir():
                                if document_id in file_path.name:
                                    document_path = file_path
                                    break
            
            if not document_path:
                raise FileNotFoundError(f"Document {document_id} not found")
            
            # Read encrypted content
            async with aiofiles.open(document_path, 'rb') as f:
                encrypted_content = await f.read()
            
            # Decrypt content
            decrypted_content = self.cipher.decrypt(encrypted_content)
            
            # Log access for audit trail
            access_entry = {
                "accessed_by": requester_id,
                "accessed_at": datetime.now(timezone.utc).isoformat(),
                "purpose": purpose,
                "ip_address": "system"  # Would get from request in real implementation
            }
            
            # Would update metadata with access log in database
            logger.info(f"Document accessed: {document_id} - By: {requester_id} - Purpose: {purpose}")
            
            # Create metadata object (would be retrieved from database in real implementation)
            metadata = DocumentMetadata(
                document_id=document_id,
                document_type=DocumentType.I9_FORM,  # Would get from database
                original_filename="document.pdf",
                stored_filename=document_path.name,
                file_path=str(document_path),
                file_size=len(decrypted_content),
                file_hash=hashlib.sha256(decrypted_content).hexdigest(),
                mime_type="application/pdf",
                employee_id="",
                property_id="",
                uploaded_by=requester_id,
                uploaded_at=datetime.now(timezone.utc),
                encryption_status="encrypted",
                verification_status="verified",
                retention_date=datetime.now(timezone.utc),
                metadata={},
                access_log=[access_entry]
            )
            
            return decrypted_content, metadata
            
        except Exception as e:
            logger.error(f"Failed to retrieve document {document_id}: {str(e)}")
            raise
    
    async def generate_legal_cover_sheet(
        self,
        document_metadata: DocumentMetadata,
        include_barcode: bool = True
    ) -> bytes:
        """
        Generate a legal cover sheet for document packages
        """
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        import qrcode
        
        # Create PDF buffer
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(1*inch, height - 1*inch, "CONFIDENTIAL EMPLOYEE DOCUMENT")
        
        # Document information
        c.setFont("Helvetica", 10)
        y_position = height - 1.5*inch
        
        info_lines = [
            f"Document ID: {document_metadata.document_id}",
            f"Document Type: {document_metadata.document_type.value}",
            f"Employee ID: {document_metadata.employee_id}",
            f"Property ID: {document_metadata.property_id}",
            f"Upload Date: {document_metadata.uploaded_at.strftime('%B %d, %Y %H:%M:%S UTC')}",
            f"Uploaded By: {document_metadata.uploaded_by}",
            f"File Hash: {document_metadata.file_hash[:16]}...",
            f"Retention Date: {document_metadata.retention_date.strftime('%B %d, %Y')}",
        ]
        
        for line in info_lines:
            c.drawString(1*inch, y_position, line)
            y_position -= 0.3*inch
        
        # Add QR code for document verification
        if include_barcode:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr_data = {
                "doc_id": document_metadata.document_id,
                "hash": document_metadata.file_hash[:16],
                "type": document_metadata.document_type.value
            }
            qr.add_data(str(qr_data))
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            # Add QR code to PDF
            c.drawImage(img_buffer, width - 3*inch, height - 3*inch, 2*inch, 2*inch)
        
        # Legal notice
        c.setFont("Helvetica-Bold", 8)
        c.drawString(1*inch, 2*inch, "LEGAL NOTICE:")
        
        c.setFont("Helvetica", 8)
        legal_text = [
            "This document contains confidential employee information protected under federal and state privacy laws.",
            "Unauthorized access, use, or disclosure is strictly prohibited and may result in civil and criminal penalties.",
            "This document must be retained according to federal record retention requirements.",
            "For questions regarding this document, contact HR at hr@hotelcompany.com"
        ]
        
        y_pos = 1.7*inch
        for line in legal_text:
            c.drawString(1*inch, y_pos, line)
            y_pos -= 0.2*inch
        
        # Footer
        c.setFont("Helvetica", 6)
        c.drawString(1*inch, 0.5*inch, f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M:%S UTC')}")
        
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    async def create_document_package(
        self,
        document_ids: List[str],
        package_title: str,
        requester_id: str
    ) -> bytes:
        """
        Create a legal document package with cover sheet and all documents
        """
        from PyPDF2 import PdfMerger
        
        merger = PdfMerger()
        
        # Add cover sheet
        cover_metadata = DocumentMetadata(
            document_id=str(uuid.uuid4()),
            document_type=DocumentType.OTHER,
            original_filename=f"{package_title}_package.pdf",
            stored_filename="",
            file_path="",
            file_size=0,
            file_hash="",
            mime_type="application/pdf",
            employee_id="",
            property_id="",
            uploaded_by=requester_id,
            uploaded_at=datetime.now(timezone.utc),
            encryption_status="none",
            verification_status="system_generated",
            retention_date=datetime.now(timezone.utc),
            metadata={"package_documents": document_ids},
            access_log=[]
        )
        
        cover_sheet = await self.generate_legal_cover_sheet(cover_metadata, include_barcode=True)
        merger.append(io.BytesIO(cover_sheet))
        
        # Add each document
        for doc_id in document_ids:
            try:
                content, metadata = await self.retrieve_document(doc_id, requester_id, "package_creation")
                
                # Only add PDFs directly, convert others
                if metadata.mime_type == 'application/pdf':
                    merger.append(io.BytesIO(content))
                else:
                    # Convert image to PDF if needed
                    if metadata.mime_type.startswith('image/'):
                        pdf_content = await self._convert_image_to_pdf(content)
                        merger.append(io.BytesIO(pdf_content))
                        
            except Exception as e:
                logger.error(f"Failed to add document {doc_id} to package: {str(e)}")
                continue
        
        # Create final package
        output_buffer = io.BytesIO()
        merger.write(output_buffer)
        merger.close()
        
        output_buffer.seek(0)
        return output_buffer.read()
    
    async def _convert_image_to_pdf(self, image_content: bytes) -> bytes:
        """Convert image to PDF for legal document packages"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        
        # Open image
        img = Image.open(io.BytesIO(image_content))
        
        # Create PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Calculate dimensions to fit on page
        page_width, page_height = letter
        margin = 0.5 * 72  # 0.5 inch margins
        
        max_width = page_width - 2 * margin
        max_height = page_height - 2 * margin
        
        # Scale image to fit
        img_width, img_height = img.size
        scale = min(max_width / img_width, max_height / img_height)
        
        new_width = img_width * scale
        new_height = img_height * scale
        
        # Center on page
        x = (page_width - new_width) / 2
        y = (page_height - new_height) / 2
        
        # Draw image
        img_reader = ImageReader(img)
        c.drawImage(img_reader, x, y, width=new_width, height=new_height)
        
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    def _calculate_retention_date(self, document_type: DocumentType) -> datetime:
        """
        Calculate document retention date based on federal requirements
        """
        retention_years = {
            DocumentType.I9_FORM: 3,  # 3 years after hire or 1 year after termination
            DocumentType.W4_FORM: 4,  # 4 years
            DocumentType.DIRECT_DEPOSIT: 3,  # 3 years
            DocumentType.INSURANCE_FORM: 6,  # 6 years for ERISA documents
            DocumentType.COMPANY_POLICIES: 7,  # 7 years
            DocumentType.BACKGROUND_CHECK: 2,  # 2 years under FCRA
            DocumentType.DRIVERS_LICENSE: 3,  # 3 years
            DocumentType.PASSPORT: 3,  # 3 years
            DocumentType.SOCIAL_SECURITY: 3,  # 3 years
            DocumentType.WORK_PERMIT: 3,  # 3 years
            DocumentType.OTHER: 7  # Default 7 years
        }
        
        years = retention_years.get(document_type, 7)
        return datetime.now(timezone.utc).replace(year=datetime.now().year + years)
    
    async def verify_document_integrity(self, document_id: str) -> bool:
        """
        Verify document hasn't been tampered with
        """
        try:
            content, metadata = await self.retrieve_document(document_id, "system", "integrity_check")
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == metadata.file_hash
        except:
            return False
    
    async def mark_for_deletion(self, document_id: str, reason: str) -> bool:
        """
        Mark document for deletion (soft delete for compliance)
        """
        # In production, this would update database record
        # Documents are never actually deleted, just marked
        logger.info(f"Document {document_id} marked for deletion. Reason: {reason}")
        return True

# Initialize service
document_storage = DocumentStorageService()