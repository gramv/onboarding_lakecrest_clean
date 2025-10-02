import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Search, 
  MapPin, 
  Phone, 
  Users, 
  Building2, 
  FileText,
  UserCheck,
  TrendingUp,
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  BarChart3
} from 'lucide-react'
import api from '@/services/api'

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

interface PropertyStats {
  total_applications: number
  pending_applications: number
  approved_applications: number
  total_employees: number
  active_employees: number
}

interface PropertiesOverviewTabProps {
  onStatsUpdate?: () => void
}

type SortField = 'name' | 'city' | 'state' | 'managers' | 'employees' | 'applications'
type SortDirection = 'asc' | 'desc'

function PropertiesOverviewTab({ onStatsUpdate = () => {} }: PropertiesOverviewTabProps) {
  const { user, loading: authLoading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [propertyStats, setPropertyStats] = useState<Record<string, PropertyStats>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { toast } = useToast()

  // Summary statistics
  const totalProperties = properties.length
  const totalManagers = managers.length
  const totalEmployees = Object.values(propertyStats).reduce((sum, stats) => sum + stats.total_employees, 0)
  const totalApplications = Object.values(propertyStats).reduce((sum, stats) => sum + stats.total_applications, 0)
  const pendingApplications = Object.values(propertyStats).reduce((sum, stats) => sum + stats.pending_applications, 0)

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
    }
  }, [authLoading, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchProperties(),
        fetchManagers(),
        fetchAllPropertyStats()
      ])
      onStatsUpdate()
    } catch (error) {
      console.error('Error fetching overview data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch properties overview",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await api.hr.getProperties()
      setProperties(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      const response = await api.hr.getManagers()
      const managersData = Array.isArray(response.data) ? response.data : []
      setManagers(managersData)
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }

  const fetchAllPropertyStats = async () => {
    try {
      const response = await api.hr.getProperties()
      const propertiesList = Array.isArray(response.data) ? response.data : []
      
      // Fetch stats for each property
      const statsPromises = propertiesList.map(async (property: Property) => {
        try {
          const statsResponse = await api.hr.getPropertyStats(property.id)
          return { 
            propertyId: property.id, 
            stats: statsResponse.data || {
              total_applications: 0,
              pending_applications: 0,
              approved_applications: 0,
              total_employees: 0,
              active_employees: 0
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for property ${property.id}:`, error)
          return { 
            propertyId: property.id, 
            stats: {
              total_applications: 0,
              pending_applications: 0,
              approved_applications: 0,
              total_employees: 0,
              active_employees: 0
            }
          }
        }
      })

      const statsResults = await Promise.all(statsPromises)
      const statsMap: Record<string, PropertyStats> = {}
      statsResults.forEach(result => {
        statsMap[result.propertyId] = result.stats
      })
      setPropertyStats(statsMap)
    } catch (error) {
      console.error('Error fetching property stats:', error)
    }
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
      return 'Unknown'
    })
  }

  const getPropertyStats = (propertyId: string): PropertyStats => {
    return propertyStats[propertyId] || {
      total_applications: 0,
      pending_applications: 0,
      approved_applications: 0,
      total_employees: 0,
      active_employees: 0
    }
  }

  const filteredAndSortedProperties = properties
    .filter(property =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getManagerNames(property.manager_ids).some(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      let aValue: any
      let bValue: any

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
        case 'managers':
          aValue = a.manager_ids.length
          bValue = b.manager_ids.length
          break
        case 'employees':
          aValue = getPropertyStats(a.id).total_employees
          bValue = getPropertyStats(b.id).total_employees
          break
        case 'applications':
          aValue = getPropertyStats(a.id).total_applications
          bValue = getPropertyStats(b.id).total_applications
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Properties Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading properties overview...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Properties</p>
                <p className="text-2xl font-bold text-blue-600">{totalProperties}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Managers</p>
                <p className="text-2xl font-bold text-green-600">{totalManagers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-purple-600">{totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-orange-600">{totalApplications}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Applications</p>
                <p className="text-2xl font-bold text-red-600">{pendingApplications}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Properties Details</span>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="h-4 w-4" />
              <span>{totalProperties} properties total</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by property name, location, or manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Properties Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">
                    <button
                      className="flex items-center hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      Property
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      className="flex items-center hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('city')}
                    >
                      Location
                      {getSortIcon('city')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      className="flex items-center hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('managers')}
                    >
                      Managers
                      {getSortIcon('managers')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      className="flex items-center hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('employees')}
                    >
                      Employees
                      {getSortIcon('employees')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      className="flex items-center hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('applications')}
                    >
                      Applications
                      {getSortIcon('applications')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProperties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No properties found matching your search.' : 'No properties found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedProperties.map((property) => {
                    const stats = getPropertyStats(property.id)
                    const managerNames = getManagerNames(property.manager_ids)
                    
                    return (
                      <TableRow key={property.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{property.name}</div>
                            <div className="text-sm text-gray-500">ID: {property.id.slice(0, 8)}...</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-sm">{property.city}, {property.state}</div>
                              <div className="text-xs text-gray-500">{property.zip_code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-4 h-4 text-gray-400" />
                            <div>
                              {managerNames.length > 0 ? (
                                <div>
                                  <div className="text-sm font-medium">{managerNames.length}</div>
                                  <div className="text-xs text-gray-500">
                                    {managerNames.slice(0, 2).join(', ')}
                                    {managerNames.length > 2 && ` +${managerNames.length - 2}`}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">None</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{stats.total_employees}</div>
                              <div className="text-xs text-gray-500">
                                {stats.active_employees} active
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{stats.total_applications}</div>
                              {stats.pending_applications > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {stats.pending_applications} pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={property.is_active ? "default" : "secondary"}>
                            {property.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PropertiesOverviewTab