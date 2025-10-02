import React, { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DataTable, ColumnDefinition } from '@/components/ui/data-table'
import { SearchFieldConfig } from '@/components/ui/advanced-search'
import { FilterFieldConfig } from '@/components/ui/advanced-filter'
import { ExportColumn } from '@/components/ui/data-export'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Eye, CheckCircle, XCircle, Clock, Filter, Users, Mail, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { apiClient } from '@/services/api'
import { getApiUrl } from '@/config/api'
import axios from 'axios'

interface JobApplication {
  id: string
  property_id: string
  property_name: string
  department: string
  position: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  status: 'pending' | 'approved' | 'rejected' | 'talent_pool'
  applied_at: string
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  talent_pool_date?: string
  applicant_data: Record<string, any>
}

interface TalentPoolCandidate {
  id: string
  property_id: string
  property_name: string
  department: string
  position: string
  applicant_data: Record<string, any>
  applied_at: string
  talent_pool_date: string
  reviewed_by?: string
  reviewed_at?: string
}

interface ApplicationsTabProps {
  userRole: 'hr' | 'manager'
  propertyId?: string
  onStatsUpdate?: () => void
}

interface OutletContext {
  stats: any
  property?: any
  onStatsUpdate: () => void
  userRole: 'hr' | 'manager'
  propertyId?: string
}

// Helper function to translate stored values to display values
function translateStoredValue(value: string | boolean | undefined | null, type: string): string {
  if (value === null || value === undefined || value === '') return '—'

  // Boolean or yes/no values
  if (type === 'boolean' || type === 'yesno') {
    if (value === true || value === 'yes' || value === 'sí') return 'Yes'
    if (value === false || value === 'no') return 'No'
    return String(value)
  }

  // Employment type
  if (type === 'employment_type') {
    const types: Record<string, string> = {
      'full_time': 'Full-Time',
      'part_time': 'Part-Time',
      'seasonal': 'Seasonal',
      'temporary': 'Temporary'
    }
    return types[String(value)] || String(value)
  }

  // Shift preference
  if (type === 'shift') {
    const shifts: Record<string, string> = {
      'morning': 'Morning',
      'afternoon': 'Afternoon',
      'evening': 'Evening',
      'night': 'Night',
      'flexible': 'Flexible',
      'any': 'Any'
    }
    return shifts[String(value)] || String(value)
  }

  // Gender
  if (type === 'gender') {
    const genders: Record<string, string> = {
      'male': 'Male',
      'female': 'Female',
      'non-binary': 'Non-Binary',
      'prefer_not_to_say': 'Prefer not to say',
      'hombre': 'Male',
      'mujer': 'Female',
      'no_binario': 'Non-Binary',
      'prefiero_no_decir': 'Prefer not to say'
    }
    return genders[String(value)] || String(value)
  }

  // Veteran status
  if (type === 'veteran_status') {
    const statuses: Record<string, string> = {
      'yes': 'Yes',
      'no': 'No',
      'prefer_not_to_say': 'Prefer not to say',
      'sí': 'Yes',
      'prefiero_no_decir': 'Prefer not to say'
    }
    return statuses[String(value)] || String(value)
  }

  // Disability status
  if (type === 'disability_status') {
    const statuses: Record<string, string> = {
      'yes': 'Yes',
      'no': 'No',
      'prefer_not_to_say': 'Prefer not to say',
      'sí': 'Yes',
      'prefiero_no_decir': 'Prefer not to say'
    }
    return statuses[String(value)] || String(value)
  }

  return String(value)
}

