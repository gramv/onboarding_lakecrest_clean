"""
QR Code Generation Service for Job Applications

This service generates and manages QR codes for property job applications.
QR codes are stored permanently in the database and reused - NOT regenerated.
"""
import qrcode
import io
import base64
from typing import Dict, Any, Optional
import os
from PIL import Image
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class QRCodeService:
    """Service for generating and managing QR codes for job applications

    Features:
    - Generates QR codes once and stores them permanently
    - Retrieves existing QR codes from database
    - No regeneration - each property has ONE permanent QR code
    - Tracks access count and last accessed time
    """

    def __init__(self, supabase_client=None):
        # Use FRONTEND_URL env var with sensible default
        self.base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.supabase = supabase_client
    
    async def get_or_create_qr_code(self, property_id: str) -> Dict[str, Any]:
        """
        Get existing QR code from database or create new one if doesn't exist

        This is the main method to use - it ensures QR codes are permanent and not regenerated.

        Args:
            property_id: The property ID to get/create QR code for

        Returns:
            Dictionary containing QR code data and URL
        """
        try:
            # First, try to get existing QR code from database
            if self.supabase:
                existing_qr = await self._get_qr_from_database(property_id)
                if existing_qr:
                    logger.info(f"✅ Retrieved existing QR code for property {property_id}")
                    # Increment access count
                    await self._increment_access_count(existing_qr['id'])
                    return existing_qr

            # If not found, generate new QR code
            logger.info(f"🆕 Generating new QR code for property {property_id}")
            qr_data = self._generate_qr_image(property_id)

            # Store in database if Supabase client available
            if self.supabase:
                stored_qr = await self._store_qr_in_database(property_id, qr_data)
                if stored_qr:
                    return stored_qr

            # Return generated data even if not stored
            return qr_data

        except Exception as e:
            logger.error(f"❌ Error getting/creating QR code: {e}")
            # Fallback to generating without storing
            return self._generate_qr_image(property_id)

    async def _get_qr_from_database(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve existing QR code from database"""
        try:
            result = self.supabase.table('qr_codes').select('*').eq('property_id', property_id).execute()

            if result.data and len(result.data) > 0:
                qr_record = result.data[0]
                return {
                    "id": qr_record['id'],
                    "qr_code_url": qr_record['qr_code_url'],
                    "qr_code_data": qr_record['qr_code_data'],
                    "application_url": qr_record['application_url'],
                    "property_id": property_id,
                    "format": qr_record.get('format', 'PNG'),
                    "size": (qr_record.get('size_width'), qr_record.get('size_height')),
                    "access_count": qr_record.get('access_count', 0),
                    "generated_at": qr_record.get('generated_at'),
                    "from_database": True
                }
            return None
        except Exception as e:
            logger.error(f"Error retrieving QR code from database: {e}")
            return None

    async def _store_qr_in_database(self, property_id: str, qr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Store newly generated QR code in database"""
        try:
            qr_record = {
                "property_id": property_id,
                "qr_code_data": qr_data['qr_code_base64'],
                "qr_code_url": qr_data['qr_code_url'],
                "application_url": qr_data['application_url'],
                "format": qr_data['format'],
                "size_width": qr_data['size'][0],
                "size_height": qr_data['size'][1],
                "version": 1,
                "error_correction": 'L',
                "access_count": 0
            }

            result = self.supabase.table('qr_codes').insert(qr_record).execute()

            if result.data and len(result.data) > 0:
                logger.info(f"✅ Stored QR code in database for property {property_id}")
                stored = result.data[0]
                return {
                    "id": stored['id'],
                    "qr_code_url": stored['qr_code_url'],
                    "application_url": stored['application_url'],
                    "property_id": property_id,
                    "format": stored['format'],
                    "size": (stored['size_width'], stored['size_height']),
                    "from_database": True
                }
            return None
        except Exception as e:
            logger.error(f"Error storing QR code in database: {e}")
            return None

    async def _increment_access_count(self, qr_id: str):
        """Increment access count for QR code"""
        try:
            self.supabase.rpc('increment_qr_access_count', {'qr_id': qr_id}).execute()
        except Exception as e:
            logger.error(f"Error incrementing access count: {e}")

    def _generate_qr_image(self, property_id: str) -> Dict[str, Any]:
        """
        Generate QR code image (internal method)

        Args:
            property_id: The property ID to generate QR code for

        Returns:
            Dictionary containing QR code data and URL
        """
        # Create the application URL
        application_url = f"{self.base_url}/apply/{property_id}"

        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,  # Controls the size of the QR Code
            error_correction=qrcode.constants.ERROR_CORRECT_L,  # About 7% or less errors can be corrected
            box_size=10,  # Controls how many pixels each "box" of the QR code is
            border=4,  # Controls how many boxes thick the border should be
        )

        # Add data to QR code
        qr.add_data(application_url)
        qr.make(fit=True)

        # Create QR code image
        qr_image = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64 for storage/transmission
        img_buffer = io.BytesIO()
        qr_image.save(img_buffer, format='PNG')
        img_buffer.seek(0)

        # Create base64 encoded string
        qr_code_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        qr_code_data_url = f"data:image/png;base64,{qr_code_base64}"

        return {
            "qr_code_url": qr_code_data_url,
            "qr_code_base64": qr_code_base64,
            "application_url": application_url,
            "property_id": property_id,
            "format": "PNG",
            "size": qr_image.size,
            "from_database": False
        }

    # Legacy method for backward compatibility
    def generate_qr_code(self, property_id: str) -> Dict[str, Any]:
        """
        Legacy method - generates QR code without database storage
        Use get_or_create_qr_code() instead for permanent storage
        """
        logger.warning("⚠️  Using legacy generate_qr_code() - consider using get_or_create_qr_code()")
        return self._generate_qr_image(property_id)
    
    async def generate_printable_qr_code(self, property_id: str, property_name: str) -> Dict[str, Any]:
        """
        Generate a printable QR code with property name and instructions
        Uses existing QR code from database if available

        Args:
            property_id: The property ID to generate QR code for
            property_name: The name of the property

        Returns:
            Dictionary containing printable QR code data
        """
        # Get or create basic QR code first (from database if exists)
        qr_data = await self.get_or_create_qr_code(property_id)
        
        # Create a larger image with text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create QR code with larger size for printing
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=15,  # Larger for printing
            border=4,
        )
        
        application_url = f"{self.base_url}/apply/{property_id}"
        qr.add_data(application_url)
        qr.make(fit=True)
        
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert QR image to RGB mode to match canvas
        qr_image = qr_image.convert('RGB')
        
        # Create a larger canvas for the printable version
        canvas_width = 600
        canvas_height = 800
        canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
        
        # Calculate QR code position (centered horizontally, upper portion)
        qr_width, qr_height = qr_image.size
        qr_x = (canvas_width - qr_width) // 2
        qr_y = 100
        
        # Paste QR code onto canvas
        canvas.paste(qr_image, (qr_x, qr_y))
        
        # Add text using PIL's default font
        draw = ImageDraw.Draw(canvas)
        
        try:
            # Try to use a better font if available
            title_font = ImageFont.truetype("Arial", 36)
            subtitle_font = ImageFont.truetype("Arial", 24)
            url_font = ImageFont.truetype("Arial", 16)
        except:
            # Fallback to default font
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            url_font = ImageFont.load_default()
        
        # Add property name at the top
        title_text = property_name
        title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        draw.text((title_x, 30), title_text, fill='black', font=title_font)
        
        # Add "Scan to Apply" text below QR code
        scan_text = "Scan to Apply for Jobs"
        scan_bbox = draw.textbbox((0, 0), scan_text, font=subtitle_font)
        scan_width = scan_bbox[2] - scan_bbox[0]
        scan_x = (canvas_width - scan_width) // 2
        scan_y = qr_y + qr_height + 30
        draw.text((scan_x, scan_y), scan_text, fill='black', font=subtitle_font)
        
        # Add URL at the bottom
        url_text = application_url
        url_bbox = draw.textbbox((0, 0), url_text, font=url_font)
        url_width = url_bbox[2] - url_bbox[0]
        url_x = (canvas_width - url_width) // 2
        url_y = scan_y + 60
        draw.text((url_x, url_y), url_text, fill='gray', font=url_font)
        
        # Convert to base64
        img_buffer = io.BytesIO()
        canvas.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        printable_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        printable_data_url = f"data:image/png;base64,{printable_base64}"
        
        return {
            "qr_code_url": qr_data["qr_code_url"],  # Regular QR code
            "printable_qr_url": printable_data_url,  # Printable version with text
            "application_url": application_url,
            "property_id": property_id,
            "property_name": property_name,
            "format": "PNG",
            "canvas_size": (canvas_width, canvas_height)
        }


# Global service instance (will be initialized with Supabase client in main app)
qr_service = QRCodeService()


def initialize_qr_service(supabase_client):
    """Initialize QR service with Supabase client"""
    global qr_service
    qr_service = QRCodeService(supabase_client)
    logger.info("✅ QR Service initialized with database support")