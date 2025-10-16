"""
PDF Password Protection Service

Adds password protection to PDF documents before download or email.
All completed onboarding documents are password-protected with password "7935".

This provides an additional security layer for documents that leave the system
(downloads, email attachments) beyond the existing storage encryption.

Security Layers:
1. Storage Encryption (Fernet/AES-128) - Protects data at rest
2. Access Control (RLS + Auth) - Prevents unauthorized access
3. PDF Password Protection - Protects downloaded/emailed files (this service)

Usage:
    from app.services.pdf_password_service import protect_pdf_for_download
    
    # After decrypting from storage:
    decrypted_bytes = supabase_service.doc_encryption.decrypt_document(...)
    
    # Add password protection before sending to user:
    protected_bytes = protect_pdf_for_download(decrypted_bytes)
    
    # Send to client:
    pdf_base64 = base64.b64encode(protected_bytes).decode('utf-8')
"""

from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Standard password for all onboarding documents
DEFAULT_PASSWORD = "7935"


def add_password_protection(
    pdf_bytes: bytes,
    password: str = DEFAULT_PASSWORD,
    allow_printing: bool = True,
    allow_commenting: bool = False
) -> bytes:
    """
    Add password protection to a PDF document.
    
    The PDF will require the password to be opened. This is applied to documents
    after they are decrypted from storage but before they are sent to users
    (via download or email).
    
    Args:
        pdf_bytes: Input PDF as bytes (should be decrypted if coming from storage)
        password: Password to protect the PDF (default: "7935")
        allow_printing: Allow printing the PDF after opening (default: True)
        allow_commenting: Allow commenting/annotations (default: False)
    
    Returns:
        Password-protected PDF as bytes
    
    Raises:
        ValueError: If pdf_bytes is empty or invalid
        RuntimeError: If password protection fails
    
    Example:
        >>> # After decrypting from storage:
        >>> decrypted_pdf = supabase_service.doc_encryption.decrypt_document(...)
        >>> 
        >>> # Add password protection:
        >>> protected_pdf = add_password_protection(decrypted_pdf)
        >>> 
        >>> # Now protected_pdf requires password "7935" to open
    
    Security Notes:
        - Password "7935" is shared across all documents (not per-user)
        - Purpose: Prevent casual/accidental access to downloaded/emailed files
        - Not meant for high-security scenarios or sophisticated attacks
        - Complements storage encryption and access control
    """
    if not pdf_bytes:
        raise ValueError("PDF bytes cannot be empty")
    
    if not isinstance(pdf_bytes, bytes):
        raise ValueError(f"pdf_bytes must be bytes, got {type(pdf_bytes)}")
    
    try:
        logger.debug(f"Adding password protection to PDF ({len(pdf_bytes)} bytes)")
        
        # Read the input PDF
        pdf_reader = PdfReader(BytesIO(pdf_bytes))
        pdf_writer = PdfWriter()
        
        # Copy all pages to writer
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
        
        # Copy metadata if present
        if pdf_reader.metadata:
            pdf_writer.add_metadata(pdf_reader.metadata)
        
        # Add password protection
        # user_password: Required to open the PDF
        # owner_password: Required to change permissions (we use same password)
        # permissions_flag: Controls what users can do after opening
        #   0b0000_0100 = Allow printing only
        #   0b0000_0000 = No permissions
        permissions = 0b0000_0100 if allow_printing else 0b0000_0000
        
        pdf_writer.encrypt(
            user_password=password,
            owner_password=password,
            permissions_flag=permissions
        )
        
        # Write to bytes
        output_buffer = BytesIO()
        pdf_writer.write(output_buffer)
        protected_bytes = output_buffer.getvalue()
        
        logger.info(
            f"✅ PDF password protected: {len(pdf_bytes)} → {len(protected_bytes)} bytes "
            f"(password: {'*' * len(password)})"
        )
        
        return protected_bytes
        
    except Exception as e:
        logger.error(f"❌ Failed to add password protection to PDF: {e}", exc_info=True)
        raise RuntimeError(f"Password protection failed: {e}")


def protect_pdf_for_download(pdf_bytes: bytes, password: Optional[str] = None) -> bytes:
    """
    Convenience function to protect PDF with standard password for download.
    
    This is the main function to use throughout the application when preparing
    PDFs for download or email attachment.
    
    Args:
        pdf_bytes: Decrypted PDF bytes (from storage or generated)
        password: Optional custom password (default: "7935")
    
    Returns:
        Password-protected PDF bytes
    
    Example:
        >>> # In document download endpoint:
        >>> decrypted_bytes = supabase_service.doc_encryption.decrypt_document(...)
        >>> protected_bytes = protect_pdf_for_download(decrypted_bytes)
        >>> pdf_base64 = base64.b64encode(protected_bytes).decode('utf-8')
        >>> return {"pdf_data": pdf_base64}
        
        >>> # In email service:
        >>> packet_bytes = generate_onboarding_packet(...)
        >>> protected_bytes = protect_pdf_for_download(packet_bytes)
        >>> packet_base64 = base64.b64encode(protected_bytes).decode('utf-8')
        >>> send_email(..., attachments=[{"content_base64": packet_base64}])
    """
    return add_password_protection(
        pdf_bytes,
        password=password or DEFAULT_PASSWORD,
        allow_printing=True,
        allow_commenting=False
    )


def is_pdf_password_protected(pdf_bytes: bytes) -> bool:
    """
    Check if a PDF is already password protected.
    
    Useful for avoiding double-protection or debugging.
    
    Args:
        pdf_bytes: PDF bytes to check
    
    Returns:
        True if PDF is encrypted/password-protected, False otherwise
    
    Example:
        >>> if not is_pdf_password_protected(pdf_bytes):
        >>>     pdf_bytes = protect_pdf_for_download(pdf_bytes)
    """
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        return reader.is_encrypted
    except Exception as e:
        logger.warning(f"Could not check if PDF is encrypted: {e}")
        return False


# Convenience exports
__all__ = [
    'add_password_protection',
    'protect_pdf_for_download',
    'is_pdf_password_protected',
    'DEFAULT_PASSWORD'
]

