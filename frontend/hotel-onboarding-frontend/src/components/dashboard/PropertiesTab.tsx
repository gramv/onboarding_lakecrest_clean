import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Edit, Trash2, QrCode, Search, MapPin, Phone, Users, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Copy } from 'lucide-react'
import api from '@/services/api'
import { PropertyForm } from './PropertyForm'
import { QRCodeDisplay, QRCodeCard } from '@/components/ui/qr-code-display'
import { SmartDeleteDialog } from './SmartDeleteDialog'
import { Label } from '@radix-ui/react-label'

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

interface Manager {
  id: string
  email: string
  first_name?: string
  last_name?: string
  property_id?: string
}

interface PropertiesTabProps {
  onStatsUpdate?: () => void
}

interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
}

type SortField = 'name' | 'city' | 'state' | 'created_at'
type SortDirection = 'asc' | 'desc'

function PropertiesTab({ onStatsUpdate = () => {} }: PropertiesTabProps) {
  const { user, loading: authLoading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)


  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPropertyForDelete, setSelectedPropertyForDelete] = useState<Property | null>(null)
  const { toast } = useToast()
  


  useEffect(() => {
    // Only fetch data after auth is loaded and user is available
    if (!authLoading && user) {
      fetchProperties()
      fetchManagers()
    }
  }, [authLoading, user])

  const fetchProperties = async () => {
    try {
      console.log('Fetching properties...')
      const response = await api.hr.getProperties()
      // API service handles response unwrapping
      const propertiesData = Array.isArray(response.data) ? response.data : []
      console.log(`Fetched ${propertiesData.length} properties`)
      setProperties(propertiesData)
      onStatsUpdate()
    } catch (error: any) {
      console.error('Error fetching properties:', error)
      
      let errorMessage = "Failed to fetch properties"
      if (error.response?.status === 401) {
        errorMessage = "Session expired. Please log in again."
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view properties."
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      
      // Set empty array on error to prevent undefined errors
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const fetchManagers = async () => {
    try {
      // Fetch managers from HR managers endpoint
      const response = await api.hr.getManagers()
      // API service handles response unwrapping
      const managersData = Array.isArray(response.data) ? response.data : []
      setManagers(managersData)
    } catch (error) {
      console.error('Error fetching managers:', error)
      // Don't show error toast for this as it's not critical
    }
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Validate form data before sending
      if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zip_code) {
        throw new Error('Please fill in all required fields')
      }

      // Clean and prepare the data
      const propertyData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zip_code: formData.zip_code.trim(),
        phone: formData.phone.trim() || ''
      }

      // Log the request for debugging
      console.log('Creating property with data:', propertyData)

      const response = await api.hr.createProperty(propertyData)

      toast({
        title: "Success",
        description: `Property "${propertyData.name}" created successfully`
      })

      setIsCreateDialogOpen(false)
      resetForm()
      await fetchProperties() // Wait for fetch to complete
    } catch (error: any) {
      console.error('Error creating property:', error)

      let errorMessage = "Failed to create property"

      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle FastAPI validation errors
          const validationErrors = error.response.data.detail.map((err: any) => {
            // Format field names nicely
            const field = err.loc?.[err.loc.length - 1] || 'field'
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            return `${fieldName}: ${err.msg}`
          })
          errorMessage = validationErrors.join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please check if all fields are correctly filled and try again."
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid data. Please check your input and try again."
      }

      toast({
        title: "Error Creating Property",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProperty) return

    setSubmitting(true)

    try {
      // Validate form data before sending
      if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zip_code) {
        throw new Error('Please fill in all required fields')
      }

      // Clean and prepare the data
      const propertyData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zip_code: formData.zip_code.trim(),
        phone: formData.phone.trim() || ''
      }

      // Log the request for debugging
      console.log('Updating property with data:', propertyData)

      await api.hr.updateProperty(editingProperty.id, propertyData)

      toast({
        title: "Success",
        description: `Property "${propertyData.name}" updated successfully`
      })

      setIsEditDialogOpen(false)
      setEditingProperty(null)
      resetForm()
      await fetchProperties() // Wait for fetch to complete
    } catch (error: any) {
      console.error('Error updating property:', error)

      let errorMessage = "Failed to update property"

      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle FastAPI validation errors
          const validationErrors = error.response.data.detail.map((err: any) => {
            // Format field names nicely
            const field = err.loc?.[err.loc.length - 1] || 'field'
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            return `${fieldName}: ${err.msg}`
          })
          errorMessage = validationErrors.join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please check if all fields are correctly filled and try again."
      } else if (error.response?.status === 404) {
        errorMessage = "Property not found. It may have been deleted."
        // Refresh the list as the property no longer exists
        await fetchProperties()
      }

      toast({
        title: "Error Updating Property",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProperty = async (propertyId: string) => {
    // Show loading state on the delete button if needed
    const propertyToDelete = properties.find(p => p.id === propertyId)
    const propertyName = propertyToDelete?.name || 'property'

    try {
      console.log('Deleting property:', propertyId)
      
      const response = await api.hr.deleteProperty(propertyId)

      // Check if the response contains a detail about manager unassignment
      const message = response.data?.detail || `Property "${propertyName}" deleted successfully`
      
      toast({
        title: "Success",
        description: message
      })

      await fetchProperties() // Wait for fetch to complete
    } catch (error: any) {
      console.error('Error deleting property:', error)

      let errorMessage = "Failed to delete property"

      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
          
          // Provide more helpful guidance for specific errors
          if (errorMessage.includes("active applications or employees")) {
            errorMessage = `Cannot delete "${propertyName}" because it has active applications or employees. Please ensure all applications are processed and employees are reassigned or made inactive before deleting.`
          } else if (errorMessage.includes("has managers assigned")) {
            errorMessage = `Cannot delete "${propertyName}" because it has managers assigned. Please unassign all managers first.`
          }
        }
      } else if (error.response?.status === 404) {
        errorMessage = "Property not found. It may have already been deleted."
        // Refresh the list as the property no longer exists
        await fetchProperties()
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred while deleting the property. Please try again."
      }

      toast({
        title: "Cannot Delete Property",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }



  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: ''
    })
  }

  const openEditDialog = (property: Property) => {
    setEditingProperty(property)
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zip_code: property.zip_code,
      phone: property.phone || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
  }

  const getManagerNames = (managerIds: string[]) => {
    return managerIds.map(id => {
      const manager = managers.find(m => m.id === id)
      if (manager) {
        return manager.first_name && manager.last_name
          ? `${manager.first_name} ${manager.last_name}`
          : manager.email
      }
      return 'Unknown Manager'
    }).join(', ')
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }



  const filteredAndSortedProperties = properties
    .filter(property =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.state.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | Date
      let bValue: string | Date

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'city':
          aValue = a.city.toLowerCase()
          bValue = b.city.toLowerCase()
          break
        case 'state':
          aValue = a.state.toLowerCase()
          bValue = b.state.toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })



  const handleCancel = () => {
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    resetForm()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading properties...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Properties Management</span>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Property</DialogTitle>
                <DialogDescription>
                  Add a new property to the system. A QR code will be generated for job applications.
                </DialogDescription>
              </DialogHeader>
              <PropertyForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreateProperty}
                title="Create Property"
                submitting={submitting}
                onCancel={handleCancel}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search properties by name, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Properties Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('name')}
                  >
                    Property Name
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('city')}
                  >
                    Location
                    {getSortIcon('city')}
                  </Button>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Managers</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('created_at')}
                  >
                    Created
                    {getSortIcon('created_at')}
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No properties found matching your search.' : 'No properties found. Create your first property to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="font-medium">{property.name}</div>
                      <div className="text-sm text-gray-500">ID: {property.id.slice(0, 8)}...</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        <div>
                          <div>{property.address}</div>
                          <div className="text-gray-500">{property.city}, {property.state} {property.zip_code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {property.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-1 text-gray-400" />
                          {property.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-1 text-gray-400" />
                        <div>
                          {property.manager_ids.length > 0 ? (
                            <div className="text-sm">
                              {getManagerNames(property.manager_ids)}
                            </div>
                          ) : (
                            <span className="text-gray-500">No managers assigned</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {new Date(property.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(property)}
                          title="Edit Property"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <QRCodeDisplay
                          property={property}
                          onRegenerate={fetchProperties}
                          showRegenerateButton={true}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Delete Property"
                          onClick={() => {
                            setSelectedPropertyForDelete(property)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update property information and settings.
              </DialogDescription>
            </DialogHeader>
            <PropertyForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleUpdateProperty}
              title="Update Property"
              submitting={submitting}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>

        {/* Smart Delete Dialog */}
        {selectedPropertyForDelete && (
          <SmartDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            propertyId={selectedPropertyForDelete.id}
            propertyName={selectedPropertyForDelete.name}
            onDelete={async () => {
              await handleDeleteProperty(selectedPropertyForDelete.id)
            }}
            onSuccess={() => {
              setSelectedPropertyForDelete(null)
              fetchProperties()
            }}
          />
        )}

      </CardContent>
    </Card>
  )
}

export default PropertiesTab