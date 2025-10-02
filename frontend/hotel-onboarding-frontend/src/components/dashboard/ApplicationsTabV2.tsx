import React from 'react'
import { useDashboardApplications } from '@/contexts/DashboardContext'

export default function ApplicationsTabV2() {
  const { applications, loading, error, refresh } = useDashboardApplications()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Applications</h3>
      <p>Pending Applications: {applications.filter(a => a.status === 'pending').length}</p>
      {/* TODO: Implement full applications management UI */}
    </div>
  )
}