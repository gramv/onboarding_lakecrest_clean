import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  ClipboardCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Eye,
  Send,
  Building,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Edit
} from 'lucide-react'
import axios from 'axios'
import I9Section2Form from '../components/I9Section2Form'

interface Employee {
  id: string
  name: string
  email: string
  position: string
  department: string
  hire_date: string
  personal_info: any
}

interface OnboardingSession {
  id: string
  employee_id: string
  status: string
  current_step: string
  progress_percentage: number
  created_at: string
  employee_completed_at?: string
  expires_at: string
  form_data: any
}

interface PendingOnboarding {
  session: OnboardingSession
  employee: Employee
  application_id?: string
  days_pending: number
}

interface Application {
  id: string
  property_id: string
  department: string
  position: string
  applicant_data: any
  status: string
  applied_at: string
}

export default function EnhancedManagerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [pendingOnboardings, setPendingOnboardings] = useState<PendingOnboarding[]>([])
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([])
  const [selectedOnboarding, setSelectedOnboarding] = useState<PendingOnboarding | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes' | ''>('')
  const [reviewComments, setReviewComments] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showI9Section2, setShowI9Section2] = useState(false)
  const [i9Section2Data, setI9Section2Data] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData()
    }, 30000) // 30 seconds
    
    return () => clearInterval(refreshInterval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        navigate('/login')
        return
      }

      // Fetch applications
      const applicationsResponse = await axios.get('/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplications(applicationsResponse.data)

      // Fetch pending onboarding sessions for manager review
      try {
        const onboardingResponse = await axios.get('/api/api/manager/onboarding/pending', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        // Transform the response data to match our interface
        const pendingOnboardingData = onboardingResponse.data.map((item: any) => ({
          session: {
            id: item.id,
            employee_id: item.employee_id,
            status: item.status,
            current_step: item.current_step,
            progress_percentage: item.progress_percentage || 90,
            created_at: item.created_at,
            employee_completed_at: item.employee_completed_at,
            expires_at: item.expires_at,
            form_data: item.form_data || {}
          },
          employee: {
            id: item.employee_id,
            name: item.employee_name || `${item.form_data?.personal_info?.firstName || ''} ${item.form_data?.personal_info?.lastName || ''}`.trim(),
            email: item.employee_email || item.form_data?.personal_info?.email || '',
            position: item.position || '',
            department: item.department || '',
            hire_date: item.start_date || '',
            personal_info: item.form_data?.personal_info || {}
          },
          days_pending: Math.ceil((new Date().getTime() - new Date(item.employee_completed_at || item.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }))
        
        setPendingOnboardings(pendingOnboardingData)
      } catch (error) {
        console.error('Failed to fetch pending onboarding sessions:', error)
        // Set empty array if fetch fails
        setPendingOnboardings([])
      }
      
      // Fetch active employees
      try {
        const employeesResponse = await axios.get('/api/api/manager/employees', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setActiveEmployees(employeesResponse.data)
      } catch (error) {
        console.error('Failed to fetch active employees:', error)
        setActiveEmployees([])
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!selectedOnboarding || !reviewAction) return

    try {
      setSubmitting(true)
      
      // Determine the API endpoint based on action
      let endpoint = ''
      let payload: any = {}
      
      if (reviewAction === 'approve') {
        endpoint = `/api/api/manager/onboarding/${selectedOnboarding.session.id}/approve`
        payload = {
          manager_signature: `Manager approved on ${new Date().toISOString()}`,
          comments: reviewComments
        }
      } else if (reviewAction === 'request_changes') {
        endpoint = `/api/api/manager/onboarding/${selectedOnboarding.session.id}/request-changes`
        payload = {
          requested_changes: reviewComments,
          forms_to_update: [] // Could be specified based on what needs changes
        }
      } else if (reviewAction === 'reject') {
        endpoint = `/api/api/manager/onboarding/${selectedOnboarding.session.id}/reject`
        payload = {
          reason: reviewComments
        }
      }
      
      // Make the API call
      const response = await axios.post(endpoint, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data) {
        toast({
          title: "Review Submitted",
          description: `Onboarding session ${reviewAction === 'approve' ? 'approved' : reviewAction === 'request_changes' ? 'sent back for changes' : 'rejected'} successfully.`,
        })
      }

      // Update local state
      setPendingOnboardings(prev => 
        prev.filter(p => p.session.id !== selectedOnboarding.session.id)
      )

      // Reset form
      setSelectedOnboarding(null)
      setReviewAction('')
      setReviewComments('')

      alert(`Onboarding ${reviewAction} successfully!`)

    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'employee_completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-gray-600">Manage applications and onboarding processes</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter(app => app.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Onboarding Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingOnboardings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{activeEmployees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingOnboardings.filter(p => getDaysUntilExpiry(p.session.expires_at) <= 2).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="onboarding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">Job Applications</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding Reviews</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>
                  Review and approve job applications from candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.filter(app => app.status === 'pending').length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.filter(app => app.status === 'pending').map(app => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold">
                              {app.applicant_data.first_name} {app.applicant_data.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {app.position} - {app.department}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                {app.applicant_data.email}
                              </span>
                              <span className="flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                {app.applicant_data.phone}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Applied: {new Date(app.applied_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            <Button size="sm" onClick={() => navigate(`/applications/${app.id}/approve`)}>
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onboarding Reviews Tab */}
          <TabsContent value="onboarding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Onboarding Reviews</CardTitle>
                <CardDescription>
                  Review completed onboarding submissions from new employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingOnboardings.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending onboarding reviews</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOnboardings.map(pending => (
                      <div key={pending.session.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {pending.employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{pending.employee.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {pending.employee.position} - {pending.employee.department}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              <Badge className={getStatusColor(pending.session.status)}>
                                Employee Completed
                              </Badge>
                              <span className="text-gray-500">
                                Progress: {pending.session.progress_percentage}%
                              </span>
                              <span className="text-gray-500">
                                Completed: {pending.session.employee_completed_at ? 
                                  new Date(pending.session.employee_completed_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>

                            {getDaysUntilExpiry(pending.session.expires_at) <= 2 && (
                              <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-red-800">
                                  Expires in {getDaysUntilExpiry(pending.session.expires_at)} day(s)
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedOnboarding(pending)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Onboarding Review - {pending.employee.name}</DialogTitle>
                                  <DialogDescription>
                                    Review the employee's completed onboarding information
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedOnboarding && (
                                  <div className="space-y-6">
                                    {/* Employee Summary */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Employee Information</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-sm font-medium">Name</Label>
                                            <p>{selectedOnboarding.employee.name}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Email</Label>
                                            <p>{selectedOnboarding.employee.email}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Position</Label>
                                            <p>{selectedOnboarding.employee.position}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Department</Label>
                                            <p>{selectedOnboarding.employee.department}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Hire Date</Label>
                                            <p>{new Date(selectedOnboarding.employee.hire_date).toLocaleDateString()}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Progress</Label>
                                            <p>{selectedOnboarding.session.progress_percentage}%</p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {/* Form Data Summary */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Submitted Information</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <Tabs defaultValue="personal" className="w-full">
                                          <TabsList>
                                            <TabsTrigger value="personal">Personal Info</TabsTrigger>
                                            <TabsTrigger value="insurance">Health Insurance</TabsTrigger>
                                            <TabsTrigger value="banking">Direct Deposit</TabsTrigger>
                                            <TabsTrigger value="documents">Documents</TabsTrigger>
                                          </TabsList>

                                          <TabsContent value="personal" className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label>First Name</Label>
                                                <p className="mt-1">{selectedOnboarding.session.form_data.personal_info?.firstName || 'Not provided'}</p>
                                              </div>
                                              <div>
                                                <Label>Last Name</Label>
                                                <p className="mt-1">{selectedOnboarding.session.form_data.personal_info?.lastName || 'Not provided'}</p>
                                              </div>
                                              <div>
                                                <Label>Email</Label>
                                                <p className="mt-1">{selectedOnboarding.session.form_data.personal_info?.email || 'Not provided'}</p>
                                              </div>
                                              {/* Add more personal info fields as needed */}
                                            </div>
                                          </TabsContent>

                                          <TabsContent value="insurance" className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label>Medical Plan</Label>
                                                <p className="mt-1">{selectedOnboarding.session.form_data.health_insurance?.medicalPlan || 'Not selected'}</p>
                                              </div>
                                              <div>
                                                <Label>Total Cost (Bi-weekly)</Label>
                                                <p className="mt-1 font-medium">
                                                  ${selectedOnboarding.session.form_data.health_insurance?.totalCost || 0}
                                                </p>
                                              </div>
                                            </div>
                                          </TabsContent>

                                          <TabsContent value="banking" className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label>Bank Name</Label>
                                                <p className="mt-1">{selectedOnboarding.session.form_data.direct_deposit?.bankName || 'Not provided'}</p>
                                              </div>
                                              <div>
                                                <Label>Account Type</Label>
                                                <p className="mt-1 capitalize">{selectedOnboarding.session.form_data.direct_deposit?.accountType || 'Not provided'}</p>
                                              </div>
                                            </div>
                                          </TabsContent>

                                          <TabsContent value="documents" className="space-y-4">
                                            <div className="space-y-4">
                                              {/* I-9 Documents */}
                                              <div className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2 flex items-center">
                                                  <FileText className="h-4 w-4 mr-2" />
                                                  I-9 Employment Eligibility Verification
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                  <div>
                                                    <Label>Section 1 (Employee)</Label>
                                                    <div className="flex items-center mt-1">
                                                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                                      <span>Completed</span>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <Label>Section 2 (Employer)</Label>
                                                    <div className="flex items-center justify-between mt-1">
                                                      <div className="flex items-center">
                                                        <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                                                        <span>Pending Review</span>
                                                      </div>
                                                      <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => setShowI9Section2(true)}
                                                      >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Complete I-9 Section 2
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* W-4 Form */}
                                              <div className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2 flex items-center">
                                                  <FileText className="h-4 w-4 mr-2" />
                                                  Form W-4 Employee's Withholding Certificate
                                                </h4>
                                                <div className="flex items-center text-sm">
                                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                                  <span>Submitted and Ready for Review</span>
                                                </div>
                                              </div>

                                              {/* Health Insurance */}
                                              <div className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2 flex items-center">
                                                  <FileText className="h-4 w-4 mr-2" />
                                                  Health Insurance Election
                                                </h4>
                                                <div className="text-sm">
                                                  <p><strong>Plan:</strong> {selectedOnboarding.session.form_data.health_insurance?.medicalPlan || 'Not selected'}</p>
                                                  <p><strong>Cost:</strong> ${selectedOnboarding.session.form_data.health_insurance?.totalCost || 0} bi-weekly</p>
                                                </div>
                                              </div>

                                              {/* Direct Deposit */}
                                              <div className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2 flex items-center">
                                                  <FileText className="h-4 w-4 mr-2" />
                                                  Direct Deposit Authorization
                                                </h4>
                                                <div className="text-sm">
                                                  <p><strong>Bank:</strong> {selectedOnboarding.session.form_data.direct_deposit?.bankName || 'Not provided'}</p>
                                                  <p><strong>Account Type:</strong> {selectedOnboarding.session.form_data.direct_deposit?.accountType || 'Not provided'}</p>
                                                </div>
                                              </div>

                                              {/* Company Policies */}
                                              <div className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2 flex items-center">
                                                  <FileText className="h-4 w-4 mr-2" />
                                                  Policy Acknowledgments
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                  <div className="flex items-center">
                                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                    <span>Weapons Policy Acknowledged</span>
                                                  </div>
                                                  <div className="flex items-center">
                                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                    <span>Human Trafficking Awareness Completed</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </TabsContent>
                                        </Tabs>
                                      </CardContent>
                                    </Card>

                                    {/* Review Actions */}
                                    <Card className="border-blue-200">
                                      <CardHeader>
                                        <CardTitle className="text-lg text-blue-900">Manager Review</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div>
                                          <Label>Review Decision</Label>
                                          <Select value={reviewAction} onValueChange={(value) => setReviewAction(value as 'approve' | 'reject' | 'request_changes' | '')}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select your decision" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="approve">
                                                <div className="flex items-center">
                                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                                  Approve Onboarding
                                                </div>
                                              </SelectItem>
                                              <SelectItem value="request_changes">
                                                <div className="flex items-center">
                                                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                                                  Request Changes
                                                </div>
                                              </SelectItem>
                                              <SelectItem value="reject">
                                                <div className="flex items-center">
                                                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                                                  Reject
                                                </div>
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div>
                                          <Label>Comments (Optional)</Label>
                                          <Textarea
                                            value={reviewComments}
                                            onChange={(e) => setReviewComments(e.target.value)}
                                            placeholder="Add any comments or feedback for the employee..."
                                            rows={3}
                                          />
                                        </div>

                                        <div className="flex justify-end space-x-3">
                                          <Button 
                                            variant="outline" 
                                            onClick={() => {
                                              setSelectedOnboarding(null)
                                              setReviewAction('')
                                              setReviewComments('')
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button 
                                            onClick={handleReviewSubmit}
                                            disabled={!reviewAction || submitting}
                                          >
                                            {submitting ? (
                                              <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Submitting...
                                              </>
                                            ) : (
                                              <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Submit Review
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* I-9 Section 2 Modal */}
        {showI9Section2 && selectedOnboarding && (
          <Dialog open={showI9Section2} onOpenChange={setShowI9Section2}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete I-9 Section 2 - {selectedOnboarding.employee.name}</DialogTitle>
                <DialogDescription>
                  Complete the employer verification portion of Form I-9 for document review and verification
                </DialogDescription>
              </DialogHeader>
              
              <I9Section2Form
                employeeData={{
                  firstName: selectedOnboarding.session.form_data.personal_info?.firstName || '',
                  lastName: selectedOnboarding.session.form_data.personal_info?.lastName || '',
                  dateOfBirth: selectedOnboarding.session.form_data.personal_info?.dateOfBirth || '',
                  ssn: selectedOnboarding.session.form_data.personal_info?.ssn || '',
                  citizenshipStatus: selectedOnboarding.session.form_data.i9_section1?.citizenshipStatus || ''
                }}
                onSave={(data) => {
                  setI9Section2Data(data)
                  console.log('I-9 Section 2 completed:', data)
                }}
                onNext={() => {
                  setShowI9Section2(false)
                  // Update the onboarding status or trigger next step
                  alert('I-9 Section 2 completed successfully! The employee verification is now complete.')
                }}
                onBack={() => {
                  setShowI9Section2(false)
                }}
                language='en'
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}