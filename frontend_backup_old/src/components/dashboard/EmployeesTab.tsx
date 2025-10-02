import React, { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTable, ColumnDefinition } from '@/components/ui/data-table'
import { SearchFieldConfig } from '@/components/ui/advanced-search'
import { FilterFieldConfig } from '@/components/ui/advanced-filter'
import { ExportColumn } from '@/components/ui/data-export'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Filter, Eye, Users, UserCheck, UserX, Clock } from 'lucide-react'
import axios from 'axios'
import { Label } from '@radix-ui/react-label'

interface Employee {
  id: string
  employee_number?: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  property_id: string
  property_name: string
  department: string
  position: string
  hire_date?: string
  start_date?: string
  employment_status: string
  onboarding_status: string
  pay_rate?: number
  pay_frequency: string
  employment_type: string
  manager_name?: string
  created_at: string
  onboarding_completed_at?: string
}

interface EmployeeDetails extends Employee {
  property_address: string
  manager_id: string
  personal_info: any
  emergency_contacts: any[]
  application_data?: {
    id: string
    applied_at: string
    applicant_data: any
  }
  onboarding_progress?: {
    status: string
    current_step: string
    progress_percentage: number
    steps_completed: string[]
    employee_completed_at?: string
    manager_review_started_at?: string
  }
}

interface FilterOptions {
  departments: string[]
  statuses: string[]
  properties: { id: string; name: string }[]
}

