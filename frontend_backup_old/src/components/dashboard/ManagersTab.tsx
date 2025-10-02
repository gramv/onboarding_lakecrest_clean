import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Search, User, Building, TrendingUp, Users, CheckCircle, XCircle, Clock, RefreshCw, UserX, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '@/services/api'

interface Manager {
  id: string
  email: string
  first_name?: string
  last_name?: string
  property_id?: string
  property_name?: string
  is_active: boolean
  created_at: string
}

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  manager_ids: string[]
  qr_code_url: string
  is_active: boolean
  created_at: string
}

interface ManagerPerformance {
  manager_id: string
  manager_name: string
  property_id?: string
  metrics: {
    total_applications: number
    approved_applications: number
    rejected_applications: number
    pending_applications: number
    approval_rate: number
    total_employees: number
  }
}

interface ManagersTabProps {
  onStatsUpdate?: () => void
}

interface ManagerFormData {
  email: string
  first_name: string
  last_name: string
  property_id: string
  password: string
}

export default function ManagersTab({ onStatsUpdate = () => {} }: ManagersTabProps) {
  const [managers, setManagers] = useState<Manager[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [performanceData, setPerformanceData] = useState<Record<string, ManagerPerformance>>({})
  const [loading, setLoading] = useState(true)
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingManager, setEditingManager] = useState<Manager | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState<ManagerFormData>({
    email: '',
    first_name: '',
    last_name: '',
    property_id: '',
    password: ''
  })

  useEffect(() => {
    fetchManagers()
    fetchProperties()
  }, [showInactive]) // Re-fetch when toggle changes

  useEffect(() => {
    // Fetch performance data for all managers
    managers.forEach(manager => {
      fetchManagerPerformance(manager.id)
    })
  }, [managers])

  const fetchManagers = async () => {
    try {
      // Pass include_inactive parameter based on toggle state
      const response = await api.hr.getManagers(showInactive ? { include_inactive: true } : {})
      
      // API service handles response unwrapping
      const managersList = Array.isArray(response.data) ? response.data : []
      
      // Transform the data to match the expected interface
      const transformedManagers = managersList.map((manager: any) => ({
        id: manager.id,
        email: manager.email,
        first_name: manager.first_name,
        last_name: manager.last_name,
        property_id: manager.properties?.[0]?.id || null,
        property_name: manager.properties?.[0]?.name || null,
        is_active: manager.is_active !== undefined ? manager.is_active : true,
        created_at: manager.created_at
      }))
      
      console.log('Transformed managers:', transformedManagers)
      setManagers(transformedManagers)
    } catch (error) {
      console.error('Failed to fetch managers:', error)
      toast({
        title: "Error",
        description: "Failed to fetch managers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    setPropertiesLoading(true)
    try {
      const response = await api.hr.getProperties()
      // API service handles response unwrapping
      setProperties(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      toast({
        title: "Warning",
        description: "Failed to load properties. Property assignment may not work properly.",
        variant: "destructive"
      })
      setProperties([]) // Set empty array as fallback
    } finally {
      setPropertiesLoading(false)
    }
  }

  const fetchManagerPerformance = async (managerId: string) => {
    try {
      // Note: Performance endpoint may not exist yet - skip for now
      // const response = await api.apiClient.get(`/hr/managers/${managerId}/performance`)
      // setPerformanceData(prev => ({
      //   ...prev,
      //   [managerId]: response.data
      // }))
    } catch (error) {
      console.error(`Failed to fetch performance for manager ${managerId}:`, error)
    }
  }

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      // Convert to object for API service
      const dataObject: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password
      }
      if (formData.property_id && formData.property_id !== 'none') {
        dataObject.property_id = formData.property_id
      }

      // Use the createManager method from API service
      await api.hr.createManager(dataObject)

      toast({
        title: "Success",
        description: "Manager created successfully"
      })

      setIsCreateDialogOpen(false)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        property_id: '',
        password: ''
      })
      fetchManagers()
      onStatsUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create manager",
        variant: "destructive"
      })
    }
  }

  const handleEditManager = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingManager) return

    try {
      // Token is handled by API service
      const formDataToSend = new FormData()
      
      // Debug logging
      console.log('Editing manager:', editingManager.id)
      console.log('Form data:', formData)
      console.log('Original manager data:', editingManager)
      
      if (formData.email) formDataToSend.append('email', formData.email)
      if (formData.first_name) formDataToSend.append('first_name', formData.first_name)
      if (formData.last_name) formDataToSend.append('last_name', formData.last_name)
      
      // Always send property_id to ensure assignment works properly
      const propertyId = formData.property_id === 'none' ? '' : formData.property_id
      formDataToSend.append('property_id', propertyId || '')
      
      console.log('Sending property_id:', propertyId)
      
      // Debug: Log all form data being sent
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`FormData ${key}:`, value)
      }

      // Convert FormData to object for API service
      const dataObject: any = {}
      for (let [key, value] of formDataToSend.entries()) {
        dataObject[key] = value
      }
      
      // Use the updateManager method from API service
      const response = await api.hr.updateManager(editingManager.id, dataObject)
      
      console.log('Update response:', response.data)

      toast({
        title: "Success",
        description: "Manager updated successfully"
      })

      setIsEditDialogOpen(false)
      setEditingManager(null)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        property_id: '',
        password: ''
      })
      fetchManagers()
      onStatsUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update manager",
        variant: "destructive"
      })
    }
  }

  const handleDeleteManager = async (managerId: string) => {
    try {
      await api.hr.deleteManager(managerId)

      toast({
        title: "Success",
        description: "Manager deactivated successfully"
      })

      fetchManagers()
      onStatsUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to deactivate manager",
        variant: "destructive"
      })
    }
  }

  const handleReactivateManager = async (managerId: string) => {
    try {
      await api.hr.reactivateManager(managerId)

      toast({
        title: "Success",
        description: "Manager reactivated successfully"
      })

      fetchManagers()
      onStatsUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to reactivate manager",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (manager: Manager) => {
    console.log('Opening edit dialog for manager:', manager)
    console.log('Manager property_id:', manager.property_id)
    console.log('Available properties:', properties)
    
    setEditingManager(manager)
    const initialFormData = {
      email: manager.email,
      first_name: manager.first_name || '',
      last_name: manager.last_name || '',
      property_id: manager.property_id || 'none',
      password: ''
    }
    console.log('Setting initial form data:', initialFormData)
    setFormData(initialFormData)
    setIsEditDialogOpen(true)
  }

  const filteredManagers = managers.filter(manager => {
    const matchesSearch = 
      manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${manager.first_name} ${manager.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProperty = selectedProperty === 'all' || 
      (selectedProperty === 'unassigned' && !manager.property_id) ||
      manager.property_id === selectedProperty

    return matchesSearch && matchesProperty
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading managers...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Manager Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Managers</p>
                <p className="text-2xl font-bold">{managers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Assigned Properties</p>
                <p className="text-2xl font-bold">
                  {managers.filter(m => m.property_id).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Approval Rate</p>
                <p className="text-2xl font-bold">
                  {Object.values(performanceData).length > 0 
                    ? Math.round(Object.values(performanceData).reduce((sum, p) => {
                        return sum + (p?.metrics?.approval_rate ?? 0)
                      }, 0) / Object.values(performanceData).length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Managers Management</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manager
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Manager</DialogTitle>
                  <DialogDescription>
                    Add a new manager to the system. You can optionally assign them to a property.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateManager} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="property_id">Assign to Property</Label>
                    <Select 
                      value={formData.property_id} 
                      onValueChange={(value) => setFormData({...formData, property_id: value})}
                      disabled={propertiesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          propertiesLoading 
                            ? "Loading properties..." 
                            : properties.length === 0 
                              ? "No properties available" 
                              : "Select a property (optional)"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignment</SelectItem>
                        {properties.length === 0 && !propertiesLoading ? (
                          <SelectItem value="no-properties" disabled>
                            No properties available - Create a property first
                          </SelectItem>
                        ) : (
                          properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name} - {property.city}, {property.state}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {properties.length === 0 && !propertiesLoading && (
                      <p className="text-sm text-gray-500 mt-1">
                        Create properties first to assign managers to them.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Manager</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Toggle for showing inactive managers */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Show Inactive Managers</span>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center space-x-2 px-3 py-1 rounded-md transition-colors"
                style={{
                  backgroundColor: showInactive ? '#3b82f6' : '#e5e7eb',
                  color: showInactive ? 'white' : '#6b7280'
                }}
              >
                {showInactive ? (
                  <ToggleRight className="h-5 w-5" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
                <span className="text-sm">{showInactive ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {showInactive ? 'Showing all managers' : 'Showing only active managers'}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search managers by name, email, or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select 
              value={selectedProperty} 
              onValueChange={setSelectedProperty}
              disabled={propertiesLoading}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={
                  propertiesLoading ? "Loading..." : "Filter by property"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {properties.length === 0 && !propertiesLoading ? (
                  <SelectItem value="no-properties" disabled>
                    No properties available
                  </SelectItem>
                ) : (
                  properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Managers Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Property Assignment</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManagers.map((manager) => {
                  const performance = performanceData[manager.id]
                  return (
                    <TableRow 
                      key={manager.id}
                      className={!manager.is_active ? 'bg-gray-50 opacity-75' : ''}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {manager.first_name} {manager.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Created {new Date(manager.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>{manager.email}</TableCell>
                      
                      <TableCell>
                        {manager.property_name ? (
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4 text-blue-500" />
                            <span>{manager.property_name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {performance?.metrics ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{performance.metrics.approved_applications || 0} approved</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="h-3 w-3 text-yellow-500" />
                              <span>{performance.metrics.pending_applications || 0} pending</span>
                            </div>
                            <div className="text-sm font-medium">
                              {performance.metrics.approval_rate || 0}% approval rate
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={manager.is_active ? "default" : "secondary"}>
                          {manager.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          {manager.is_active ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(manager)}
                                title="Edit Manager"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    title="Deactivate Manager"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate Manager</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to deactivate {manager.first_name} {manager.last_name}? 
                                      They will lose access to the system. You can reactivate them later if needed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteManager(manager.id)}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateManager(manager.id)}
                              title="Reactivate Manager"
                              className="text-green-600 hover:text-green-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            
            {filteredManagers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedProperty !== 'all' 
                  ? "No managers found matching your criteria" 
                  : "No managers found. Create your first manager to get started."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Manager Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>
              Update manager information and property assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditManager} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_property_id">Property Assignment</Label>
              <Select 
                value={formData.property_id} 
                onValueChange={(value) => setFormData({...formData, property_id: value})}
                disabled={propertiesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    propertiesLoading 
                      ? "Loading properties..." 
                      : properties.length === 0 
                        ? "No properties available" 
                        : "Select a property"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {properties.length === 0 && !propertiesLoading ? (
                    <SelectItem value="no-properties" disabled>
                      No properties available - Create a property first
                    </SelectItem>
                  ) : (
                    properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name} - {property.city}, {property.state}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {properties.length === 0 && !propertiesLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  Create properties first to assign managers to them.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Manager</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}