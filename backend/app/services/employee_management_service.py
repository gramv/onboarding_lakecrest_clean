"""
Enhanced Employee Management Service
Provides comprehensive employee lifecycle management, performance tracking, and communication tools
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from enum import Enum
import uuid
import json

from ..models_enhanced import Employee, OnboardingStatus, UserRole
from ..supabase_service_enhanced import EnhancedSupabaseService

class EmployeeLifecycleStage(str, Enum):
    """Employee lifecycle stages"""
    ONBOARDING = "onboarding"
    PROBATION = "probation"
    ACTIVE = "active"
    PERFORMANCE_REVIEW = "performance_review"
    DEVELOPMENT = "development"
    RETENTION = "retention"
    OFFBOARDING = "offboarding"

class PerformanceRating(str, Enum):
    """Performance rating scale"""
    EXCEEDS_EXPECTATIONS = "exceeds_expectations"
    MEETS_EXPECTATIONS = "meets_expectations"
    BELOW_EXPECTATIONS = "below_expectations"
    NEEDS_IMPROVEMENT = "needs_improvement"

class GoalStatus(str, Enum):
    """Goal status tracking"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

@dataclass
class EmployeeProfile:
    """Comprehensive employee profile"""
    id: str
    employee_number: str
    personal_info: Dict[str, Any]
    employment_info: Dict[str, Any]
    onboarding_progress: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    lifecycle_stage: EmployeeLifecycleStage
    goals: List[Dict[str, Any]]
    reviews: List[Dict[str, Any]]
    communications: List[Dict[str, Any]]
    milestones: List[Dict[str, Any]]

@dataclass
class PerformanceGoal:
    """Employee performance goal"""
    id: str
    employee_id: str
    title: str
    description: str
    category: str
    target_value: Optional[float]
    current_value: Optional[float]
    unit: Optional[str]
    status: GoalStatus
    priority: str
    due_date: date
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]

@dataclass
class PerformanceReview:
    """Employee performance review"""
    id: str
    employee_id: str
    reviewer_id: str
    review_period_start: date
    review_period_end: date
    overall_rating: PerformanceRating
    goals_achievement: Dict[str, Any]
    strengths: List[str]
    areas_for_improvement: List[str]
    development_plan: Dict[str, Any]
    comments: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

