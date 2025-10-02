/**
 * Properties Tab V2 - Simplified with centralized state
 * No performance metrics, focus on property management
 */

import React, { useState } from 'react'
import { useDashboardProperties } from '@/contexts/DashboardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, Edit, Trash2, Search, Building, 
  MapPin, Phone, QrCode, Users
} from 'lucide-react'
import axios from 'axios'

interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
}

export default function PropertiesTabV2() {
  const { properties, loading, error, refresh } = useDashboardProperties()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<any>(null)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: ''
  })

  // Filter properties
  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.state.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Create property
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value)
      })

      await axios.post('http://127.0.0.1:8000/hr/properties', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Property created successfully'
      })

      setIsCreateOpen(false)
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: ''
      })
      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create property',
        variant: 'destructive'
      })
    }
  }

  // Update property
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProperty) return

    try {
      const token = localStorage.getItem('token')
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value) formDataToSend.append(key, value)
      })

      await axios.put(
        `http://127.0.0.1:8000/hr/properties/${editingProperty.id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      toast({
        title: 'Success',
        description: 'Property updated successfully'
      })

      setIsEditOpen(false)
      setEditingProperty(null)
      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update property',
        variant: 'destructive'
      })
    }
  }

  // Delete property
  const handleDelete = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`http://127.0.0.1:8000/hr/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: 'Success',
        description: 'Property deleted successfully'
      })

      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete property',
        variant: 'destructive'
      })
    }
  }

  // Open edit dialog
  const openEditDialog = (property: any) => {
    setEditingProperty(property)
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zip_code: property.zip_code,
      phone: property.phone || ''
    })
    setIsEditOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={refresh} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
              <DialogDescription>
                Add a new hotel property to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip_code">ZIP Code *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Property</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProperties.map((property) => (
          <div key={property.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{property.name}</h3>
                <Badge variant={property.is_active ? 'default' : 'secondary'}>
                  {property.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(property)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(property.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{property.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>{property.city}, {property.state} {property.zip_code}</span>
              </div>
              {property.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{property.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{property.manager_ids?.length || 0} managers</span>
              </div>
            </div>

            {property.qr_code_url && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <QrCode className="h-4 w-4" />
                  <a
                    href={property.qr_code_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View QR Code
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Property Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_address">Address *</Label>
              <Input
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_city">City *</Label>
                <Input
                  id="edit_city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_state">State *</Label>
                <Input
                  id="edit_state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_zip">ZIP Code *</Label>
                <Input
                  id="edit_zip"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Property</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'No properties found matching your search.' : 'No properties yet. Create your first property to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}