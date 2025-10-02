"""
Email Notification Service
Handles sending email notifications for job application workflow
"""
import asyncio
import logging
import os
import re
import json
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import aiosmtplib
from dotenv import load_dotenv
from collections import deque
from enum import Enum

load_dotenv(".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailFailureReason(Enum):
    """Email failure reasons for better categorization"""
    CONNECTION_ERROR = "connection_error"
    AUTHENTICATION_ERROR = "authentication_error"
    INVALID_RECIPIENT = "invalid_recipient"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    CONTENT_ERROR = "content_error"
    SMTP_ERROR = "smtp_error"
    UNKNOWN = "unknown"

class EmailService:
    """Service for sending email notifications with retry logic and error recovery"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        self.from_email = os.getenv("FROM_EMAIL", "noreply@hotelonboarding.com")
        self.from_name = os.getenv("FROM_NAME", "Hotel Onboarding System")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Check if email is configured (skip default placeholder values)
        self.is_configured = bool(
            self.smtp_username and
            self.smtp_password and
            self.smtp_username != "your-email@gmail.com" and
            self.smtp_password != "your-app-specific-password"
        )

        # Check if we should force dev mode - in development, always log emails to console
        self.environment = os.getenv("ENVIRONMENT", "development")
        logger.info(f"Email Service Environment: {self.environment}")

        # Explicitly handle production mode
        self.force_dev_mode = False  # Default to False
        if self.environment in ["development", "test"]:
            self.force_dev_mode = True

        logger.info(f"Email Service Configuration:")
        logger.info(f"  - Environment: {self.environment}")
        logger.info(f"  - Force Dev Mode: {self.force_dev_mode}")
        logger.info(f"  - Is Configured: {self.is_configured}")
        logger.info(f"  - SMTP Host: {self.smtp_host}:{self.smtp_port}")
        
        # Retry configuration
        self.max_retries = int(os.getenv("EMAIL_MAX_RETRIES", "3"))
        self.initial_delay = float(os.getenv("EMAIL_INITIAL_DELAY", "1.0"))
        self.max_delay = float(os.getenv("EMAIL_MAX_DELAY", "60.0"))
        self.timeout = float(os.getenv("EMAIL_TIMEOUT", "30.0"))
        
        # Failed email queue (in-memory for now, should be persisted in production)
        self.failed_emails = deque(maxlen=1000)
        self.email_stats = {
            "sent": 0,
            "failed": 0,
            "retried": 0,
            "rate_limited": 0
        }
        
        if not self.is_configured or self.force_dev_mode:
            logger.warning("Email service in development mode. Emails will be logged to console.")
            if self.is_configured:
                logger.info("SMTP is configured but development mode is active. Set ENVIRONMENT=production to send real emails.")
    
    def _validate_email(self, email: str) -> bool:
        """Validate email address format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, email))
    
    def _categorize_error(self, error: Exception) -> EmailFailureReason:
        """Categorize the error type for better handling"""
        error_str = str(error).lower()
        
        if "connection" in error_str or "connect" in error_str:
            return EmailFailureReason.CONNECTION_ERROR
        elif "auth" in error_str or "password" in error_str or "credential" in error_str:
            return EmailFailureReason.AUTHENTICATION_ERROR
        elif "recipient" in error_str or "address" in error_str or "550" in error_str:
            return EmailFailureReason.INVALID_RECIPIENT
        elif "rate" in error_str or "limit" in error_str or "429" in error_str:
            return EmailFailureReason.RATE_LIMIT
        elif "timeout" in error_str or "timed out" in error_str:
            return EmailFailureReason.TIMEOUT
        elif "content" in error_str or "body" in error_str:
            return EmailFailureReason.CONTENT_ERROR
        elif "smtp" in error_str:
            return EmailFailureReason.SMTP_ERROR
        else:
            return EmailFailureReason.UNKNOWN
    
    async def _store_failed_email(self, to_email: str, subject: str, body: str, 
                                 error: str, reason: EmailFailureReason, 
                                 attempts: int = 1, attachments: Optional[list] = None):
        """Store failed email for later retry or manual intervention"""
        failed_email = {
            "id": f"{datetime.now().timestamp()}_{hash(to_email)}",
            "to_email": to_email,
            "subject": subject,
            "body": body[:1000] if body else "",  # Truncate body for storage
            "error": error,
            "reason": reason.value,
            "attempts": attempts,
            "timestamp": datetime.now().isoformat(),
            "has_attachments": bool(attachments)
        }
        
        self.failed_emails.append(failed_email)
        self.email_stats["failed"] += 1
        
        # Log critical failure
        logger.critical(f"Email permanently failed after {attempts} attempts to {to_email}: {error}")
        
        # In production, this should also persist to database
        # await self._persist_to_database(failed_email)
    
    async def send_email_with_retry(self, to_email: str, subject: str, html_content: str, 
                                   text_content: str = None, attachments: Optional[list] = None,
                                   max_retries: Optional[int] = None, 
                                   initial_delay: Optional[float] = None) -> bool:
        """
        Send email with automatic retry logic and exponential backoff.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (optional)
            attachments: List of attachments (optional)
            max_retries: Override default max retries (optional)
            initial_delay: Override default initial delay (optional)
        
        Returns:
            True if email sent successfully, False otherwise
        """
        max_retries = max_retries or self.max_retries
        initial_delay = initial_delay or self.initial_delay
        
        # Validate email address first
        if not self._validate_email(to_email):
            logger.error(f"Invalid email address format: {to_email}")
            await self._store_failed_email(
                to_email, subject, html_content or text_content or "",
                "Invalid email address format", EmailFailureReason.INVALID_RECIPIENT, 0
            )
            return False
        
        last_error = None
        last_reason = EmailFailureReason.UNKNOWN
        
        for attempt in range(max_retries):
            try:
                # Try to send the email
                result = await self.send_email(to_email, subject, html_content, text_content, attachments)
                
                if result:
                    if attempt > 0:
                        logger.info(f"Email sent successfully to {to_email} after {attempt + 1} attempts")
                        self.email_stats["retried"] += 1
                    self.email_stats["sent"] += 1
                    return True
                else:
                    # send_email returned False (not configured or dev mode already handled)
                    if attempt == max_retries - 1:
                        return False
                    
            except asyncio.TimeoutError as e:
                last_error = str(e)
                last_reason = EmailFailureReason.TIMEOUT
                logger.warning(f"Email timeout on attempt {attempt + 1}/{max_retries} to {to_email}")
                
            except aiosmtplib.SMTPAuthenticationError as e:
                last_error = str(e)
                last_reason = EmailFailureReason.AUTHENTICATION_ERROR
                logger.error(f"SMTP authentication failed: {e}")
                # Don't retry auth errors
                break
                
            except aiosmtplib.SMTPRecipientsRefused as e:
                last_error = str(e)
                last_reason = EmailFailureReason.INVALID_RECIPIENT
                logger.error(f"Recipient refused: {e}")
                # Don't retry invalid recipients
                break
                
            except aiosmtplib.SMTPConnectError as e:
                last_error = str(e)
                last_reason = EmailFailureReason.CONNECTION_ERROR
                logger.warning(f"SMTP connection error on attempt {attempt + 1}/{max_retries}: {e}")
                
            except Exception as e:
                last_error = str(e)
                last_reason = self._categorize_error(e)
                logger.warning(f"Email error on attempt {attempt + 1}/{max_retries}: {e}")
                
                # Don't retry certain errors
                if last_reason in [EmailFailureReason.INVALID_RECIPIENT, 
                                  EmailFailureReason.AUTHENTICATION_ERROR,
                                  EmailFailureReason.CONTENT_ERROR]:
                    break
            
            # If not the last attempt, wait with exponential backoff
            if attempt < max_retries - 1:
                delay = min(initial_delay * (2 ** attempt), self.max_delay)
                
                # Add jitter to prevent thundering herd
                import random
                delay = delay * (0.5 + random.random())
                
                logger.info(f"Retrying email to {to_email} in {delay:.1f} seconds...")
                await asyncio.sleep(delay)
                
                # Handle rate limiting with longer delay
                if last_reason == EmailFailureReason.RATE_LIMIT:
                    self.email_stats["rate_limited"] += 1
                    await asyncio.sleep(min(delay * 2, self.max_delay))
        
        # All attempts failed - store for manual retry
        await self._store_failed_email(
            to_email, subject, html_content or text_content or "",
            last_error or "Unknown error", last_reason, max_retries, attachments
        )
        
        return False
    
    async def send_email_with_cc(self, to_email: str, cc_emails: list, subject: str, html_content: str, text_content: str = None, attachments: Optional[list] = None) -> bool:
        """
        Send an email with CC recipients
        """
        # In development mode, always log emails to console
        if self.force_dev_mode:
            logger.info("=" * 80)
            logger.info(f"📧 [DEV MODE] Email Notification")
            logger.info(f"📧 To: {to_email}")
            if cc_emails:
                logger.info(f"📧 CC: {', '.join(cc_emails)}")
            logger.info(f"📧 Subject: {subject}")
            logger.info(f"📧 From: {self.from_name} <{self.from_email}>")
            logger.info("-" * 80)
            if attachments:
                logger.info(f"📎 Attachments: {[att.get('filename') for att in attachments]}")
            if text_content:
                logger.info("📧 Text Content:")
                logger.info(text_content[:500] + ("..." if len(text_content) > 500 else ""))
            else:
                logger.info("📧 HTML Content Preview:")
                # Strip HTML tags for preview
                clean_text = re.sub('<[^<]+?>', '', html_content)
                logger.info(clean_text[:500] + ("..." if len(clean_text) > 500 else ""))
            logger.info("=" * 80)
            return True  # Return success for development

        if not self.is_configured:
            logger.warning(f"Email service not configured. Cannot send email to {to_email}")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add CC recipients
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)

            # Add text content if provided
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Add attachments
            if attachments:
                for att in attachments:
                    try:
                        filename = att.get('filename') or 'document.pdf'
                        content_b64 = att.get('content_base64')
                        mime_type = att.get('mime_type', 'application/octet-stream')
                        if not content_b64:
                            continue
                        import base64
                        from email.mime.base import MIMEBase
                        from email.mime.image import MIMEImage
                        main_type = (mime_type or 'application/octet-stream').split('/')[0]
                        sub_type = (mime_type or 'application/octet-stream').split('/')[-1]
                        file_bytes = base64.b64decode(content_b64)
                        if main_type == 'image':
                            part = MIMEImage(file_bytes, _subtype=sub_type)
                        elif mime_type == 'application/pdf':
                            part = MIMEApplication(file_bytes, _subtype='pdf')
                        else:
                            part = MIMEApplication(file_bytes, _subtype=sub_type)
                        part.add_header('Content-Disposition', 'attachment', filename=filename)
                        message.attach(part)
                    except Exception as e:
                        logger.error(f"Failed to attach file {att}: {e}")

            # Build recipient list (To + CC)
            recipients = [to_email]
            if cc_emails:
                recipients.extend(cc_emails)

            # Send email
            # Port 465 uses implicit SSL/TLS, port 587 uses STARTTLS
            if self.smtp_port == 465:
                # Use SSL/TLS for port 465
                await aiosmtplib.send(
                    message,
                    recipients=recipients,  # Send to all recipients
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True,  # Use SSL/TLS directly
                    username=self.smtp_username,
                    password=self.smtp_password,
                )
            else:
                # Use STARTTLS for other ports (like 587)
                await aiosmtplib.send(
                    message,
                    recipients=recipients,  # Send to all recipients
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    start_tls=self.smtp_use_tls,  # Use STARTTLS
                    username=self.smtp_username,
                    password=self.smtp_password,
                )

            logger.info(f"Email sent successfully to {to_email} with CC to {cc_emails}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None, attachments: Optional[list] = None) -> bool:
        """
        Send an email WITHOUT retry logic (for backward compatibility).
        Use send_email_with_retry for automatic retries.
        
        attachments: list of dicts with keys: filename, content_base64, mime_type (e.g., 'application/pdf')
        """
        
        # In development mode, always log emails to console
        if self.force_dev_mode:
            logger.info("=" * 80)
            logger.info(f"📧 [DEV MODE] Email Notification")
            logger.info(f"📧 To: {to_email}")
            logger.info(f"📧 Subject: {subject}")
            logger.info(f"📧 From: {self.from_name} <{self.from_email}>")
            logger.info("-" * 80)
            if attachments:
                logger.info(f"📎 Attachments: {[att.get('filename') for att in attachments]}")
            if text_content:
                logger.info("📧 Text Content:")
                logger.info(text_content[:500] + ("..." if len(text_content) > 500 else ""))
            else:
                logger.info("📧 HTML Content Preview:")
                # Strip HTML tags for preview
                clean_text = re.sub('<[^<]+?>', '', html_content)
                logger.info(clean_text[:500] + ("..." if len(clean_text) > 500 else ""))
            logger.info("=" * 80)
            return True  # Return success for development
        
        if not self.is_configured:
            logger.warning(f"Email service not configured. Cannot send email to {to_email}")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text content if provided
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Add attachments
            if attachments:
                for att in attachments:
                    try:
                        filename = att.get('filename') or 'document.pdf'
                        content_b64 = att.get('content_base64')
                        mime_type = att.get('mime_type', 'application/octet-stream')
                        if not content_b64:
                            continue
                        import base64
                        from email.mime.image import MIMEImage
                        main_type = (mime_type or 'application/octet-stream').split('/')[0]
                        sub_type = (mime_type or 'application/octet-stream').split('/')[-1]
                        file_bytes = base64.b64decode(content_b64)
                        if main_type == 'image':
                            part = MIMEImage(file_bytes, _subtype=sub_type)
                        elif mime_type == 'application/pdf':
                            part = MIMEApplication(file_bytes, _subtype='pdf')
                        else:
                            part = MIMEApplication(file_bytes, _subtype=sub_type)
                        part.add_header('Content-Disposition', 'attachment', filename=filename)
                        message.attach(part)
                    except Exception as e:
                        logger.error(f"Failed to attach file {att}: {e}")
            
            # Send email
            # Port 465 uses implicit SSL/TLS, port 587 uses STARTTLS
            if self.smtp_port == 465:
                # Use SSL/TLS for port 465
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True,  # Use SSL/TLS directly
                    username=self.smtp_username,
                    password=self.smtp_password,
                )
            else:
                # Use STARTTLS for other ports (like 587)
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    start_tls=self.smtp_use_tls,  # Use STARTTLS
                    username=self.smtp_username,
                    password=self.smtp_password,
                )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _get_email_template(self, template_type: str, **kwargs) -> tuple[str, str]:
        """Get email template HTML and text content"""
        
        if template_type == "approval":
            return self._get_approval_template(**kwargs)
        elif template_type == "rejection":
            return self._get_rejection_template(**kwargs)
        elif template_type == "talent_pool":
            return self._get_talent_pool_template(**kwargs)
        else:
            raise ValueError(f"Unknown template type: {template_type}")
    
    def _get_approval_template(self, applicant_name: str, property_name: str, position: str, 
                             job_title: str, start_date: str, pay_rate: float, 
                             onboarding_link: str, manager_name: str, manager_email: str) -> tuple[str, str]:
        """Get approval email template"""
        
        subject = f"Congratulations! Job Offer from {property_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Congratulations, {applicant_name}!</h1>
                </div>
                <div class="content">
                    <p>We are pleased to offer you the position of <strong>{job_title}</strong> at <strong>{property_name}</strong>.</p>
                    
                    <h3>Job Details:</h3>
                    <ul>
                        <li><strong>Position:</strong> {position}</li>
                        <li><strong>Pay Rate:</strong> ${pay_rate:.2f}/hour</li>
                        <li><strong>Start Date:</strong> {start_date}</li>
                        <li><strong>Property:</strong> {property_name}</li>
                    </ul>
                    
                    <p>To accept this offer and complete your onboarding process, please click the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{onboarding_link}" class="button">Complete Onboarding</a>
                    </div>
                    
                    <p><strong>Important:</strong> This onboarding link will expire in 7 days. Please complete your onboarding as soon as possible.</p>
                    
                    <p>If you have any questions, please contact your hiring manager:</p>
                    <p><strong>{manager_name}</strong><br>
                    Email: <a href="mailto:{manager_email}">{manager_email}</a></p>
                    
                    <p>We look forward to welcoming you to our team!</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Congratulations, {applicant_name}!
        
        We are pleased to offer you the position of {job_title} at {property_name}.
        
        Job Details:
        - Position: {position}
        - Pay Rate: ${pay_rate:.2f}/hour
        - Start Date: {start_date}
        - Property: {property_name}
        
        To accept this offer and complete your onboarding process, please visit:
        {onboarding_link}
        
        Important: This onboarding link will expire in 7 days. Please complete your onboarding as soon as possible.
        
        If you have any questions, please contact your hiring manager:
        {manager_name}
        Email: {manager_email}
        
        We look forward to welcoming you to our team!
        
        ---
        This is an automated message from the Hotel Onboarding System.
        Please do not reply to this email.
        """
        
        return html_content, text_content
    
    def _get_rejection_template(self, applicant_name: str, property_name: str, position: str, 
                               manager_name: str, manager_email: str) -> tuple[str, str]:
        """Get rejection email template"""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Application Update</h1>
                </div>
                <div class="content">
                    <p>Dear {applicant_name},</p>
                    
                    <p>Thank you for your interest in the <strong>{position}</strong> position at <strong>{property_name}</strong>.</p>
                    
                    <p>After careful consideration, we have decided to move forward with another candidate for this particular role. This decision was not easy, as we received many qualified applications.</p>
                    
                    <p>We encourage you to apply for future openings that match your skills and experience. We will keep your application on file for consideration for other opportunities.</p>
                    
                    <p>If you have any questions, please feel free to contact:</p>
                    <p><strong>{manager_name}</strong><br>
                    Email: <a href="mailto:{manager_email}">{manager_email}</a></p>
                    
                    <p>Thank you again for your interest in joining our team.</p>
                    
                    <p>Best regards,<br>
                    The Hiring Team at {property_name}</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Dear {applicant_name},
        
        Thank you for your interest in the {position} position at {property_name}.
        
        After careful consideration, we have decided to move forward with another candidate for this particular role. This decision was not easy, as we received many qualified applications.
        
        We encourage you to apply for future openings that match your skills and experience. We will keep your application on file for consideration for other opportunities.
        
        If you have any questions, please feel free to contact:
        {manager_name}
        Email: {manager_email}
        
        Thank you again for your interest in joining our team.
        
        Best regards,
        The Hiring Team at {property_name}
        
        ---
        This is an automated message from the Hotel Onboarding System.
        Please do not reply to this email.
        """
        
        return html_content, text_content
    
    def _get_talent_pool_template(self, applicant_name: str, property_name: str, position: str, 
                                 manager_name: str, manager_email: str) -> tuple[str, str]:
        """Get talent pool notification template"""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>You're in Our Talent Pool!</h1>
                </div>
                <div class="content">
                    <p>Dear {applicant_name},</p>
                    
                    <p>Thank you for your interest in the <strong>{position}</strong> position at <strong>{property_name}</strong>.</p>
                    
                    <p>While we have selected another candidate for this specific role, we were impressed with your qualifications and would like to keep you in our talent pool for future opportunities.</p>
                    
                    <p><strong>What this means:</strong></p>
                    <ul>
                        <li>Your application will be kept on file for future openings</li>
                        <li>You'll be among the first to be contacted for similar positions</li>
                        <li>We may reach out when new opportunities become available</li>
                    </ul>
                    
                    <p>We encourage you to continue checking our job postings and applying for positions that interest you.</p>
                    
                    <p>If you have any questions, please feel free to contact:</p>
                    <p><strong>{manager_name}</strong><br>
                    Email: <a href="mailto:{manager_email}">{manager_email}</a></p>
                    
                    <p>Thank you for your continued interest in joining our team!</p>
                    
                    <p>Best regards,<br>
                    The Hiring Team at {property_name}</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Dear {applicant_name},
        
        Thank you for your interest in the {position} position at {property_name}.
        
        While we have selected another candidate for this specific role, we were impressed with your qualifications and would like to keep you in our talent pool for future opportunities.
        
        What this means:
        - Your application will be kept on file for future openings
        - You'll be among the first to be contacted for similar positions
        - We may reach out when new opportunities become available
        
        We encourage you to continue checking our job postings and applying for positions that interest you.
        
        If you have any questions, please feel free to contact:
        {manager_name}
        Email: {manager_email}
        
        Thank you for your continued interest in joining our team!
        
        Best regards,
        The Hiring Team at {property_name}
        
        ---
        This is an automated message from the Hotel Onboarding System.
        Please do not reply to this email.
        """
        
        return html_content, text_content
    
    async def send_approval_notification(self, applicant_email: str, applicant_name: str,
                                       property_name: str, position: str, job_title: str,
                                       start_date: str, pay_rate: float, onboarding_link: str,
                                       manager_name: str, manager_email: str) -> bool:
        """Send approval notification email with retry logic"""

        # Debug log the received onboarding link
        logger.info(f"EmailService received onboarding_link: {onboarding_link}")
        logger.info(f"Onboarding link length: {len(onboarding_link) if onboarding_link else 'None'}")

        html_content, text_content = self._get_approval_template(
            applicant_name=applicant_name,
            property_name=property_name,
            position=position,
            job_title=job_title,
            start_date=start_date,
            pay_rate=pay_rate,
            onboarding_link=onboarding_link,
            manager_name=manager_name,
            manager_email=manager_email
        )
        
        subject = f"Congratulations! Job Offer from {property_name}"
        
        # Use retry logic for critical approval notifications
        return await self.send_email_with_retry(applicant_email, subject, html_content, text_content)
    
    async def send_rejection_notification(self, to_email: str, applicant_name: str,
                                        property_name: str, position: str,
                                        rejection_reason: str,
                                        manager_name: str = "Hiring Manager", 
                                        manager_email: str = "hr@hotel.com") -> bool:
        """Send rejection notification email"""
        
        html_content, text_content = self._get_rejection_template(
            applicant_name=applicant_name,
            property_name=property_name,
            position=position,
            manager_name=manager_name,
            manager_email=manager_email
        )
        
        subject = f"Application Update - {property_name}"
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_talent_pool_notification(self, to_email: str, applicant_name: str,
                                          property_name: str, position: str,
                                          talent_pool_notes: Optional[str] = None,
                                          manager_name: str = "Hiring Manager",
                                          manager_email: str = "hr@hotel.com") -> bool:
        """Send talent pool notification email"""
        
        html_content, text_content = self._get_talent_pool_template(
            applicant_name=applicant_name,
            property_name=property_name,
            position=position,
            manager_name=manager_name,
            manager_email=manager_email
        )
        
        subject = f"You're in Our Talent Pool - {property_name}"
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_onboarding_welcome_email(self, to_email: str, employee_name: str,
                                          property_name: str, position: str,
                                          start_date: date, orientation_date: date,
                                          orientation_time: str, orientation_location: str,
                                          onboarding_url: str, expires_at: datetime,
                                          manager_name: str = "Your Manager") -> bool:
        """Send onboarding welcome email with secure link"""
        
        subject = f"Welcome to {property_name} - Complete Your Onboarding"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .highlight {{ background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to {property_name}!</h1>
                </div>
                <div class="content">
                    <p>Dear {employee_name},</p>
                    
                    <p>Congratulations on joining our team as a <strong>{position}</strong>! We're excited to have you aboard.</p>
                    
                    <div class="highlight">
                        <h3>📅 Important Dates</h3>
                        <p><strong>Start Date:</strong> {start_date.strftime('%B %d, %Y')}</p>
                        <p><strong>Orientation:</strong> {orientation_date.strftime('%B %d, %Y')} at {orientation_time}</p>
                        <p><strong>Location:</strong> {orientation_location}</p>
                    </div>
                    
                    <div class="highlight">
                        <h3>🚀 Next Step: Complete Your Onboarding</h3>
                        <p>To get started, please complete your onboarding process by clicking the button below. This secure link will guide you through all the necessary forms and information.</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{onboarding_url}" class="button">Start My Onboarding</a>
                    </div>
                    
                    <p><strong>What to expect:</strong></p>
                    <ul>
                        <li>📋 Personal information and emergency contacts</li>
                        <li>🆔 I-9 employment eligibility verification</li>
                        <li>💰 W-4 tax withholding information</li>
                        <li>🏥 Health insurance and benefits selection</li>
                        <li>📝 Company policies and acknowledgments</li>
                        <li>✅ Digital signatures and final review</li>
                    </ul>
                    
                    <div class="highlight">
                        <p><strong>⏰ Important:</strong> Please complete your onboarding by {expires_at.strftime('%B %d, %Y at %I:%M %p')}. The process takes approximately 45 minutes.</p>
                    </div>
                    
                    <p>If you have any questions during the onboarding process, please don't hesitate to contact your manager:</p>
                    <p><strong>{manager_name}</strong></p>
                    
                    <p>We look forward to working with you!</p>
                    
                    <p>Best regards,<br>
                    The {property_name} Team</p>
                </div>
                <div class="footer">
                    <p>🔒 This is a secure onboarding link. Please do not share it with others.</p>
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to {property_name}!
        
        Dear {employee_name},
        
        Congratulations on joining our team as a {position}! We're excited to have you aboard.
        
        Important Dates:
        - Start Date: {start_date.strftime('%B %d, %Y')}
        - Orientation: {orientation_date.strftime('%B %d, %Y')} at {orientation_time}
        - Location: {orientation_location}
        
        Next Step: Complete Your Onboarding
        To get started, please complete your onboarding process by visiting the secure link below:
        
        {onboarding_url}
        
        What to expect:
        - Personal information and emergency contacts
        - I-9 employment eligibility verification
        - W-4 tax withholding information
        - Health insurance and benefits selection
        - Company policies and acknowledgments
        - Digital signatures and final review
        
        Important: Please complete your onboarding by {expires_at.strftime('%B %d, %Y at %I:%M %p')}. The process takes approximately 45 minutes.
        
        If you have any questions during the onboarding process, please contact your manager:
        {manager_name}
        
        We look forward to working with you!
        
        Best regards,
        The {property_name} Team
        
        ---
        🔒 This is a secure onboarding link. Please do not share it with others.
        This is an automated message from the Hotel Onboarding System.
        """
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_form_update_notification(self, employee_email: str, employee_name: str,
                                          form_type: str, update_link: str, 
                                          reason: str = "Information update required") -> bool:
        """Send form update notification email"""
        
        subject = f"Action Required: Update Your {form_type} Information"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .alert {{ background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📝 Form Update Required</h1>
                </div>
                <div class="content">
                    <p>Dear {employee_name},</p>
                    
                    <p>We need you to update your <strong>{form_type}</strong> information in our system.</p>
                    
                    <div class="alert">
                        <p><strong>Reason:</strong> {reason}</p>
                    </div>
                    
                    <p>Please click the button below to access the secure form and make the necessary updates:</p>
                    
                    <div style="text-align: center;">
                        <a href="{update_link}" class="button">Update My Information</a>
                    </div>
                    
                    <p><strong>What you need to know:</strong></p>
                    <ul>
                        <li>🔒 This is a secure, time-limited link</li>
                        <li>📝 Your current information will be pre-filled</li>
                        <li>✅ Digital signature will be required</li>
                        <li>⏰ Please complete within 48 hours</li>
                    </ul>
                    
                    <p>If you have any questions about this update, please contact HR or your manager.</p>
                    
                    <p>Thank you for keeping your information current!</p>
                    
                    <p>Best regards,<br>
                    HR Department</p>
                </div>
                <div class="footer">
                    <p>🔒 This is a secure update link. Please do not share it with others.</p>
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Form Update Required
        
        Dear {employee_name},
        
        We need you to update your {form_type} information in our system.
        
        Reason: {reason}
        
        Please visit the secure link below to make the necessary updates:
        {update_link}
        
        What you need to know:
        - This is a secure, time-limited link
        - Your current information will be pre-filled
        - Digital signature will be required
        - Please complete within 48 hours
        
        If you have any questions about this update, please contact HR or your manager.
        
        Thank you for keeping your information current!
        
        Best regards,
        HR Department
        
        ---
        🔒 This is a secure update link. Please do not share it with others.
        This is an automated message from the Hotel Onboarding System.
        """
        
        return await self.send_email_with_retry(employee_email, subject, html_content, text_content)
    
    async def send_signed_document(self, to_email: str, employee_name: str, 
                                  document_type: str, pdf_base64: str, 
                                  filename: str, cc_emails: Optional[list] = None) -> bool:
        """Send signed document via email with PDF attachment
        
        Args:
            to_email: Recipient email address
            employee_name: Employee's name
            document_type: Type of document (e.g., "Direct Deposit", "W-4 Form", etc.)
            pdf_base64: Base64 encoded PDF content
            filename: Filename for the attachment
            cc_emails: Optional list of CC recipients (HR, manager, etc.)
        """
        
        subject = f"Signed Document: {document_type} - {employee_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .success-box {{ background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }}
                .document-info {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Document Successfully Signed</h1>
                </div>
                <div class="content">
                    <p>Dear {employee_name},</p>
                    
                    <div class="success-box">
                        <p><strong>Your {document_type} has been successfully signed and processed.</strong></p>
                    </div>
                    
                    <div class="document-info">
                        <h3>📄 Document Details:</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li>📝 <strong>Document Type:</strong> {document_type}</li>
                            <li>📅 <strong>Signed Date:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</li>
                            <li>📎 <strong>Attachment:</strong> {filename}</li>
                        </ul>
                    </div>
                    
                    <p><strong>Important Information:</strong></p>
                    <ul>
                        <li>Please keep this signed document for your records</li>
                        <li>The attached PDF contains your digital signature</li>
                        <li>This document is legally binding and has been securely stored</li>
                        <li>A copy has been sent to HR for processing</li>
                    </ul>
                    
                    <p>If you need to make any changes or have questions about this document, please contact HR or your manager.</p>
                    
                    <p>Thank you for completing your {document_type}!</p>
                    
                    <p>Best regards,<br>
                    HR Department</p>
                </div>
                <div class="footer">
                    <p>🔒 This email contains confidential information. Please do not forward.</p>
                    <p>This is an automated message from the Hotel Onboarding System.</p>
                    <p>Document ID: {datetime.now().strftime('%Y%m%d%H%M%S')}-{hash(filename) % 10000:04d}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Document Successfully Signed
        
        Dear {employee_name},
        
        Your {document_type} has been successfully signed and processed.
        
        Document Details:
        - Document Type: {document_type}
        - Signed Date: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
        - Attachment: {filename}
        
        Important Information:
        - Please keep this signed document for your records
        - The attached PDF contains your digital signature
        - This document is legally binding and has been securely stored
        - A copy has been sent to HR for processing
        
        If you need to make any changes or have questions about this document, please contact HR or your manager.
        
        Thank you for completing your {document_type}!
        
        Best regards,
        HR Department
        
        ---
        🔒 This email contains confidential information. Please do not forward.
        This is an automated message from the Hotel Onboarding System.
        Document ID: {datetime.now().strftime('%Y%m%d%H%M%S')}-{hash(filename) % 10000:04d}
        """
        
        # Prepare attachment
        attachments = [{
            "filename": filename,
            "content_base64": pdf_base64,
            "mime_type": "application/pdf"
        }]
        
        # Send to primary recipient with retry logic for important signed documents
        success = await self.send_email_with_retry(to_email, subject, html_content, text_content, attachments)
        
        # Send copies to CC recipients if provided
        if success and cc_emails:
            for cc_email in cc_emails:
                if cc_email and cc_email != to_email:  # Avoid duplicate sends
                    try:
                        # CC emails are less critical, use single retry
                        await self.send_email_with_retry(
                            cc_email, 
                            f"[Copy] {subject}", 
                            html_content, 
                            text_content, 
                            attachments,
                            max_retries=1
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send CC to {cc_email}: {e}")
        
        return success
    
    async def send_onboarding_reminder(self, to_email: str, employee_name: str, 
                                      days_remaining: int, onboarding_url: str) -> bool:
        """Send reminder email for expiring onboarding session"""
        
        subject = f"Reminder: Complete Your Onboarding - {days_remaining} Days Remaining"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .warning {{ background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Onboarding Reminder</h1>
                </div>
                <div class="content">
                    <p>Dear {employee_name},</p>
                    
                    <div class="warning">
                        <p><strong>Your onboarding session will expire in {days_remaining} day{'s' if days_remaining != 1 else ''}!</strong></p>
                        <p>Please complete your onboarding process as soon as possible to ensure a smooth start to your new position.</p>
                    </div>
                    
                    <p>Click the button below to continue where you left off:</p>
                    
                    <div style="text-align: center;">
                        <a href="{onboarding_url}" class="button">Continue Onboarding</a>
                    </div>
                    
                    <p><strong>What happens if the session expires?</strong></p>
                    <ul>
                        <li>You'll need to contact HR to restart the process</li>
                        <li>This may delay your start date</li>
                        <li>Some information may need to be re-entered</li>
                    </ul>
                    
                    <p>If you have any questions or need assistance, please contact HR immediately.</p>
                    
                    <p>Thank you,<br>
                    HR Department</p>
                </div>
                <div class="footer">
                    <p>🔒 This is a secure onboarding link. Please do not share it with others.</p>
                    <p>This is an automated reminder from the Hotel Onboarding System.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Onboarding Reminder
        
        Dear {employee_name},
        
        Your onboarding session will expire in {days_remaining} day{'s' if days_remaining != 1 else ''}!
        
        Please complete your onboarding process as soon as possible to ensure a smooth start to your new position.
        
        Continue your onboarding here:
        {onboarding_url}
        
        What happens if the session expires?
        - You'll need to contact HR to restart the process
        - This may delay your start date
        - Some information may need to be re-entered
        
        If you have any questions or need assistance, please contact HR immediately.
        
        Thank you,
        HR Department
        
        ---
        🔒 This is a secure onboarding link. Please do not share it with others.
        This is an automated reminder from the Hotel Onboarding System.
        """
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_manager_welcome_email(self, to_email: str, manager_name: str,
                                        property_name: str, temporary_password: str,
                                        login_url: str = None, language: str = 'en') -> bool:
        """Send welcome email to newly created manager with credentials"""
        
        if not login_url:
            login_url = f"{self.frontend_url}/manager"
        
        subject = f"Welcome to {property_name} Management Team" if language == 'en' else f"Bienvenido al Equipo de Gestión de {property_name}"
        
        if language == 'en':
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ padding: 20px; background-color: #f9fafb; }}
                    .button {{ display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
                    .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                    .credentials {{ background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
                    .important {{ background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to the Management Team!</h1>
                    </div>
                    <div class="content">
                        <p>Dear {manager_name},</p>
                        
                        <p>Your manager account has been created for <strong>{property_name}</strong>. You now have access to the Hotel Onboarding System to manage employee applications and onboarding.</p>
                        
                        <div class="credentials">
                            <h3>Your Login Credentials</h3>
                            <p><strong>Email:</strong> {to_email}</p>
                            <p><strong>Temporary Password:</strong> {temporary_password}</p>
                        </div>
                        
                        <div class="important">
                            <p><strong>⚠️ Important Security Notice:</strong></p>
                            <ul>
                                <li>Please change your password upon first login</li>
                                <li>Do not share your credentials with anyone</li>
                                <li>Use a strong, unique password</li>
                            </ul>
                        </div>
                        
                        <p>Click the button below to access the Manager Dashboard:</p>
                        
                        <div style="text-align: center;">
                            <a href="{login_url}" class="button">Access Manager Dashboard</a>
                        </div>
                        
                        <h3>Your Responsibilities Include:</h3>
                        <ul>
                            <li>📋 Review job applications for your property</li>
                            <li>✅ Approve or reject employee applications</li>
                            <li>📝 Complete I-9 Section 2 verification within 3 business days</li>
                            <li>👥 Monitor employee onboarding progress</li>
                            <li>📊 Access analytics and reports for your property</li>
                        </ul>
                        
                        <h3>Getting Started:</h3>
                        <ol>
                            <li>Log in using your credentials</li>
                            <li>Change your password</li>
                            <li>Review any pending applications</li>
                            <li>Complete I-9 verifications for new employees</li>
                        </ol>
                        
                        <p>If you have any questions or need assistance, please contact HR.</p>
                        
                        <p>Best regards,<br>
                        The HR Team</p>
                    </div>
                    <div class="footer">
                        <p>🔒 Keep your login credentials secure and confidential.</p>
                        <p>This is an automated message from the Hotel Onboarding System.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Welcome to the Management Team!
            
            Dear {manager_name},
            
            Your manager account has been created for {property_name}. You now have access to the Hotel Onboarding System to manage employee applications and onboarding.
            
            YOUR LOGIN CREDENTIALS
            Email: {to_email}
            Temporary Password: {temporary_password}
            
            ⚠️ IMPORTANT SECURITY NOTICE:
            - Please change your password upon first login
            - Do not share your credentials with anyone
            - Use a strong, unique password
            
            Access the Manager Dashboard at: {login_url}
            
            Your Responsibilities Include:
            - Review job applications for your property
            - Approve or reject employee applications
            - Complete I-9 Section 2 verification within 3 business days
            - Monitor employee onboarding progress
            - Access analytics and reports for your property
            
            Getting Started:
            1. Log in using your credentials
            2. Change your password
            3. Review any pending applications
            4. Complete I-9 verifications for new employees
            
            If you have any questions or need assistance, please contact HR.
            
            Best regards,
            The HR Team
            
            ---
            🔒 Keep your login credentials secure and confidential.
            This is an automated message from the Hotel Onboarding System.
            """
        else:  # Spanish version
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ padding: 20px; background-color: #f9fafb; }}
                    .button {{ display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
                    .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                    .credentials {{ background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
                    .important {{ background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Bienvenido al Equipo de Gestión!</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a {manager_name},</p>
                        
                        <p>Su cuenta de gerente ha sido creada para <strong>{property_name}</strong>. Ahora tiene acceso al Sistema de Incorporación del Hotel para gestionar las solicitudes y la incorporación de empleados.</p>
                        
                        <div class="credentials">
                            <h3>Sus Credenciales de Acceso</h3>
                            <p><strong>Correo Electrónico:</strong> {to_email}</p>
                            <p><strong>Contraseña Temporal:</strong> {temporary_password}</p>
                        </div>
                        
                        <div class="important">
                            <p><strong>⚠️ Aviso de Seguridad Importante:</strong></p>
                            <ul>
                                <li>Por favor, cambie su contraseña al iniciar sesión por primera vez</li>
                                <li>No comparta sus credenciales con nadie</li>
                                <li>Use una contraseña fuerte y única</li>
                            </ul>
                        </div>
                        
                        <p>Haga clic en el botón a continuación para acceder al Panel de Gerente:</p>
                        
                        <div style="text-align: center;">
                            <a href="{login_url}" class="button">Acceder al Panel de Gerente</a>
                        </div>
                        
                        <h3>Sus Responsabilidades Incluyen:</h3>
                        <ul>
                            <li>📋 Revisar solicitudes de empleo para su propiedad</li>
                            <li>✅ Aprobar o rechazar solicitudes de empleados</li>
                            <li>📝 Completar la Sección 2 del I-9 dentro de 3 días hábiles</li>
                            <li>👥 Monitorear el progreso de incorporación de empleados</li>
                            <li>📊 Acceder a análisis e informes de su propiedad</li>
                        </ul>
                        
                        <h3>Para Comenzar:</h3>
                        <ol>
                            <li>Inicie sesión con sus credenciales</li>
                            <li>Cambie su contraseña</li>
                            <li>Revise las solicitudes pendientes</li>
                            <li>Complete las verificaciones I-9 para nuevos empleados</li>
                        </ol>
                        
                        <p>Si tiene alguna pregunta o necesita ayuda, por favor contacte a Recursos Humanos.</p>
                        
                        <p>Saludos cordiales,<br>
                        El Equipo de Recursos Humanos</p>
                    </div>
                    <div class="footer">
                        <p>🔒 Mantenga sus credenciales de acceso seguras y confidenciales.</p>
                        <p>Este es un mensaje automatizado del Sistema de Incorporación del Hotel.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            ¡Bienvenido al Equipo de Gestión!
            
            Estimado/a {manager_name},
            
            Su cuenta de gerente ha sido creada para {property_name}. Ahora tiene acceso al Sistema de Incorporación del Hotel para gestionar las solicitudes y la incorporación de empleados.
            
            SUS CREDENCIALES DE ACCESO
            Correo Electrónico: {to_email}
            Contraseña Temporal: {temporary_password}
            
            ⚠️ AVISO DE SEGURIDAD IMPORTANTE:
            - Por favor, cambie su contraseña al iniciar sesión por primera vez
            - No comparta sus credenciales con nadie
            - Use una contraseña fuerte y única
            
            Acceda al Panel de Gerente en: {login_url}
            
            Sus Responsabilidades Incluyen:
            - Revisar solicitudes de empleo para su propiedad
            - Aprobar o rechazar solicitudes de empleados
            - Completar la Sección 2 del I-9 dentro de 3 días hábiles
            - Monitorear el progreso de incorporación de empleados
            - Acceder a análisis e informes de su propiedad
            
            Para Comenzar:
            1. Inicie sesión con sus credenciales
            2. Cambie su contraseña
            3. Revise las solicitudes pendientes
            4. Complete las verificaciones I-9 para nuevos empleados
            
            Si tiene alguna pregunta o necesita ayuda, por favor contacte a Recursos Humanos.
            
            Saludos cordiales,
            El Equipo de Recursos Humanos
            
            ---
            🔒 Mantenga sus credenciales de acceso seguras y confidenciales.
            Este es un mensaje automatizado del Sistema de Incorporación del Hotel.
            """
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_hr_daily_summary(self, to_email: str, hr_name: str, 
                                   pending_manager: int, pending_hr: int, 
                                   expiring_soon: int) -> bool:
        """Send daily summary email to HR"""
        
        subject = "Daily Onboarding Summary Report"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .stats-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }}
                .stat-card {{ background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }}
                .stat-number {{ font-size: 28px; font-weight: bold; color: #2563eb; }}
                .stat-label {{ color: #6b7280; font-size: 14px; margin-top: 5px; }}
                .footer {{ background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .alert {{ background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Daily Onboarding Summary</h1>
                    <p style="margin: 0; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                <div class="content">
                    <p>Good morning {hr_name},</p>
                    
                    <p>Here's your daily onboarding status summary:</p>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">{pending_manager}</div>
                            <div class="stat-label">Pending Manager Review</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{pending_hr}</div>
                            <div class="stat-label">Pending HR Approval</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{expiring_soon}</div>
                            <div class="stat-label">Expiring in 24 Hours</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{pending_manager + pending_hr}</div>
                            <div class="stat-label">Total Pending Actions</div>
                        </div>
                    </div>
                    
                    {f'''<div class="alert">
                        <p><strong>⚠️ Attention Required:</strong></p>
                        <p>{expiring_soon} onboarding session{'s are' if expiring_soon != 1 else ' is'} expiring within 24 hours. Please review and follow up with the employees.</p>
                    </div>''' if expiring_soon > 0 else ''}
                    
                    <p><strong>Recommended Actions:</strong></p>
                    <ul>
                        {f'<li>Review {pending_hr} onboarding submission{"s" if pending_hr != 1 else ""} awaiting HR approval</li>' if pending_hr > 0 else ''}
                        {f'<li>Follow up with managers on {pending_manager} pending review{"s" if pending_manager != 1 else ""}</li>' if pending_manager > 0 else ''}
                        {f'<li>Contact employees with expiring sessions immediately</li>' if expiring_soon > 0 else ''}
                        {f'<li>No urgent actions required today</li>' if pending_manager + pending_hr + expiring_soon == 0 else ''}
                    </ul>
                    
                    <p>Log in to the HR Dashboard to view details and take action.</p>
                    
                    <p>Have a productive day!</p>
                    
                    <p>Best regards,<br>
                    Hotel Onboarding System</p>
                </div>
                <div class="footer">
                    <p>This is an automated daily summary from the Hotel Onboarding System.</p>
                    <p>Report generated at {datetime.now().strftime('%I:%M %p %Z')}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Daily Onboarding Summary - {datetime.now().strftime('%B %d, %Y')}
        
        Good morning {hr_name},
        
        Here's your daily onboarding status summary:
        
        STATISTICS:
        - Pending Manager Review: {pending_manager}
        - Pending HR Approval: {pending_hr}
        - Expiring in 24 Hours: {expiring_soon}
        - Total Pending Actions: {pending_manager + pending_hr}
        
        {'⚠️ ATTENTION: ' + str(expiring_soon) + ' onboarding session(s) expiring within 24 hours!' if expiring_soon > 0 else ''}
        
        RECOMMENDED ACTIONS:
        {f'- Review {pending_hr} onboarding submission(s) awaiting HR approval' if pending_hr > 0 else ''}
        {f'- Follow up with managers on {pending_manager} pending review(s)' if pending_manager > 0 else ''}
        {f'- Contact employees with expiring sessions immediately' if expiring_soon > 0 else ''}
        {'- No urgent actions required today' if pending_manager + pending_hr + expiring_soon == 0 else ''}
        
        Log in to the HR Dashboard to view details and take action.
        
        Have a productive day!
        
        Best regards,
        Hotel Onboarding System
        
        ---
        This is an automated daily summary from the Hotel Onboarding System.
        Report generated at {datetime.now().strftime('%I:%M %p %Z')}
        """
        
        return await self.send_email_with_retry(to_email, subject, html_content, text_content)
    
    async def send_application_notification(self, application_data: Dict[str, Any], 
                                          property_name: str, recipients: List[Dict[str, Any]], 
                                          application_id: str) -> Dict[str, bool]:
        """Send new job application notification to property recipients"""
        
        subject = f"New Job Application - {property_name}"
        
        # Extract application details
        name = application_data.get('name', 'Unknown Applicant')
        position = application_data.get('position', 'Not Specified')
        department = application_data.get('department', 'Not Specified')
        phone = application_data.get('phone', 'Not Provided')
        email_address = application_data.get('email', 'Not Provided')
        availability_date = application_data.get('availability_date', 'Not Specified')
        
        # Create HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 600; }}
                .header p {{ margin: 5px 0 0; opacity: 0.95; font-size: 16px; }}
                .content {{ padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }}
                .application-card {{ background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }}
                .info-row {{ display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                .info-row:last-child {{ border-bottom: none; }}
                .label {{ font-weight: 600; color: #6b7280; }}
                .value {{ color: #111827; }}
                .button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                .button:hover {{ opacity: 0.9; }}
                .footer {{ background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; border-radius: 8px; }}
                .notification-badge {{ display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 New Job Application</h1>
                    <p>{property_name}</p>
                </div>
                <div class="content">
                    <p style="font-size: 18px; color: #374151;">You have received a new job application that requires your attention.</p>
                    
                    <div class="application-card">
                        <h3 style="margin-top: 0; color: #111827;">Applicant Information</h3>
                        <div class="info-row">
                            <span class="label">Name:</span>
                            <span class="value"><strong>{name}</strong></span>
                        </div>
                        <div class="info-row">
                            <span class="label">Position Applied:</span>
                            <span class="value">{position}<span class="notification-badge">NEW</span></span>
                        </div>
                        <div class="info-row">
                            <span class="label">Department:</span>
                            <span class="value">{department}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Phone:</span>
                            <span class="value">{phone}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span>
                            <span class="value"><a href="mailto:{email_address}" style="color: #667eea; text-decoration: none;">{email_address}</a></span>
                        </div>
                        <div class="info-row">
                            <span class="label">Available From:</span>
                            <span class="value">{availability_date}</span>
                        </div>
                    </div>
                    
                    <p style="font-size: 16px; color: #374151;">Please review this application and take appropriate action.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{self.frontend_url}/manager/applications?highlight={application_id}" class="button">
                            Review Applications →
                        </a>
                    </div>
                    
                    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            <strong>Quick Actions Available:</strong>
                        </p>
                        <ul style="margin: 10px 0; color: #3730a3; font-size: 14px;">
                            <li>Review applicant qualifications</li>
                            <li>Approve for onboarding</li>
                            <li>Move to talent pool</li>
                            <li>Schedule interview</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated notification from the Hotel Onboarding System.</p>
                    <p>Application ID: {application_id}</p>
                    <p style="margin-top: 10px;">
                        <a href="{self.frontend_url}/manager" style="color: #667eea; text-decoration: none;">Go to Manager Dashboard</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        New Job Application - {property_name}
        
        You have received a new job application that requires your attention.
        
        APPLICANT INFORMATION:
        ----------------------
        Name: {name}
        Position Applied: {position}
        Department: {department}
        Phone: {phone}
        Email: {email_address}
        Available From: {availability_date}
        
        Please review this application and take appropriate action.
        
        View Applications: {self.frontend_url}/manager/applications?highlight={application_id}
        
        Quick Actions Available:
        - Review applicant qualifications
        - Approve for onboarding
        - Move to talent pool
        - Schedule interview
        
        ---
        This is an automated notification from the Hotel Onboarding System.
        Application ID: {application_id}
        """
        
        # Send emails to all recipients with retry logic
        results = {}
        for recipient in recipients:
            recipient_email = recipient.get('email')
            if recipient_email:
                try:
                    # Use retry logic for application notifications
                    success = await self.send_email_with_retry(
                        recipient_email, 
                        subject, 
                        html_content, 
                        text_content,
                        max_retries=2  # Fewer retries for batch notifications
                    )
                    results[recipient_email] = success
                    if success:
                        logger.info(f"Application notification sent to {recipient_email}")
                    else:
                        logger.warning(f"Failed to send application notification to {recipient_email} after retries")
                except Exception as e:
                    logger.error(f"Error sending application notification to {recipient_email}: {e}")
                    results[recipient_email] = False
        
        # Log summary
        successful = sum(1 for s in results.values() if s)
        logger.info(f"Application notifications sent: {successful}/{len(recipients)} successful")
        
        return results
    
    async def send_password_reset_email(self, email: str, reset_token: str, user_name: str = None) -> bool:
        """Send password reset email with secure token"""
        try:
            # Create reset link
            reset_link = f"{self.frontend_url}/reset-password/confirm?token={reset_token}"
            
            subject = "Password Reset Request - Hotel Onboarding System"
            
            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Hello {user_name or 'there'},
                    </p>
                    
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password for the Hotel Onboarding System. 
                        If you made this request, please click the button below to reset your password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600;">
                            Reset Password
                        </a>
                    </div>
                    
                    <div style="background: #fef5e7; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0; border-radius: 5px;">
                        <p style="color: #8b6914; margin: 0; font-size: 14px;">
                            <strong>⚠️ Important:</strong><br>
                            • This link will expire in 1 hour<br>
                            • For security reasons, this link can only be used once<br>
                            • If you didn't request this reset, please ignore this email
                        </p>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
                        Or copy and paste this link into your browser:<br>
                        <code style="background: #f7fafc; padding: 5px; border-radius: 3px; word-break: break-all;">{reset_link}</code>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                        If you didn't request a password reset, you can safely ignore this email. 
                        Your password won't be changed unless you click the link above.
                    </p>
                </div>
            </div>
            """
            
            text_content = f"""
            Password Reset Request
            =====================
            
            Hello {user_name or 'there'},
            
            We received a request to reset your password for the Hotel Onboarding System.
            
            To reset your password, please visit:
            {reset_link}
            
            This link will expire in 1 hour and can only be used once.
            
            If you didn't request this password reset, please ignore this email.
            Your password won't be changed unless you click the link above.
            
            ---
            Hotel Onboarding System
            """
            
            # Password reset emails are critical - use full retry logic
            success = await self.send_email_with_retry(email, subject, html_content, text_content)
            
            if success:
                logger.info(f"Password reset email sent to {email}")
            else:
                logger.error(f"Failed to send password reset email to {email}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return False
    
    async def send_password_change_confirmation(self, email: str, user_name: str = None) -> bool:
        """Send confirmation email after password change"""
        try:
            subject = "Password Successfully Changed - Hotel Onboarding System"
            
            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Password Changed Successfully</h1>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Hello {user_name or 'there'},
                    </p>
                    
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Your password for the Hotel Onboarding System has been successfully changed.
                    </p>
                    
                    <div style="background: #f0fdf4; padding: 15px; border-left: 4px solid #48bb78; margin: 20px 0; border-radius: 5px;">
                        <p style="color: #22543d; margin: 0; font-size: 14px;">
                            <strong>✓ Password Updated</strong><br>
                            Changed on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
                        </p>
                    </div>
                    
                    <div style="background: #fef5e7; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0; border-radius: 5px;">
                        <p style="color: #8b6914; margin: 0; font-size: 14px;">
                            <strong>🔒 Security Alert:</strong><br>
                            If you did not make this change, please contact your system administrator immediately 
                            and consider the following actions:<br>
                            • Change your password again<br>
                            • Review your recent account activity<br>
                            • Enable additional security measures if available
                        </p>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
                        You can now log in with your new password at:<br>
                        <a href="{self.frontend_url}/login" style="color: #667eea; text-decoration: none;">
                            {self.frontend_url}/login
                        </a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                        This is an automated security notification from the Hotel Onboarding System.
                    </p>
                </div>
            </div>
            """
            
            text_content = f"""
            Password Changed Successfully
            =============================
            
            Hello {user_name or 'there'},
            
            Your password for the Hotel Onboarding System has been successfully changed.
            
            Changed on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
            
            SECURITY ALERT:
            If you did not make this change, please contact your system administrator immediately.
            
            You can now log in with your new password at:
            {self.frontend_url}/login
            
            ---
            Hotel Onboarding System
            """
            
            # Password reset emails are critical - use full retry logic
            success = await self.send_email_with_retry(email, subject, html_content, text_content)
            
            if success:
                logger.info(f"Password change confirmation sent to {email}")
            else:
                logger.error(f"Failed to send password change confirmation to {email}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending password change confirmation: {e}")
            return False

    # Email Queue Management Methods
    
    async def get_failed_emails(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get list of failed emails for review"""
        # Convert deque to list and return most recent failures
        failed_list = list(self.failed_emails)
        return failed_list[-limit:] if len(failed_list) > limit else failed_list
    
    async def retry_failed_email(self, email_id: str) -> bool:
        """Retry a specific failed email by ID"""
        for email in self.failed_emails:
            if email.get("id") == email_id:
                # Attempt to resend with retry logic
                return await self.send_email_with_retry(
                    email["to_email"],
                    email["subject"],
                    email["body"],
                    None,  # Text content not stored
                    None,  # Attachments not stored
                    max_retries=1  # Single retry attempt for manual retry
                )
        return False
    
    async def clear_failed_emails(self) -> int:
        """Clear the failed email queue and return count cleared"""
        count = len(self.failed_emails)
        self.failed_emails.clear()
        return count
    
    def get_email_stats(self) -> Dict[str, Any]:
        """Get email service statistics"""
        return {
            "sent": self.email_stats["sent"],
            "failed": self.email_stats["failed"],
            "retried": self.email_stats["retried"],
            "rate_limited": self.email_stats["rate_limited"],
            "failed_queue_size": len(self.failed_emails),
            "is_configured": self.is_configured,
            "environment": self.environment
        }
    
    async def retry_all_failed(self, batch_size: int = 10) -> Dict[str, int]:
        """Retry all failed emails in batches"""
        results = {"succeeded": 0, "failed": 0}
        failed_list = list(self.failed_emails)[:batch_size]
        
        for email in failed_list:
            success = await self.retry_failed_email(email.get("id"))
            if success:
                results["succeeded"] += 1
                # Remove from failed queue if successful
                if email in self.failed_emails:
                    self.failed_emails.remove(email)
            else:
                results["failed"] += 1
        
        return results

    async def send_signed_document_with_attachments_cc(
        self,
        to_email: str,
        cc_emails: list,
        employee_name: str,
        document_type: str,
        attachments: list
    ) -> bool:
        """
        Send signed document email with multiple attachments and CC support

        Args:
            to_email: Primary recipient email address (HR)
            cc_emails: List of CC recipients (employee, manager)
            employee_name: Name of the employee
            document_type: Type of document (e.g., "Direct Deposit Authorization")
            attachments: List of attachment dictionaries with filename, content_base64, mime_type
        """
        try:
            current_time = datetime.now().strftime("%B %d, %Y at %I:%M %p")

            # Create attachment list description
            attachment_descriptions = []
            for attachment in attachments:
                attachment_descriptions.append(f"• {attachment['filename']}")
            attachments_text = "\n".join(attachment_descriptions)

            # Include employee name in subject
            subject = f"Signed Document: {document_type} - {employee_name}"

            # Build recipient list for email body
            recipients_text = f"To: {to_email}"
            if cc_emails:
                recipients_text += f"\nCC: {', '.join(cc_emails)}"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document Successfully Signed</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Document Successfully Signed</h1>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #28a745; margin-top: 0; font-size: 22px;">Document Details</h2>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Document Type:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{document_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Employee:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{employee_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Signed Date:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{current_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-weight: bold; color: #555;">Attachments:</td>
                                <td style="padding: 12px 0; color: #333;">{len(attachments)} files</td>
                            </tr>
                        </table>

                        <div style="background: #e7f5ff; padding: 15px; border-radius: 5px; margin-top: 20px;">
                            <p style="margin: 0; font-weight: bold; color: #0c5395;">📎 Attached Files:</p>
                            <div style="margin-top: 10px; color: #333; white-space: pre-line;">{attachments_text}</div>
                        </div>

                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0;">
                                <strong>Recipients:</strong><br>
                                {recipients_text}
                            </p>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #6c757d; font-size: 12px;">
                            This document contains sensitive employee information.<br>
                            Please handle according to your organization's data security policies.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            text_content = f"""
            Document Successfully Signed

            Document Type: {document_type}
            Employee: {employee_name}
            Signed Date: {current_time}

            {recipients_text}

            Attached Documents:
            {attachments_text}

            This document contains sensitive employee information.
            Please handle according to your organization's data security policies.
            """

            # Send a single email with CC
            return await self.send_email_with_cc(
                to_email,
                cc_emails,
                subject,
                html_content,
                text_content,
                attachments=attachments
            )

        except Exception as e:
            logger.error(f"Failed to send signed document with CC: {e}")
            return False

    async def send_signed_document_with_attachments(
        self,
        to_email: str,
        employee_name: str,
        document_type: str,
        attachments: list
    ) -> bool:
        """
        Send signed document email with multiple attachments (for Direct Deposit)

        Args:
            to_email: Recipient email address
            employee_name: Name of the employee
            document_type: Type of document (e.g., "Direct Deposit Authorization")
            attachments: List of attachment dictionaries with filename, content_base64, mime_type
        """
        try:
            current_time = datetime.now().strftime("%B %d, %Y at %I:%M %p")

            # Create attachment list description
            attachment_descriptions = []
            for attachment in attachments:
                attachment_descriptions.append(f"• {attachment['filename']}")
            attachments_text = "\n".join(attachment_descriptions)

            subject = f"Signed Document: {document_type} - {employee_name}"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document Successfully Signed</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Document Successfully Signed</h1>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #28a745; margin-top: 0; font-size: 22px;">Document Details</h2>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Document Type:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{document_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Employee:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{employee_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Signed Date:</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">{current_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-weight: bold; color: #555;">Attachments:</td>
                                <td style="padding: 12px 0; color: #333;">{len(attachments)} files</td>
                            </tr>
                        </table>

                        <div style="background: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="color: #28a745; margin-top: 0; font-size: 18px;">📎 Attached Documents:</h3>
                            <div style="font-family: monospace; font-size: 14px; color: #555; white-space: pre-line;">{attachments_text}</div>
                        </div>

                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> This document contains sensitive financial information. Please handle according to your organization's data security policies.</p>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 12px; margin: 0;">
                            This is an automated message from the Onboarding System.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            text_content = f"""
            Document Successfully Signed

            Document Type: {document_type}
            Employee: {employee_name}
            Signed Date: {current_time}

            Attached Documents:
            {attachments_text}

            Important: This document contains sensitive financial information.
            Please handle according to your organization's data security policies.

            This is an automated message from the Onboarding System.
            """

            return await self.send_email(
                to_email,
                subject,
                html_content,
                text_content,
                attachments=attachments
            )

        except Exception as e:
            logger.error(f"Failed to send signed document with attachments: {e}")
            return False

# Create global email service instance
email_service = EmailService()