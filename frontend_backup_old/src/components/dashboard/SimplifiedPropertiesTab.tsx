import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Building2, MapPin, Phone, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import axios from 'axios'

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  is_active: boolean
  created_at: string
}

export function SimplifiedPropertiesTab() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: ''
  })
  
  const { toast } = useToast()
  const API_BASE = 'http://127.0.0.1:8000'
  
  // Get auth token
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  })

  // Fetch properties - NO CACHING, DIRECT API CALL
  const fetchProperties = async () => {
    console.log('📡 Fetching properties directly from server...')
    try {
      const response = await axios.get(`${API_BASE}/hr/properties`, {
        headers: getAuthHeaders()
      })
      // Backend wraps successful results under data
      const data = response.data?.data || response.data?.properties || response.data || []
      console.log(`✅ Fetched ${data.length} properties`)
      setProperties(data)
    } catch (error: any) {
      console.error('❌ Failed to fetch properties:', error)
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Create property
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zip_code) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    console.log('➕ Creating property:', formData.name)

    try {
      // Create as form data
      const params = new URLSearchParams()
      Object.entries(formData).forEach(([key, value]) => {
        params.append(key, value)
      })

      await axios.post(`${API_BASE}/hr/properties`, params, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      toast({
        title: "Success",
        description: `Property "${formData.name}" created successfully`
      })

      // Reset form and close dialog
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: ''
      })
      setShowCreateDialog(false)

      // IMPORTANT: Fetch fresh data and UPDATE STATE
      await fetchProperties()
      
    } catch (error: any) {
      console.error('❌ Failed to create property:', error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create property",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  // Delete property
  const handleDelete = async (propertyId: string) => {
    setDeleting(propertyId)
    console.log('🗑️ Deleting property:', propertyId)
    
    // Optimistic update - remove from UI immediately
    const originalProperties = properties
    setProperties(prev => prev.filter(p => p.id !== propertyId))
    
    try {
      await axios.delete(`${API_BASE}/hr/properties/${propertyId}`, {
        headers: getAuthHeaders()
      })

      toast({
        title: "Success", 
        description: "Property deleted successfully"
      })

      // Fetch fresh data to sync with server
      await fetchProperties()
      
    } catch (error: any) {
      console.error('❌ Failed to delete property:', error)
      
      // Revert optimistic update on error
      setProperties(originalProperties)
      
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete property",
        variant: "destructive"
      })
    } finally {
      setDeleting(null)
      setDeleteConfirmId(null)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProperties()
  }, [])

  // Auto-refresh every 5 seconds (optional - remove if not needed)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!creating && !deleting) {
        console.log('🔄 Auto-refreshing properties...')
        fetchProperties()
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [creating, deleting])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Properties Management</h2>
          <p className="text-muted-foreground">Manage hotel properties (Simplified - No Cache)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchProperties}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date().toLocaleTimeString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Properties List */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No properties found</p>
              <Button 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Add First Property
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">{property.name}</h3>
                      {property.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{property.address}, {property.city}, {property.state} {property.zip_code}</span>
                      </div>
                      {property.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{property.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmId(property.id)}
                    disabled={deleting === property.id}
                  >
                    {deleting === property.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Grand Hotel"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main St"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="New York"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="NY"
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input
                  id="zip"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                  placeholder="10001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="555-0123"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Property'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}