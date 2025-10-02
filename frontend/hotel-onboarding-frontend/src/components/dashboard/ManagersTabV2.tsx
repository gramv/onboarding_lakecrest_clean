/**
 * Managers Tab V2 - Simplified with centralized state
 * No performance metrics, focus on manager management
 */

import React, { useState } from 'react'
import { useDashboardManagers, useDashboardProperties } from '@/contexts/DashboardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, Edit, Trash2, Search, User, 
  Building, Mail, Calendar, Shield
} from 'lucide-react'
import axios from 'axios'

interface ManagerFormData {
  email: string
  first_name: string
  last_name: string
  property_id: string
  password: string
}

export default function ManagersTabV2() {
  const { managers, loading, error, refresh } = useDashboardManagers()
  const { properties } = useDashboardProperties()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProperty, setFilterProperty] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingManager, setEditingManager] = useState<any>(null)
  const [formData, setFormData] = useState<ManagerFormData>({
    email: '',
    first_name: '',
    last_name: '',
    property_id: '',
    password: ''
  })

  // Filter managers
  const filteredManagers = managers.filter(manager => {
    const matchesSearch = 
      manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${manager.first_name} ${manager.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProperty = filterProperty === 'all' || 
      (filterProperty === 'unassigned' && !manager.property_id) ||
      manager.property_id === filterProperty

    return matchesSearch && matchesProperty
  })

  // Create manager
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const formDataToSend = new FormData()
      formDataToSend.append('email', formData.email)
      formDataToSend.append('first_name', formData.first_name)
      formDataToSend.append('last_name', formData.last_name)
      formDataToSend.append('password', formData.password)
      if (formData.property_id && formData.property_id !== 'none') {
        formDataToSend.append('property_id', formData.property_id)
      }

      await axios.post('http://127.0.0.1:8000/hr/managers', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Manager created successfully'
      })

      setIsCreateOpen(false)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        property_id: '',
        password: ''
      })
      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create manager',
        variant: 'destructive'
      })
    }
  }

  // Update manager
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingManager) return

    try {
      const token = localStorage.getItem('token')
      const formDataToSend = new FormData()
      if (formData.email) formDataToSend.append('email', formData.email)
      if (formData.first_name) formDataToSend.append('first_name', formData.first_name)
      if (formData.last_name) formDataToSend.append('last_name', formData.last_name)

      await axios.put(
        `http://127.0.0.1:8000/hr/managers/${editingManager.id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      // Handle property assignment separately
      const previousPropertyId = editingManager.property_id || 'none'
      const newPropertyId = formData.property_id || 'none'

      if (previousPropertyId !== 'none' && newPropertyId === 'none') {
        // Remove assignment
        await axios.delete(
          `http://127.0.0.1:8000/hr/properties/${previousPropertyId}/managers/${editingManager.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {})
      }

      if (newPropertyId !== 'none' && newPropertyId !== previousPropertyId) {
        // Add new assignment
        const params = new URLSearchParams()
        params.append('manager_id', editingManager.id)
        await axios.post(
          `http://127.0.0.1:8000/hr/properties/${newPropertyId}/managers`,
          params,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        ).catch(() => {})
      }

      toast({
        title: 'Success',
        description: 'Manager updated successfully'
      })

      setIsEditOpen(false)
      setEditingManager(null)
      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update manager',
        variant: 'destructive'
      })
    }
  }

  // Delete manager
  const handleDelete = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this manager?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`http://127.0.0.1:8000/hr/managers/${managerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: 'Success',
        description: 'Manager deleted successfully'
      })

      refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete manager',
        variant: 'destructive'
      })
    }
  }

  // Open edit dialog
  const openEditDialog = (manager: any) => {
    setEditingManager(manager)
    setFormData({
      email: manager.email,
      first_name: manager.first_name || '',
      last_name: manager.last_name || '',
      property_id: manager.property_id || 'none',
      password: ''
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
              placeholder="Search managers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                Add a new property manager to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="property_id">Assign to Property</Label>
                <Select
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No assignment</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Manager</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Managers List */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredManagers.map((manager) => (
                <tr key={manager.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {manager.first_name} {manager.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{manager.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      {manager.property_name || (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={manager.is_active ? 'default' : 'secondary'}>
                      {manager.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(manager.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(manager)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(manager.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>
              Update manager information and property assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_property">Assign to Property</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Manager</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredManagers.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm || filterProperty !== 'all' 
              ? 'No managers found matching your filters.' 
              : 'No managers yet. Create your first manager to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}