import React, { useState } from 'react'
import { 
  FileText, Download, Filter, Calendar, Users, 
  Building, TrendingUp, Settings, Plus, X 
} from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

interface ReportParameter {
  name: string
  type: 'text' | 'select' | 'date' | 'daterange' | 'multiselect'
  label: string
  required: boolean
  options?: Array<{ value: string; label: string }>
  value?: any
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  parameters: ReportParameter[]
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'employee_roster',
    name: 'Employee Roster',
    description: 'Complete list of employees with details',
    category: 'Employees',
    parameters: [
      {
        name: 'property_id',
        type: 'select',
        label: 'Property',
        required: false,
        options: []
      },
      {
        name: 'department',
        type: 'select',
        label: 'Department',
        required: false,
        options: [
          { value: 'all', label: 'All Departments' },
          { value: 'front_desk', label: 'Front Desk' },
          { value: 'housekeeping', label: 'Housekeeping' },
          { value: 'food_service', label: 'Food Service' },
          { value: 'maintenance', label: 'Maintenance' }
        ]
      },
      {
        name: 'include_inactive',
        type: 'select',
        label: 'Include Inactive',
        required: false,
        options: [
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' }
        ]
      }
    ]
  },
  {
    id: 'application_summary',
    name: 'Application Summary',
    description: 'Summary of job applications by status and property',
    category: 'Applications',
    parameters: [
      {
        name: 'date_range',
        type: 'select',
        label: 'Date Range',
        required: true,
        options: [
          { value: 'last_7_days', label: 'Last 7 Days' },
          { value: 'last_30_days', label: 'Last 30 Days' },
          { value: 'last_90_days', label: 'Last 90 Days' },
          { value: 'custom', label: 'Custom Range' }
        ]
      },
      {
        name: 'group_by',
        type: 'select',
        label: 'Group By',
        required: false,
        options: [
          { value: 'status', label: 'Status' },
          { value: 'property', label: 'Property' },
          { value: 'position', label: 'Position' },
          { value: 'manager', label: 'Manager' }
        ]
      }
    ]
  },
  {
    id: 'compliance_audit',
    name: 'Compliance Audit',
    description: 'Federal compliance status for I-9 and W-4 forms',
    category: 'Compliance',
    parameters: [
      {
        name: 'property_id',
        type: 'select',
        label: 'Property',
        required: false,
        options: []
      },
      {
        name: 'check_i9',
        type: 'select',
        label: 'Check I-9 Compliance',
        required: false,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      },
      {
        name: 'check_w4',
        type: 'select',
        label: 'Check W-4 Compliance',
        required: false,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      },
      {
        name: 'include_expiring',
        type: 'select',
        label: 'Include Expiring Documents',
        required: false,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      }
    ]
  },
  {
    id: 'turnover_analysis',
    name: 'Turnover Analysis',
    description: 'Employee turnover rates and trends',
    category: 'Analytics',
    parameters: [
      {
        name: 'period',
        type: 'select',
        label: 'Analysis Period',
        required: true,
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'yearly', label: 'Yearly' }
        ]
      },
      {
        name: 'lookback_months',
        type: 'select',
        label: 'Lookback Period',
        required: true,
        options: [
          { value: '6', label: '6 Months' },
          { value: '12', label: '12 Months' },
          { value: '24', label: '24 Months' }
        ]
      }
    ]
  },
  {
    id: 'hiring_forecast',
    name: 'Hiring Forecast',
    description: 'Predictive analysis for future hiring needs',
    category: 'Analytics',
    parameters: [
      {
        name: 'property_id',
        type: 'select',
        label: 'Property',
        required: false,
        options: []
      },
      {
        name: 'forecast_months',
        type: 'select',
        label: 'Forecast Period',
        required: true,
        options: [
          { value: '1', label: '1 Month' },
          { value: '3', label: '3 Months' },
          { value: '6', label: '6 Months' }
        ]
      },
      {
        name: 'include_seasonality',
        type: 'select',
        label: 'Consider Seasonality',
        required: false,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      }
    ]
  }
]

export default function CustomReportBuilder() {
  const { user } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('excel')
  const [generating, setGenerating] = useState(false)
  const [savedReports, setSavedReports] = useState<Array<{ name: string; template: string; date: string }>>([])

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    // Initialize parameters with default values
    const defaults: Record<string, any> = {}
    template.parameters.forEach(param => {
      if (param.options && param.options.length > 0) {
        defaults[param.name] = param.options[0].value
      }
    })
    setParameters(defaults)
  }

  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateReport = async () => {
    if (!selectedTemplate) return

    setGenerating(true)
    try {
      const response = await axios.post(
        '/api/analytics/custom-report',
        {
          report_type: selectedTemplate.id,
          parameters,
          format: exportFormat
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          },
          responseType: exportFormat === 'csv' ? 'text' : 'blob'
        }
      )

      // Handle download
      const blob = new Blob([response.data], {
        type: exportFormat === 'csv' ? 'text/csv' : 
              exportFormat === 'excel' ? 'application/vnd.ms-excel' : 
              'application/pdf'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTemplate.id}_${new Date().toISOString().split('T')[0]}.${
        exportFormat === 'excel' ? 'xlsx' : exportFormat
      }`
      a.click()
      window.URL.revokeObjectURL(url)

      // Add to saved reports
      setSavedReports(prev => [
        {
          name: selectedTemplate.name,
          template: selectedTemplate.id,
          date: new Date().toLocaleString()
        },
        ...prev.slice(0, 9) // Keep last 10 reports
      ])
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const categories = Array.from(new Set(reportTemplates.map(t => t.category)))

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Custom Report Builder</h1>
        <p className="text-gray-600 mt-1">Generate detailed reports with custom parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Report Templates</h2>
            </div>
            <div className="p-4 space-y-4">
              {categories.map(category => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {reportTemplates
                      .filter(t => t.category === category)
                      .map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {template.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          {savedReports.length > 0 && (
            <div className="bg-white rounded-lg border mt-6">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Recent Reports</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {savedReports.map((report, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{report.name}</div>
                      <div className="text-xs text-gray-500">{report.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Configuration */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedTemplate.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Parameters */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    Report Parameters
                  </h3>
                  <div className="space-y-4">
                    {selectedTemplate.parameters.map(param => (
                      <div key={param.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {param.label}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {param.type === 'select' && (
                          <select
                            value={parameters[param.name] || ''}
                            onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {param.options?.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {param.type === 'text' && (
                          <input
                            type="text"
                            value={parameters[param.name] || ''}
                            onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                        {param.type === 'date' && (
                          <input
                            type="date"
                            value={parameters[param.name] || ''}
                            onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Format */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    Export Format
                  </h3>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={(e) => setExportFormat(e.target.value as any)}
                        className="mr-2"
                      />
                      <span>CSV</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="excel"
                        checked={exportFormat === 'excel'}
                        onChange={(e) => setExportFormat(e.target.value as any)}
                        className="mr-2"
                      />
                      <span>Excel</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="pdf"
                        checked={exportFormat === 'pdf'}
                        onChange={(e) => setExportFormat(e.target.value as any)}
                        className="mr-2"
                      />
                      <span>PDF</span>
                    </label>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-end">
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Select a report template to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}