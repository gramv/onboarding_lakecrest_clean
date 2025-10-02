import React from 'react'
import { useDashboardEmployees } from '@/contexts/DashboardContext'

export default function EmployeesTabV2() {
  const { employees, loading, error, refresh } = useDashboardEmployees()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Employees</h3>
      <p>Total Employees: {employees.length}</p>
      {/* TODO: Implement full employees management UI */}
    </div>
  )
}