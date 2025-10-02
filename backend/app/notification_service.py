"""
Comprehensive Notification Service (Task 6.2)
Handles multi-channel notifications with templates, preferences, and scheduling
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from dotenv import load_dotenv
# import aioredis  # Optional for Redis caching
import uuid
from collections import defaultdict
import re

load_dotenv(".env.test")

logger = logging.getLogger(__name__)

# Notification enums
class NotificationChannel(Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"

class NotificationPriority(Enum):
    URGENT = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3

class NotificationStatus(Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRY = "retry"
    DEAD_LETTER = "dead_letter"

class NotificationType(Enum):
    APPLICATION_RECEIVED = "application_received"
    APPLICATION_APPROVED = "application_approved"
    APPLICATION_REJECTED = "application_rejected"
    ONBOARDING_STARTED = "onboarding_started"
    ONBOARDING_REMINDER = "onboarding_reminder"
    ONBOARDING_COMPLETE = "onboarding_complete"
    I9_DEADLINE = "i9_deadline"
    W4_REMINDER = "w4_reminder"
    DOCUMENT_EXPIRING = "document_expiring"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    DEADLINE_ALERT = "deadline_alert"
    COMPLIANCE_WARNING = "compliance_warning"

@dataclass
class NotificationTemplate:
    """Template for notifications with variable substitution"""
    id: str
    name: str
    type: NotificationType
    channels: List[NotificationChannel]
    subject: str
    body: str
    html_body: Optional[str] = None
    variables: List[str] = field(default_factory=list)
    attachments: List[str] = field(default_factory=list)
    
    def render(self, variables: Dict[str, Any]) -> Tuple[str, str, Optional[str]]:
        """Render template with variables"""
        subject = self.subject
        body = self.body
        html_body = self.html_body
        
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
            if html_body:
                html_body = html_body.replace(placeholder, str(value))
        
        return subject, body, html_body

@dataclass
class NotificationPreferences:
    """User notification preferences"""
    user_id: str
    email: Dict[str, Any] = field(default_factory=lambda: {
        "enabled": True,
        "frequency": "immediate",
        "types": ["all"]
    })
    in_app: Dict[str, Any] = field(default_factory=lambda: {
        "enabled": True,
        "frequency": "immediate",
        "types": ["all"]
    })
    sms: Dict[str, Any] = field(default_factory=lambda: {
        "enabled": False,
        "frequency": "daily_digest",
        "types": ["urgent"]
    })
    push: Dict[str, Any] = field(default_factory=lambda: {
        "enabled": True,
        "frequency": "immediate",
        "types": ["deadline", "urgent"]
    })
    quiet_hours: Optional[Tuple[int, int]] = None  # (start_hour, end_hour) in 24h format
    timezone: str = "America/New_York"
    
    def should_send(self, channel: NotificationChannel, notif_type: str) -> bool:
        """Check if notification should be sent based on preferences"""
        channel_prefs = getattr(self, channel.value, {})
        
        if not channel_prefs.get("enabled", False):
            return False
        
        allowed_types = channel_prefs.get("types", [])
        if "all" in allowed_types or notif_type in allowed_types:
            return True
        
        return False

@dataclass
class Notification:
    """Individual notification instance"""
    id: str
    type: NotificationType
    channel: NotificationChannel
    recipient: str  # email, user_id, phone, etc.
    subject: str
    body: str
    html_body: Optional[str] = None
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.PENDING
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None

class NotificationService:
    """Comprehensive notification service with multi-channel support"""
    
    def __init__(self, supabase_service=None):
        self.supabase = supabase_service
        self.templates: Dict[str, NotificationTemplate] = {}
        self.queue: List[Notification] = []
        self.preferences_cache: Dict[str, NotificationPreferences] = {}
        self.websocket_manager = None  # Will be injected
        self.redis_client = None  # For queue management
        
        # Email configuration
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@hotel.com")
        
        # SMS configuration (mock for now)
        self.sms_api_key = os.getenv("SMS_API_KEY")
        
        # Push notification configuration (mock for now)
        self.push_api_key = os.getenv("PUSH_API_KEY")
        
        # Initialize default templates
        self._initialize_templates()
        
        # Start background workers
        self._start_workers()
    
    def _initialize_templates(self):
        """Initialize default notification templates"""
        self.templates = {
            "application_received": NotificationTemplate(
                id="application_received",
                name="Application Received",
                type=NotificationType.APPLICATION_RECEIVED,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                subject="Application Received for {position}",
                body="Dear {applicant_name},\n\nWe have received your application for the {position} position at {property}. Our team will review your application and get back to you soon.\n\nBest regards,\n{property} HR Team",
                html_body="<html><body><p>Dear {applicant_name},</p><p>We have received your application for the <strong>{position}</strong> position at {property}.</p><p>Our team will review your application and get back to you soon.</p><p>Best regards,<br>{property} HR Team</p></body></html>",
                variables=["applicant_name", "position", "property"]
            ),
            "onboarding_reminder": NotificationTemplate(
                id="onboarding_reminder",
                name="Onboarding Reminder",
                type=NotificationType.ONBOARDING_REMINDER,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.SMS],
                subject="Complete Your Onboarding - {deadline}",
                body="Hi {employee_name},\n\nYou have {forms_remaining} forms to complete by {deadline}. Please log in to complete your onboarding.\n\nLink: {onboarding_link}",
                variables=["employee_name", "forms_remaining", "deadline", "onboarding_link"]
            ),
            "i9_deadline": NotificationTemplate(
                id="i9_deadline",
                name="I-9 Deadline Alert",
                type=NotificationType.I9_DEADLINE,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
                subject="URGENT: I-9 Section 2 Due in {days_remaining} Days",
                body="Manager {manager_name},\n\nPlease complete I-9 Section 2 for {employee_name} within {days_remaining} days to comply with federal requirements.\n\nEmployee Start Date: {start_date}\nDeadline: {deadline}",
                variables=["manager_name", "employee_name", "days_remaining", "start_date", "deadline"]
            ),
            "system_announcement": NotificationTemplate(
                id="system_announcement",
                name="System Announcement",
                type=NotificationType.SYSTEM_ANNOUNCEMENT,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                subject="{announcement_title}",
                body="{announcement_body}",
                variables=["announcement_title", "announcement_body"]
            )
        }
    
    def _start_workers(self):
        """Start background workers for queue processing"""
        # These would be started as asyncio tasks in production
        pass
    
    async def send_notification(
        self,
        type: NotificationType,
        channel: NotificationChannel,
        recipient: str,
        variables: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        scheduled_at: Optional[datetime] = None
    ) -> Notification:
        """Send a notification through specified channel"""
        
        # Find template
        template = None
        for tmpl in self.templates.values():
            if tmpl.type == type:
                template = tmpl
                break
        
        if not template:
            raise ValueError(f"No template found for notification type: {type}")
        
        # Render template
        subject, body, html_body = template.render(variables or {})
        
        # Create notification
        notification = Notification(
            id=str(uuid.uuid4()),
            type=type,
            channel=channel,
            recipient=recipient,
            subject=subject,
            body=body,
            html_body=html_body,
            priority=priority,
            scheduled_at=scheduled_at,
            metadata=variables or {}
        )
        
        # Check user preferences
        prefs = await self.get_user_preferences(recipient)
        if prefs and not prefs.should_send(channel, type.value):
            notification.status = NotificationStatus.FAILED
            notification.error_message = "User preferences prevent sending"
            return notification
        
        # If scheduled, add to schedule queue
        if scheduled_at and scheduled_at > datetime.now():
            await self._schedule_notification(notification)
            notification.status = NotificationStatus.QUEUED
            return notification
        
        # Otherwise, send immediately or queue
        if priority == NotificationPriority.URGENT:
            await self._send_immediate(notification)
        else:
            await self._queue_notification(notification)
        
        return notification
    
    async def _send_immediate(self, notification: Notification):
        """Send notification immediately"""
        notification.status = NotificationStatus.SENDING
        
        try:
            if notification.channel == NotificationChannel.EMAIL:
                await self._send_email(notification)
            elif notification.channel == NotificationChannel.IN_APP:
                await self._send_in_app(notification)
            elif notification.channel == NotificationChannel.SMS:
                await self._send_sms(notification)
            elif notification.channel == NotificationChannel.PUSH:
                await self._send_push(notification)
            
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
        except Exception as e:
            logger.error(f"Failed to send notification {notification.id}: {e}")
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            await self._handle_failed_notification(notification)
    
    async def _queue_notification(self, notification: Notification):
        """Add notification to queue for processing"""
        notification.status = NotificationStatus.QUEUED
        
        # Priority queue insertion
        inserted = False
        for i, queued in enumerate(self.queue):
            if notification.priority.value < queued.priority.value:
                self.queue.insert(i, notification)
                inserted = True
                break
        
        if not inserted:
            self.queue.append(notification)
        
        # Store in database
        if self.supabase:
            await self._store_notification(notification)
    
    async def _schedule_notification(self, notification: Notification):
        """Schedule notification for future delivery"""
        # Store in database with scheduled_at timestamp
        if self.supabase:
            await self._store_notification(notification)
    
    async def _send_email(self, notification: Notification):
        """Send email notification"""
        if not self.smtp_user or not self.smtp_password:
            raise ValueError("Email configuration not set")
        
        msg = MIMEMultipart('alternative')
        msg['From'] = self.from_email
        msg['To'] = notification.recipient
        msg['Subject'] = notification.subject
        
        # Add plain text part
        text_part = MIMEText(notification.body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if available
        if notification.html_body:
            html_part = MIMEText(notification.html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
    
    async def _send_in_app(self, notification: Notification):
        """Send in-app notification"""
        # Store in database for user to retrieve
        if self.supabase:
            await self._store_notification(notification)
        
        # Send via WebSocket if user is online
        if self.websocket_manager:
            await self.websocket_manager.send_to_user(
                notification.recipient,
                {
                    "type": "notification",
                    "data": {
                        "id": notification.id,
                        "type": notification.type.value,
                        "subject": notification.subject,
                        "body": notification.body,
                        "priority": notification.priority.value,
                        "timestamp": datetime.now().isoformat()
                    }
                }
            )
    
    async def _send_sms(self, notification: Notification):
        """Send SMS notification (mock implementation)"""
        # In production, integrate with SMS service like Twilio
        logger.info(f"SMS to {notification.recipient}: {notification.body[:160]}")
        notification.delivered_at = datetime.now()
    
    async def _send_push(self, notification: Notification):
        """Send push notification (mock implementation)"""
        # In production, integrate with push service like FCM or APNS
        logger.info(f"Push to {notification.recipient}: {notification.subject}")
        notification.delivered_at = datetime.now()
    
    async def _handle_failed_notification(self, notification: Notification):
        """Handle failed notification with retry logic"""
        notification.retry_count += 1
        
        if notification.retry_count <= notification.max_retries:
            # Exponential backoff
            delay = 2 ** notification.retry_count
            notification.scheduled_at = datetime.now() + timedelta(seconds=delay)
            notification.status = NotificationStatus.RETRY
            await self._schedule_notification(notification)
        else:
            # Move to dead letter queue
            notification.status = NotificationStatus.DEAD_LETTER
            logger.error(f"Notification {notification.id} moved to dead letter queue after {notification.max_retries} retries")
    
    async def _store_notification(self, notification: Notification):
        """Store notification in database"""
        if not self.supabase:
            return
        
        try:
            data = {
                "id": notification.id,
                "type": notification.type.value,
                "channel": notification.channel.value,
                "recipient": notification.recipient,
                "subject": notification.subject,
                "body": notification.body,
                "html_body": notification.html_body,
                "priority": notification.priority.value,
                "status": notification.status.value,
                "scheduled_at": notification.scheduled_at.isoformat() if notification.scheduled_at else None,
                "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
                "delivered_at": notification.delivered_at.isoformat() if notification.delivered_at else None,
                "read_at": notification.read_at.isoformat() if notification.read_at else None,
                "retry_count": notification.retry_count,
                "metadata": json.dumps(notification.metadata),
                "error_message": notification.error_message,
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.client.table("notifications").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to store notification: {e}")
    
    async def get_user_preferences(self, user_id: str) -> Optional[NotificationPreferences]:
        """Get user notification preferences"""
        # Check cache first
        if user_id in self.preferences_cache:
            return self.preferences_cache[user_id]
        
        # Load from database
        if self.supabase:
            try:
                result = self.supabase.client.table("user_preferences").select("*").eq("user_id", user_id).execute()
                if result.data:
                    prefs_data = result.data[0]
                    prefs = NotificationPreferences(
                        user_id=user_id,
                        email=prefs_data.get("email_prefs", {}),
                        in_app=prefs_data.get("in_app_prefs", {}),
                        sms=prefs_data.get("sms_prefs", {}),
                        push=prefs_data.get("push_prefs", {}),
                        quiet_hours=tuple(prefs_data["quiet_hours"]) if prefs_data.get("quiet_hours") else None,
                        timezone=prefs_data.get("timezone", "America/New_York")
                    )
                    self.preferences_cache[user_id] = prefs
                    return prefs
            except Exception as e:
                logger.error(f"Failed to load preferences for user {user_id}: {e}")
        
        # Return default preferences
        return NotificationPreferences(user_id=user_id)
    
    async def update_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> bool:
        """Update user notification preferences"""
        try:
            # Update cache
            if user_id not in self.preferences_cache:
                self.preferences_cache[user_id] = NotificationPreferences(user_id=user_id)
            
            prefs = self.preferences_cache[user_id]
            for key, value in preferences.items():
                if hasattr(prefs, key):
                    setattr(prefs, key, value)
            
            # Update database
            if self.supabase:
                data = {
                    "user_id": user_id,
                    "email_prefs": prefs.email,
                    "in_app_prefs": prefs.in_app,
                    "sms_prefs": prefs.sms,
                    "push_prefs": prefs.push,
                    "quiet_hours": list(prefs.quiet_hours) if prefs.quiet_hours else None,
                    "timezone": prefs.timezone,
                    "updated_at": datetime.now().isoformat()
                }
                
                result = self.supabase.client.table("user_preferences").upsert(data).execute()
                return bool(result.data)
            
            return True
        except Exception as e:
            logger.error(f"Failed to update preferences for user {user_id}: {e}")
            return False
    
    async def broadcast_notification(
        self,
        scope: str,
        message: str,
        channels: List[NotificationChannel],
        filters: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Broadcast notification to multiple recipients"""
        recipients = []
        
        if scope == "property":
            # Get all users in property
            property_id = kwargs.get("property_id")
            if self.supabase and property_id:
                result = self.supabase.client.table("users").select("id, email").eq("property_id", property_id).execute()
                recipients = [(r["id"], r["email"]) for r in result.data]
        
        elif scope == "role":
            # Get all users with role
            role = kwargs.get("role")
            if self.supabase and role:
                result = self.supabase.client.table("users").select("id, email").eq("role", role).execute()
                recipients = [(r["id"], r["email"]) for r in result.data]
        
        elif scope == "filtered":
            # Apply custom filters
            if self.supabase and filters:
                query = self.supabase.client.table("users").select("id, email")
                for key, value in filters.items():
                    query = query.eq(key, value)
                result = query.execute()
                recipients = [(r["id"], r["email"]) for r in result.data]
        
        elif scope == "global":
            # Get all users (requires HR permission)
            if kwargs.get("requires_hr"):
                if self.supabase:
                    result = self.supabase.client.table("users").select("id, email").execute()
                    recipients = [(r["id"], r["email"]) for r in result.data]
        
        # Send notifications
        sent_count = 0
        for user_id, email in recipients:
            for channel in channels:
                try:
                    recipient = email if channel == NotificationChannel.EMAIL else user_id
                    await self.send_notification(
                        type=NotificationType.SYSTEM_ANNOUNCEMENT,
                        channel=channel,
                        recipient=recipient,
                        variables={"announcement_title": "Broadcast", "announcement_body": message},
                        priority=NotificationPriority.HIGH
                    )
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send broadcast to {recipient}: {e}")
        
        return {
            "recipients_count": len(recipients),
            "notifications_sent": sent_count,
            "channels": [c.value for c in channels]
        }
    
    async def schedule_deadline_reminders(
        self,
        deadline: datetime,
        reminders: List[int],  # Hours before deadline
        notification_type: NotificationType,
        recipient: str,
        variables: Dict[str, Any]
    ) -> List[Notification]:
        """Schedule multiple reminders before a deadline"""
        scheduled = []
        
        for hours_before in reminders:
            send_at = deadline - timedelta(hours=hours_before)
            if send_at > datetime.now():
                variables["days_remaining"] = hours_before // 24
                variables["hours_remaining"] = hours_before
                
                notification = await self.send_notification(
                    type=notification_type,
                    channel=NotificationChannel.EMAIL,
                    recipient=recipient,
                    variables=variables,
                    priority=NotificationPriority.HIGH if hours_before <= 24 else NotificationPriority.NORMAL,
                    scheduled_at=send_at
                )
                scheduled.append(notification)
        
        return scheduled
    
    async def mark_as_read(self, notification_ids: List[str], user_id: str) -> int:
        """Mark notifications as read"""
        count = 0
        
        if self.supabase:
            for notif_id in notification_ids:
                try:
                    result = self.supabase.client.table("notifications")\
                        .update({"read_at": datetime.now().isoformat()})\
                        .eq("id", notif_id)\
                        .eq("recipient", user_id)\
                        .execute()
                    if result.data:
                        count += 1
                except Exception as e:
                    logger.error(f"Failed to mark notification {notif_id} as read: {e}")
        
        return count
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for user"""
        if self.supabase:
            try:
                result = self.supabase.client.table("notifications")\
                    .select("id", count="exact")\
                    .eq("recipient", user_id)\
                    .eq("channel", "in_app")\
                    .is_("read_at", "null")\
                    .execute()
                return result.count or 0
            except Exception as e:
                logger.error(f"Failed to get unread count for user {user_id}: {e}")
        
        return 0
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        if self.supabase:
            try:
                query = self.supabase.client.table("notifications")\
                    .select("*")\
                    .eq("recipient", user_id)\
                    .eq("channel", "in_app")\
                    .order("created_at", desc=True)\
                    .limit(limit)\
                    .offset(offset)
                
                if unread_only:
                    query = query.is_("read_at", "null")
                
                result = query.execute()
                return result.data
            except Exception as e:
                logger.error(f"Failed to get notifications for user {user_id}: {e}")
        
        return []
    
    async def process_queue(self):
        """Process notification queue (run as background task)"""
        while True:
            if self.queue:
                notification = self.queue.pop(0)
                await self._send_immediate(notification)
            
            await asyncio.sleep(1)  # Check queue every second
    
    async def process_scheduled(self):
        """Process scheduled notifications (run as background task)"""
        while True:
            if self.supabase:
                try:
                    # Find notifications due to be sent
                    result = self.supabase.client.table("notifications")\
                        .select("*")\
                        .eq("status", NotificationStatus.QUEUED.value)\
                        .lte("scheduled_at", datetime.now().isoformat())\
                        .limit(10)\
                        .execute()
                    
                    for notif_data in result.data:
                        # Reconstruct notification object
                        notification = Notification(
                            id=notif_data["id"],
                            type=NotificationType(notif_data["type"]),
                            channel=NotificationChannel(notif_data["channel"]),
                            recipient=notif_data["recipient"],
                            subject=notif_data["subject"],
                            body=notif_data["body"],
                            html_body=notif_data.get("html_body"),
                            priority=NotificationPriority(notif_data["priority"]),
                            status=NotificationStatus(notif_data["status"]),
                            retry_count=notif_data.get("retry_count", 0),
                            metadata=json.loads(notif_data.get("metadata", "{}"))
                        )
                        
                        await self._send_immediate(notification)
                except Exception as e:
                    logger.error(f"Failed to process scheduled notifications: {e}")
            
            await asyncio.sleep(60)  # Check every minute

# Singleton instance
notification_service = NotificationService()