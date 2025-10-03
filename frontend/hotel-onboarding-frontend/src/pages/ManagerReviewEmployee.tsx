/**
 * Manager Review Employee Page
 * Allows managers to review employee onboarding documents and complete I-9 Section 2
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Briefcase,
  Calendar,
  Eye,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react'
import { managerReviewApi, EmployeeDocumentsResponse } from '@/services/managerReviewApi'
import { format } from 'date-fns'

export default function ManagerReviewEmployee() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [employeeData, setEmployeeData] = useState<EmployeeDocumentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewStarted, setReviewStarted] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData()
    }
  }, [employeeId])

  const loadEmployeeData = async () => {
    try {
      setLoading(true)
      const data = await managerReviewApi.getEmployeeDocuments(employeeId!)
      setEmployeeData(data)
    } catch (err: any) {
      console.error('Failed to load employee data:', err)
      toast({
        title: 'Error',
        description: 'Failed to load employee data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartReview = async () => {
    try {
      await managerReviewApi.startReview(employeeId!, {})
      setReviewStarted(true)
      toast({
        title: 'Review Started',
        description: 'You have started reviewing this employee.',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to start review. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddNotes = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some notes.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await managerReviewApi.addReviewNotes(employeeId!, {
        comments: notes,
      })
      toast({
        title: 'Notes Added',
        description: 'Your review notes have been saved.',
      })
      setNotes('')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to save notes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteI9Section2 = () => {
    // Navigate to I-9 Section 2 form
    navigate(`/manager/i9-section2/${employeeId}`)
  }

  const handleApproveReview = async () => {
    if (employeeData?.i9_section2_status !== 'completed') {
      toast({
        title: 'Cannot Approve',
        description: 'I-9 Section 2 must be completed before approving.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await managerReviewApi.approveReview(employeeId!, {})
      toast({
        title: 'Review Approved',
        description: 'Employee onboarding has been approved.',
      })
      navigate('/manager')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to approve review. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!employeeData) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Employee not found or you don't have permission to view this employee.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { employee, documents, i9_section2_required, i9_section2_deadline, i9_section2_status } = employeeData

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/manager')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{employee.name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>{employee.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{employee.id}</span>
              </div>
            </div>
          </div>

          {!reviewStarted && (
            <Button onClick={handleStartReview}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Start Review
            </Button>
          )}
        </div>
      </div>

      {/* I-9 Section 2 Alert */}
      {i9_section2_required && i9_section2_status !== 'completed' && (
        <Alert className="mb-6 border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>I-9 Section 2 Required</strong>
                <p className="text-sm mt-1">
                  Federal law requires completion within 3 business days of employee's first day.
                  {i9_section2_deadline && (
                    <span className="block mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Deadline: {format(new Date(i9_section2_deadline), 'MMM d, yyyy')}
                    </span>
                  )}
                </p>
              </div>
              <Button onClick={handleCompleteI9Section2} variant="default">
                Complete I-9 Section 2
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {i9_section2_status === 'completed' && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>I-9 Section 2 Completed</strong>
            <p className="text-sm mt-1">Federal employment verification is complete.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Documents Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Onboarding Documents</CardTitle>
          <CardDescription>
            Review all completed onboarding documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-600">
                      Signed: {format(new Date(doc.signed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                  {doc.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.pdf_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
          <CardDescription>
            Add notes or comments about this employee's onboarding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter your review notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mb-3"
          />
          <Button onClick={handleAddNotes} disabled={submitting || !notes.trim()}>
            <MessageSquare className="h-4 w-4 mr-2" />
            {submitting ? 'Saving...' : 'Add Notes'}
          </Button>
        </CardContent>
      </Card>

      {/* Approve Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleApproveReview}
          disabled={i9_section2_status !== 'completed' || submitting}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {submitting ? 'Approving...' : 'Approve Onboarding'}
        </Button>
      </div>
    </div>
  )
}

