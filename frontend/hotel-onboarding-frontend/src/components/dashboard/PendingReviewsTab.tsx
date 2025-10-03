/**
 * Pending Reviews Tab Component
 * Shows employees who have completed onboarding and are awaiting manager review
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  Calendar,
  User,
  Briefcase
} from 'lucide-react'
import { managerReviewApi, PendingReviewEmployee } from '@/services/managerReviewApi'
import { formatDistanceToNow, format } from 'date-fns'

export function PendingReviewsTab() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<PendingReviewEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingReviews()
  }, [])

  const loadPendingReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await managerReviewApi.getPendingReviews()

      // The axios interceptor automatically unwraps { data: [...] } responses
      // So response is already the employees array, not { data: [...], count: N }
      const employees = Array.isArray(response) ? response : (response.data || [])
      console.log('👥 Loaded employees for review:', employees.length)
      setEmployees(employees)
    } catch (err: any) {
      console.error('Failed to load pending reviews:', err)
      setError(err.message || 'Failed to load pending reviews')
      toast({
        title: 'Error',
        description: 'Failed to load pending reviews. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyBadge = (urgencyLevel: string, daysRemaining: number) => {
    switch (urgencyLevel) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        )
      case 'urgent':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
          </Badge>
        )
      case 'warning':
        return (
          <Badge variant="warning" className="flex items-center gap-1 bg-yellow-500 text-white">
            <Clock className="h-3 w-3" />
            {daysRemaining} days left
          </Badge>
        )
      case 'normal':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysRemaining} days left
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            No deadline set
          </Badge>
        )
    }
  }

  const handleReviewEmployee = (employeeId: string) => {
    navigate(`/manager/review/${employeeId}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPendingReviews}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-gray-600">
            No employees are currently pending review.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Separate employees by urgency
  const overdueEmployees = employees.filter(e => e.i9_urgency_level === 'overdue')
  const urgentEmployees = employees.filter(e => e.i9_urgency_level === 'urgent')
  const normalEmployees = employees.filter(e => !['overdue', 'urgent'].includes(e.i9_urgency_level))

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-3xl font-bold">{employees.length}</p>
              </div>
              <ClipboardCheck className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-3xl font-bold text-red-600">{urgentEmployees.length}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-700">{overdueEmployees.length}</p>
              </div>
              <Clock className="h-10 w-10 text-red-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Section */}
      {overdueEmployees.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Overdue I-9 Section 2 ({overdueEmployees.length})
          </h3>
          <div className="space-y-3">
            {overdueEmployees.map((employee) => (
              <EmployeeReviewCard 
                key={employee.id} 
                employee={employee} 
                onReview={handleReviewEmployee}
                getUrgencyBadge={getUrgencyBadge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Urgent Section */}
      {urgentEmployees.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orange-700 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Urgent - Due Soon ({urgentEmployees.length})
          </h3>
          <div className="space-y-3">
            {urgentEmployees.map((employee) => (
              <EmployeeReviewCard 
                key={employee.id} 
                employee={employee} 
                onReview={handleReviewEmployee}
                getUrgencyBadge={getUrgencyBadge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Normal Section */}
      {normalEmployees.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Pending Review ({normalEmployees.length})
          </h3>
          <div className="space-y-3">
            {normalEmployees.map((employee) => (
              <EmployeeReviewCard 
                key={employee.id} 
                employee={employee} 
                onReview={handleReviewEmployee}
                getUrgencyBadge={getUrgencyBadge}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface EmployeeReviewCardProps {
  employee: PendingReviewEmployee
  onReview: (employeeId: string) => void
  getUrgencyBadge: (urgencyLevel: string, daysRemaining: number) => React.ReactNode
}

function EmployeeReviewCard({ employee, onReview, getUrgencyBadge }: EmployeeReviewCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold">
                {employee.first_name} {employee.last_name}
              </h4>
              {getUrgencyBadge(employee.i9_urgency_level, employee.days_until_i9_deadline)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>{employee.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Completed: {formatDistanceToNow(new Date(employee.onboarding_completed_at), { addSuffix: true })}
                </span>
              </div>
              {employee.i9_section2_deadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    I-9 Due: {format(new Date(employee.i9_section2_deadline), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={() => onReview(employee.id)}
            className="ml-4"
          >
            <Eye className="h-4 w-4 mr-2" />
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

