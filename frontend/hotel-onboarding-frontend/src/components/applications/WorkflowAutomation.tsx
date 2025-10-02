/**
 * Workflow Automation Component
 * Advanced workflow automation with AI-powered rules and bulk processing
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { 
  Zap, 
  Settings,
  Play,
  Pause,
  Square,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Target,
  Filter,
  Send,
  Users,
  Brain,
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Eye,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { DataTable } from '@/design-system/components/DataTable'
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// Import services
import { aiRecommendationService, WorkflowAutomation, WorkflowTrigger, WorkflowCondition, WorkflowAction } from '@/services/aiRecommendationService'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface WorkflowRule {
  id: string
  name: string
  description: string
  is_active: boolean
  triggers: WorkflowTrigger[]
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  created_at: string
  last_executed?: string
  execution_count: number
  success_rate: number
}

interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow_name: string
  started_at: string
  completed_at?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  total_applications: number
  processed_applications: number
  successful_actions: number
  failed_actions: number
  results: WorkflowExecutionResult[]
}

interface WorkflowExecutionResult {
  application_id: string
  candidate_name: string
  actions_taken: string[]
  success: boolean
  error?: string
  processing_time: number
}

interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: 'screening' | 'approval' | 'communication' | 'scheduling'
  template: Omit<WorkflowAutomation, 'id'>
}

// =====================================
// WORKFLOW RULE BUILDER
// =====================================

interface WorkflowRuleBuilderProps {
  rule?: WorkflowRule
  onSave: (rule: Omit<WorkflowRule, 'id' | 'created_at' | 'execution_count' | 'success_rate'>) => void
  onCancel: () => void
}

const WorkflowRuleBuilder: React.FC<WorkflowRuleBuilderProps> = ({
  rule,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    is_active: rule?.is_active ?? true,
    triggers: rule?.triggers || [],
    conditions: rule?.conditions || [],
    actions: rule?.actions || []
  })

  const [activeSection, setActiveSection] = useState<'triggers' | 'conditions' | 'actions'>('triggers')

  const handleSave = () => {
    if (!formData.name.trim()) {
      return
    }

    onSave({
      name: formData.name,
      description: formData.description,
      is_active: formData.is_active,
      triggers: formData.triggers,
      conditions: formData.conditions,
      actions: formData.actions,
      last_executed: rule?.last_executed
    })
  }

  const addTrigger = () => {
    setFormData(prev => ({
      ...prev,
      triggers: [...prev.triggers, {
        type: 'application_submitted',
        parameters: {}
      }]
    }))
  }

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        field: 'overall_score',
        operator: 'greater_than',
        value: 80,
        logic: 'AND'
      }]
    }))
  }

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'auto_approve',
        parameters: {},
        delay_minutes: 0
      }]
    }))
  }

  const removeTrigger = (index: number) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index)
    }))
  }

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  const updateTrigger = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map((trigger, i) => 
        i === index ? { ...trigger, [field]: value } : trigger
      )
    }))
  }

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }))
  }

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }))
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-600" />
          {rule ? 'Edit Workflow Rule' : 'Create Workflow Rule'}
        </CardTitle>
        <CardDescription>
          Define automated actions based on application criteria
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Auto-approve high-scoring candidates"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this rule does..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        {/* Rule Configuration Tabs */}
        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="triggers">
              Triggers ({formData.triggers.length})
            </TabsTrigger>
            <TabsTrigger value="conditions">
              Conditions ({formData.conditions.length})
            </TabsTrigger>
            <TabsTrigger value="actions">
              Actions ({formData.actions.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="triggers" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">When should this rule run?</h4>
              <Button variant="outline" size="sm" onClick={addTrigger}>
                <Plus className="h-4 w-4 mr-1" />
                Add Trigger
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.triggers.map((trigger, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium">Trigger {index + 1}</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrigger(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Trigger Type</Label>
                      <Select
                        value={trigger.type}
                        onValueChange={(value) => updateTrigger(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="application_submitted">Application Submitted</SelectItem>
                          <SelectItem value="score_calculated">AI Score Calculated</SelectItem>
                          <SelectItem value="manual_trigger">Manual Trigger</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
              
              {formData.triggers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No triggers defined. Add a trigger to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="conditions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">What conditions must be met?</h4>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.conditions.map((condition, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium">Condition {index + 1}</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Field</Label>
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(index, 'field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall_score">Overall Score</SelectItem>
                          <SelectItem value="experience_years">Experience Years</SelectItem>
                          <SelectItem value="education_level">Education Level</SelectItem>
                          <SelectItem value="salary_expectation">Salary Expectation</SelectItem>
                          <SelectItem value="skills_match">Skills Match %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(index, 'operator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="in_range">In Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Value</Label>
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Enter value..."
                      />
                    </div>
                    
                    <div>
                      <Label>Logic</Label>
                      <Select
                        value={condition.logic}
                        onValueChange={(value) => updateCondition(index, 'logic', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
              
              {formData.conditions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conditions defined. Add conditions to filter applications.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">What actions should be taken?</h4>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.actions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium">Action {index + 1}</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Action Type</Label>
                      <Select
                        value={action.type}
                        onValueChange={(value) => updateAction(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto_approve">Auto Approve</SelectItem>
                          <SelectItem value="auto_reject">Auto Reject</SelectItem>
                          <SelectItem value="schedule_interview">Schedule Interview</SelectItem>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="assign_reviewer">Assign Reviewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Delay (minutes)</Label>
                      <Input
                        type="number"
                        value={action.delay_minutes || 0}
                        onChange={(e) => updateAction(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </Card>
              ))}
              
              {formData.actions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No actions defined. Add actions to automate your workflow.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name.trim()}>
            <Save className="h-4 w-4 mr-1" />
            Save Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// WORKFLOW EXECUTION MONITOR
// =====================================

interface WorkflowExecutionMonitorProps {
  execution: WorkflowExecution
  onCancel: () => void
  onClose: () => void
}

const WorkflowExecutionMonitor: React.FC<WorkflowExecutionMonitorProps> = ({
  execution,
  onCancel,
  onClose
}) => {
  const progress = execution.total_applications > 0 
    ? (execution.processed_applications / execution.total_applications) * 100 
    : 0

  const getStatusIcon = () => {
    switch (execution.status) {
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
    switch (execution.status) {
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
            <div>
              <CardTitle>{execution.workflow_name}</CardTitle>
              <CardDescription>
                Workflow execution started {new Date(execution.started_at).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {execution.status === 'running' && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {(execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') && (
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
            <span>{execution.processed_applications} / {execution.total_applications}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Statistics */}
        <Grid columns={3} gap="sm">
          <div className="text-center p-2 bg-green-100 rounded">
            <div className="text-lg font-bold text-green-600">
              {execution.successful_actions}
            </div>
            <div className="text-xs text-gray-600">Successful</div>
          </div>
          
          <div className="text-center p-2 bg-red-100 rounded">
            <div className="text-lg font-bold text-red-600">
              {execution.failed_actions}
            </div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          
          <div className="text-center p-2 bg-blue-100 rounded">
            <div className="text-lg font-bold text-blue-600">
              {execution.total_applications - execution.processed_applications}
            </div>
            <div className="text-xs text-gray-600">Remaining</div>
          </div>
        </Grid>

        {/* Recent Results */}
        {execution.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Results</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {execution.results.slice(-5).map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                  <span>{result.candidate_name}</span>
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="text-xs text-gray-600">
                      {result.actions_taken.join(', ')}
                    </span>
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
// MAIN WORKFLOW AUTOMATION COMPONENT
// =====================================

interface WorkflowAutomationProps {
  onClose: () => void
}

export const WorkflowAutomation: React.FC<WorkflowAutomationProps> = ({
  onClose
}) => {
  const { toast } = useToast()
  
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('workflows')
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)

  // Load workflows and executions
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Mock data - in real implementation, this would fetch from the API
      const mockWorkflows: WorkflowRule[] = [
        {
          id: 'workflow-1',
          name: 'Auto-approve High Scorers',
          description: 'Automatically approve candidates with scores above 85',
          is_active: true,
          triggers: [{ type: 'score_calculated', parameters: {} }],
          conditions: [{ field: 'overall_score', operator: 'greater_than', value: 85, logic: 'AND' }],
          actions: [{ type: 'auto_approve', parameters: {}, delay_minutes: 0 }],
          created_at: new Date().toISOString(),
          execution_count: 23,
          success_rate: 95.7
        },
        {
          id: 'workflow-2',
          name: 'Schedule Interviews for Mid-range',
          description: 'Schedule interviews for candidates scoring 70-84',
          is_active: true,
          triggers: [{ type: 'score_calculated', parameters: {} }],
          conditions: [
            { field: 'overall_score', operator: 'greater_than', value: 70, logic: 'AND' },
            { field: 'overall_score', operator: 'less_than', value: 85, logic: 'AND' }
          ],
          actions: [{ type: 'schedule_interview', parameters: {}, delay_minutes: 30 }],
          created_at: new Date().toISOString(),
          execution_count: 45,
          success_rate: 88.9
        }
      ]

      setWorkflows(mockWorkflows)

    } catch (error) {
      console.error('Failed to load workflow data:', error)
      toast({
        title: "Error Loading Workflows",
        description: "Failed to load workflow data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRule = async (ruleData: Omit<WorkflowRule, 'id' | 'created_at' | 'execution_count' | 'success_rate'>) => {
    try {
      if (editingRule) {
        // Update existing rule
        setWorkflows(prev => prev.map(w => 
          w.id === editingRule.id 
            ? { ...w, ...ruleData }
            : w
        ))
        toast({
          title: "Rule Updated",
          description: "Workflow rule has been updated successfully.",
        })
      } else {
        // Create new rule
        const newRule: WorkflowRule = {
          ...ruleData,
          id: `workflow-${Date.now()}`,
          created_at: new Date().toISOString(),
          execution_count: 0,
          success_rate: 0
        }
        setWorkflows(prev => [...prev, newRule])
        toast({
          title: "Rule Created",
          description: "New workflow rule has been created successfully.",
        })
      }

      setShowRuleBuilder(false)
      setEditingRule(null)
    } catch (error) {
      console.error('Failed to save rule:', error)
      toast({
        title: "Error Saving Rule",
        description: "Failed to save workflow rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setWorkflows(prev => prev.filter(w => w.id !== ruleId))
      toast({
        title: "Rule Deleted",
        description: "Workflow rule has been deleted successfully.",
      })
    } catch (error) {
      console.error('Failed to delete rule:', error)
      toast({
        title: "Error Deleting Rule",
        description: "Failed to delete workflow rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      setWorkflows(prev => prev.map(w => 
        w.id === ruleId ? { ...w, is_active: isActive } : w
      ))
      toast({
        title: isActive ? "Rule Activated" : "Rule Deactivated",
        description: `Workflow rule has been ${isActive ? 'activated' : 'deactivated'}.`,
      })
    } catch (error) {
      console.error('Failed to toggle rule:', error)
      toast({
        title: "Error Updating Rule",
        description: "Failed to update workflow rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (showRuleBuilder) {
    return (
      <Container className="max-w-7xl mx-auto p-6">
        <WorkflowRuleBuilder
          rule={editingRule || undefined}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowRuleBuilder(false)
            setEditingRule(null)
          }}
        />
      </Container>
    )
  }

  return (
    <Container className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600">Automate application processing with intelligent rules</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowRuleBuilder(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Rule
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">
            Workflow Rules ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="executions">
            Recent Executions ({executions.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="workflows" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          workflow.is_active ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        <div>
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          <CardDescription>{workflow.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {workflow.execution_count} executions
                        </Badge>
                        <Badge variant="outline">
                          {workflow.success_rate.toFixed(1)}% success
                        </Badge>
                        <Switch
                          checked={workflow.is_active}
                          onCheckedChange={(checked) => handleToggleRule(workflow.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRule(workflow)
                            setShowRuleBuilder(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">Triggers</h4>
                        <div className="space-y-1">
                          {workflow.triggers.map((trigger, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {trigger.type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">Conditions</h4>
                        <div className="space-y-1">
                          {workflow.conditions.map((condition, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              {condition.field} {condition.operator} {condition.value}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">Actions</h4>
                        <div className="space-y-1">
                          {workflow.actions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action.type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {workflows.length === 0 && (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Rules</h3>
                  <p className="text-gray-600 mb-4">Create your first automation rule to get started.</p>
                  <Button onClick={() => setShowRuleBuilder(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Rule
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="executions" className="space-y-4">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Executions</h3>
            <p className="text-gray-600">Workflow executions will appear here when rules are triggered.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Templates</h3>
            <p className="text-gray-600">Pre-built templates will be available here soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </Container>
  )
}

export default WorkflowAutomation