export function ApplicationsTab({ userRole: propUserRole, propertyId: propPropertyId, onStatsUpdate: propOnStatsUpdate }: ApplicationsTabProps) {
  const { t, i18n } = useTranslation()

  // Safely get outlet context without causing hook errors
  let outletContext: OutletContext | undefined
  try {
    outletContext = useOutletContext<OutletContext>()
  } catch (error) {
    // Context might not be available when navigating directly
    console.log('ApplicationsTab: No outlet context available')
  }

  const userRole = propUserRole || outletContext?.userRole || 'hr'
  const propertyId = propPropertyId || outletContext?.propertyId
  const currentProperty = outletContext?.property
  const onStatsUpdate = propOnStatsUpdate || outletContext?.onStatsUpdate || (() => {})
  const { user, token } = useAuth()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [talentPoolCandidates, setTalentPoolCandidates] = useState<TalentPoolCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [talentPoolLoading, setTalentPoolLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('applied_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [selectedTalentPoolCandidate, setSelectedTalentPoolCandidate] = useState<TalentPoolCandidate | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isTalentPoolDetailModalOpen, setIsTalentPoolDetailModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('applications')
  
  // Talent Pool specific state
  const [talentPoolSearchQuery, setTalentPoolSearchQuery] = useState('')
  const [talentPoolDepartmentFilter, setTalentPoolDepartmentFilter] = useState<string>('all')
  const [talentPoolPropertyFilter, setTalentPoolPropertyFilter] = useState<string>('all')
  const [talentPoolPositionFilter, setTalentPoolPositionFilter] = useState<string>('all')
  const [selectedTalentPoolIds, setSelectedTalentPoolIds] = useState<string[]>([])
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<'email' | 'reactivate'>('email')
  
  // Bulk application management
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([])
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false)
  const [bulkStatusData, setBulkStatusData] = useState({
    new_status: '',
    reason: '',
    notes: ''
  })
  
  // Job offer form data
  const [jobOfferData, setJobOfferData] = useState({
    job_title: '',
    start_date: '',
    start_time: '',
    pay_rate: '',
    pay_frequency: 'bi-weekly',
    benefits_eligible: 'yes',
    supervisor: '',
    special_instructions: ''
  })

  const fetchApplications = async () => {
    try {
      setLoading(true)
      // Use different endpoints based on user role
      const endpoint = userRole === 'hr' 
        ? '/hr/applications'
        : '/manager/applications'
      
      console.log('🔍 Fetching applications:', {
        userRole,
        endpoint,
        token: token ? `${token.substring(0, 20)}...` : 'No token'
      })
      
      const response = await apiClient.get(endpoint, {
        params: {
          search: searchQuery || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
          property_id: userRole === 'hr' && propertyFilter !== 'all' ? propertyFilter : undefined
        }
      })

      const payload: any[] = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.data) ? response.data.data : [])

      console.log('✅ Applications fetched:', {
        count: payload.length,
        pending: payload.filter((app: any) => app.status === 'pending').length
      })
      
      let sortedApplications = [...payload]
      
      // Apply sorting
      sortedApplications.sort((a, b) => {
        let aValue = a[sortBy as keyof JobApplication] || ''
        let bValue = b[sortBy as keyof JobApplication] || ''

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
      
      setApplications(sortedApplications)
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTalentPoolCandidates = async () => {
    try {
      setTalentPoolLoading(true)
      const endpoint = '/hr/applications/talent-pool'
      const response = await apiClient.get(endpoint, {
        params: {
          property_id: userRole === 'hr' && talentPoolPropertyFilter !== 'all' ? talentPoolPropertyFilter : undefined,
          department: talentPoolDepartmentFilter !== 'all' ? talentPoolDepartmentFilter : undefined,
          position: talentPoolPositionFilter !== 'all' ? talentPoolPositionFilter : undefined
        }
      })
      
      let candidates = response.data.applications || []
      
      // Apply search filter
      if (talentPoolSearchQuery) {
        const query = talentPoolSearchQuery.toLowerCase()
        candidates = candidates.filter((candidate: TalentPoolCandidate) => 
          candidate.applicant_data.first_name?.toLowerCase().includes(query) ||
          candidate.applicant_data.last_name?.toLowerCase().includes(query) ||
          candidate.applicant_data.email?.toLowerCase().includes(query) ||
          candidate.position?.toLowerCase().includes(query) ||
          candidate.department?.toLowerCase().includes(query) ||
          candidate.property_name?.toLowerCase().includes(query)
        )
      }
      
      setTalentPoolCandidates(candidates)
    } catch (error) {
      console.error('Error fetching talent pool candidates:', error)
    } finally {
      setTalentPoolLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/hr/properties')
      // Handle wrapped response format
      const propertiesData = response.data.data || response.data
      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  useEffect(() => {
    fetchApplications()
    if (userRole === 'hr') {
      fetchProperties()
    }
  }, [searchQuery, statusFilter, departmentFilter, propertyFilter, sortBy, sortOrder])

  // Removed auto-refresh interval - WebSocket provides real-time updates
  // Manual refresh button is available for user control

  useEffect(() => {
    if (activeTab === 'talent-pool') {
      fetchTalentPoolCandidates()
    }
  }, [activeTab, talentPoolSearchQuery, talentPoolDepartmentFilter, talentPoolPropertyFilter, talentPoolPositionFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDepartmentFilter('all')
    setPropertyFilter('all')
    setSortBy('applied_at')
    setSortOrder('desc')
  }

  // Get unique departments from applications
  const uniqueDepartments = useMemo(() => {
    return [...new Set(applications.map(app => app.department).filter(Boolean))].sort()
  }, [applications])

  // Get unique departments and positions from talent pool candidates
  const uniqueTalentPoolDepartments = useMemo(() => {
    return [...new Set(talentPoolCandidates.map(candidate => candidate.department).filter(Boolean))].sort()
  }, [talentPoolCandidates])

  const uniqueTalentPoolPositions = useMemo(() => {
    return [...new Set(talentPoolCandidates.map(candidate => candidate.position).filter(Boolean))].sort()
  }, [talentPoolCandidates])

  const handleApproveApplication = async () => {
    if (!selectedApplication) return

    console.log('🔍 DEBUG: Starting approval process')
    console.log('Selected application:', selectedApplication)
    console.log('Job offer data:', jobOfferData)
    console.log('User role:', userRole)
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'No token')

    // Check if the application is still pending before attempting approval
    if (selectedApplication.status !== 'pending') {
      console.log('❌ Application is not pending:', selectedApplication.status)
      alert('This application is no longer pending and cannot be approved. Refreshing the list...')
      fetchApplications()
      setIsApproveModalOpen(false)
      setSelectedApplication(null)
      return
    }

    // Validate required fields before submission
    const requiredFields = {
      job_title: 'Job Title',
      start_date: 'Start Date',
      start_time: 'Start Time',
      pay_rate: 'Pay Rate',
      pay_frequency: 'Pay Frequency',
      benefits_eligible: 'Benefits Eligible',
      supervisor: 'Supervisor'
    }

    const missingFields = []
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!jobOfferData[field] || jobOfferData[field].toString().trim() === '') {
        missingFields.push(label)
      }
    }

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`)
      return
    }

    // Validate pay_rate is a valid number
    const payRate = parseFloat(jobOfferData.pay_rate)
    if (isNaN(payRate) || payRate <= 0) {
      alert('Please enter a valid pay rate (must be a positive number)')
      return
    }

    try {
      setActionLoading(true)
      const formData = new FormData()
      Object.entries(jobOfferData).forEach(([key, value]) => {
        console.log(`Adding to FormData: ${key} = "${value}"`)
        formData.append(key, value)
      })

      console.log('🚀 Making approval request to:', `/applications/${selectedApplication.id}/approve`)
      
      const response = await apiClient.post(`/applications/${selectedApplication.id}/approve`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      console.log('✅ Approval successful:', response.data)

      setIsApproveModalOpen(false)
      setJobOfferData({
        job_title: '',
        start_date: '',
        start_time: '',
        pay_rate: '',
        pay_frequency: 'bi-weekly',
        benefits_eligible: 'yes',
        supervisor: '',
        special_instructions: ''
      })
      setSelectedApplication(null)
      fetchApplications()
      if (onStatsUpdate) onStatsUpdate()
    } catch (error: any) {
      console.error('❌ Error approving application:', error)
      console.log('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config
      })
      
      let errorMessage = 'Error approving application. Please try again.'
      
      if (error.response?.status === 422) {
        console.log('422 Validation Error Details:', error.response.data)
        errorMessage = 'Invalid application data. Please check all required fields are filled.'
        
        // Log specific validation errors
        if (error.response.data?.detail && Array.isArray(error.response.data.detail)) {
          console.log('Validation errors:')
          error.response.data.detail.forEach((err: any) => {
            console.log(`  - ${err.loc?.join(' -> ')}: ${err.msg} (input: ${err.input})`)
          })
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Application not found. It may have been deleted or processed by another user. Refreshing the list...'
        // Refresh the applications list when application is not found
        fetchApplications()
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to approve this application.'
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      alert(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectApplication = async () => {
    if (!selectedApplication || !rejectionReason.trim()) {
      alert('Please enter a rejection reason.')
      return
    }

    // Additional validation
    if (selectedApplication.status !== 'pending') {
      alert(`Cannot reject application. Current status: ${selectedApplication.status}`)
      return
    }

    try {
      setActionLoading(true)
      
      // Debug logging
      console.log('Rejecting application:', {
        id: selectedApplication.id,
        status: selectedApplication.status,
        reason: rejectionReason.trim()
      })
      
      const formData = new FormData()
      formData.append('rejection_reason', rejectionReason.trim())

      const response = await axios.post(`${getApiUrl()}/applications/${selectedApplication.id}/reject`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      console.log('Rejection successful:', response.data)

      setIsRejectModalOpen(false)
      setRejectionReason('')
      setSelectedApplication(null)
      fetchApplications()
      if (onStatsUpdate) onStatsUpdate()
      
      // Show success message
      if (response.data?.status === 'talent_pool') {
        alert('Application rejected and moved to talent pool successfully!')
      }
      
    } catch (error: any) {
      console.error('Error rejecting application:', error)
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      })
      
      let errorMessage = 'Error rejecting application. Please try again.'
      
      if (error.response?.status === 422) {
        const details = error.response?.data?.detail
        if (Array.isArray(details)) {
          const missingFields = details.map(d => d.loc?.join('.') || 'unknown').join(', ')
          errorMessage = `Validation error: Missing or invalid fields: ${missingFields}`
        } else {
          errorMessage = 'Invalid application data. The application may have already been processed.'
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Application not found. It may have been deleted or processed by another user.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to reject this application.'
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      alert(errorMessage)
      
      // Refresh applications to get latest state
      fetchApplications()
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkTalentPoolAction = async () => {
    if (selectedTalentPoolIds.length === 0) return

    try {
      setActionLoading(true)
      
      if (bulkActionType === 'email') {
        // Send bulk email notifications to talent pool candidates
        const response = await axios.post(`${getApiUrl()}/hr/applications/bulk-talent-pool-notify`, {
          application_ids: selectedTalentPoolIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        alert(`Email notifications sent to ${selectedTalentPoolIds.length} candidates`)
      } else if (bulkActionType === 'reactivate') {
        // Reactivate talent pool candidates (move back to pending)
        const response = await axios.post(`${getApiUrl()}/hr/applications/bulk-reactivate`, {
          application_ids: selectedTalentPoolIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        alert(`${selectedTalentPoolIds.length} candidates reactivated`)
        fetchTalentPoolCandidates()
        fetchApplications()
      }
      
      setSelectedTalentPoolIds([])
      setIsBulkActionModalOpen(false)
      if (onStatsUpdate) onStatsUpdate()
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Error performing bulk action. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTalentPoolSelection = (candidateId: string, checked: boolean) => {
    if (checked) {
      setSelectedTalentPoolIds(prev => [...prev, candidateId])
    } else {
      setSelectedTalentPoolIds(prev => prev.filter(id => id !== candidateId))
    }
  }

  const handleSelectAllTalentPool = (checked: boolean) => {
    if (checked) {
      setSelectedTalentPoolIds(talentPoolCandidates.map(c => c.id))
    } else {
      setSelectedTalentPoolIds([])
    }
  }

  const handleStatusTransition = async (applicationId: string, newStatus: string, reason: string) => {
    try {
      setActionLoading(true)
      const formData = new FormData()
      formData.append('application_ids', applicationId)
      formData.append('new_status', newStatus)
      formData.append('reason', reason)

      await axios.post(`${getApiUrl()}/hr/applications/bulk-status-update`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      fetchApplications()
      if (activeTab === 'talent-pool') {
        fetchTalentPoolCandidates()
      }
      if (onStatsUpdate) onStatsUpdate()
    } catch (error) {
      console.error('Error updating application status:', error)
      alert('Error updating application status. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const [applicationHistory, setApplicationHistory] = useState<any[]>([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchApplicationHistory = async (applicationId: string) => {
    try {
      setHistoryLoading(true)
      const response = await axios.get(`${getApiUrl()}/hr/applications/${applicationId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplicationHistory(response.data.history || [])
    } catch (error) {
      console.error('Error fetching application history:', error)
      setApplicationHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const showApplicationHistory = (application: JobApplication) => {
    setSelectedApplication(application)
    setIsHistoryModalOpen(true)
    fetchApplicationHistory(application.id)
  }

  const handleApplicationSelection = (applicationId: string, checked: boolean) => {
    if (checked) {
      setSelectedApplicationIds(prev => [...prev, applicationId])
    } else {
      setSelectedApplicationIds(prev => prev.filter(id => id !== applicationId))
    }
  }

  const handleSelectAllApplications = (checked: boolean) => {
    if (checked) {
      setSelectedApplicationIds(applications.map(app => app.id))
    } else {
      setSelectedApplicationIds([])
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (selectedApplicationIds.length === 0 || !bulkStatusData.new_status) return

    try {
      setActionLoading(true)
      const formData = new FormData()
      selectedApplicationIds.forEach(id => formData.append('application_ids', id))
      formData.append('new_status', bulkStatusData.new_status)
      if (bulkStatusData.reason) formData.append('reason', bulkStatusData.reason)
      if (bulkStatusData.notes) formData.append('notes', bulkStatusData.notes)

      await axios.post(`${getApiUrl()}/hr/applications/bulk-status-update`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSelectedApplicationIds([])
      setIsBulkStatusModalOpen(false)
      setBulkStatusData({ new_status: '', reason: '', notes: '' })
      fetchApplications()
      if (activeTab === 'talent-pool') {
        fetchTalentPoolCandidates()
      }
      if (onStatsUpdate) onStatsUpdate()
      
      alert(`${selectedApplicationIds.length} applications updated successfully`)
    } catch (error) {
      console.error('Error performing bulk status update:', error)
      alert('Error performing bulk status update. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'talent_pool':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Users className="w-3 h-3 mr-1" />Talent Pool</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  // Define columns for the enhanced data table
  const applicationColumns: ColumnDefinition<JobApplication>[] = useMemo(() => {
    const baseColumns: ColumnDefinition<JobApplication>[] = [
      {
        key: 'select',
        label: (
          <Checkbox
            checked={selectedApplicationIds.length === applications.length && applications.length > 0}
            onCheckedChange={handleSelectAllApplications}
          />
        ),
        sortable: false,
        render: (_, application) => (
          <Checkbox
            checked={selectedApplicationIds.includes(application.id)}
            onCheckedChange={(checked) => handleApplicationSelection(application.id, checked as boolean)}
          />
        )
      },
      {
        key: 'applicant_name',
        label: 'Applicant',
        render: (_, application) => (
          <div>
            <div className="font-medium">{application.applicant_name}</div>
            <div className="text-sm text-gray-500">{application.applicant_email}</div>
          </div>
        )
      },
      {
        key: 'position',
        label: 'Position',
        className: 'font-medium'
      },
      {
        key: 'department',
        label: 'Department'
      },
      {
        key: 'contact',
        label: 'Contact',
        render: (_, application) => (
          <div className="text-sm">
            <div className="text-gray-900">{application.applicant_phone || application.applicant_data?.phone || '—'}</div>
            <div className="text-gray-500">{application.applicant_email}</div>
          </div>
        )
      },
      {
        key: 'location',
        label: 'Location',
        render: (_, application) => (
          <span className="text-sm text-gray-600">
            {[
              application.applicant_data?.city,
              application.applicant_data?.state
            ].filter(Boolean).join(', ') || '—'}
          </span>
        )
      }
    ]

    if (userRole === 'hr') {
      baseColumns.push({
        key: 'property_name',
        label: 'Property'
      })
    }

    baseColumns.push(
      {
        key: 'status',
        label: 'Status',
        render: (_, application) => getStatusBadge(application.status)
      },
      {
        key: 'applied_at',
        label: 'Applied',
        render: (_, application) => (
          <span className="text-sm text-gray-500">
            {formatDate(application.applied_at)}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, application) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedApplication(application)
                setIsDetailModalOpen(true)
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                showApplicationHistory(application)
              }}
              className="text-gray-600 border-gray-600 hover:bg-gray-50"
            >
              <Clock className="w-4 h-4 mr-1" />
              History
            </Button>
            
            {application.status === 'pending' && userRole === 'manager' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedApplication(application)
                    setJobOfferData({
                      ...jobOfferData,
                      job_title: application.position
                    })
                    setIsApproveModalOpen(true)
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedApplication(application)
                    setIsRejectModalOpen(true)
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {/* Status transition controls for different statuses */}
            {application.status === 'talent_pool' && (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusTransition(application.id, 'pending', 'Reactivated from talent pool')
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reactivate
              </Button>
            )}
            
            {application.status === 'rejected' && userRole === 'hr' && (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusTransition(application.id, 'talent_pool', 'Moved to talent pool for future consideration')
                }}
              >
                <Users className="w-4 h-4 mr-1" />
                To Talent Pool
              </Button>
            )}
          </div>
        )
      }
    )

    return baseColumns
  }, [userRole, jobOfferData])

  // Define search fields for advanced search
  const applicationSearchFields: SearchFieldConfig[] = useMemo(() => [
    { key: 'applicant_name', weight: 3, searchable: true, highlightable: true },
    { key: 'applicant_email', weight: 2, searchable: true, highlightable: true },
    { key: 'position', weight: 2, searchable: true, highlightable: true },
    { key: 'department', weight: 2, searchable: true, highlightable: true },
    { key: 'property_name', weight: 1, searchable: true, highlightable: true },
    { key: 'status', weight: 1, searchable: true, highlightable: false }
  ], [])

  // Define filter fields for advanced filtering
  const applicationFilterFields: FilterFieldConfig[] = useMemo(() => [
    { 
      key: 'applicant_name', 
      label: 'Applicant Name', 
      type: 'text' 
    },
    { 
      key: 'applicant_email', 
      label: 'Email', 
      type: 'text' 
    },
    { 
      key: 'position', 
      label: 'Position', 
      type: 'text' 
    },
    { 
      key: 'department', 
      label: 'Department', 
      type: 'select',
      options: uniqueDepartments.map(dept => ({ value: dept, label: dept }))
    },
    ...(userRole === 'hr' ? [{
      key: 'property_name', 
      label: 'Property', 
      type: 'select' as const,
      options: properties.map(prop => ({ value: prop.name, label: prop.name }))
    }] : []),
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'talent_pool', label: 'Talent Pool' }
      ]
    },
    { 
      key: 'applied_at', 
      label: 'Applied Date', 
      type: 'date' 
    }
  ], [uniqueDepartments, properties, userRole])

  // Define export columns
  const applicationExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'applicant_name', label: 'Applicant Name', type: 'text' },
    { key: 'applicant_email', label: 'Email', type: 'text' },
    { key: 'applicant_phone', label: 'Phone', type: 'text' },
    { key: 'position', label: 'Position', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    ...(userRole === 'hr' ? [{ key: 'property_name', label: 'Property', type: 'text' as const }] : []),
    { 
      key: 'status', 
      label: 'Status', 
      type: 'text',
      format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
    },
    { 
      key: 'applied_at', 
      label: 'Applied Date', 
      type: 'date',
      format: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'reviewed_at', 
      label: 'Reviewed Date', 
      type: 'date',
      format: (value: string) => value ? new Date(value).toLocaleDateString() : 'Not reviewed'
    },
    { key: 'reviewed_by', label: 'Reviewed By', type: 'text' },
    { key: 'rejection_reason', label: 'Rejection Reason', type: 'text' }
  ], [userRole])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Management Screen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading applications...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-opacity duration-300 opacity-100">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <CardTitle className="text-lg sm:text-xl">Applications Management</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 min-h-[44px]">
            <TabsTrigger value="applications" className="text-xs sm:text-sm min-h-[44px]">
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="talent-pool" className="text-xs sm:text-sm min-h-[44px]">
              <span className="hidden sm:inline">Talent Pool ({talentPoolCandidates.length})</span>
              <span className="sm:hidden">Pool ({talentPoolCandidates.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="applications" className="space-y-3 sm:space-y-4">
        {/* Compact Search and Filter Bar */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* Search Bar */}
            <div className="flex-1 w-full sm:min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 flex-shrink-0" />
                <Input
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 min-h-[44px] text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchApplications()}
              disabled={loading}
              className="min-h-[44px] w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span className="sm:hidden ml-2">Refresh</span>
            </Button>
            
            {/* Compact Filters */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Property Filter (HR only) */}
              {userRole === 'hr' && (
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger className="w-full sm:w-[120px] min-h-[44px] text-xs sm:text-sm">
                    <SelectValue placeholder="Property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Department Filter */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="flex-1 sm:w-[120px] min-h-[44px] text-xs sm:text-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-[100px] min-h-[44px] text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="talent_pool">Talent Pool</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Combined Sort */}
              <Select 
                value={`${sortBy}-${sortOrder}`} 
                onValueChange={(value) => {
                  const [field, order] = value.split('-')
                  setSortBy(field)
                  setSortOrder(order as 'asc' | 'desc')
                }}
              >
                <SelectTrigger className="w-[110px] h-9 text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied_at-desc">Newest</SelectItem>
                  <SelectItem value="applied_at-asc">Oldest</SelectItem>
                  <SelectItem value="applicant_name-asc">Name A-Z</SelectItem>
                  <SelectItem value="applicant_name-desc">Name Z-A</SelectItem>
                  <SelectItem value="position-asc">Position A-Z</SelectItem>
                  <SelectItem value="status-asc">Status</SelectItem>
                  {userRole === 'hr' && <SelectItem value="property_name-asc">Property A-Z</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            {/* Bulk Actions */}
            {selectedApplicationIds.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-gray-600">
                  {selectedApplicationIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkStatusModalOpen(true)}
                  className="min-h-[44px] px-3 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>Bulk Update</span>
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!searchQuery && statusFilter === 'all' && departmentFilter === 'all' && propertyFilter === 'all'}
                className="min-h-[44px] px-3 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="min-h-[44px] px-3 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Filter className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Filters</span>
              </Button>
            </div>
          </div>
          
          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mt-2 text-xs sm:text-sm text-gray-500">
            <span>
              {applications.length} applications
            </span>
            {(searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || propertyFilter !== 'all') && (
              <span className="text-blue-600 text-[10px] sm:text-xs">Filters active</span>
            )}
          </div>
          {/* Manager quick QR access */}
          {userRole === 'manager' && currentProperty?.id && (
            <div className="mt-2 sm:mt-3">
              <QRCodeDisplay
                property={{
                  id: currentProperty.id,
                  name: currentProperty.name,
                  qr_code_url: currentProperty.qr_code_url || ''
                }}
                showRegenerateButton={true}
                className="whitespace-nowrap"
              />
            </div>
          )}
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Advanced Filters</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Use these advanced filters when basic filtering doesn't meet your needs.
              </p>
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              Advanced filtering options are available in the table below. Use the search and filter controls in the table header.
            </div>
          </div>
        )}

        {/* Applications Table */}
        <DataTable
          data={applications}
          columns={applicationColumns}
          searchFields={applicationSearchFields}
          filterFields={applicationFilterFields}
          exportColumns={applicationExportColumns}
          enableAdvancedSearch={showAdvancedFilters}
          enableAdvancedFilter={showAdvancedFilters}
          enableExport={true}
          exportFilename="job-applications"
          exportTitle="Job Applications Report"
          searchable={false}
          sortable={false}
          pagination={true}
          pageSize={10}
          loading={loading}
          emptyMessage={
            searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || propertyFilter !== 'all'
              ? 'No applications found. Try adjusting your filters.'
              : 'No applications have been submitted yet.'
          }
          onRowClick={(application) => {
            setSelectedApplication(application)
            setIsDetailModalOpen(true)
          }}
        />
          </TabsContent>
          
          <TabsContent value="talent-pool" className="space-y-3 sm:space-y-4">
            {/* Talent Pool Search and Filter Bar */}
            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {/* Search Bar */}
                <div className="flex-1 w-full sm:min-w-[280px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 flex-shrink-0" />
                    <Input
                      placeholder="Search talent pool candidates..."
                      value={talentPoolSearchQuery}
                      onChange={(e) => setTalentPoolSearchQuery(e.target.value)}
                      className="pl-10 min-h-[44px] text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Compact Filters */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {/* Property Filter (HR only) */}
                  {userRole === 'hr' && (
                    <Select value={talentPoolPropertyFilter} onValueChange={setTalentPoolPropertyFilter}>
                      <SelectTrigger className="w-full sm:w-[120px] min-h-[44px] text-xs sm:text-sm">
                        <SelectValue placeholder="Property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Department Filter */}
                  <Select value={talentPoolDepartmentFilter} onValueChange={setTalentPoolDepartmentFilter}>
                    <SelectTrigger className="flex-1 sm:w-[120px] min-h-[44px] text-xs sm:text-sm">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {uniqueTalentPoolDepartments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Position Filter */}
                  <Select value={talentPoolPositionFilter} onValueChange={setTalentPoolPositionFilter}>
                    <SelectTrigger className="flex-1 sm:w-[120px] min-h-[44px] text-xs sm:text-sm">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {uniqueTalentPoolPositions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {selectedTalentPoolIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedTalentPoolIds.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkActionType('email')
                        setIsBulkActionModalOpen(true)
                      }}
                      className="min-h-[44px] px-3 text-xs sm:text-sm"
                    >
                      <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkActionType('reactivate')
                        setIsBulkActionModalOpen(true)
                      }}
                      className="min-h-[44px] px-3 text-xs sm:text-sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Reactivate</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Results Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mt-2 text-xs sm:text-sm text-gray-500">
                <span>
                  {talentPoolCandidates.length} candidates in talent pool
                </span>
                {selectedTalentPoolIds.length > 0 && (
                  <span className="text-blue-600 text-[10px] sm:text-xs">
                    {selectedTalentPoolIds.length} selected
                  </span>
                )}
              </div>
            </div>

            {/* Talent Pool Candidates Table */}
            {talentPoolLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="text-xs sm:text-sm text-gray-500">Loading talent pool candidates...</div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTalentPoolIds.length === talentPoolCandidates.length && talentPoolCandidates.length > 0}
                          onCheckedChange={handleSelectAllTalentPool}
                        />
                      </TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      {userRole === 'hr' && <TableHead>Property</TableHead>}
                      <TableHead>Experience</TableHead>
                      <TableHead>In Pool Since</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talentPoolCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={userRole === 'hr' ? 8 : 7} className="text-center py-8 text-gray-500">
                          {talentPoolSearchQuery || talentPoolDepartmentFilter !== 'all' || talentPoolPropertyFilter !== 'all' || talentPoolPositionFilter !== 'all'
                            ? 'No candidates found. Try adjusting your filters.'
                            : 'No candidates in talent pool yet.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      talentPoolCandidates.map((candidate) => (
                        <TableRow key={candidate.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedTalentPoolIds.includes(candidate.id)}
                              onCheckedChange={(checked) => handleTalentPoolSelection(candidate.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {candidate.applicant_data.first_name} {candidate.applicant_data.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{candidate.applicant_data.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{candidate.position}</TableCell>
                          <TableCell>{candidate.department}</TableCell>
                          {userRole === 'hr' && <TableCell>{candidate.property_name}</TableCell>}
                          <TableCell>
                            <div className="text-sm">
                              <div>{candidate.applicant_data.experience_years} years</div>
                              <div className="text-gray-500">
                                Hotel: {candidate.applicant_data.hotel_experience || 'No'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {formatDate(candidate.talent_pool_date)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTalentPoolCandidate(candidate)
                                setIsTalentPoolDetailModalOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Application Detail Modal - Enhanced with all fields */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Complete Application Details
                {selectedApplication?.applicant_data?.application_language && (
                  <Badge className="ml-2" variant="secondary">
                    {selectedApplication.applicant_data.application_language === 'es' ? 'Spanish Application' : 'English Application'}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-6">
                {/* Application Status Overview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Position</Label>
                      <p className="font-medium">{selectedApplication.position}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Department</Label>
                      <p>{selectedApplication.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Property</Label>
                      <p>{selectedApplication.property_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                      <p>{selectedApplication.applicant_data.first_name} {selectedApplication.applicant_data.middle_initial ? selectedApplication.applicant_data.middle_initial + ' ' : ''}{selectedApplication.applicant_data.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p>{selectedApplication.applicant_email || selectedApplication.applicant_data.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Primary Phone</Label>
                      <p>{selectedApplication.applicant_phone || selectedApplication.applicant_data.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Secondary Phone</Label>
                      <p>
                        {selectedApplication.applicant_data.secondary_phone || 'Not provided'}
                        {selectedApplication.applicant_data.secondary_phone && selectedApplication.applicant_data.secondary_phone_type && 
                          ` (${selectedApplication.applicant_data.secondary_phone_type})`
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Street Address</Label>
                      <p>
                        {selectedApplication.applicant_data.address || 'Not provided'}
                        {selectedApplication.applicant_data.apartment_unit && `, ${selectedApplication.applicant_data.apartment_unit}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">City, State ZIP</Label>
                      <p>{selectedApplication.applicant_data.city}, {selectedApplication.applicant_data.state} {selectedApplication.applicant_data.zip_code}</p>
                    </div>
                    {/* SSN and Date of Birth removed - collected during onboarding phase for privacy compliance */}
                  </div>
                </div>

                {/* Position & Compensation */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Position & Compensation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Position Applied For</Label>
                      <p>{selectedApplication.position}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Department</Label>
                      <p>{selectedApplication.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Desired Salary</Label>
                      <p>{selectedApplication.applicant_data.salary_desired || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Employment Type</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.employment_type, 'employment_type')}</p>
                    </div>
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Legal & Compliance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">18 Years or Older</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.age_verification, 'boolean')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Work Authorization</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.work_authorized, 'yesno')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Requires Sponsorship</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.sponsorship_required, 'yesno')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Criminal Record</Label>
                      <p>
                        {selectedApplication.applicant_data.conviction_record?.has_conviction === true
                          ? 'Yes - See explanation'
                          : translateStoredValue(selectedApplication.applicant_data.conviction_record?.has_conviction, 'boolean')}
                      </p>
                    </div>
                    {selectedApplication.applicant_data.conviction_record?.has_conviction === true && 
                     selectedApplication.applicant_data.conviction_record?.explanation && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Criminal Record Explanation</Label>
                        <p className="text-sm bg-yellow-50 p-2 rounded">
                          {selectedApplication.applicant_data.conviction_record.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability & Schedule */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Availability & Schedule</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Available Start Date</Label>
                      <p>{selectedApplication.applicant_data.start_date || 'Immediately'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Shift Preference</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.shift_preference, 'shift')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Employment Type</Label>
                      <p>{translateStoredValue(selectedApplication.applicant_data.employment_type, 'employment_type')}</p>
                    </div>
                    {selectedApplication.applicant_data.employment_type === 'Seasonal' && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Seasonal Dates</Label>
                        <p>
                          {selectedApplication.applicant_data.seasonal_start_date && selectedApplication.applicant_data.seasonal_end_date
                            ? `${selectedApplication.applicant_data.seasonal_start_date} to ${selectedApplication.applicant_data.seasonal_end_date}`
                            : 'Not specified'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previous Hotel Experience */}
                {(selectedApplication.applicant_data.previous_hotel_employment || selectedApplication.applicant_data.hotel_experience || selectedApplication.applicant_data.worked_before_hotel) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Previous Hotel Experience</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedApplication.applicant_data.previous_hotel_employment !== undefined || selectedApplication.applicant_data.hotel_experience !== undefined) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Has Hotel Experience</Label>
                          <p>{translateStoredValue(
                            selectedApplication.applicant_data.previous_hotel_employment !== undefined
                              ? selectedApplication.applicant_data.previous_hotel_employment
                              : selectedApplication.applicant_data.hotel_experience,
                            'yesno'
                          )}</p>
                        </div>
                      )}
                      {selectedApplication.applicant_data.previous_hotel_details && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Previous Hotel Details</Label>
                          <p>{selectedApplication.applicant_data.previous_hotel_details}</p>
                        </div>
                      )}
                      {selectedApplication.applicant_data.worked_before_hotel && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Worked at This Hotel Before</Label>
                          <p>{translateStoredValue(selectedApplication.applicant_data.worked_before_hotel, 'yesno')}</p>
                        </div>
                      )}
                      {(selectedApplication.applicant_data.worked_before_hotel === 'Yes' || selectedApplication.applicant_data.worked_before_hotel === 'yes' || selectedApplication.applicant_data.worked_before_hotel === 'sí') && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Previous Work Period</Label>
                            <p>
                              {selectedApplication.applicant_data.worked_before_from && selectedApplication.applicant_data.worked_before_to
                                ? `${selectedApplication.applicant_data.worked_before_from} to ${selectedApplication.applicant_data.worked_before_to}`
                                : 'Not specified'
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Previous Position</Label>
                            <p>{selectedApplication.applicant_data.worked_before_position || 'Not specified'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Previous Supervisor</Label>
                            <p>{selectedApplication.applicant_data.worked_before_supervisor || 'Not specified'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Education History */}
                {selectedApplication.applicant_data.education_history && selectedApplication.applicant_data.education_history.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Education History</h3>
                    <div className="space-y-3">
                      {selectedApplication.applicant_data.education_history.map((edu: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-500">School Name</Label>
                              <p className="text-sm">{edu.school_name || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Location</Label>
                              <p className="text-sm">{edu.location || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Years Attended</Label>
                              <p className="text-sm">{edu.years_attended || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Degree/Diploma</Label>
                              <p className="text-sm">{edu.degree_received || 'Not provided'}</p>
                            </div>
                            {edu.graduated !== undefined && (
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Graduated</Label>
                                <p className="text-sm">{edu.graduated ? 'Yes' : 'No'}</p>
                              </div>
                            )}
                            {edu.major && (
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Major/Course of Study</Label>
                                <p className="text-sm">{edu.major}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employment History */}
                {selectedApplication.applicant_data.employment_history && selectedApplication.applicant_data.employment_history.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Employment History</h3>
                    <div className="space-y-3">
                      {selectedApplication.applicant_data.employment_history.map((job: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Company</Label>
                              <p className="text-sm font-medium">{job.company_name || job.company || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Position</Label>
                              <p className="text-sm">{job.job_title || job.position || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Employment Period</Label>
                              <p className="text-sm">
                                {job.from_date && job.to_date 
                                  ? `${job.from_date} to ${job.to_date}` 
                                  : job.from_date 
                                    ? `${job.from_date} to Present` 
                                    : 'Not provided'
                                }
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Supervisor</Label>
                              <p className="text-sm">{job.supervisor || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Phone</Label>
                              <p className="text-sm">{job.phone || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">May Contact</Label>
                              <p className="text-sm">{job.may_contact ? 'Yes' : job.may_contact === false ? 'No' : 'Not specified'}</p>
                            </div>
                            {(job.starting_salary || job.ending_salary) && (
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Salary</Label>
                                <p className="text-sm">
                                  {job.starting_salary && job.ending_salary
                                    ? `$${job.starting_salary} - $${job.ending_salary}`
                                    : job.starting_salary
                                      ? `Starting: $${job.starting_salary}`
                                      : `Ending: $${job.ending_salary}`
                                  }
                                </p>
                              </div>
                            )}
                            {job.address && (
                              <div className="col-span-2">
                                <Label className="text-sm font-medium text-gray-500">Company Address</Label>
                                <p className="text-sm">{job.address}</p>
                              </div>
                            )}
                            <div className="col-span-2">
                              <Label className="text-sm font-medium text-gray-500">Reason for Leaving</Label>
                              <p className="text-sm">{job.reason_for_leaving || job.reason_left || 'Not provided'}</p>
                            </div>
                            {job.responsibilities && (
                              <div className="col-span-2">
                                <Label className="text-sm font-medium text-gray-500">Responsibilities</Label>
                                <p className="text-sm">{job.responsibilities}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* References */}
                {(selectedApplication.applicant_data.personal_reference || selectedApplication.applicant_data.personal_reference_name) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">References</h3>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reference Name</Label>
                          <p className="text-sm">
                            {typeof selectedApplication.applicant_data.personal_reference === 'object'
                              ? (selectedApplication.applicant_data.personal_reference.name || 'Not specified')
                              : (selectedApplication.applicant_data.personal_reference_name || 'Not specified')
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Relationship</Label>
                          <p className="text-sm">
                            {typeof selectedApplication.applicant_data.personal_reference === 'object'
                              ? (selectedApplication.applicant_data.personal_reference.relationship || 'Not specified')
                              : (selectedApplication.applicant_data.personal_reference_relationship || 'Not specified')
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Phone</Label>
                          <p className="text-sm">
                            {typeof selectedApplication.applicant_data.personal_reference === 'object'
                              ? (selectedApplication.applicant_data.personal_reference.phone || 'Not provided')
                              : (selectedApplication.applicant_data.personal_reference_phone || 'Not provided')
                            }
                          </p>
                        </div>
                        {typeof selectedApplication.applicant_data.personal_reference === 'object' &&
                         selectedApplication.applicant_data.personal_reference.years_known && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Years Known</Label>
                            <p className="text-sm">{selectedApplication.applicant_data.personal_reference.years_known} years</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Email</Label>
                          <p className="text-sm">
                            {typeof selectedApplication.applicant_data.personal_reference === 'object'
                              ? (selectedApplication.applicant_data.personal_reference.email || 'Not provided')
                              : (selectedApplication.applicant_data.personal_reference_email || 'Not provided')
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Military Service */}
                {selectedApplication.applicant_data.military_service && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Military Service</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Service Status</Label>
                        <p>
                          {typeof selectedApplication.applicant_data.military_service === 'object' 
                            ? (selectedApplication.applicant_data.military_service.served ? 'Yes' : 'No')
                            : (selectedApplication.applicant_data.military_service || 'Not specified')
                          }
                        </p>
                      </div>
                      {(typeof selectedApplication.applicant_data.military_service === 'object' 
                        ? selectedApplication.applicant_data.military_service.served === true
                        : selectedApplication.applicant_data.military_service !== 'Never Served') && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Branch</Label>
                            <p>
                              {typeof selectedApplication.applicant_data.military_service === 'object'
                                ? (selectedApplication.applicant_data.military_service.branch || 'Not specified')
                                : (selectedApplication.applicant_data.military_branch || 'Not specified')
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Service Dates</Label>
                            <p>
                              {typeof selectedApplication.applicant_data.military_service === 'object'
                                ? (selectedApplication.applicant_data.military_service.from_date && selectedApplication.applicant_data.military_service.to_date
                                  ? `${selectedApplication.applicant_data.military_service.from_date} to ${selectedApplication.applicant_data.military_service.to_date}`
                                  : 'Not specified')
                                : (selectedApplication.applicant_data.military_from && selectedApplication.applicant_data.military_to
                                  ? `${selectedApplication.applicant_data.military_from} to ${selectedApplication.applicant_data.military_to}`
                                  : 'Not specified')
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Discharge Type</Label>
                            <p>
                              {typeof selectedApplication.applicant_data.military_service === 'object'
                                ? (selectedApplication.applicant_data.military_service.type_of_discharge || 'Not specified')
                                : (selectedApplication.applicant_data.military_discharge_type || 'Not specified')
                              }
                            </p>
                          </div>
                          {typeof selectedApplication.applicant_data.military_service === 'object' && 
                           selectedApplication.applicant_data.military_service.rank_at_discharge && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Rank at Discharge</Label>
                              <p>{selectedApplication.applicant_data.military_service.rank_at_discharge}</p>
                            </div>
                          )}
                          {typeof selectedApplication.applicant_data.military_service === 'object' && 
                           selectedApplication.applicant_data.military_service.disabilities_related && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Service-Related Disabilities</Label>
                              <p>{selectedApplication.applicant_data.military_service.disabilities_related}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Experience & Skills */}
                {(selectedApplication.applicant_data.experience_years || selectedApplication.applicant_data.skills || selectedApplication.applicant_data.languages || selectedApplication.applicant_data.certifications || selectedApplication.applicant_data.skills_languages_certifications) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Experience & Qualifications</h3>
                    <div className="space-y-3">
                      {selectedApplication.applicant_data.experience_years && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Years of Experience</Label>
                          <p className="text-sm">{selectedApplication.applicant_data.experience_years} years</p>
                        </div>
                      )}
                      {selectedApplication.applicant_data.skills_languages_certifications && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Skills, Languages & Certifications</Label>
                          <p className="text-sm">{selectedApplication.applicant_data.skills_languages_certifications}</p>
                        </div>
                      )}
                      {!selectedApplication.applicant_data.skills_languages_certifications && (
                        <>
                          {selectedApplication.applicant_data.skills && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Skills</Label>
                              <p className="text-sm">{selectedApplication.applicant_data.skills}</p>
                            </div>
                          )}
                          {selectedApplication.applicant_data.languages && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Languages</Label>
                              <p className="text-sm">{selectedApplication.applicant_data.languages}</p>
                            </div>
                          )}
                          {selectedApplication.applicant_data.certifications && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Certifications</Label>
                              <p className="text-sm">{selectedApplication.applicant_data.certifications}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Equal Opportunity Information */}
                {(selectedApplication.applicant_data.voluntary_self_identification || selectedApplication.applicant_data.gender || selectedApplication.applicant_data.race_ethnicity || selectedApplication.applicant_data.veteran_status || selectedApplication.applicant_data.disability_status) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Equal Opportunity Information (Voluntary)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedApplication.applicant_data.voluntary_self_identification?.gender || selectedApplication.applicant_data.gender) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Gender</Label>
                          <p>{translateStoredValue(
                            selectedApplication.applicant_data.voluntary_self_identification?.gender || selectedApplication.applicant_data.gender,
                            'gender'
                          )}</p>
                        </div>
                      )}
                      {(selectedApplication.applicant_data.voluntary_self_identification?.ethnicity || selectedApplication.applicant_data.race_ethnicity) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Race/Ethnicity</Label>
                          <p>{selectedApplication.applicant_data.voluntary_self_identification?.ethnicity || selectedApplication.applicant_data.race_ethnicity}</p>
                        </div>
                      )}
                      {(selectedApplication.applicant_data.voluntary_self_identification?.veteran_status || selectedApplication.applicant_data.veteran_status) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Veteran Status</Label>
                          <p>{translateStoredValue(
                            selectedApplication.applicant_data.voluntary_self_identification?.veteran_status || selectedApplication.applicant_data.veteran_status,
                            'veteran_status'
                          )}</p>
                        </div>
                      )}
                      {(selectedApplication.applicant_data.voluntary_self_identification?.disability_status || selectedApplication.applicant_data.disability_status) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Disability Status</Label>
                          <p>{translateStoredValue(
                            selectedApplication.applicant_data.voluntary_self_identification?.disability_status || selectedApplication.applicant_data.disability_status,
                            'disability_status'
                          )}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Additional Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">How did you hear about this position?</Label>
                      <p>{selectedApplication.applicant_data.how_heard || 'Not specified'}</p>
                    </div>
                    {selectedApplication.applicant_data.how_heard_detailed && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">How They Heard - Details</Label>
                        <p className="text-sm">{selectedApplication.applicant_data.how_heard_detailed}</p>
                      </div>
                    )}
                    {selectedApplication.applicant_data.additional_comments && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Additional Comments</Label>
                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedApplication.applicant_data.additional_comments}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Metadata */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Application Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Applied On</Label>
                      <p>{formatDate(selectedApplication.applied_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Application ID</Label>
                      <p className="text-xs font-mono">{selectedApplication.id}</p>
                    </div>
                    {selectedApplication.reviewed_by && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reviewed By</Label>
                          <p>{selectedApplication.reviewed_by}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reviewed At</Label>
                          <p>{selectedApplication.reviewed_at ? formatDate(selectedApplication.reviewed_at) : 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {selectedApplication.rejection_reason && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Rejection Reason</Label>
                        <p className="text-red-600 bg-red-50 p-2 rounded">{selectedApplication.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Application Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a reason for rejecting this application..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false)
                    setRejectionReason('')
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectApplication}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Application'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Application / Job Offer Modal */}
        <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Approve Application - Job Offer Details</DialogTitle>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900">
                    Creating job offer for: {selectedApplication.applicant_name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Position: {selectedApplication.position} | Department: {selectedApplication.department}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title <span className="text-red-500">*</span></Label>
                    <Input
                      id="job_title"
                      value={jobOfferData.job_title}
                      onChange={(e) => setJobOfferData({...jobOfferData, job_title: e.target.value})}
                      placeholder="Enter job title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={jobOfferData.start_date}
                      onChange={(e) => setJobOfferData({...jobOfferData, start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time <span className="text-red-500">*</span></Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={jobOfferData.start_time}
                      onChange={(e) => setJobOfferData({...jobOfferData, start_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay_rate">Pay Rate ($/hour) <span className="text-red-500">*</span></Label>
                    <Input
                      id="pay_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={jobOfferData.pay_rate}
                      onChange={(e) => setJobOfferData({...jobOfferData, pay_rate: e.target.value})}
                      placeholder="15.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay_frequency">Pay Frequency <span className="text-red-500">*</span></Label>
                    <Select value={jobOfferData.pay_frequency} onValueChange={(value) => setJobOfferData({...jobOfferData, pay_frequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="benefits_eligible">Benefits Eligible <span className="text-red-500">*</span></Label>
                    <Select value={jobOfferData.benefits_eligible} onValueChange={(value) => setJobOfferData({...jobOfferData, benefits_eligible: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="supervisor">Direct Supervisor <span className="text-red-500">*</span></Label>
                    <Input
                      id="supervisor"
                      value={jobOfferData.supervisor}
                      onChange={(e) => setJobOfferData({...jobOfferData, supervisor: e.target.value})}
                      placeholder="Enter supervisor name"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="special_instructions">Special Instructions</Label>
                    <Textarea
                      id="special_instructions"
                      value={jobOfferData.special_instructions}
                      onChange={(e) => setJobOfferData({...jobOfferData, special_instructions: e.target.value})}
                      rows={3}
                      placeholder="Any special instructions for the new employee..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsApproveModalOpen(false)
                      setSelectedApplication(null)
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApproveApplication}
                    disabled={actionLoading || !jobOfferData.job_title || !jobOfferData.start_date || !jobOfferData.start_time || !jobOfferData.pay_rate || !jobOfferData.pay_frequency || !jobOfferData.benefits_eligible || !jobOfferData.supervisor}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? 'Sending Offer...' : 'Send Job Offer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Talent Pool Candidate Detail Modal */}
        <Dialog open={isTalentPoolDetailModalOpen} onOpenChange={setIsTalentPoolDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Talent Pool Candidate Details</DialogTitle>
            </DialogHeader>
            
            {selectedTalentPoolCandidate && (
              <div className="space-y-6">
                {/* Candidate Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Position</Label>
                    <p className="font-medium">{selectedTalentPoolCandidate.position}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Department</Label>
                    <p>{selectedTalentPoolCandidate.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Property</Label>
                    <p>{selectedTalentPoolCandidate.property_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">In Talent Pool Since</Label>
                    <p>{formatDate(selectedTalentPoolCandidate.talent_pool_date)}</p>
                  </div>
                </div>

                {/* Candidate Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Candidate Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.first_name} {selectedTalentPoolCandidate.applicant_data.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Phone</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.address}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">City, State ZIP</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.city}, {selectedTalentPoolCandidate.applicant_data.state} {selectedTalentPoolCandidate.applicant_data.zip_code}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Work Authorization</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.work_authorized}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Experience Years</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.experience_years}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hotel Experience</Label>
                      <p>{selectedTalentPoolCandidate.applicant_data.hotel_experience}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Employment Type</Label>
                      <p>{translateStoredValue(selectedTalentPoolCandidate.applicant_data.employment_type, 'employment_type')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Shift Preference</Label>
                      <p>{translateStoredValue(selectedTalentPoolCandidate.applicant_data.shift_preference, 'shift')}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Timeline</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Originally Applied</Label>
                      <p>{formatDate(selectedTalentPoolCandidate.applied_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Moved to Talent Pool</Label>
                      <p>{formatDate(selectedTalentPoolCandidate.talent_pool_date)}</p>
                    </div>
                    {selectedTalentPoolCandidate.reviewed_by && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reviewed By</Label>
                          <p>{selectedTalentPoolCandidate.reviewed_by}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reviewed At</Label>
                          <p>{selectedTalentPoolCandidate.reviewed_at ? formatDate(selectedTalentPoolCandidate.reviewed_at) : 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Action Modal */}
        <Dialog open={isBulkActionModalOpen} onOpenChange={setIsBulkActionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkActionType === 'email' ? 'Send Email Notifications' : 'Reactivate Candidates'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  {bulkActionType === 'email' 
                    ? `Send email notifications to ${selectedTalentPoolIds.length} selected candidates about new opportunities.`
                    : `Reactivate ${selectedTalentPoolIds.length} selected candidates and move them back to pending status.`
                  }
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkActionModalOpen(false)
                    setSelectedTalentPoolIds([])
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkTalentPoolAction}
                  disabled={actionLoading}
                  className={bulkActionType === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {actionLoading 
                    ? (bulkActionType === 'email' ? 'Sending...' : 'Reactivating...') 
                    : (bulkActionType === 'email' ? 'Send Emails' : 'Reactivate Candidates')
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Application History Modal */}
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Status History</DialogTitle>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900">
                    {selectedApplication.applicant_name} - {selectedApplication.position}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current Status: {getStatusBadge(selectedApplication.status)}
                  </p>
                </div>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading history...</div>
                  </div>
                ) : applicationHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No status changes recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applicationHistory.map((change, index) => (
                      <div key={change.id} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(change.old_status)}
                            <span className="text-gray-400">→</span>
                            {getStatusBadge(change.new_status)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(change.changed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-700">
                            Changed by: <span className="font-medium">{change.changed_by}</span>
                          </p>
                          {change.reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              Reason: {change.reason}
                            </p>
                          )}
                          {change.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              Notes: {change.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Status Update Modal */}
        <Dialog open={isBulkStatusModalOpen} onOpenChange={setIsBulkStatusModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Status Update</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  Update status for {selectedApplicationIds.length} selected applications.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-status">New Status</Label>
                  <Select 
                    value={bulkStatusData.new_status} 
                    onValueChange={(value) => setBulkStatusData({...bulkStatusData, new_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="talent_pool">Talent Pool</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="bulk-reason">Reason</Label>
                  <Input
                    id="bulk-reason"
                    value={bulkStatusData.reason}
                    onChange={(e) => setBulkStatusData({...bulkStatusData, reason: e.target.value})}
                    placeholder="Reason for status change"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                  <Textarea
                    id="bulk-notes"
                    value={bulkStatusData.notes}
                    onChange={(e) => setBulkStatusData({...bulkStatusData, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkStatusModalOpen(false)
                    setBulkStatusData({ new_status: '', reason: '', notes: '' })
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkStatusUpdate}
                  disabled={actionLoading || !bulkStatusData.new_status}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}