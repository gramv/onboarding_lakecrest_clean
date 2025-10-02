/**
 * Compliance Audit Trail Viewer
 * 
 * Displays federal compliance validation audit trail for legal documentation
 * and regulatory reporting purposes. This component provides transparency
 * into all compliance checks performed during the onboarding process.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, Shield, AlertTriangle, CheckCircle, Clock, Search, 
  Filter, Download, Gavel, Scale, ExternalLink 
} from 'lucide-react'

interface AuditEntry {
  timestamp: string
  form_type: string
  user_id: string
  user_email: string
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT'
  error_count: number
  warning_count: number
  legal_codes: string[]
  compliance_notes: string[]
  audit_id: string
}

interface ComplianceAuditTrailProps {
  apiBaseUrl?: string
}

export default function ComplianceAuditTrail({ 
  apiBaseUrl = 'http://localhost:8000' 
}: ComplianceAuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all')
  const [complianceSummary, setComplianceSummary] = useState<any>(null)

  useEffect(() => {
    fetchAuditTrail()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [auditEntries, searchTerm, statusFilter, formTypeFilter])

  const fetchAuditTrail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/compliance/audit-trail`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAuditEntries(data.entries || [])
      setComplianceSummary(data.compliance_summary)
      setError(null)
    } catch (err) {
      setError(`Failed to fetch audit trail: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = auditEntries

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.audit_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.legal_codes.some(code => code.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.compliance_status === statusFilter)
    }

    // Apply form type filter
    if (formTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.form_type === formTypeFilter)
    }

    setFilteredEntries(filtered)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLIANT') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          COMPLIANT
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          NON-COMPLIANT
        </Badge>
      )
    }
  }

  const getFormTypeBadge = (formType: string) => {
    const typeConfig = {
      'AGE_VALIDATION': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'SSN_VALIDATION': { color: 'bg-purple-100 text-purple-800', icon: Shield },
      'I9_SECTION1_VALIDATION': { color: 'bg-orange-100 text-orange-800', icon: FileText },
      'W4_FORM_VALIDATION': { color: 'bg-indigo-100 text-indigo-800', icon: Scale },
      'COMPREHENSIVE_VALIDATION': { color: 'bg-gray-100 text-gray-800', icon: Gavel }
    }

    const config = typeConfig[formType as keyof typeof typeConfig] || 
      { color: 'bg-gray-100 text-gray-800', icon: FileText }
    const IconComponent = config.icon

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {formType.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const exportAuditTrail = () => {
    const csvContent = [
      ['Audit ID', 'Timestamp', 'Form Type', 'User Email', 'Compliance Status', 'Error Count', 'Warning Count', 'Legal Codes', 'Compliance Notes'].join(','),
      ...filteredEntries.map(entry => [
        entry.audit_id,
        entry.timestamp,
        entry.form_type,
        entry.user_email,
        entry.compliance_status,
        entry.error_count.toString(),
        entry.warning_count.toString(),
        entry.legal_codes.join('; '),
        entry.compliance_notes.join('; ')
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance_audit_trail_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading compliance audit trail...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-semibold">Audit Trail Error</div>
          <div className="text-sm mt-1">{error}</div>
          <Button onClick={fetchAuditTrail} className="mt-2" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Scale className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-blue-800">Federal Compliance Audit Trail</CardTitle>
              <CardDescription className="text-blue-700">
                Legal documentation of all federal employment law compliance validations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      {complianceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {complianceSummary.total_validations}
                  </div>
                  <div className="text-sm text-gray-600">Total Validations</div>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {complianceSummary.compliant_validations}
                  </div>
                  <div className="text-sm text-gray-600">Compliant</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {complianceSummary.non_compliant_validations}
                  </div>
                  <div className="text-sm text-gray-600">Non-Compliant</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Audit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search audit ID, email, or legal code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLIANT">Compliant</SelectItem>
                  <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Form Type</label>
              <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  <SelectItem value="AGE_VALIDATION">Age Validation</SelectItem>
                  <SelectItem value="SSN_VALIDATION">SSN Validation</SelectItem>
                  <SelectItem value="I9_SECTION1_VALIDATION">I-9 Section 1</SelectItem>
                  <SelectItem value="W4_FORM_VALIDATION">W-4 Form</SelectItem>
                  <SelectItem value="COMPREHENSIVE_VALIDATION">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={exportAuditTrail} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600">No audit entries found matching your criteria</div>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.audit_id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="font-mono text-sm text-gray-600">
                      {entry.audit_id}
                    </div>
                    {getFormTypeBadge(entry.form_type)}
                    {getStatusBadge(entry.compliance_status)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">User Information</div>
                    <div className="text-sm text-gray-600">{entry.user_email}</div>
                    <div className="text-xs text-gray-500">ID: {entry.user_id}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Validation Results</div>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-red-600">{entry.error_count} Errors</span>
                      <span className="text-yellow-600">{entry.warning_count} Warnings</span>
                    </div>
                  </div>
                </div>

                {entry.legal_codes.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Legal Codes</div>
                    <div className="flex flex-wrap gap-1">
                      {entry.legal_codes.map((code, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <ExternalLink className="h-2 w-2 mr-1" />
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {entry.compliance_notes.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Compliance Notes</div>
                    <div className="space-y-1">
                      {entry.compliance_notes.map((note, index) => (
                        <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legal Footer */}
      <Alert className="bg-blue-50 border-blue-200">
        <Scale className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="font-semibold mb-1">⚖️ Legal Compliance Documentation</div>
          <div className="text-sm">
            This audit trail serves as official documentation of federal employment law compliance 
            validations. All entries are timestamped and legally binding for regulatory purposes. 
            Audit records are maintained in accordance with federal record-keeping requirements.
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}