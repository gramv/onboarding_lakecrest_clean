import React, { useState, useEffect } from 'react'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle, Users, FileText, UserCheck, Building } from 'lucide-react'
import axios from 'axios'
import { getApiUrl } from '@/config/api'

interface DeletionCheckResult {
  canDelete: boolean
  property: {
    id: string
    name: string
  }
  blockers: {
    managers: Array<{
      id: string
      email: string
      name: string
    }>
    activeEmployees: number
    pendingApplications: number
    totalApplications: number
    totalEmployees: number
  }
  suggestions: {
    autoUnassign: boolean
    reassignToProperties: Array<{
      id: string
      name: string
    }>
  }
  message: string
}

interface SmartDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  propertyName: string
  onDelete: () => Promise<void>
  onSuccess: () => void
}

export function SmartDeleteDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  onDelete,
  onSuccess
}: SmartDeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<DeletionCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open && propertyId) {
      checkDeletion()
    }
  }, [open, propertyId])

  const checkDeletion = async () => {
    setChecking(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${getApiUrl()}/hr/properties/${propertyId}/can-delete`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setCheckResult(response.data)
    } catch (error: any) {
      console.error('Failed to check deletion:', error)
      setError(error.response?.data?.detail || 'Failed to check if property can be deleted')
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setDeleting(false)
    }
  }

  const renderBlockerIcon = (type: string) => {
    switch (type) {
      case 'managers':
        return <Users className="w-4 h-4" />
      case 'applications':
        return <FileText className="w-4 h-4" />
      case 'employees':
        return <UserCheck className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Property: {propertyName}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {checking ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Checking property dependencies...</span>
                </div>
              ) : checkResult ? (
                <>
                  {/* Deletion Status */}
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    checkResult.canDelete 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {checkResult.canDelete ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">This property can be safely deleted</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">{checkResult.message}</span>
                      </>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Property Status</h4>
                    
                    {/* Managers */}
                    {checkResult.blockers.managers.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {checkResult.blockers.managers.length} Manager(s) Assigned
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {checkResult.blockers.managers.map(m => m.name || m.email).join(', ')}
                          </div>
                          {checkResult.suggestions.autoUnassign && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Will be automatically unassigned
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Applications */}
                    {checkResult.blockers.pendingApplications > 0 && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-red-600">
                            {checkResult.blockers.pendingApplications} Pending Application(s)
                          </div>
                          <div className="text-xs text-gray-600">
                            Must be processed before deletion
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Employees */}
                    {checkResult.blockers.activeEmployees > 0 && (
                      <div className="flex items-start gap-2">
                        <UserCheck className="w-4 h-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-red-600">
                            {checkResult.blockers.activeEmployees} Active Employee(s)
                          </div>
                          <div className="text-xs text-gray-600">
                            Must be reassigned or made inactive
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No blockers */}
                    {checkResult.blockers.managers.length === 0 && 
                     checkResult.blockers.pendingApplications === 0 && 
                     checkResult.blockers.activeEmployees === 0 && (
                      <div className="text-sm text-gray-600">
                        No active dependencies found
                      </div>
                    )}
                  </div>

                  {/* Reassignment Suggestions */}
                  {!checkResult.canDelete && checkResult.suggestions.reassignToProperties.length > 0 && (
                    <Alert>
                      <Building className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Suggestion:</strong> Reassign employees and managers to:
                        <div className="mt-2 space-y-1">
                          {checkResult.suggestions.reassignToProperties.map(prop => (
                            <div key={prop.id} className="text-sm">
                              • {prop.name}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Warning for deletable properties */}
                  {checkResult.canDelete && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This action will permanently delete the property
                        {checkResult.blockers.managers.length > 0 && 
                          ` and unassign ${checkResult.blockers.managers.length} manager(s)`}.
                        This cannot be undone.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          {checkResult?.canDelete && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  Delete Property
                  {checkResult.blockers.managers.length > 0 && 
                    ` & Unassign ${checkResult.blockers.managers.length} Manager(s)`}
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}