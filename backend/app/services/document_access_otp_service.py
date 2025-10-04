"""
Document Access OTP Service
Generates and verifies OTPs for secure document access
Uses existing email service infrastructure
"""

import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import logging

from app.email_service import email_service
from app.services.supabase_service_enhanced import supabase_service

logger = logging.getLogger(__name__)


class DocumentAccessOTPService:
    """Service for managing document access OTPs"""
    
    def __init__(self):
        self.otp_length = 6
        self.otp_expiry_minutes = 10  # OTP expires in 10 minutes
        self.max_attempts = 5  # Maximum verification attempts
        
    def generate_otp(self) -> str:
        """Generate a cryptographically secure 6-digit OTP"""
        # Generate 6-digit code (000000 to 999999)
        otp = ''.join([str(secrets.randbelow(10)) for _ in range(self.otp_length)])
        return otp
    
    def hash_otp(self, otp: str, manager_id: str) -> str:
        """Hash OTP with manager ID for secure storage"""
        # Combine OTP with manager ID for additional security
        combined = f"{otp}{manager_id}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    async def create_otp_session(
        self, 
        manager_id: str, 
        employee_id: str,
        manager_email: str
    ) -> Dict:
        """
        Create OTP session and send email
        
        Args:
            manager_id: Manager's user ID
            employee_id: Employee being reviewed
            manager_email: Manager's email address
            
        Returns:
            Dict with success status and message
        """
        try:
            # Generate OTP
            otp_code = self.generate_otp()
            otp_hash = self.hash_otp(otp_code, manager_id)
            
            # Calculate expiration
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.otp_expiry_minutes)
            
            # Store OTP in database
            otp_record = {
                "manager_id": manager_id,
                "employee_id": employee_id,
                "otp_hash": otp_hash,
                "expires_at": expires_at.isoformat(),
                "used": False,
                "attempts": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert into document_access_otps table
            result = supabase_service.client.table("document_access_otps").insert(otp_record).execute()
            
            if not result.data:
                logger.error(f"Failed to create OTP record for manager {manager_id}")
                return {
                    "success": False,
                    "error": "Failed to create OTP session"
                }
            
            otp_id = result.data[0]['id']
            
            # Get employee name for email
            employee = supabase_service.client.table("employees").select("personal_info").eq("id", employee_id).single().execute()
            employee_name = "Employee"
            if employee.data and employee.data.get('personal_info'):
                first_name = employee.data['personal_info'].get('firstName') or employee.data['personal_info'].get('first_name')
                last_name = employee.data['personal_info'].get('lastName') or employee.data['personal_info'].get('last_name')
                if first_name and last_name:
                    employee_name = f"{first_name} {last_name}"
            
            # Send OTP via email
            email_sent = await self.send_otp_email(
                email=manager_email,
                otp_code=otp_code,
                employee_name=employee_name,
                expires_minutes=self.otp_expiry_minutes
            )
            
            if not email_sent:
                # Delete OTP record if email failed
                supabase_service.client.table("document_access_otps").delete().eq("id", otp_id).execute()
                return {
                    "success": False,
                    "error": "Failed to send OTP email"
                }
            
            logger.info(f"OTP created and sent to {manager_email} for employee {employee_id}")
            
            return {
                "success": True,
                "otp_id": otp_id,
                "expires_at": expires_at.isoformat(),
                "message": f"Verification code sent to {manager_email}"
            }
            
        except Exception as e:
            logger.error(f"Error creating OTP session: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_otp(
        self,
        manager_id: str,
        employee_id: str,
        otp_code: str
    ) -> Dict:
        """
        Verify OTP code
        
        Args:
            manager_id: Manager's user ID
            employee_id: Employee being reviewed
            otp_code: 6-digit OTP code entered by manager
            
        Returns:
            Dict with success status and session token if valid
        """
        try:
            # Hash the provided OTP
            otp_hash = self.hash_otp(otp_code, manager_id)
            
            # Find matching OTP record
            result = supabase_service.client.table("document_access_otps")\
                .select("*")\
                .eq("manager_id", manager_id)\
                .eq("employee_id", employee_id)\
                .eq("otp_hash", otp_hash)\
                .eq("used", False)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not result.data:
                logger.warning(f"Invalid OTP attempt for manager {manager_id}")
                return {
                    "success": False,
                    "error": "Invalid verification code"
                }
            
            otp_record = result.data[0]
            
            # Check if expired
            expires_at = datetime.fromisoformat(otp_record['expires_at'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_at:
                logger.warning(f"Expired OTP attempt for manager {manager_id}")
                return {
                    "success": False,
                    "error": "Verification code has expired"
                }
            
            # Check attempts
            if otp_record['attempts'] >= self.max_attempts:
                logger.warning(f"Max attempts exceeded for OTP {otp_record['id']}")
                return {
                    "success": False,
                    "error": "Maximum verification attempts exceeded"
                }
            
            # Mark OTP as used
            supabase_service.client.table("document_access_otps")\
                .update({
                    "used": True,
                    "used_at": datetime.now(timezone.utc).isoformat()
                })\
                .eq("id", otp_record['id'])\
                .execute()
            
            # Create document access session
            session_token = secrets.token_urlsafe(32)
            session_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
            
            session_record = {
                "manager_id": manager_id,
                "employee_id": employee_id,
                "session_token": session_token,
                "expires_at": session_expires.isoformat(),
                "is_active": True,
                "verification_method": "email",
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "documents_viewed": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            session_result = supabase_service.client.table("document_access_sessions")\
                .insert(session_record)\
                .execute()
            
            if not session_result.data:
                logger.error(f"Failed to create document access session for manager {manager_id}")
                return {
                    "success": False,
                    "error": "Failed to create access session"
                }
            
            logger.info(f"OTP verified successfully for manager {manager_id}, session created")
            
            return {
                "success": True,
                "session_token": session_token,
                "expires_at": session_expires.isoformat(),
                "message": "Access granted for 30 minutes"
            }
            
        except Exception as e:
            logger.error(f"Error verifying OTP: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_otp_email(
        self,
        email: str,
        otp_code: str,
        employee_name: str,
        expires_minutes: int
    ) -> bool:
        """Send OTP via email using existing email service"""
        try:
            subject = "🔒 Document Access Verification Code"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Verify Your Identity</h1>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        You requested access to view documents for <strong>{employee_name}</strong>.
                    </p>
                    
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Enter this verification code to access the documents:
                    </p>
                    
                    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e0;">
                        <div style="font-size: 14px; color: #718096; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
                            Verification Code
                        </div>
                        <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #2d3748; font-family: 'Courier New', monospace;">
                            {otp_code}
                        </div>
                    </div>
                    
                    <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="color: #c53030; font-size: 14px; margin: 0; font-weight: 600;">
                            ⏱️ This code expires in {expires_minutes} minutes
                        </p>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                        For security reasons:
                    </p>
                    <ul style="color: #718096; font-size: 14px; line-height: 1.8;">
                        <li>This code can only be used once</li>
                        <li>You have {self.max_attempts} attempts to enter the correct code</li>
                        <li>Access will be granted for 30 minutes after verification</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                        If you didn't request this code, please ignore this email or contact your administrator.
                    </p>
                </div>
            </div>
            """
            
            text_content = f"""
            Document Access Verification Code
            ==================================
            
            You requested access to view documents for {employee_name}.
            
            Your verification code is: {otp_code}
            
            This code expires in {expires_minutes} minutes.
            
            For security reasons:
            - This code can only be used once
            - You have {self.max_attempts} attempts to enter the correct code
            - Access will be granted for 30 minutes after verification
            
            If you didn't request this code, please ignore this email.
            
            ---
            Hotel Onboarding System
            """
            
            # Use existing email service with retry logic
            success = await email_service.send_email_with_retry(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending OTP email: {e}")
            return False
    
    async def cleanup_expired_otps(self):
        """Clean up expired OTP records (run periodically)"""
        try:
            # Delete OTPs older than 24 hours
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            
            result = supabase_service.client.table("document_access_otps")\
                .delete()\
                .lt("expires_at", cutoff.isoformat())\
                .execute()
            
            if result.data:
                logger.info(f"Cleaned up {len(result.data)} expired OTP records")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired OTPs: {e}")


# Singleton instance
document_access_otp_service = DocumentAccessOTPService()

