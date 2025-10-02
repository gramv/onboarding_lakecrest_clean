/**
 * Intelligent Application Review System
 * Enhanced application review interface with AI-powered recommendations
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  User, 
  Star, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Target,
  Award,
  Users,
  FileText,
  MessageSquare,
  Send,
  Eye,
  Compare,
  Filter,
  Download,
  Bookmark,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart3,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { DataTable } from '@/design-system/components/DataTable'
import { MetricCard } from '@/design-system/components/MetricCard'
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface CandidateProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  position: string
  department: string
  experience_years: number
  education_level: string
  skills: string[]
  certifications: string[]
  languages: string[]
  availability: string
  salary_expectation?: number
  location: string
  applied_at: string
  
  // Enhanced profile data
  profile_completeness: number
  response_quality_score: number
  communication_score: number
  professionalism_score: number
}

interface AIRecommendation {
  overall_score: number
  recommendation: 'hire' | 'interview' | 'reject' | 'consider'
  confidence_level: number
  reasoning: string[]
  strengths: string[]
  concerns: string[]
  risk_factors: RiskFactor[]
  skill_match_percentage: number
  experience_match: 'excellent' | 'good' | 'fair' | 'poor'
  cultural_fit_score: number
  growth_potential: number
}

interface RiskFactor {
  type: 'high' | 'medium' | 'low'
  category: string
  description: string
  impact: string
  mitigation?: string
}

interface SkillsAssessment {
  required_skills: SkillMatch[]
  preferred_skills: SkillMatch[]
  overall_match: number
  skill_gaps: string[]
  transferable_skills: string[]
}

interface SkillMatch {
  skill: string
  required_level: number
  candidate_level: number
  match_percentage: number
  evidence: string[]
}

interface ComparisonCandidate {
  id: string
  name: string
  overall_score: number
  key_strengths: string[]
  applied_at: string
  status: string
}

interface ReviewDecision {
  action: 'approve' | 'reject' | 'interview' | 'hold'
  reasoning: string
  feedback?: string
  interview_notes?: string
  salary_offer?: number
  start_date?: string
  conditions?: string[]
}

interface BulkReviewAction {
  action: 'approve' | 'reject' | 'interview' | 'talent_pool'
  application_ids: string[]
  reasoning?: string
  template_message?: string
}

// =====================================
// CANDIDATE SCORE CARD
// =====================================

interface CandidateScoreCardProps {
  candidate: CandidateProfile
  aiRecommendation: AIRecommendation
  skillsAssessment: SkillsAssessment
  className?: string
}

const CandidateScoreCard: React.FC<CandidateScoreCardProps> = ({
  candidate,
  aiRecommendation,
  skillsAssessment,
  className
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'hire': return 'bg-green-100 text-green-800'
      case 'interview': return 'bg-blue-100 text-blue-800'
      case 'consider': return 'bg-yellow-100 text-yellow-800'
      case 'reject': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (confidence >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <Card className={cn('hover:shadow-lg transition-all duration-200', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {candidate.first_name} {candidate.last_name}
              </CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {candidate.location} • {candidate.position}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className={cn('text-2xl font-bold', getScoreColor(aiRecommendation.overall_score))}>
              {aiRecommendation.overall_score}
            </div>
            <div className="text-xs text-gray-600">Overall Score</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Recommendation */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="font-medium">AI Recommendation</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getRecommendationColor(aiRecommendation.recommendation)}>
              {aiRecommendation.recommendation.toUpperCase()}
            </Badge>
            {getConfidenceIcon(aiRecommendation.confidence_level)}
            <span className="text-sm text-gray-600">
              {aiRecommendation.confidence_level}% confidence
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <Grid columns={3} gap="sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className={cn('text-lg font-bold', getScoreColor(skillsAssessment.overall_match))}>
              {skillsAssessment.overall_match}%
            </div>
            <div className="text-xs text-gray-600">Skills Match</div>
          </div>
          
          <div className="text-center p-2 bg-green-50 rounded">
            <div className={cn('text-lg font-bold', getScoreColor(aiRecommendation.cultural_fit_score))}>
              {aiRecommendation.cultural_fit_score}
            </div>
            <div className="text-xs text-gray-600">Cultural Fit</div>
          </div>
          
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className={cn('text-lg font-bold', getScoreColor(aiRecommendation.growth_potential))}>
              {aiRecommendation.growth_potential}
            </div>
            <div className="text-xs text-gray-600">Growth Potential</div>
          </div>
        </Grid>

        {/* Experience Match */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Experience Match</span>
            <Badge variant={
              aiRecommendation.experience_match === 'excellent' ? 'default' :
              aiRecommendation.experience_match === 'good' ? 'secondary' :
              aiRecommendation.experience_match === 'fair' ? 'outline' : 'destructive'
            }>
              {aiRecommendation.experience_match}
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            {candidate.experience_years} years experience in {candidate.department}
          </div>
        </div>

        {/* Top Strengths */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Key Strengths</h4>
          <div className="space-y-1">
            {aiRecommendation.strengths.slice(0, 3).map((strength, index) => (
              <div key={index} className="flex items-center text-sm">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        {aiRecommendation.risk_factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Risk Factors</h4>
            <div className="space-y-1">
              {aiRecommendation.risk_factors.slice(0, 2).map((risk, index) => (
                <div key={index} className="flex items-start text-sm">
                  <AlertTriangle className={cn(
                    'h-3 w-3 mr-2 flex-shrink-0 mt-0.5',
                    risk.type === 'high' ? 'text-red-600' :
                    risk.type === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                  )} />
                  <span className="text-gray-700">{risk.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Mail className="h-3 w-3 mr-1" />
              {candidate.email}
            </div>
            <div className="flex items-center text-gray-600">
              <Phone className="h-3 w-3 mr-1" />
              {candidate.phone}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// DETAILED ANALYSIS PANEL
// =====================================

interface DetailedAnalysisPanelProps {
  candidate: CandidateProfile
  aiRecommendation: AIRecommendation
  skillsAssessment: SkillsAssessment
  similarCandidates: ComparisonCandidate[]
  onCompare: (candidateIds: string[]) => void
}

const DetailedAnalysisPanel: React.FC<DetailedAnalysisPanelProps> = ({
  candidate,
  aiRecommendation,
  skillsAssessment,
  similarCandidates,
  onCompare
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['strengths']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-500'
    if (level >= 3) return 'bg-blue-500'
    if (level >= 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          Detailed Analysis
        </CardTitle>
        <CardDescription>
          Comprehensive candidate evaluation and insights
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="comparison">Compare</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* AI Reasoning */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('reasoning')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="text-sm font-medium text-gray-700">AI Reasoning</h4>
                  {expandedSections.has('reasoning') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {expandedSections.has('reasoning') && (
                  <div className="space-y-2 pl-4">
                    {aiRecommendation.reasoning.map((reason, index) => (
                      <div key={index} className="flex items-start text-sm">
                        <Lightbulb className="h-3 w-3 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strengths */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('strengths')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="text-sm font-medium text-gray-700">Strengths</h4>
                  {expandedSections.has('strengths') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {expandedSections.has('strengths') && (
                  <div className="space-y-2 pl-4">
                    {aiRecommendation.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start text-sm">
                        <CheckCircle className="h-3 w-3 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{strength}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Concerns */}
              {aiRecommendation.concerns.length > 0 && (
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('concerns')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h4 className="text-sm font-medium text-gray-700">Concerns</h4>
                    {expandedSections.has('concerns') ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                  
                  {expandedSections.has('concerns') && (
                    <div className="space-y-2 pl-4">
                      {aiRecommendation.concerns.map((concern, index) => (
                        <div key={index} className="flex items-start text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{concern}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Profile Completeness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
                  <span className="text-sm text-gray-600">{candidate.profile_completeness}%</span>
                </div>
                <Progress value={candidate.profile_completeness} className="h-2" />
              </div>
            </TabsContent>
            
            <TabsContent value="skills" className="space-y-4 mt-0">
              {/* Required Skills */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Required Skills</h4>
                <div className="space-y-2">
                  {skillsAssessment.required_skills.map((skill, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.skill}</span>
                        <Badge variant={skill.match_percentage >= 80 ? 'default' : 
                                     skill.match_percentage >= 60 ? 'secondary' : 'destructive'}>
                          {skill.match_percentage}%
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  'w-4 h-2 rounded-sm',
                                  level <= skill.required_level ? 'bg-gray-300' : 'bg-gray-100'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Required Level</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  'w-4 h-2 rounded-sm',
                                  level <= skill.candidate_level ? getSkillLevelColor(skill.candidate_level) : 'bg-gray-100'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Candidate Level</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Gaps */}
              {skillsAssessment.skill_gaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Skill Gaps</h4>
                  <div className="space-y-1">
                    {skillsAssessment.skill_gaps.map((gap, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <XCircle className="h-3 w-3 text-red-600 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transferable Skills */}
              {skillsAssessment.transferable_skills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Transferable Skills</h4>
                  <div className="space-y-1">
                    {skillsAssessment.transferable_skills.map((skill, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Target className="h-3 w-3 text-blue-600 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="comparison" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Similar Candidates</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCompare([candidate.id, ...similarCandidates.slice(0, 2).map(c => c.id)])}
                  >
                    <Compare className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {similarCandidates.slice(0, 5).map((similar, index) => (
                    <div key={similar.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{similar.name}</div>
                        <div className="text-xs text-gray-600">
                          Applied {new Date(similar.applied_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{similar.overall_score}</div>
                        <Badge variant="outline" className="text-xs">
                          {similar.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4 mt-0">
              {/* Risk Assessment */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Risk Assessment</h4>
                <div className="space-y-2">
                  {aiRecommendation.risk_factors.map((risk, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={
                          risk.type === 'high' ? 'destructive' :
                          risk.type === 'medium' ? 'outline' : 'secondary'
                        }>
                          {risk.type.toUpperCase()} RISK
                        </Badge>
                        <span className="text-xs text-gray-600">{risk.category}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">{risk.description}</div>
                      <div className="text-xs text-gray-600">Impact: {risk.impact}</div>
                      {risk.mitigation && (
                        <div className="text-xs text-blue-600 mt-1">
                          Mitigation: {risk.mitigation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Interview Recommendations */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Interview Focus Areas</h4>
                <div className="space-y-1">
                  {skillsAssessment.skill_gaps.slice(0, 3).map((gap, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <MessageSquare className="h-3 w-3 text-blue-600 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">Assess {gap} experience</span>
                    </div>
                  ))}
                  {aiRecommendation.concerns.slice(0, 2).map((concern, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <MessageSquare className="h-3 w-3 text-yellow-600 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">Clarify {concern.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// =====================================
// REVIEW DECISION PANEL
// =====================================

interface ReviewDecisionPanelProps {
  candidate: CandidateProfile
  aiRecommendation: AIRecommendation
  onDecision: (decision: ReviewDecision) => void
  onBulkAction?: (action: BulkReviewAction) => void
  isProcessing?: boolean
}

const ReviewDecisionPanel: React.FC<ReviewDecisionPanelProps> = ({
  candidate,
  aiRecommendation,
  onDecision,
  onBulkAction,
  isProcessing = false
}) => {
  const [decision, setDecision] = useState<Partial<ReviewDecision>>({
    action: aiRecommendation.recommendation === 'hire' ? 'approve' : 
            aiRecommendation.recommendation === 'interview' ? 'interview' : 'reject'
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = () => {
    if (!decision.action || !decision.reasoning) return
    
    onDecision(decision as ReviewDecision)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-green-600 hover:bg-green-700'
      case 'interview': return 'bg-blue-600 hover:bg-blue-700'
      case 'hold': return 'bg-yellow-600 hover:bg-yellow-700'
      case 'reject': return 'bg-red-600 hover:bg-red-700'
      default: return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2 text-green-600" />
          Review Decision
        </CardTitle>
        <CardDescription>
          Make your hiring decision for this candidate
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Recommendation Banner */}
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            AI recommends: <strong>{aiRecommendation.recommendation.toUpperCase()}</strong> 
            ({aiRecommendation.confidence_level}% confidence)
          </AlertDescription>
        </Alert>

        {/* Action Selection */}
        <div className="space-y-2">
          <Label>Decision</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'approve', label: 'Approve', icon: CheckCircle },
              { value: 'interview', label: 'Interview', icon: MessageSquare },
              { value: 'hold', label: 'Hold', icon: Clock },
              { value: 'reject', label: 'Reject', icon: XCircle }
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={decision.action === value ? 'default' : 'outline'}
                className={cn(
                  'justify-start h-auto p-3',
                  decision.action === value && getActionColor(value)
                )}
                onClick={() => setDecision(prev => ({ ...prev, action: value as any }))}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-2">
          <Label htmlFor="reasoning">Reasoning *</Label>
          <Textarea
            id="reasoning"
            placeholder="Explain your decision..."
            value={decision.reasoning || ''}
            onChange={(e) => setDecision(prev => ({ ...prev, reasoning: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Advanced Options */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-0 h-auto"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            Advanced Options
          </Button>
          
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-gray-200">
              {decision.action === 'approve' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="salary">Salary Offer</Label>
                      <Input
                        id="salary"
                        type="number"
                        placeholder="Annual salary"
                        value={decision.salary_offer || ''}
                        onChange={(e) => setDecision(prev => ({ 
                          ...prev, 
                          salary_offer: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={decision.start_date || ''}
                        onChange={(e) => setDecision(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="conditions">Conditions</Label>
                    <Textarea
                      id="conditions"
                      placeholder="Any conditions or requirements..."
                      value={decision.conditions?.join('\n') || ''}
                      onChange={(e) => setDecision(prev => ({ 
                        ...prev, 
                        conditions: e.target.value.split('\n').filter(c => c.trim()) 
                      }))}
                      rows={2}
                    />
                  </div>
                </>
              )}
              
              {decision.action === 'interview' && (
                <div>
                  <Label htmlFor="interview_notes">Interview Notes</Label>
                  <Textarea
                    id="interview_notes"
                    placeholder="Areas to focus on during interview..."
                    value={decision.interview_notes || ''}
                    onChange={(e) => setDecision(prev => ({ ...prev, interview_notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="feedback">Candidate Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Feedback to share with candidate (optional)..."
                  value={decision.feedback || ''}
                  onChange={(e) => setDecision(prev => ({ ...prev, feedback: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!decision.action || !decision.reasoning || isProcessing}
          className={cn('w-full', getActionColor(decision.action || 'approve'))}
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Decision
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// =====================================
// MAIN INTELLIGENT APPLICATION REVIEW
// =====================================

interface IntelligentApplicationReviewProps {
  applicationId: string
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
}

export const IntelligentApplicationReview: React.FC<IntelligentApplicationReviewProps> = ({
  applicationId,
  onClose,
  onNext,
  onPrevious
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null)
  const [skillsAssessment, setSkillsAssessment] = useState<SkillsAssessment | null>(null)
  const [similarCandidates, setSimilarCandidates] = useState<ComparisonCandidate[]>([])

  // Load application data and generate AI insights
  useEffect(() => {
    loadApplicationData()
  }, [applicationId])

  const loadApplicationData = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll generate mock data based on the application ID
      
      // Mock candidate data
      const mockCandidate: CandidateProfile = {
        id: applicationId,
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '(555) 123-4567',
        position: 'Front Desk Associate',
        department: 'Front Office',
        experience_years: 3,
        education_level: 'Bachelor\'s Degree',
        skills: ['Customer Service', 'PMS Systems', 'Multi-lingual', 'Problem Solving'],
        certifications: ['Hospitality Management Certificate'],
        languages: ['English', 'Spanish'],
        availability: 'Full-time',
        salary_expectation: 45000,
        location: 'Miami, FL',
        applied_at: new Date().toISOString(),
        profile_completeness: 92,
        response_quality_score: 88,
        communication_score: 85,
        professionalism_score: 90
      }

      // Mock AI recommendation
      const mockAiRecommendation: AIRecommendation = {
        overall_score: 87,
        recommendation: 'hire',
        confidence_level: 85,
        reasoning: [
          'Strong customer service background with 3+ years experience',
          'Bilingual capabilities valuable for diverse guest base',
          'High professionalism score indicates good cultural fit',
          'Previous hotel experience with PMS systems'
        ],
        strengths: [
          'Excellent customer service skills',
          'Bilingual (English/Spanish)',
          'Previous hotel industry experience',
          'Strong communication abilities',
          'Professional demeanor and appearance'
        ],
        concerns: [
          'Salary expectation slightly above budget range',
          'Limited experience with luxury hotel standards'
        ],
        risk_factors: [
          {
            type: 'medium',
            category: 'Compensation',
            description: 'Salary expectation 10% above typical range',
            impact: 'May require negotiation or decline offer',
            mitigation: 'Discuss growth opportunities and benefits package'
          }
        ],
        skill_match_percentage: 85,
        experience_match: 'good',
        cultural_fit_score: 88,
        growth_potential: 82
      }

      // Mock skills assessment
      const mockSkillsAssessment: SkillsAssessment = {
        required_skills: [
          {
            skill: 'Customer Service',
            required_level: 4,
            candidate_level: 4,
            match_percentage: 95,
            evidence: ['3 years front desk experience', 'Customer service training certificate']
          },
          {
            skill: 'PMS Systems',
            required_level: 3,
            candidate_level: 3,
            match_percentage: 85,
            evidence: ['Experience with Opera PMS', 'Hotel management system training']
          },
          {
            skill: 'Multi-lingual',
            required_level: 2,
            candidate_level: 4,
            match_percentage: 100,
            evidence: ['Native Spanish speaker', 'Fluent English']
          }
        ],
        preferred_skills: [
          {
            skill: 'Concierge Services',
            required_level: 2,
            candidate_level: 1,
            match_percentage: 40,
            evidence: ['Limited concierge experience']
          }
        ],
        overall_match: 85,
        skill_gaps: ['Luxury hotel protocols', 'Advanced concierge services'],
        transferable_skills: ['Retail customer service', 'Conflict resolution', 'Time management']
      }

      // Mock similar candidates
      const mockSimilarCandidates: ComparisonCandidate[] = [
        {
          id: 'candidate-2',
          name: 'Maria Rodriguez',
          overall_score: 82,
          key_strengths: ['Bilingual', 'Hotel experience'],
          applied_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'pending'
        },
        {
          id: 'candidate-3',
          name: 'James Wilson',
          overall_score: 79,
          key_strengths: ['Customer service', 'Leadership'],
          applied_at: new Date(Date.now() - 172800000).toISOString(),
          status: 'interview'
        }
      ]

      setCandidate(mockCandidate)
      setAiRecommendation(mockAiRecommendation)
      setSkillsAssessment(mockSkillsAssessment)
      setSimilarCandidates(mockSimilarCandidates)

    } catch (error) {
      console.error('Failed to load application data:', error)
      toast({
        title: "Error Loading Application",
        description: "Failed to load application data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (decision: ReviewDecision) => {
    setProcessing(true)
    try {
      // In a real implementation, this would call the API
      console.log('Processing decision:', decision)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Decision Submitted",
        description: `Application ${decision.action}d successfully.`,
      })
      
      onClose()
      
    } catch (error) {
      console.error('Failed to process decision:', error)
      toast({
        title: "Error Processing Decision",
        description: "Failed to submit decision. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCompare = (candidateIds: string[]) => {
    // Open comparison view
    console.log('Compare candidates:', candidateIds)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-lg font-medium">Loading Application</div>
          <div className="text-sm text-gray-600">Analyzing candidate profile...</div>
        </div>
      </div>
    )
  }

  if (!candidate || !aiRecommendation || !skillsAssessment) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <div className="text-lg font-medium">Application Not Found</div>
          <div className="text-sm text-gray-600">Unable to load application data.</div>
        </div>
      </div>
    )
  }

  return (
    <Container className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intelligent Application Review</h1>
          <p className="text-gray-600">AI-powered candidate evaluation and decision support</p>
        </div>
        <div className="flex items-center space-x-2">
          {onPrevious && (
            <Button variant="outline" onClick={onPrevious}>
              Previous
            </Button>
          )}
          {onNext && (
            <Button variant="outline" onClick={onNext}>
              Next
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Candidate Overview */}
        <div className="space-y-6">
          <CandidateScoreCard
            candidate={candidate}
            aiRecommendation={aiRecommendation}
            skillsAssessment={skillsAssessment}
          />
          
          <ReviewDecisionPanel
            candidate={candidate}
            aiRecommendation={aiRecommendation}
            onDecision={handleDecision}
            isProcessing={processing}
          />
        </div>

        {/* Right Column - Detailed Analysis */}
        <div className="lg:col-span-2">
          <DetailedAnalysisPanel
            candidate={candidate}
            aiRecommendation={aiRecommendation}
            skillsAssessment={skillsAssessment}
            similarCandidates={similarCandidates}
            onCompare={handleCompare}
          />
        </div>
      </div>
    </Container>
  )
}

export default IntelligentApplicationReview