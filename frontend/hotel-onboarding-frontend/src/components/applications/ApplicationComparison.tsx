/**
 * Application Comparison Tool
 * Side-by-side candidate analysis and comparison interface
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Equal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  Target,
  Brain,
  BarChart3,
  Eye,
  Download,
  Share,
  Bookmark,
  MessageSquare,
  Calendar,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Languages,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface ComparisonCandidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  position: string
  department: string
  applied_at: string
  status: string
  
  // Profile data
  experience_years: number
  education_level: string
  skills: string[]
  certifications: string[]
  languages: string[]
  availability: string
  salary_expectation?: number
  location: string
  
  // Scores and assessments
  overall_score: number
  skills_match_score: number
  experience_match_score: number
  cultural_fit_score: number
  communication_score: number
  professionalism_score: number
  
  // AI insights
  ai_recommendation: 'hire' | 'interview' | 'reject' | 'consider'
  ai_confidence: number
  strengths: string[]
  concerns: string[]
  risk_factors: Array<{
    type: 'high' | 'medium' | 'low'
    description: string
  }>
  
  // Additional data
  profile_completeness: number
  response_quality: number
  interview_notes?: string
  manager_notes?: string
}

interface ComparisonMetric {
  id: string
  name: string
  description: string
  weight: number
  format: 'percentage' | 'score' | 'rating' | 'text' | 'list'
  category: 'skills' | 'experience' | 'cultural' | 'communication' | 'other'
}

interface ComparisonResult {
  metric: string
  candidates: Array<{
    id: string
    value: any
    score: number
    rank: number
    advantage: 'winner' | 'close' | 'behind'
  }>
  winner_id?: string
  is_tie: boolean
}

// =====================================
// COMPARISON METRICS CONFIGURATION
// =====================================

const COMPARISON_METRICS: ComparisonMetric[] = [
  {
    id: 'overall_score',
    name: 'Overall Score',
    description: 'Comprehensive evaluation score',
    weight: 1.0,
    format: 'score',
    category: 'other'
  },
  {
    id: 'skills_match_score',
    name: 'Skills Match',
    description: 'How well skills align with requirements',
    weight: 0.9,
    format: 'percentage',
    category: 'skills'
  },
  {
    id: 'experience_match_score',
    name: 'Experience Match',
    description: 'Relevance of work experience',
    weight: 0.8,
    format: 'percentage',
    category: 'experience'
  },
  {
    id: 'cultural_fit_score',
    name: 'Cultural Fit',
    description: 'Alignment with company culture',
    weight: 0.7,
    format: 'score',
    category: 'cultural'
  },
  {
    id: 'communication_score',
    name: 'Communication',
    description: 'Communication skills assessment',
    weight: 0.6,
    format: 'score',
    category: 'communication'
  },
  {
    id: 'experience_years',
    name: 'Years of Experience',
    description: 'Total years of relevant experience',
    weight: 0.5,
    format: 'text',
    category: 'experience'
  },
  {
    id: 'education_level',
    name: 'Education Level',
    description: 'Highest level of education',
    weight: 0.4,
    format: 'text',
    category: 'other'
  },
  {
    id: 'languages',
    name: 'Languages',
    description: 'Language capabilities',
    weight: 0.3,
    format: 'list',
    category: 'skills'
  },
  {
    id: 'certifications',
    name: 'Certifications',
    description: 'Professional certifications',
    weight: 0.3,
    format: 'list',
    category: 'skills'
  }
]

// =====================================
// CANDIDATE COMPARISON CARD
// =====================================

interface CandidateComparisonCardProps {
  candidate: ComparisonCandidate
  isSelected?: boolean
  onSelect?: () => void
  onRemove?: () => void
  showRemove?: boolean
  compact?: boolean
}

const CandidateComparisonCard: React.FC<CandidateComparisonCardProps> = ({
  candidate,
  isSelected = false,
  onSelect,
  onRemove,
  showRemove = false,
  compact = false
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

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200',
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md',
        compact && 'p-2'
      )}
      onClick={onSelect}
    >
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className={cn('text-base', compact && 'text-sm')}>
                {candidate.first_name} {candidate.last_name}
              </CardTitle>
              <CardDescription className={cn('text-sm', compact && 'text-xs')}>
                {candidate.position}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {showRemove && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <div className="text-right">
              <div className={cn('text-xl font-bold', getScoreColor(candidate.overall_score))}>
                {candidate.overall_score}
              </div>
              <div className="text-xs text-gray-600">Score</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {!compact && (
        <CardContent className="space-y-3">
          {/* AI Recommendation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Recommendation</span>
            <Badge className={getRecommendationColor(candidate.ai_recommendation)}>
              {candidate.ai_recommendation.toUpperCase()}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Skills Match:</span>
              <span className={getScoreColor(candidate.skills_match_score)}>
                {candidate.skills_match_score}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Experience:</span>
              <span className={getScoreColor(candidate.experience_match_score)}>
                {candidate.experience_match_score}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cultural Fit:</span>
              <span className={getScoreColor(candidate.cultural_fit_score)}>
                {candidate.cultural_fit_score}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Communication:</span>
              <span className={getScoreColor(candidate.communication_score)}>
                {candidate.communication_score}
              </span>
            </div>
          </div>

          {/* Experience and Education */}
          <div className="text-sm space-y-1">
            <div className="flex items-center text-gray-600">
              <Briefcase className="h-3 w-3 mr-1" />
              {candidate.experience_years} years experience
            </div>
            <div className="flex items-center text-gray-600">
              <GraduationCap className="h-3 w-3 mr-1" />
              {candidate.education_level}
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-3 w-3 mr-1" />
              {candidate.location}
            </div>
          </div>

          {/* Top Skills */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Top Skills</div>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// =====================================
// COMPARISON MATRIX
// =====================================

interface ComparisonMatrixProps {
  candidates: ComparisonCandidate[]
  metrics: ComparisonMetric[]
  results: ComparisonResult[]
}

const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  candidates,
  metrics,
  results
}) => {
  const getAdvantageColor = (advantage: string) => {
    switch (advantage) {
      case 'winner': return 'bg-green-100 text-green-800 font-bold'
      case 'close': return 'bg-yellow-100 text-yellow-800'
      case 'behind': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatValue = (value: any, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value}%`
      case 'score':
        return value.toString()
      case 'rating':
        return `${value}/5`
      case 'list':
        return Array.isArray(value) ? value.join(', ') : value
      default:
        return value.toString()
    }
  }

  const getComparisonIcon = (advantage: string) => {
    switch (advantage) {
      case 'winner': return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'close': return <Equal className="h-3 w-3 text-yellow-600" />
      case 'behind': return <TrendingDown className="h-3 w-3 text-red-600" />
      default: return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          Comparison Matrix
        </CardTitle>
        <CardDescription>
          Side-by-side comparison of key metrics
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Metric</th>
                {candidates.map((candidate) => (
                  <th key={candidate.id} className="text-center p-2 font-medium min-w-32">
                    <div className="space-y-1">
                      <div className="text-sm">{candidate.first_name}</div>
                      <div className="text-xs text-gray-600">{candidate.last_name}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const result = results.find(r => r.metric === metric.id)
                if (!result) return null

                return (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-sm">{metric.name}</div>
                        <div className="text-xs text-gray-600">{metric.description}</div>
                      </div>
                    </td>
                    {result.candidates.map((candidateResult) => (
                      <td key={candidateResult.id} className="p-2 text-center">
                        <div className={cn(
                          'inline-flex items-center space-x-1 px-2 py-1 rounded text-sm',
                          getAdvantageColor(candidateResult.advantage)
                        )}>
                          {getComparisonIcon(candidateResult.advantage)}
                          <span>{formatValue(candidateResult.value, metric.format)}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Rank #{candidateResult.rank}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// STRENGTHS AND WEAKNESSES COMPARISON
// =====================================

interface StrengthsWeaknessesComparisonProps {
  candidates: ComparisonCandidate[]
}

const StrengthsWeaknessesComparison: React.FC<StrengthsWeaknessesComparisonProps> = ({
  candidates
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {candidates.map((candidate) => (
        <Card key={candidate.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {candidate.first_name} {candidate.last_name}
            </CardTitle>
            <CardDescription>
              Strengths and areas of concern
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Strengths */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-700 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Strengths
              </h4>
              <div className="space-y-1">
                {candidate.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Concerns */}
            {candidate.concerns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-700 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Concerns
                </h4>
                <div className="space-y-1">
                  {candidate.concerns.map((concern, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{concern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {candidate.risk_factors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700 flex items-center">
                  <XCircle className="h-4 w-4 mr-1" />
                  Risk Factors
                </h4>
                <div className="space-y-1">
                  {candidate.risk_factors.map((risk, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0',
                        risk.type === 'high' ? 'bg-red-500' :
                        risk.type === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                      )} />
                      <span className="text-gray-700">{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// =====================================
// RECOMMENDATION SUMMARY
// =====================================

interface RecommendationSummaryProps {
  candidates: ComparisonCandidate[]
  results: ComparisonResult[]
}

const RecommendationSummary: React.FC<RecommendationSummaryProps> = ({
  candidates,
  results
}) => {
  // Calculate overall winner based on weighted scores
  const calculateOverallWinner = () => {
    const scores = candidates.map(candidate => ({
      id: candidate.id,
      name: `${candidate.first_name} ${candidate.last_name}`,
      score: candidate.overall_score,
      recommendation: candidate.ai_recommendation,
      confidence: candidate.ai_confidence
    }))

    return scores.sort((a, b) => b.score - a.score)
  }

  const rankedCandidates = calculateOverallWinner()
  const winner = rankedCandidates[0]

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'hire': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'interview': return <MessageSquare className="h-5 w-5 text-blue-600" />
      case 'consider': return <Clock className="h-5 w-5 text-yellow-600" />
      case 'reject': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2 text-gold-600" />
          Recommendation Summary
        </CardTitle>
        <CardDescription>
          Overall comparison results and hiring recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Winner Highlight */}
        <Alert>
          <Award className="h-4 w-4" />
          <AlertDescription>
            <strong>{winner.name}</strong> ranks highest with a score of {winner.score} 
            and AI recommendation to <strong>{winner.recommendation.toUpperCase()}</strong> 
            ({winner.confidence}% confidence)
          </AlertDescription>
        </Alert>

        {/* Candidate Rankings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Candidate Rankings</h4>
          <div className="space-y-2">
            {rankedCandidates.map((candidate, index) => (
              <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-gold-100 text-gold-800' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    'bg-bronze-100 text-bronze-800'
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{candidate.name}</div>
                    <div className="text-sm text-gray-600">Score: {candidate.score}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getRecommendationIcon(candidate.recommendation)}
                  <Badge variant="outline">
                    {candidate.recommendation.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Differentiators */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Key Differentiators</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {results.slice(0, 3).map((result, index) => {
              const metric = COMPARISON_METRICS.find(m => m.id === result.metric)
              if (!metric || !result.winner_id) return null
              
              const winner = candidates.find(c => c.id === result.winner_id)
              if (!winner) return null

              return (
                <div key={index} className="flex items-center">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-2" />
                  <span>
                    <strong>{winner.first_name} {winner.last_name}</strong> leads in {metric.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// MAIN APPLICATION COMPARISON
// =====================================

interface ApplicationComparisonProps {
  candidateIds: string[]
  onClose: () => void
  onAddCandidate?: () => void
}

export const ApplicationComparison: React.FC<ApplicationComparisonProps> = ({
  candidateIds,
  onClose,
  onAddCandidate
}) => {
  const { toast } = useToast()
  
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([])
  const [results, setResults] = useState<ComparisonResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('matrix')

  // Load candidate data and perform comparison
  useEffect(() => {
    loadCandidatesAndCompare()
  }, [candidateIds])

  const loadCandidatesAndCompare = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll generate mock data
      
      const mockCandidates: ComparisonCandidate[] = candidateIds.map((id, index) => ({
        id,
        first_name: ['Sarah', 'Michael', 'Emma'][index] || 'John',
        last_name: ['Johnson', 'Chen', 'Davis'][index] || 'Doe',
        email: `candidate${index + 1}@email.com`,
        phone: `(555) ${100 + index}${index}-${1000 + index}${index}${index}${index}`,
        position: 'Front Desk Associate',
        department: 'Front Office',
        applied_at: new Date(Date.now() - (index * 86400000)).toISOString(),
        status: 'pending',
        
        experience_years: [3, 5, 2][index] || 4,
        education_level: ['Bachelor\'s Degree', 'Associate Degree', 'High School'][index] || 'Bachelor\'s',
        skills: [
          ['Customer Service', 'PMS Systems', 'Multi-lingual', 'Problem Solving'],
          ['Hotel Management', 'Leadership', 'Training', 'Operations'],
          ['Communication', 'Organization', 'Computer Skills', 'Teamwork']
        ][index] || ['Customer Service'],
        certifications: [
          ['Hospitality Management Certificate'],
          ['Hotel Operations Certificate', 'Leadership Training'],
          ['Customer Service Excellence']
        ][index] || [],
        languages: [
          ['English', 'Spanish'],
          ['English', 'Mandarin'],
          ['English']
        ][index] || ['English'],
        availability: 'Full-time',
        salary_expectation: [45000, 52000, 38000][index],
        location: ['Miami, FL', 'Orlando, FL', 'Tampa, FL'][index] || 'Florida',
        
        overall_score: [87, 82, 75][index] || 80,
        skills_match_score: [85, 90, 70][index] || 75,
        experience_match_score: [80, 95, 60][index] || 70,
        cultural_fit_score: [88, 75, 85][index] || 80,
        communication_score: [85, 80, 90][index] || 80,
        professionalism_score: [90, 85, 80][index] || 85,
        
        ai_recommendation: (['hire', 'interview', 'consider'] as const)[index] || 'consider',
        ai_confidence: [85, 78, 65][index] || 70,
        strengths: [
          ['Excellent customer service', 'Bilingual capabilities', 'Hotel experience'],
          ['Strong leadership skills', 'Extensive experience', 'Training abilities'],
          ['Great communication', 'Eager to learn', 'Reliable']
        ][index] || ['Good candidate'],
        concerns: [
          ['Salary expectation above range'],
          ['May be overqualified', 'Salary expectations high'],
          ['Limited experience', 'No hotel background']
        ][index] || [],
        risk_factors: [
          [{ type: 'medium' as const, description: 'Salary negotiation needed' }],
          [{ type: 'low' as const, description: 'Potential overqualification' }],
          [{ type: 'medium' as const, description: 'Training investment required' }]
        ][index] || [],
        
        profile_completeness: [92, 88, 85][index] || 85,
        response_quality: [88, 85, 82][index] || 85
      }))

      // Generate comparison results
      const comparisonResults: ComparisonResult[] = COMPARISON_METRICS.map(metric => {
        const candidateResults = mockCandidates.map(candidate => {
          let value: any
          let score: number

          switch (metric.id) {
            case 'overall_score':
              value = candidate.overall_score
              score = candidate.overall_score
              break
            case 'skills_match_score':
              value = candidate.skills_match_score
              score = candidate.skills_match_score
              break
            case 'experience_match_score':
              value = candidate.experience_match_score
              score = candidate.experience_match_score
              break
            case 'cultural_fit_score':
              value = candidate.cultural_fit_score
              score = candidate.cultural_fit_score
              break
            case 'communication_score':
              value = candidate.communication_score
              score = candidate.communication_score
              break
            case 'experience_years':
              value = candidate.experience_years
              score = candidate.experience_years * 20 // Convert to 0-100 scale
              break
            case 'education_level':
              value = candidate.education_level
              score = candidate.education_level === 'Bachelor\'s Degree' ? 100 :
                     candidate.education_level === 'Associate Degree' ? 80 : 60
              break
            case 'languages':
              value = candidate.languages
              score = candidate.languages.length * 30
              break
            case 'certifications':
              value = candidate.certifications
              score = candidate.certifications.length * 25
              break
            default:
              value = 0
              score = 0
          }

          return {
            id: candidate.id,
            value,
            score,
            rank: 0, // Will be calculated below
            advantage: 'close' as const
          }
        })

        // Calculate ranks and advantages
        const sortedResults = [...candidateResults].sort((a, b) => b.score - a.score)
        const maxScore = sortedResults[0]?.score || 0
        const minScore = sortedResults[sortedResults.length - 1]?.score || 0
        const scoreRange = maxScore - minScore

        candidateResults.forEach(result => {
          const rank = sortedResults.findIndex(r => r.id === result.id) + 1
          result.rank = rank

          if (rank === 1 && scoreRange > 10) {
            result.advantage = 'winner'
          } else if (rank === candidateResults.length && scoreRange > 10) {
            result.advantage = 'behind'
          } else {
            result.advantage = 'close'
          }
        })

        return {
          metric: metric.id,
          candidates: candidateResults,
          winner_id: sortedResults[0]?.id,
          is_tie: scoreRange <= 5
        }
      })

      setCandidates(mockCandidates)
      setResults(comparisonResults)

    } catch (error) {
      console.error('Failed to load comparison data:', error)
      toast({
        title: "Error Loading Comparison",
        description: "Failed to load candidate data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCandidate = (candidateId: string) => {
    setCandidates(prev => prev.filter(c => c.id !== candidateId))
    // Recalculate results without this candidate
    setResults(prev => prev.map(result => ({
      ...result,
      candidates: result.candidates.filter(c => c.id !== candidateId)
    })))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <div className="text-lg font-medium">Loading Comparison</div>
          <div className="text-sm text-gray-600">Analyzing candidates...</div>
        </div>
      </div>
    )
  }

  return (
    <Container className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Comparison</h1>
          <p className="text-gray-600">Side-by-side candidate analysis and evaluation</p>
        </div>
        <div className="flex items-center space-x-2">
          {onAddCandidate && (
            <Button variant="outline" onClick={onAddCandidate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Candidate
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Candidate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {candidates.map((candidate) => (
          <CandidateComparisonCard
            key={candidate.id}
            candidate={candidate}
            onRemove={() => handleRemoveCandidate(candidate.id)}
            showRemove={candidates.length > 2}
            compact
          />
        ))}
      </div>

      {/* Comparison Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matrix">Comparison Matrix</TabsTrigger>
          <TabsTrigger value="strengths">Strengths & Concerns</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Detailed Profiles</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="matrix" className="mt-0">
            <ComparisonMatrix
              candidates={candidates}
              metrics={COMPARISON_METRICS}
              results={results}
            />
          </TabsContent>
          
          <TabsContent value="strengths" className="mt-0">
            <StrengthsWeaknessesComparison candidates={candidates} />
          </TabsContent>
          
          <TabsContent value="summary" className="mt-0">
            <RecommendationSummary candidates={candidates} results={results} />
          </TabsContent>
          
          <TabsContent value="details" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {candidates.map((candidate) => (
                <CandidateComparisonCard
                  key={candidate.id}
                  candidate={candidate}
                />
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Container>
  )
}

export default ApplicationComparison