class EmployeeManagementService:
    """Enhanced employee management service"""
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        self.supabase = supabase_service
    
    # =====================================
    # EMPLOYEE LIFECYCLE MANAGEMENT
    # =====================================
    
    async def get_employee_profile(self, employee_id: str) -> Optional[EmployeeProfile]:
        """Get comprehensive employee profile"""
        try:
            # Get basic employee data
            employee_data = await self.supabase.get_employee_by_id(employee_id)
            if not employee_data:
                return None
            
            # Get onboarding progress
            onboarding_progress = await self._get_onboarding_progress(employee_id)
            
            # Get performance metrics
            performance_metrics = await self._get_performance_metrics(employee_id)
            
            # Get goals
            goals = await self.get_employee_goals(employee_id)
            
            # Get reviews
            reviews = await self.get_employee_reviews(employee_id)
            
            # Get communications
            communications = await self._get_employee_communications(employee_id)
            
            # Get milestones
            milestones = await self._get_employee_milestones(employee_id)
            
            # Determine lifecycle stage
            lifecycle_stage = await self._determine_lifecycle_stage(employee_data)
            
            return EmployeeProfile(
                id=employee_data['id'],
                employee_number=employee_data.get('employee_number', ''),
                personal_info=employee_data.get('personal_info', {}),
                employment_info={
                    'department': employee_data.get('department'),
                    'position': employee_data.get('position'),
                    'hire_date': employee_data.get('hire_date'),
                    'employment_status': employee_data.get('employment_status'),
                    'pay_rate': employee_data.get('pay_rate'),
                    'employment_type': employee_data.get('employment_type')
                },
                onboarding_progress=onboarding_progress,
                performance_metrics=performance_metrics,
                lifecycle_stage=lifecycle_stage,
                goals=goals,
                reviews=reviews,
                communications=communications,
                milestones=milestones
            )
            
        except Exception as e:
            print(f"Error getting employee profile: {str(e)}")
            return None
    
    async def update_employee_lifecycle_stage(self, employee_id: str, stage: EmployeeLifecycleStage, notes: str = "") -> bool:
        """Update employee lifecycle stage"""
        try:
            milestone = {
                'id': str(uuid.uuid4()),
                'employee_id': employee_id,
                'type': 'lifecycle_stage_change',
                'title': f'Moved to {stage.value.replace("_", " ").title()}',
                'description': notes,
                'stage': stage.value,
                'achieved_at': datetime.utcnow().isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store milestone
            await self._store_employee_milestone(milestone)
            
            # Update employee record
            await self.supabase.update_employee(employee_id, {
                'lifecycle_stage': stage.value,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            return True
            
        except Exception as e:
            print(f"Error updating lifecycle stage: {str(e)}")
            return False
    
    async def _get_onboarding_progress(self, employee_id: str) -> Dict[str, Any]:
        """Get detailed onboarding progress"""
        try:
            # Get onboarding session data
            query = """
                SELECT * FROM onboarding_sessions 
                WHERE employee_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            
            if not result:
                return {
                    'status': 'not_started',
                    'progress_percentage': 0,
                    'current_step': 'welcome',
                    'steps_completed': [],
                    'milestones': []
                }
            
            session = result[0]
            steps_completed = session.get('steps_completed', [])
            total_steps = 18  # Total onboarding steps
            progress_percentage = (len(steps_completed) / total_steps) * 100
            
            return {
                'status': session.get('status', 'not_started'),
                'progress_percentage': round(progress_percentage, 1),
                'current_step': session.get('current_step', 'welcome'),
                'steps_completed': steps_completed,
                'employee_completed_at': session.get('employee_completed_at'),
                'manager_review_started_at': session.get('manager_review_started_at'),
                'approved_at': session.get('approved_at'),
                'milestones': await self._get_onboarding_milestones(employee_id)
            }
            
        except Exception as e:
            print(f"Error getting onboarding progress: {str(e)}")
            return {}
    
    async def _get_onboarding_milestones(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get onboarding milestones"""
        try:
            query = """
                SELECT * FROM employee_milestones 
                WHERE employee_id = %s AND type = 'onboarding'
                ORDER BY achieved_at DESC
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            return result or []
            
        except Exception as e:
            print(f"Error getting onboarding milestones: {str(e)}")
            return []
    
    # =====================================
    # PERFORMANCE TRACKING
    # =====================================
    
    async def _get_performance_metrics(self, employee_id: str) -> Dict[str, Any]:
        """Get employee performance metrics"""
        try:
            # Get latest performance review
            latest_review = await self._get_latest_performance_review(employee_id)
            
            # Get goal completion rate
            goals_stats = await self._get_goals_statistics(employee_id)
            
            # Calculate performance score
            performance_score = await self._calculate_performance_score(employee_id)
            
            return {
                'latest_review': latest_review,
                'goals_statistics': goals_stats,
                'performance_score': performance_score,
                'review_due': await self._is_review_due(employee_id),
                'development_areas': await self._get_development_areas(employee_id)
            }
            
        except Exception as e:
            print(f"Error getting performance metrics: {str(e)}")
            return {}
    
    async def create_performance_goal(self, goal_data: Dict[str, Any]) -> Optional[str]:
        """Create a new performance goal"""
        try:
            goal_id = str(uuid.uuid4())
            goal = {
                'id': goal_id,
                'employee_id': goal_data['employee_id'],
                'title': goal_data['title'],
                'description': goal_data['description'],
                'category': goal_data.get('category', 'general'),
                'target_value': goal_data.get('target_value'),
                'current_value': goal_data.get('current_value', 0),
                'unit': goal_data.get('unit'),
                'status': GoalStatus.NOT_STARTED.value,
                'priority': goal_data.get('priority', 'medium'),
                'due_date': goal_data['due_date'],
                'created_by': goal_data['created_by'],
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Store goal
            await self._store_performance_goal(goal)
            
            # Create milestone
            milestone = {
                'id': str(uuid.uuid4()),
                'employee_id': goal_data['employee_id'],
                'type': 'goal_created',
                'title': f'New Goal: {goal_data["title"]}',
                'description': goal_data['description'],
                'achieved_at': datetime.utcnow().isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            await self._store_employee_milestone(milestone)
            
            return goal_id
            
        except Exception as e:
            print(f"Error creating performance goal: {str(e)}")
            return None
    
    async def update_goal_progress(self, goal_id: str, current_value: float, notes: str = "") -> bool:
        """Update goal progress"""
        try:
            # Get current goal
            goal = await self._get_goal_by_id(goal_id)
            if not goal:
                return False
            
            # Calculate progress percentage
            target_value = goal.get('target_value', 0)
            progress_percentage = (current_value / target_value * 100) if target_value > 0 else 0
            
            # Determine status
            status = GoalStatus.IN_PROGRESS.value
            if progress_percentage >= 100:
                status = GoalStatus.COMPLETED.value
            elif datetime.now().date() > datetime.fromisoformat(goal['due_date']).date():
                status = GoalStatus.OVERDUE.value
            
            # Update goal
            update_data = {
                'current_value': current_value,
                'status': status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if status == GoalStatus.COMPLETED.value:
                update_data['completed_at'] = datetime.utcnow().isoformat()
            
            await self._update_performance_goal(goal_id, update_data)
            
            # Create milestone if completed
            if status == GoalStatus.COMPLETED.value:
                milestone = {
                    'id': str(uuid.uuid4()),
                    'employee_id': goal['employee_id'],
                    'type': 'goal_completed',
                    'title': f'Goal Completed: {goal["title"]}',
                    'description': notes or f'Achieved {current_value} {goal.get("unit", "")}',
                    'achieved_at': datetime.utcnow().isoformat(),
                    'created_at': datetime.utcnow().isoformat()
                }
                await self._store_employee_milestone(milestone)
            
            return True
            
        except Exception as e:
            print(f"Error updating goal progress: {str(e)}")
            return False
    
    async def get_employee_goals(self, employee_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get employee goals"""
        try:
            query = "SELECT * FROM employee_goals WHERE employee_id = %s"
            params = [employee_id]
            
            if status:
                query += " AND status = %s"
                params.append(status)
            
            query += " ORDER BY created_at DESC"
            
            result = await self.supabase.execute_query(query, params)
            return result or []
            
        except Exception as e:
            print(f"Error getting employee goals: {str(e)}")
            return []
    
    async def create_performance_review(self, review_data: Dict[str, Any]) -> Optional[str]:
        """Create a performance review"""
        try:
            review_id = str(uuid.uuid4())
            review = {
                'id': review_id,
                'employee_id': review_data['employee_id'],
                'reviewer_id': review_data['reviewer_id'],
                'review_period_start': review_data['review_period_start'],
                'review_period_end': review_data['review_period_end'],
                'overall_rating': review_data['overall_rating'],
                'goals_achievement': json.dumps(review_data.get('goals_achievement', {})),
                'strengths': json.dumps(review_data.get('strengths', [])),
                'areas_for_improvement': json.dumps(review_data.get('areas_for_improvement', [])),
                'development_plan': json.dumps(review_data.get('development_plan', {})),
                'comments': review_data.get('comments', ''),
                'status': 'draft',
                'created_at': datetime.utcnow().isoformat()
            }
            
            await self._store_performance_review(review)
            
            # Create milestone
            milestone = {
                'id': str(uuid.uuid4()),
                'employee_id': review_data['employee_id'],
                'type': 'performance_review',
                'title': f'Performance Review - {review_data["overall_rating"].replace("_", " ").title()}',
                'description': f'Review period: {review_data["review_period_start"]} to {review_data["review_period_end"]}',
                'achieved_at': datetime.utcnow().isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            await self._store_employee_milestone(milestone)
            
            return review_id
            
        except Exception as e:
            print(f"Error creating performance review: {str(e)}")
            return None
    
    async def get_employee_reviews(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get employee performance reviews"""
        try:
            query = """
                SELECT * FROM employee_reviews 
                WHERE employee_id = %s 
                ORDER BY created_at DESC
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            
            # Parse JSON fields
            for review in result or []:
                review['goals_achievement'] = json.loads(review.get('goals_achievement', '{}'))
                review['strengths'] = json.loads(review.get('strengths', '[]'))
                review['areas_for_improvement'] = json.loads(review.get('areas_for_improvement', '[]'))
                review['development_plan'] = json.loads(review.get('development_plan', '{}'))
            
            return result or []
            
        except Exception as e:
            print(f"Error getting employee reviews: {str(e)}")
            return []
    
    # =====================================
    # COMMUNICATION TOOLS
    # =====================================
    
    async def send_employee_message(self, message_data: Dict[str, Any]) -> Optional[str]:
        """Send message to employee(s)"""
        try:
            message_id = str(uuid.uuid4())
            message = {
                'id': message_id,
                'sender_id': message_data['sender_id'],
                'recipient_ids': json.dumps(message_data['recipient_ids']),
                'subject': message_data['subject'],
                'content': message_data['content'],
                'message_type': message_data.get('message_type', 'general'),
                'priority': message_data.get('priority', 'normal'),
                'template_id': message_data.get('template_id'),
                'status': 'sent',
                'sent_at': datetime.utcnow().isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            
            await self._store_employee_message(message)
            
            # Create communication record for each recipient
            for recipient_id in message_data['recipient_ids']:
                communication = {
                    'id': str(uuid.uuid4()),
                    'employee_id': recipient_id,
                    'message_id': message_id,
                    'type': 'message_received',
                    'subject': message_data['subject'],
                    'content': message_data['content'],
                    'sender_id': message_data['sender_id'],
                    'read_at': None,
                    'created_at': datetime.utcnow().isoformat()
                }
                await self._store_employee_communication(communication)
            
            return message_id
            
        except Exception as e:
            print(f"Error sending employee message: {str(e)}")
            return None
    
    async def bulk_message_employees(self, message_data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """Send bulk message to employees based on filters"""
        try:
            # Get employees based on filters
            employees = await self._get_employees_by_filters(filters)
            
            if not employees:
                return {'success': False, 'message': 'No employees found matching filters'}
            
            recipient_ids = [emp['id'] for emp in employees]
            
            # Send message
            message_id = await self.send_employee_message({
                **message_data,
                'recipient_ids': recipient_ids
            })
            
            if message_id:
                return {
                    'success': True,
                    'message_id': message_id,
                    'recipients_count': len(recipient_ids),
                    'recipients': [{'id': emp['id'], 'name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}"} for emp in employees]
                }
            else:
                return {'success': False, 'message': 'Failed to send message'}
                
        except Exception as e:
            print(f"Error sending bulk message: {str(e)}")
            return {'success': False, 'message': str(e)}
    
    async def get_message_templates(self, template_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get message templates"""
        try:
            query = "SELECT * FROM message_templates"
            params = []
            
            if template_type:
                query += " WHERE template_type = %s"
                params.append(template_type)
            
            query += " ORDER BY name"
            
            result = await self.supabase.execute_query(query, params)
            return result or []
            
        except Exception as e:
            print(f"Error getting message templates: {str(e)}")
            return []
    
    async def create_message_template(self, template_data: Dict[str, Any]) -> Optional[str]:
        """Create a message template"""
        try:
            template_id = str(uuid.uuid4())
            template = {
                'id': template_id,
                'name': template_data['name'],
                'subject': template_data['subject'],
                'content': template_data['content'],
                'template_type': template_data.get('template_type', 'general'),
                'variables': json.dumps(template_data.get('variables', [])),
                'created_by': template_data['created_by'],
                'created_at': datetime.utcnow().isoformat()
            }
            
            await self._store_message_template(template)
            return template_id
            
        except Exception as e:
            print(f"Error creating message template: {str(e)}")
            return None
    
    # =====================================
    # HELPER METHODS
    # =====================================
    
    async def _determine_lifecycle_stage(self, employee_data: Dict[str, Any]) -> EmployeeLifecycleStage:
        """Determine employee lifecycle stage"""
        try:
            onboarding_status = employee_data.get('onboarding_status', 'not_started')
            hire_date = employee_data.get('hire_date')
            employment_status = employee_data.get('employment_status', 'active')
            
            if onboarding_status in ['not_started', 'in_progress', 'employee_completed', 'manager_review']:
                return EmployeeLifecycleStage.ONBOARDING
            
            if hire_date:
                hire_date_obj = datetime.fromisoformat(hire_date).date()
                days_since_hire = (datetime.now().date() - hire_date_obj).days
                
                if days_since_hire <= 90:  # 90-day probation period
                    return EmployeeLifecycleStage.PROBATION
            
            if employment_status == 'active':
                return EmployeeLifecycleStage.ACTIVE
            elif employment_status == 'terminated':
                return EmployeeLifecycleStage.OFFBOARDING
            
            return EmployeeLifecycleStage.ACTIVE
            
        except Exception as e:
            print(f"Error determining lifecycle stage: {str(e)}")
            return EmployeeLifecycleStage.ACTIVE
    
    async def _get_employee_communications(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get employee communications"""
        try:
            query = """
                SELECT * FROM employee_communications 
                WHERE employee_id = %s 
                ORDER BY created_at DESC 
                LIMIT 50
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            return result or []
            
        except Exception as e:
            print(f"Error getting employee communications: {str(e)}")
            return []
    
    async def _get_employee_milestones(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get employee milestones"""
        try:
            query = """
                SELECT * FROM employee_milestones 
                WHERE employee_id = %s 
                ORDER BY achieved_at DESC
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            return result or []
            
        except Exception as e:
            print(f"Error getting employee milestones: {str(e)}")
            return []
    
    async def _store_employee_milestone(self, milestone: Dict[str, Any]) -> bool:
        """Store employee milestone"""
        try:
            await self.supabase.create_record('employee_milestones', milestone)
            return True
        except Exception as e:
            print(f"Error storing milestone: {str(e)}")
            return False
    
    async def _store_performance_goal(self, goal: Dict[str, Any]) -> bool:
        """Store performance goal"""
        try:
            await self.supabase.create_record('employee_goals', goal)
            return True
        except Exception as e:
            print(f"Error storing goal: {str(e)}")
            return False
    
    async def _store_performance_review(self, review: Dict[str, Any]) -> bool:
        """Store performance review"""
        try:
            await self.supabase.create_record('employee_reviews', review)
            return True
        except Exception as e:
            print(f"Error storing review: {str(e)}")
            return False
    
    async def _store_employee_message(self, message: Dict[str, Any]) -> bool:
        """Store employee message"""
        try:
            await self.supabase.create_record('employee_messages', message)
            return True
        except Exception as e:
            print(f"Error storing message: {str(e)}")
            return False
    
    async def _store_employee_communication(self, communication: Dict[str, Any]) -> bool:
        """Store employee communication"""
        try:
            await self.supabase.create_record('employee_communications', communication)
            return True
        except Exception as e:
            print(f"Error storing communication: {str(e)}")
            return False
    
    async def _store_message_template(self, template: Dict[str, Any]) -> bool:
        """Store message template"""
        try:
            await self.supabase.create_record('message_templates', template)
            return True
        except Exception as e:
            print(f"Error storing template: {str(e)}")
            return False
    
    async def _get_employees_by_filters(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get employees by filters"""
        try:
            query = "SELECT * FROM employees WHERE 1=1"
            params = []
            
            if filters.get('property_id'):
                query += " AND property_id = %s"
                params.append(filters['property_id'])
            
            if filters.get('department'):
                query += " AND department = %s"
                params.append(filters['department'])
            
            if filters.get('employment_status'):
                query += " AND employment_status = %s"
                params.append(filters['employment_status'])
            
            if filters.get('lifecycle_stage'):
                query += " AND lifecycle_stage = %s"
                params.append(filters['lifecycle_stage'])
            
            result = await self.supabase.execute_query(query, params)
            return result or []
            
        except Exception as e:
            print(f"Error getting employees by filters: {str(e)}")
            return []
    
    # Additional helper methods for performance metrics
    async def _get_latest_performance_review(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get latest performance review"""
        try:
            query = """
                SELECT * FROM employee_reviews 
                WHERE employee_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error getting latest review: {str(e)}")
            return None
    
    async def _get_goals_statistics(self, employee_id: str) -> Dict[str, Any]:
        """Get goals statistics"""
        try:
            query = """
                SELECT status, COUNT(*) as count 
                FROM employee_goals 
                WHERE employee_id = %s 
                GROUP BY status
            """
            result = await self.supabase.execute_query(query, (employee_id,))
            
            stats = {'total': 0, 'completed': 0, 'in_progress': 0, 'overdue': 0}
            for row in result or []:
                stats['total'] += row['count']
                stats[row['status']] = row['count']
            
            stats['completion_rate'] = (stats['completed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            return stats
            
        except Exception as e:
            print(f"Error getting goals statistics: {str(e)}")
            return {}
    
    async def _calculate_performance_score(self, employee_id: str) -> float:
        """Calculate performance score"""
        try:
            # Get latest review rating
            latest_review = await self._get_latest_performance_review(employee_id)
            review_score = 0
            
            if latest_review:
                rating_scores = {
                    'exceeds_expectations': 5,
                    'meets_expectations': 4,
                    'below_expectations': 2,
                    'needs_improvement': 1
                }
                review_score = rating_scores.get(latest_review.get('overall_rating', ''), 3)
            
            # Get goals completion rate
            goals_stats = await self._get_goals_statistics(employee_id)
            goals_score = goals_stats.get('completion_rate', 0) / 20  # Convert to 0-5 scale
            
            # Calculate weighted average
            performance_score = (review_score * 0.7) + (goals_score * 0.3)
            return round(performance_score, 2)
            
        except Exception as e:
            print(f"Error calculating performance score: {str(e)}")
            return 0.0
    
    async def _is_review_due(self, employee_id: str) -> bool:
        """Check if performance review is due"""
        try:
            latest_review = await self._get_latest_performance_review(employee_id)
            
            if not latest_review:
                return True  # No review yet, so due
            
            last_review_date = datetime.fromisoformat(latest_review['created_at']).date()
            days_since_review = (datetime.now().date() - last_review_date).days
            
            return days_since_review >= 365  # Annual reviews
            
        except Exception as e:
            print(f"Error checking review due: {str(e)}")
            return False
    
    async def _get_development_areas(self, employee_id: str) -> List[str]:
        """Get development areas from latest review"""
        try:
            latest_review = await self._get_latest_performance_review(employee_id)
            
            if latest_review:
                areas = json.loads(latest_review.get('areas_for_improvement', '[]'))
                return areas
            
            return []
            
        except Exception as e:
            print(f"Error getting development areas: {str(e)}")
            return []
    
    async def _get_goal_by_id(self, goal_id: str) -> Optional[Dict[str, Any]]:
        """Get goal by ID"""
        try:
            query = "SELECT * FROM employee_goals WHERE id = %s"
            result = await self.supabase.execute_query(query, (goal_id,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error getting goal: {str(e)}")
            return None
    
    async def _update_performance_goal(self, goal_id: str, update_data: Dict[str, Any]) -> bool:
        """Update performance goal"""
        try:
            await self.supabase.update_record('employee_goals', goal_id, update_data)
            return True
        except Exception as e:
            print(f"Error updating goal: {str(e)}")
            return False