"""
Background scheduler for automated tasks like reminder emails
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class OnboardingScheduler:
    def __init__(self, supabase_service, email_service):
        self.supabase_service = supabase_service
        self.email_service = email_service
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        
    async def check_expiring_onboarding_sessions(self):
        """Check for onboarding sessions expiring in the next 48 hours and send reminders"""
        try:
            logger.info("Checking for expiring onboarding sessions...")
            
            # Get sessions expiring in next 48 hours
            sessions = await self.supabase_service.get_expiring_onboarding_sessions(hours=48)
            
            for session in sessions:
                # Calculate days remaining
                expires_at = datetime.fromisoformat(session.get('expires_at').replace('Z', '+00:00'))
                days_remaining = (expires_at - datetime.now()).days
                
                # Check if reminder already sent today
                last_reminder = session.get('last_reminder_sent')
                if last_reminder:
                    last_reminder_date = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                    if (datetime.now() - last_reminder_date).total_seconds() < 86400:  # 24 hours
                        continue
                
                # Send reminder email
                employee_email = session.get('employee_email')
                employee_name = session.get('employee_name', 'Employee')
                
                if employee_email:
                    await self.email_service.send_onboarding_reminder(
                        to_email=employee_email,
                        employee_name=employee_name,
                        days_remaining=days_remaining,
                        onboarding_url=f"{self.email_service.frontend_url}/onboard?token={session.get('token')}"
                    )
                    
                    # Update last reminder sent
                    await self.supabase_service.update_last_reminder_sent(session.get('id'))
                    
                    logger.info(f"Reminder sent to {employee_email} - {days_remaining} days remaining")
                    
        except Exception as e:
            logger.error(f"Error checking expiring sessions: {str(e)}")
    
    async def cleanup_expired_sessions(self):
        """Clean up onboarding sessions that have expired"""
        try:
            logger.info("Cleaning up expired onboarding sessions...")
            
            # Get expired sessions
            expired_count = await self.supabase_service.cleanup_expired_sessions()
            
            if expired_count > 0:
                logger.info(f"Cleaned up {expired_count} expired onboarding sessions")
                
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {str(e)}")
    
    async def send_daily_summary_to_hr(self):
        """Send daily summary of pending onboarding to HR"""
        try:
            logger.info("Preparing daily HR summary...")
            
            # Get HR users
            hr_users = await self.supabase_service.get_hr_users()
            
            # Get pending stats
            stats = await self.supabase_service.get_onboarding_stats()
            
            if stats['pending_manager_review'] > 0 or stats['pending_hr_review'] > 0:
                for hr_user in hr_users:
                    await self.email_service.send_hr_daily_summary(
                        to_email=hr_user.get('email'),
                        hr_name=hr_user.get('name', 'HR Manager'),
                        pending_manager=stats['pending_manager_review'],
                        pending_hr=stats['pending_hr_review'],
                        expiring_soon=stats['expiring_in_24h']
                    )
                    
                logger.info(f"Daily summary sent to {len(hr_users)} HR users")
                
        except Exception as e:
            logger.error(f"Error sending HR daily summary: {str(e)}")
    
    def start(self):
        """Start the scheduler with configured jobs"""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
            
        # Schedule reminder checks - every 6 hours
        self.scheduler.add_job(
            self.check_expiring_onboarding_sessions,
            trigger=IntervalTrigger(hours=6),
            id='expiring_sessions_check',
            name='Check expiring onboarding sessions',
            replace_existing=True
        )
        
        # Schedule cleanup - daily at 2 AM
        self.scheduler.add_job(
            self.cleanup_expired_sessions,
            trigger='cron',
            hour=2,
            minute=0,
            id='cleanup_expired',
            name='Cleanup expired sessions',
            replace_existing=True
        )
        
        # Schedule HR summary - daily at 9 AM
        self.scheduler.add_job(
            self.send_daily_summary_to_hr,
            trigger='cron',
            hour=9,
            minute=0,
            id='hr_daily_summary',
            name='Send daily HR summary',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("Onboarding scheduler started with 3 jobs")
        
        # Run initial check
        self.scheduler.add_job(
            self.check_expiring_onboarding_sessions,
            trigger='date',
            run_date=datetime.now() + timedelta(seconds=10),
            id='initial_check',
            name='Initial expiring sessions check'
        )
    
    def stop(self):
        """Stop the scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Onboarding scheduler stopped")