interface EmployeesTabProps {
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

export function EmployeesTab({ userRole: propUserRole, propertyId: propPropertyId, onStatsUpdate: propOnStatsUpdate }: EmployeesTabProps) {
  const outletContext = useOutletContext<OutletContext>()
  const userRole = propUserRole || outletContext?.userRole || 'hr'
  const propertyId = propPropertyId || outletContext?.propertyId
  const onStatsUpdate = propOnStatsUpdate || outletContext?.onStatsUpdate || (() => { })
  const { token, user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [],
    statuses: [],
    properties: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Sorting states
  const [sortBy, setSortBy] = useState<string>('first_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Advanced filtering state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newEmployeeStatus, setNewEmployeeStatus] = useState('')
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  // Fetch employees and filter options
  useEffect(() => {
    fetchEmployees()
    fetchFilterOptions()
  }, [])

  // Apply filters when filter states change
  useEffect(() => {
    applyFilters()
  }, [employees, searchQuery, selectedProperty, selectedDepartment, selectedStatus, sortBy, sortOrder])

  const fetchEmployees = async () => {
    try {
      setLoading(true)

      // Fetch all employees without any filters - we'll filter on the client side
      const response = await axios.get('/api/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      })

      console.log('Fetched employees:', response.data.employees)
      setEmployees(response.data.employees || [])
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch employees')
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/hr/properties', {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Extract unique departments and statuses from employees
      const departments = [...new Set((employees || []).map(emp => emp.department).filter(Boolean))].sort()
      const statuses = [...new Set((employees || []).map(emp => emp.employment_status).filter(Boolean))].sort()

      setFilterOptions({
        departments,
        statuses,
        properties: response.data || []
      })
    } catch (err) {
      console.error('Error fetching filter options:', err)
    }
  }

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setDetailsLoading(true)
      const response = await axios.get(`/api/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle wrapped response format
      const employeeData = response.data.data || response.data
      setSelectedEmployee(employeeData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch employee details')
      console.error('Error fetching employee details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleUpdateEmployeeStatus = async () => {
    if (!selectedEmployee || !newEmployeeStatus) return

    try {
      setStatusUpdateLoading(true)
      const formData = new FormData()
      formData.append('employment_status', newEmployeeStatus)

      await axios.put(`/api/api/employees/${selectedEmployee.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setIsStatusModalOpen(false)
      setNewEmployeeStatus('')
      fetchEmployees()
      if (onStatsUpdate) onStatsUpdate()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update employee status')
      console.error('Error updating employee status:', err)
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...(employees || [])]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(emp =>
        (emp.first_name || '').toLowerCase().includes(query) ||
        (emp.last_name || '').toLowerCase().includes(query) ||
        (emp.email || '').toLowerCase().includes(query) ||
        (emp.department || '').toLowerCase().includes(query) ||
        (emp.position || '').toLowerCase().includes(query) ||
        (emp.property_name || '').toLowerCase().includes(query)
      )
    }

    // Apply property filter
    if (selectedProperty && selectedProperty !== 'all') {
      filtered = filtered.filter(emp => emp.property_id === selectedProperty)
    }

    // Apply department filter
    if (selectedDepartment && selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment)
    }

    // Apply status filter
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(emp => emp.employment_status === selectedStatus)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Employee] || ''
      let bValue = b[sortBy as keyof Employee] || ''

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

    console.log('Filtered employees:', filtered.length, 'out of', employees.length)
    setFilteredEmployees(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedProperty('all')
    setSelectedDepartment('all')
    setSelectedStatus('all')
    setSortBy('first_name')
    setSortOrder('asc')
  }

  // Define columns for the enhanced data table
  const employeeColumns: ColumnDefinition<Employee>[] = useMemo(() => {
    const baseColumns: ColumnDefinition<Employee>[] = [
      {
        key: 'full_name',
        label: 'Employee',
        render: (_, employee) => (
          <div>
            <div className="font-medium">
              {employee.first_name} {employee.last_name}
            </div>
            <div className="text-sm text-gray-500">{employee.email}</div>
            {employee.employee_number && (
              <div className="text-xs text-gray-400">#{employee.employee_number}</div>
            )}
          </div>
        )
      },
      {
        key: 'department',
        label: 'Department'
      },
      {
        key: 'position',
        label: 'Position'
      }
    ]

    if (userRole === 'hr') {
      baseColumns.push({
        key: 'property_name',
        label: 'Property',
        render: (_, employee) => (
          <div className="text-sm">{employee.property_name}</div>
        )
      })
    }

    baseColumns.push(
      {
        key: 'hire_date',
        label: 'Hire Date',
        render: (_, employee) => formatDate(employee.hire_date)
      },
      {
        key: 'employment_status',
        label: 'Employment Status',
        render: (_, employee) => getStatusBadge(employee.employment_status)
      },
      {
        key: 'onboarding_status',
        label: 'Onboarding Status',
        render: (_, employee) => getOnboardingStatusBadge(employee.onboarding_status)
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, employee) => (
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    fetchEmployeeDetails(employee.id)
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Employee Details</DialogTitle>
                </DialogHeader>
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedEmployee ? (
                  <EmployeeDetailsModal employee={selectedEmployee} />
                ) : null}
              </DialogContent>
            </Dialog>

            {userRole === 'manager' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedEmployee(employee as EmployeeDetails)
                  setNewEmployeeStatus(employee.employment_status)
                  setIsStatusModalOpen(true)
                }}
              >
                Update Status
              </Button>
            )}
          </div>
        )
      }
    )

    return baseColumns
  }, [userRole, detailsLoading, selectedEmployee])

  // Define search fields for advanced search
  const employeeSearchFields: SearchFieldConfig[] = useMemo(() => [
    { key: 'first_name', weight: 3, searchable: true, highlightable: true },
    { key: 'last_name', weight: 3, searchable: true, highlightable: true },
    { key: 'email', weight: 2, searchable: true, highlightable: true },
    { key: 'department', weight: 2, searchable: true, highlightable: true },
    { key: 'position', weight: 2, searchable: true, highlightable: true },
    { key: 'property_name', weight: 1, searchable: true, highlightable: true },
    { key: 'employment_status', weight: 1, searchable: true, highlightable: false },
    { key: 'onboarding_status', weight: 1, searchable: true, highlightable: false },
    { key: 'employee_number', weight: 1, searchable: true, highlightable: true }
  ], [])

  // Define filter fields for advanced filtering
  const employeeFilterFields: FilterFieldConfig[] = useMemo(() => [
    {
      key: 'first_name',
      label: 'First Name',
      type: 'text'
    },
    {
      key: 'last_name',
      label: 'Last Name',
      type: 'text'
    },
    {
      key: 'email',
      label: 'Email',
      type: 'text'
    },
    {
      key: 'employee_number',
      label: 'Employee Number',
      type: 'text'
    },
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      options: (filterOptions.departments || []).map(dept => ({ value: dept, label: dept }))
    },
    {
      key: 'position',
      label: 'Position',
      type: 'text'
    },
    ...(userRole === 'hr' ? [{
      key: 'property_name',
      label: 'Property',
      type: 'select' as const,
      options: (filterOptions.properties || []).map(prop => ({ value: prop.name, label: prop.name }))
    }] : []),
    {
      key: 'employment_status',
      label: 'Employment Status',
      type: 'select',
      options: (filterOptions.statuses || []).map(status => ({
        value: status,
        label: status.replace('_', ' ').toUpperCase()
      }))
    },
    {
      key: 'onboarding_status',
      label: 'Onboarding Status',
      type: 'select',
      options: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'employee_completed', label: 'Employee Completed' },
        { value: 'manager_review', label: 'Manager Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    },
    {
      key: 'hire_date',
      label: 'Hire Date',
      type: 'date'
    },
    {
      key: 'pay_rate',
      label: 'Pay Rate',
      type: 'number'
    }
  ], [filterOptions, userRole])

  // Define export columns
  const employeeExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'employee_number', label: 'Employee Number', type: 'text' },
    { key: 'first_name', label: 'First Name', type: 'text' },
    { key: 'last_name', label: 'Last Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'position', label: 'Position', type: 'text' },
    ...(userRole === 'hr' ? [{ key: 'property_name', label: 'Property', type: 'text' as const }] : []),
    {
      key: 'employment_status',
      label: 'Employment Status',
      type: 'text',
      format: (value: string) => value.replace('_', ' ').toUpperCase()
    },
    {
      key: 'onboarding_status',
      label: 'Onboarding Status',
      type: 'text',
      format: (value: string) => value.replace('_', ' ').toUpperCase()
    },
    {
      key: 'hire_date',
      label: 'Hire Date',
      type: 'date',
      format: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'date',
      format: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'pay_rate',
      label: 'Pay Rate',
      type: 'number',
      format: (value: number) => value ? `$${value.toFixed(2)}` : 'N/A'
    },
    {
      key: 'pay_frequency',
      label: 'Pay Frequency',
      type: 'text',
      format: (value: string) => value.replace('_', ' ').toUpperCase()
    },
    {
      key: 'employment_type',
      label: 'Employment Type',
      type: 'text',
      format: (value: string) => value.replace('_', ' ').toUpperCase()
    },
    { key: 'manager_name', label: 'Manager', type: 'text' },
    {
      key: 'created_at',
      label: 'Created Date',
      type: 'date',
      format: (value: string) => new Date(value).toLocaleDateString()
    }
  ], [userRole])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      terminated: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      on_leave: { variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    return (
      <Badge className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getOnboardingStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      employee_completed: { color: 'bg-yellow-100 text-yellow-800', icon: UserCheck },
      manager_review: { color: 'bg-purple-100 text-purple-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: UserCheck },
      rejected: { color: 'bg-red-100 text-red-800', icon: UserX }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employees Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading employees...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employees Directory
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <Button
              onClick={fetchEmployees}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Compact Search and Filter Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Bar */}
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Compact Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Property Filter (HR only) */}
              {userRole === 'hr' && (
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-[120px] h-9 text-sm">
                    <SelectValue placeholder="Property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {(filterOptions.properties || []).map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Department Filter */}
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(filterOptions.departments || []).map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[100px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(filterOptions.statuses || []).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="first_name-asc">Name A-Z</SelectItem>
                  <SelectItem value="first_name-desc">Name Z-A</SelectItem>
                  <SelectItem value="department-asc">Dept A-Z</SelectItem>
                  <SelectItem value="hire_date-desc">Newest</SelectItem>
                  <SelectItem value="hire_date-asc">Oldest</SelectItem>
                  {userRole === 'hr' && <SelectItem value="property_name-asc">Property A-Z</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!searchQuery && selectedProperty === 'all' && selectedDepartment === 'all' && selectedStatus === 'all'}
                className="h-9 px-3 text-sm"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="h-9 px-3 text-sm"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
            <span>
              {filteredEmployees.length} of {employees.length} employees
            </span>
            {(searchQuery || selectedProperty !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all') && (
              <span className="text-blue-600 text-xs">Filters active</span>
            )}
          </div>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Filters</h3>
              <p className="text-sm text-gray-600">
                Use these advanced filters when basic filtering doesn't meet your needs.
              </p>
            </div>
            {/* The DataTable's advanced filtering will be shown here */}
            <div className="text-sm text-gray-500">
              Advanced filtering options are available in the table below. Use the search and filter controls in the table header.
            </div>
          </div>
        )}

        {/* Employees Table */}
        <DataTable
          data={filteredEmployees}
          columns={employeeColumns}
          searchFields={employeeSearchFields}
          filterFields={employeeFilterFields}
          exportColumns={employeeExportColumns}
          enableAdvancedSearch={showAdvancedFilters}
          enableAdvancedFilter={showAdvancedFilters}
          enableExport={true}
          exportFilename="employees"
          exportTitle="Employee Directory Report"
          searchable={false}
          sortable={false}
          pagination={true}
          pageSize={10}
          loading={loading}
          emptyMessage={
            searchQuery || (selectedProperty !== 'all') || (selectedDepartment !== 'all') || (selectedStatus !== 'all')
              ? 'No employees found. Try adjusting your filters.'
              : 'No employees have been added yet.'
          }
          onRowClick={(employee) => {
            fetchEmployeeDetails(employee.id)
          }}
        />

        {/* Employee Status Update Modal */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Employee Status</DialogTitle>
            </DialogHeader>

            {selectedEmployee && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {selectedEmployee.position} | {selectedEmployee.department}
                  </p>
                  <p className="text-sm text-blue-700">
                    Current Status: {getStatusBadge(selectedEmployee.employment_status)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-status">New Employment Status</Label>
                  <Select value={newEmployeeStatus} onValueChange={setNewEmployeeStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsStatusModalOpen(false)
                      setNewEmployeeStatus('')
                      setSelectedEmployee(null)
                    }}
                    disabled={statusUpdateLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateEmployeeStatus}
                    disabled={statusUpdateLoading || !newEmployeeStatus || newEmployeeStatus === selectedEmployee.employment_status}
                  >
                    {statusUpdateLoading ? 'Updating...' : 'Update Status'}
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

// Employee Details Modal Component
function EmployeeDetailsModal({ employee }: { employee: EmployeeDetails }) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-sm">{employee.first_name} {employee.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm">{employee.email}</p>
            </div>
            {employee.employee_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">Employee Number</label>
                <p className="text-sm">#{employee.employee_number}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Manager</label>
              <p className="text-sm">{employee.manager_name || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Property</label>
              <p className="text-sm">{employee.property_name}</p>
              <p className="text-xs text-gray-400">{employee.property_address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Department</label>
              <p className="text-sm">{employee.department}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Position</label>
              <p className="text-sm">{employee.position}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Employment Type</label>
              <p className="text-sm">{employee.employment_type.replace('_', ' ').toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employment Status and Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status & Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Employment Status</label>
              <div className="mt-1">
                <Badge className={
                  employee.employment_status === 'active' ? 'bg-green-100 text-green-800' :
                    employee.employment_status === 'terminated' ? 'bg-red-100 text-red-800' :
                      employee.employment_status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                }>
                  {employee.employment_status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Hire Date</label>
              <p className="text-sm">{formatDate(employee.hire_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="text-sm">{formatDate(employee.start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-sm">{formatDate(employee.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Pay Rate</label>
              <p className="text-sm">{formatCurrency(employee.pay_rate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Pay Frequency</label>
              <p className="text-sm">{employee.pay_frequency.replace('_', ' ').toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Progress */}
      {employee.onboarding_progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge className={
                  employee.onboarding_progress.status === 'approved' ? 'bg-green-100 text-green-800' :
                    employee.onboarding_progress.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      employee.onboarding_progress.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                }>
                  {employee.onboarding_progress.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Progress</label>
              <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${employee.onboarding_progress.progress_percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {employee.onboarding_progress.progress_percentage}% complete
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Step</label>
              <p className="text-sm">{employee.onboarding_progress.current_step.replace('_', ' ').toUpperCase()}</p>
            </div>
            {employee.onboarding_progress.employee_completed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Employee Completed</label>
                <p className="text-sm">{formatDate(employee.onboarding_progress.employee_completed_at)}</p>
              </div>
            )}
            {employee.onboarding_progress.manager_review_started_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Manager Review Started</label>
                <p className="text-sm">{formatDate(employee.onboarding_progress.manager_review_started_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Data */}
      {employee.application_data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Applied Date</label>
              <p className="text-sm">{formatDate(employee.application_data.applied_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Experience</label>
              <p className="text-sm">{employee.application_data.applicant_data.experience_years || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Hotel Experience</label>
              <p className="text-sm">{employee.application_data.applicant_data.hotel_experience || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}