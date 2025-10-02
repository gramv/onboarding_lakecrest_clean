/**
 * Bulk Application Processor
 * Workflow automation and template responses for bulk application processing
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileText,
  Filter,
  Download,
  Upload,
  Settings,
  Zap,
  AlertTriangle,
  Info,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Square,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { DataTable } from '@/design-system/components/DataTable'
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface BulkApplication {
  id: string
  candidate_name: string
  email: string
  position: string
  department: string
  applied_at: string
  status: string
  score?: number
  ai_recommendation?: 'hire' | 'interview' | 'reject' | 'consider'
  selected: boolean
}

interface BulkAction {
  id: string
  type: 'approve' | 'reject' | 'interview' | 'talent_pool' | 'custom'
  name: string
  description: string
  icon: React.ReactNode
  color: string
  requires_reason: boolean
  template_available: boolean
}

interface MessageTemplate {
  id: string
  name: string
  type: 'approval' | 'rejection' | 'interview' | 'general'
  subject: string
  content: string
  variables: string[]
  is_default: boolean
}

interface BulkProcessingJob {
  id: string
  action: string
  total_applications: number
  processed_applications: number
  successful_applications: number
  failed_applications: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at?: string
  completed_at?: string
  error_message?: string
  results: BulkProcessingResult[]
}

interface BulkProcessingResult {
  application_id: string
  candidate_name: string
  status: 'success' | 'failed' | 'skipped'
  message?: string
  error?: string
}

interface WorkflowRule {
  id: string
  name: string
  description: string
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  is_active: boolean
}

interface WorkflowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range'
  value: any
}

interface WorkflowAction {
  type: 'approve' | 'reject' | 'interview' | 'assign_tag' | 'send_email'
  parameters: Record<string, any>
}

// =====================================
// BULK ACTIONS CONFIGURATION
// =====================================

const BULK_ACTIONS: BulkAction[] = [
  {
    id: 'approve',
    type: 'approve',
    name: 'Approve Applications',
    description: 'Approve selected applications and send offer letters',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-green-600 hover:bg-green-700',
    requires_reason: false,
    template_available: true
  },
  {
    id: 'reject',
    type: 'reject',
    name: 'Reject Applications',
    description: 'Reject selected applications with reason',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-red-600 hover:bg-red-700',
    requires_reason: true,
    template_available: true
  },
  {
    id: 'interview',
    type: 'interview',
    name: 'Schedule Interviews',
    description: 'Move applications to interview stage',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-blue-600 hover:bg-blue-700',
    requires_reason: false,
    template_available: true
  },
  {
    id: 'talent_pool',
    type: 'talent_pool',
    name: 'Move to Talent Pool',
    description: 'Add candidates to talent pool for future opportunities',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-purple-600 hover:bg-purple-700',
    requires_reason: false,
    template_available: true
  }
]

// =====================================
// APPLICATION SELECTION TABLE
// =====================================

interface ApplicationSelectionTableProps {
  applications: BulkApplication[]
  onSelectionChange: (selectedIds: string[]) => void
  selectedIds: string[]
  loading?: boolean
}

const ApplicationSelectionTable: React.FC<ApplicationSelectionTableProps> = ({
  applications,
  onSelectionChange,
  selectedIds,
  loading = false
}) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(applications.map(app => app.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectApplication = (applicationId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, applicationId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== applicationId))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'interview': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationColor = (recommendation?: string) => {
    switch (recommendation) {
      case 'hire': return 'text-green-600'
      case 'interview': return 'text-blue-600'
      case 'consider': return 'text-yellow-600'
      case 'reject': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const columns = [
    {
      id: 'select',
      header: (
        <Checkbox
          checked={selectedIds.length === applications.length && applications.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all applications"
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) => handleSelectApplication(row.original.id, checked as boolean)}
          aria-label={`Select ${row.original.candidate_name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'candidate_name',
      header: 'Candidate',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.candidate_name}</div>
          <div className="text-sm text-gray-600">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.position}</div>
          <div className="text-sm text-gray-600">{row.original.department}</div>
        </div>
      ),
    },
    {
      accessorKey: 'applied_at',
      header: 'Applied',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.applied_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }: any) => (
        <div className="text-center">
          {row.original.score ? (
            <div className={cn('font-bold', getRecommendationColor(row.original.ai_recommendation))}>
              {row.original.score}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'ai_recommendation',
      header: 'AI Rec.',
      cell: ({ row }: any) => (
        <div className="text-center">
          {row.original.ai_recommendation ? (
            <Badge variant="outline" className={getRecommendationColor(row.original.ai_recommendation)}>
              {row.original.ai_recommendation.toUpperCase()}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Select Applications</CardTitle>
            <CardDescription>
              Choose applications for bulk processing ({selectedIds.length} selected)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <DataTable
          data={applications}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true
          }}
          sorting={{
            defaultSort: [{ id: 'applied_at', desc: true }]
          }}
        />
      </CardContent>
    </Card>
  )
}

// =====================================
// BULK ACTION CONFIGURATION
// =====================================

interface BulkActionConfigProps {
  selectedAction: BulkAction | null
  onActionSelect: (action: BulkAction) => void
  selectedCount: number
}

const BulkActionConfig: React.FC<BulkActionConfigProps> = ({
  selectedAction,
  onActionSelect,
  selectedCount
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-600" />
          Bulk Actions
        </CardTitle>
        <CardDescription>
          Choose an action to apply to {selectedCount} selected applications
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BULK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant={selectedAction?.id === action.id ? 'default' : 'outline'}
              className={cn(
                'justify-start h-auto p-4 text-left',
                selectedAction?.id === action.id && action.color
              )}
              onClick={() => onActionSelect(action)}
              disabled={selectedCount === 0}
            >
              <div className="flex items-start space-x-3">
                {action.icon}
                <div>
                  <div className="font-medium">{action.name}</div>
                  <div className="text-sm opacity-80">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// MESSAGE TEMPLATE SELECTOR
// =====================================

interface MessageTemplateSelectorProps {
  templates: MessageTemplate[]
  selectedTemplate: MessageTemplate | null
  onTemplateSelect: (template: MessageTemplate | null) => void
  actionType: string
  customMessage: string
  onCustomMessageChange: (message: string) => void
}

const MessageTemplateSelector: React.FC<MessageTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  actionType,
  customMessage,
  onCustomMessageChange
}) => {
  const [showCustom, setShowCustom] = useState(false)
  
  const relevantTemplates = templates.filter(t => 
    t.type === actionType || t.type === 'general'
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
          Message Template
        </CardTitle>
        <CardDescription>
          Choose a template or write a custom message
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Select Template</Label>
          <Select
            value={selectedTemplate?.id || 'custom'}
            onValueChange={(value) => {
              if (value === 'custom') {
                onTemplateSelect(null)
                setShowCustom(true)
              } else {
                const template = relevantTemplates.find(t => t.id === value)
                onTemplateSelect(template || null)
                setShowCustom(false)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {relevantTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600">{template.subject}</div>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                <div>
                  <div className="font-medium">Custom Message</div>
                  <div className="text-sm text-gray-600">Write your own message</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Preview */}
        {selectedTemplate && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-sm mb-2">Preview:</div>
            <div className="text-sm">
              <div className="font-medium mb-1">Subject: {selectedTemplate.subject}</div>
              <div className="text-gray-700 whitespace-pre-wrap">
                {selectedTemplate.content}
              </div>
            </div>
            {selectedTemplate.variables.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Variables: {selectedTemplate.variables.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Custom Message */}
        {(showCustom || !selectedTemplate) && (
          <div className="space-y-2">
            <Label htmlFor="custom-message">Custom Message</Label>
            <Textarea
              id="custom-message"
              placeholder="Write your custom message here..."
              value={customMessage}
              onChange={(e) => onCustomMessageChange(e.target.value)}
              rows={6}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================
// PROCESSING PROGRESS MONITOR
// =====================================

interface ProcessingProgressMonitorProps {
  job: BulkProcessingJob | null
  onCancel: () => void
  onClose: () => void
}

const ProcessingProgressMonitor: React.FC<ProcessingProgressMonitorProps> = ({
  job,
  onCancel,
  onClose
}) => {
  if (!job) return null

  const progress = job.total_applications > 0 
    ? (job.processed_applications / job.total_applications) * 100 
    : 0

  const getStatusIcon = () => {
    switch (job.status) {
      case 'running':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'cancelled':
        return <Square className="h-5 w-5 text-gray-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'running': return 'border-blue-200 bg-blue-50'
      case 'completed': return 'border-green-200 bg-green-50'
      case 'failed': return 'border-red-200 bg-red-50'
      case 'cancelled': return 'border-gray-200 bg-gray-50'
      default: return 'border-yellow-200 bg-yellow-50'
    }
  }

  return (
    <Card className={cn('border-2', getStatusColor())}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle>Bulk Processing</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {job.status === 'running' && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{job.processed_applications} / {job.total_applications}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Statistics */}
        <Grid columns={3} gap="sm">
          <div className="text-center p-2 bg-green-100 rounded">
            <div className="text-lg font-bold text-green-600">
              {job.successful_applications}
            </div>
            <div className="text-xs text-gray-600">Successful</div>
          </div>
          
          <div className="text-center p-2 bg-red-100 rounded">
            <div className="text-lg font-bold text-red-600">
              {job.failed_applications}
            </div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          
          <div className="text-center p-2 bg-blue-100 rounded">
            <div className="text-lg font-bold text-blue-600">
              {job.total_applications - job.processed_applications}
            </div>
            <div className="text-xs text-gray-600">Remaining</div>
          </div>
        </Grid>

        {/* Status Message */}
        {job.error_message && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {/* Results Summary */}
        {job.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Results</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {job.results.slice(-5).map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                  <span>{result.candidate_name}</span>
                  <div className="flex items-center space-x-2">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : result.status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-red-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-gray-600" />
                    )}
                    <span className="text-xs text-gray-600">{result.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================
// MAIN BULK APPLICATION PROCESSOR
// =====================================

interface BulkApplicationProcessorProps {
  applications: BulkApplication[]
  onClose: () => void
  onRefresh: () => void
}

export const BulkApplicationProcessor: React.FC<BulkApplicationProcessorProps> = ({
  applications,
  onClose,
  onRefresh
}) => {
  const { toast } = useToast()
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [processingJob, setProcessingJob] = useState<BulkProcessingJob | null>(null)
  const [loading, setLoading] = useState(false)

  // Mock message templates
  const messageTemplates: MessageTemplate[] = [
    {
      id: 'approval-standard',
      name: 'Standard Approval',
      type: 'approval',
      subject: 'Congratulations! Your application has been approved',
      content: 'Dear {{candidate_name}},\n\nWe are pleased to inform you that your application for the position of {{position}} has been approved. We will contact you shortly with next steps.\n\nBest regards,\n{{manager_name}}',
      variables: ['candidate_name', 'position', 'manager_name'],
      is_default: true
    },
    {
      id: 'rejection-standard',
      name: 'Standard Rejection',
      type: 'rejection',
      subject: 'Update on your application',
      content: 'Dear {{candidate_name}},\n\nThank you for your interest in the {{position}} position. After careful consideration, we have decided to move forward with other candidates.\n\nWe encourage you to apply for future opportunities.\n\nBest regards,\n{{manager_name}}',
      variables: ['candidate_name', 'position', 'manager_name'],
      is_default: true
    },
    {
      id: 'interview-invitation',
      name: 'Interview Invitation',
      type: 'interview',
      subject: 'Interview Invitation - {{position}}',
      content: 'Dear {{candidate_name}},\n\nWe would like to invite you for an interview for the {{position}} position. Please reply to schedule a convenient time.\n\nBest regards,\n{{manager_name}}',
      variables: ['candidate_name', 'position', 'manager_name'],
      is_default: true
    }
  ]

  const handleStartProcessing = async () => {
    if (!selectedAction || selectedIds.length === 0) return

    setLoading(true)
    try {
      // Create processing job
      const job: BulkProcessingJob = {
        id: `job-${Date.now()}`,
        action: selectedAction.type,
        total_applications: selectedIds.length,
        processed_applications: 0,
        successful_applications: 0,
        failed_applications: 0,
        status: 'running',
        started_at: new Date().toISOString(),
        results: []
      }

      setProcessingJob(job)

      // Simulate processing
      for (let i = 0; i < selectedIds.length; i++) {
        const applicationId = selectedIds[i]
        const application = applications.find(app => app.id === applicationId)
        
        if (!application) continue

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Simulate success/failure
        const success = Math.random() > 0.1 // 90% success rate

        const result: BulkProcessingResult = {
          application_id: applicationId,
          candidate_name: application.candidate_name,
          status: success ? 'success' : 'failed',
          message: success ? `${selectedAction.name} completed` : 'Processing failed',
          error: success ? undefined : 'Network error'
        }

        // Update job progress
        setProcessingJob(prev => {
          if (!prev) return null
          return {
            ...prev,
            processed_applications: i + 1,
            successful_applications: prev.successful_applications + (success ? 1 : 0),
            failed_applications: prev.failed_applications + (success ? 0 : 1),
            results: [...prev.results, result]
          }
        })
      }

      // Complete job
      setProcessingJob(prev => {
        if (!prev) return null
        return {
          ...prev,
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      })

      toast({
        title: "Bulk Processing Complete",
        description: `Successfully processed ${selectedIds.length} applications.`,
      })

      // Refresh data
      onRefresh()

    } catch (error) {
      console.error('Bulk processing failed:', error)
      
      setProcessingJob(prev => {
        if (!prev) return null
        return {
          ...prev,
          status: 'failed',
          error_message: 'Processing failed due to an unexpected error'
        }
      })

      toast({
        title: "Processing Failed",
        description: "Failed to process applications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelProcessing = () => {
    setProcessingJob(prev => {
      if (!prev) return null
      return {
        ...prev,
        status: 'cancelled'
      }
    })
  }

  const handleCloseProcessing = () => {
    setProcessingJob(null)
    setSelectedIds([])
    setSelectedAction(null)
    setSelectedTemplate(null)
    setCustomMessage('')
    setReasoning('')
  }

  const canStartProcessing = selectedIds.length > 0 && 
                            selectedAction && 
                            (!selectedAction.requires_reason || reasoning.trim()) &&
                            !processingJob

  return (
    <Container className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Application Processor</h1>
          <p className="text-gray-600">Process multiple applications with workflow automation</p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Processing Monitor */}
      {processingJob && (
        <div className="mb-6">
          <ProcessingProgressMonitor
            job={processingJob}
            onCancel={handleCancelProcessing}
            onClose={handleCloseProcessing}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Application Selection */}
        <div className="lg:col-span-2">
          <ApplicationSelectionTable
            applications={applications}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            loading={loading}
          />
        </div>

        {/* Right Column - Configuration */}
        <div className="space-y-6">
          {/* Bulk Actions */}
          <BulkActionConfig
            selectedAction={selectedAction}
            onActionSelect={setSelectedAction}
            selectedCount={selectedIds.length}
          />

          {/* Reasoning (if required) */}
          {selectedAction?.requires_reason && (
            <Card>
              <CardHeader>
                <CardTitle>Reasoning Required</CardTitle>
                <CardDescription>
                  Provide a reason for this action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your reasoning..."
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* Message Template */}
          {selectedAction?.template_available && (
            <MessageTemplateSelector
              templates={messageTemplates}
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
              actionType={selectedAction.type}
              customMessage={customMessage}
              onCustomMessageChange={setCustomMessage}
            />
          )}

          {/* Process Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleStartProcessing}
                disabled={!canStartProcessing || loading}
                className={cn('w-full', selectedAction?.color)}
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Process {selectedIds.length} Applications
                  </>
                )}
              </Button>
              
              {selectedIds.length === 0 && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  Select applications to enable processing
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  )
}

export default BulkApplicationProcessor