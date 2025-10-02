import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Eye, CheckCircle, XCircle, Clock, Filter, Building2, RefreshCw, Users, MapPin } from 'lucide-react'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { getApiUrl } from '@/config/api'

interface SystemApplication {
  id: string
  property_id: string
  property_name: string
  property_city: string
  property_state: string
  property_active: boolean
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  department: string
  position: string
  status: 'pending' | 'approved' | 'rejected' | 'talent_pool'
  applied_at: string
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
  applicant_data: Record<string, any>
}

interface SystemApplicationsTabProps {
  onStatsUpdate?: () => void
}

export function SystemApplicationsTab({ onStatsUpdate }: SystemApplicationsTabProps) {
  const { token } = useAuth()
  const [applications, setApplications] = useState<SystemApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('applied_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedApplication, setSelectedApplication] = useState<SystemApplication | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [jobOfferData, setJobOfferData] = useState({
    start_date: '',
    department: '',
    position: '',
    pay_rate: '',
    employment_type: 'full-time'
  })

  // Fetch all properties for filtering
  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/hr/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const propertiesData = response.data.data || response.data
      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  // Fetch applications from the new endpoint
  const fetchApplications = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (propertyFilter !== 'all') params.append('property_id', propertyFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (departmentFilter !== 'all') params.append('department', departmentFilter)
      if (positionFilter !== 'all') params.append('position', positionFilter)
      if (searchQuery) params.append('search', searchQuery)
      params.append('sort_by', sortBy)
      params.append('sort_order', sortOrder)
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())

      const response = await axios.get(`${getApiUrl()}/hr/applications/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setApplications(response.data.applications || [])
      setTotalCount(response.data.total || 0)
    } catch (error) {
      console.error('Error fetching system applications:', error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
    fetchProperties()
  }, [searchQuery, statusFilter, propertyFilter, departmentFilter, positionFilter, sortBy, sortOrder, currentPage])

  // Auto-refresh applications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchApplications()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Get unique values for filters
  const uniqueDepartments = useMemo(() => {
    return [...new Set(applications.map(app => app.department).filter(Boolean))].sort()
  }, [applications])

  const uniquePositions = useMemo(() => {
    return [...new Set(applications.map(app => app.position).filter(Boolean))].sort()
  }, [applications])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPropertyFilter('all')
    setDepartmentFilter('all')
    setPositionFilter('all')
    setSortBy('applied_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const handleApproveApplication = async () => {
    if (!selectedApplication) return

    if (selectedApplication.status !== 'pending') {
      alert('This application is no longer pending.')
      fetchApplications()
      setIsApproveModalOpen(false)
      return
    }

    try {
      setActionLoading(true)
      
      await axios.post(
        `/applications/${selectedApplication.id}/approve-enhanced`,
        {
          ...jobOfferData,
          send_email: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      await fetchApplications()
      if (onStatsUpdate) onStatsUpdate()
      setIsApproveModalOpen(false)
      setSelectedApplication(null)
      setJobOfferData({
        start_date: '',
        department: '',
        position: '',
        pay_rate: '',
        employment_type: 'full-time'
      })
    } catch (error: any) {
      console.error('Error approving application:', error)
      alert(error.response?.data?.detail || 'Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectApplication = async () => {
    if (!selectedApplication || !rejectionReason.trim()) return

    try {
      setActionLoading(true)
      
      await axios.post(
        `/applications/${selectedApplication.id}/reject-enhanced`,
        {
          reason: rejectionReason,
          add_to_talent_pool: false
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      await fetchApplications()
      if (onStatsUpdate) onStatsUpdate()
      setIsRejectModalOpen(false)
      setSelectedApplication(null)
      setRejectionReason('')
    } catch (error: any) {
      console.error('Error rejecting application:', error)
      alert(error.response?.data?.detail || 'Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  const openApplicationDetail = (application: SystemApplication) => {
    setSelectedApplication(application)
    setIsDetailModalOpen(true)
  }

  const handleApprove = (application: SystemApplication) => {
    setSelectedApplication(application)
    setJobOfferData({
      start_date: '',
      department: application.department,
      position: application.position,
      pay_rate: '',
      employment_type: 'full-time'
    })
    setIsApproveModalOpen(true)
  }

  const handleReject = (application: SystemApplication) => {
    setSelectedApplication(application)
    setRejectionReason('')
    setIsRejectModalOpen(true)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'talent_pool':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            System-Wide Applications
            <Badge variant="secondary">{totalCount} Total</Badge>
          </CardTitle>
          <Button onClick={fetchApplications} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Properties" />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="talent_pool">Talent Pool</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {uniquePositions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applied_at">Applied Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="property">Property</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Applications Table */}
        {loading ? (
          <div className="text-center py-8">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No applications found matching your filters.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.property_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {application.property_city}, {application.property_state}
                          </div>
                          {!application.property_active && (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.applicant_name}</div>
                          <div className="text-sm text-gray-500">{application.applicant_email}</div>
                          {application.applicant_phone && (
                            <div className="text-sm text-gray-500">{application.applicant_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{application.department}</TableCell>
                      <TableCell>{application.position}</TableCell>
                      <TableCell>
                        {format(parseISO(application.applied_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(application.status)}>
                          {application.status === 'talent_pool' ? 'Talent Pool' : application.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openApplicationDetail(application)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleApprove(application)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => handleReject(application)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} applications
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Application Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Property</Label>
                    <div className="font-medium">{selectedApplication.property_name}</div>
                    <div className="text-sm text-gray-500">
                      {selectedApplication.property_city}, {selectedApplication.property_state}
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusBadgeColor(selectedApplication.status)}>
                      {selectedApplication.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <div>{selectedApplication.department}</div>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <div>{selectedApplication.position}</div>
                  </div>
                  <div>
                    <Label>Applied Date</Label>
                    <div>{format(parseISO(selectedApplication.applied_at), 'MMMM d, yyyy h:mm a')}</div>
                  </div>
                  {selectedApplication.reviewed_at && (
                    <div>
                      <Label>Reviewed Date</Label>
                      <div>{format(parseISO(selectedApplication.reviewed_at), 'MMMM d, yyyy h:mm a')}</div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Applicant Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <div>{selectedApplication.applicant_name}</div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <div>{selectedApplication.applicant_email}</div>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <div>{selectedApplication.applicant_phone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {selectedApplication.notes && (
                  <div className="border-t pt-4">
                    <Label>Notes</Label>
                    <div className="mt-1">{selectedApplication.notes}</div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Modal */}
        <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Application</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Approving application for: <strong>{selectedApplication.applicant_name}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Property: <strong>{selectedApplication.property_name}</strong>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={jobOfferData.start_date}
                      onChange={(e) => setJobOfferData({ ...jobOfferData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pay_rate">Pay Rate</Label>
                    <Input
                      id="pay_rate"
                      type="text"
                      placeholder="e.g., $15/hour"
                      value={jobOfferData.pay_rate}
                      onChange={(e) => setJobOfferData({ ...jobOfferData, pay_rate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      value={jobOfferData.department}
                      onChange={(e) => setJobOfferData({ ...jobOfferData, department: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      type="text"
                      value={jobOfferData.position}
                      onChange={(e) => setJobOfferData({ ...jobOfferData, position: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="employment_type">Employment Type</Label>
                    <Select
                      value={jobOfferData.employment_type}
                      onValueChange={(value) => setJobOfferData({ ...jobOfferData, employment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApproveApplication}
                    disabled={actionLoading || !jobOfferData.start_date || !jobOfferData.pay_rate}
                  >
                    {actionLoading ? 'Approving...' : 'Approve & Send Offer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Rejecting application for: <strong>{selectedApplication.applicant_name}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Property: <strong>{selectedApplication.property_name}</strong>
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="rejection_reason">Rejection Reason</Label>
                  <Textarea
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
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
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}