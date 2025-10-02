/**
 * AI Recommendation Service
 * Provides intelligent application review capabilities with AI-powered insights
 */

import { apiClient } from './apiClient';

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  experience_years: number;
  education_level: string;
  skills: string[];
  certifications: string[];
  languages: string[];
  availability: string;
  salary_expectation?: number;
  location: string;
  applied_at: string;
  profile_completeness: number;
  response_quality_score: number;
  communication_score: number;
  professionalism_score: number;
}

export interface AIRecommendation {
  overall_score: number;
  recommendation: 'hire' | 'interview' | 'reject' | 'consider';
  confidence_level: number;
  reasoning: string[];
  strengths: string[];
  concerns: string[];
  risk_factors: RiskFactor[];
  skill_match_percentage: number;
  experience_match: 'excellent' | 'good' | 'fair' | 'poor';
  cultural_fit_score: number;
  growth_potential: number;
  success_prediction: number;
  interview_readiness: number;
}

export interface RiskFactor {
  type: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  impact: string;
  mitigation?: string;
}

export interface SkillsAssessment {
  required_skills: SkillMatch[];
  preferred_skills: SkillMatch[];
  overall_match: number;
  skill_gaps: string[];
  transferable_skills: string[];
  development_recommendations: string[];
}

export interface SkillMatch {
  skill: string;
  required_level: number;
  candidate_level: number;
  match_percentage: number;
  evidence: string[];
  importance: 'critical' | 'important' | 'nice-to-have';
}

export interface ComparisonCandidate {
  id: string;
  name: string;
  overall_score: number;
  key_strengths: string[];
  applied_at: string;
  status: string;
  similarity_score: number;
}

export interface InterviewRecommendations {
  suggested_questions: InterviewQuestion[];
  focus_areas: string[];
  red_flags_to_explore: string[];
  strengths_to_validate: string[];
  estimated_duration: number;
  interview_type: 'phone' | 'video' | 'in-person' | 'panel';
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational' | 'cultural';
  difficulty: 'easy' | 'medium' | 'hard';
  expected_answer_points: string[];
  follow_up_questions?: string[];
}

export interface BulkReviewRequest {
  application_ids: string[];
  criteria: ReviewCriteria;
  auto_approve_threshold?: number;
  auto_reject_threshold?: number;
  include_reasoning: boolean;
}

export interface ReviewCriteria {
  minimum_experience_years?: number;
  required_skills?: string[];
  education_requirements?: string[];
  salary_range?: { min: number; max: number };
  location_preferences?: string[];
  availability_requirements?: string[];
}

export interface BulkReviewResult {
  application_id: string;
  candidate_name: string;
  recommendation: 'hire' | 'interview' | 'reject' | 'consider';
  score: number;
  reasoning: string[];
  auto_processed: boolean;
  requires_manual_review: boolean;
}

export interface WorkflowAutomation {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_active: boolean;
}

export interface WorkflowTrigger {
  type: 'application_submitted' | 'score_calculated' | 'manual_trigger';
  parameters: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logic: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: 'auto_approve' | 'auto_reject' | 'schedule_interview' | 'send_email' | 'assign_reviewer';
  parameters: Record<string, any>;
  delay_minutes?: number;
}

// =====================================
// AI RECOMMENDATION SERVICE
// =====================================

class AIRecommendationService {
  private baseUrl = '/api/ai-recommendations';

  /**
   * Analyze a single candidate with AI-powered insights
   */
  async analyzeCandidate(candidateId: string): Promise<{
    candidate: CandidateProfile;
    ai_recommendation: AIRecommendation;
    skills_assessment: SkillsAssessment;
    similar_candidates: ComparisonCandidate[];
    interview_recommendations: InterviewRecommendations;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/analyze`, {
        candidate_id: candidateId,
        include_similar_candidates: true,
        include_interview_recommendations: true,
        analysis_depth: 'comprehensive'
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Candidate analysis failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Candidate analysis error:', error);
      throw error;
    }
  }

  /**
   * Get AI-powered hiring recommendations for multiple candidates
   */
  async bulkAnalyze(request: BulkReviewRequest): Promise<{
    results: BulkReviewResult[];
    summary: {
      total_analyzed: number;
      auto_approved: number;
      auto_rejected: number;
      requires_review: number;
      average_score: number;
    };
    recommendations: {
      top_candidates: BulkReviewResult[];
      flagged_for_review: BulkReviewResult[];
      suggested_rejections: BulkReviewResult[];
    };
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk-analyze`, request);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Bulk analysis failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Bulk analysis error:', error);
      throw error;
    }
  }

  /**
   * Compare multiple candidates side-by-side
   */
  async compareCandidates(candidateIds: string[]): Promise<{
    candidates: Array<{
      profile: CandidateProfile;
      ai_recommendation: AIRecommendation;
      skills_assessment: SkillsAssessment;
    }>;
    comparison_matrix: {
      metrics: string[];
      scores: Record<string, Record<string, number>>;
      rankings: Record<string, number>;
    };
    winner_analysis: {
      overall_winner: string;
      category_winners: Record<string, string>;
      tie_breakers: string[];
    };
    hiring_recommendation: {
      recommended_candidate: string;
      reasoning: string[];
      alternative_options: string[];
    };
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/compare`, {
        candidate_ids: candidateIds,
        comparison_depth: 'detailed',
        include_winner_analysis: true
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Candidate comparison failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Candidate comparison error:', error);
      throw error;
    }
  }

  /**
   * Generate interview questions based on candidate profile and skill gaps
   */
  async generateInterviewQuestions(candidateId: string, options?: {
    interview_type?: 'phone' | 'video' | 'in-person' | 'panel';
    duration_minutes?: number;
    focus_areas?: string[];
    difficulty_level?: 'easy' | 'medium' | 'hard' | 'mixed';
  }): Promise<InterviewRecommendations> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/interview-questions`, {
        candidate_id: candidateId,
        ...options
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Interview question generation failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Interview question generation error:', error);
      throw error;
    }
  }

  /**
   * Predict candidate success rate based on historical data
   */
  async predictSuccess(candidateId: string): Promise<{
    success_probability: number;
    confidence_level: number;
    key_factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    similar_hires: Array<{
      hire_id: string;
      similarity_score: number;
      outcome: 'successful' | 'unsuccessful';
      tenure_months: number;
      performance_rating: number;
    }>;
    risk_assessment: {
      flight_risk: number;
      performance_risk: number;
      cultural_fit_risk: number;
      overall_risk: 'low' | 'medium' | 'high';
    };
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/predict-success`, {
        candidate_id: candidateId,
        include_similar_hires: true,
        include_risk_assessment: true
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Success prediction failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Success prediction error:', error);
      throw error;
    }
  }

  /**
   * Create or update workflow automation rules
   */
  async createWorkflow(workflow: Omit<WorkflowAutomation, 'id'>): Promise<WorkflowAutomation> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/workflows`, workflow);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Workflow creation failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Workflow creation error:', error);
      throw error;
    }
  }

  /**
   * Get active workflow automations
   */
  async getWorkflows(): Promise<WorkflowAutomation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/workflows`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch workflows');
      }

      return response.data.data;
    } catch (error) {
      console.error('Workflow fetch error:', error);
      throw error;
    }
  }

  /**
   * Execute workflow automation for specific applications
   */
  async executeWorkflow(workflowId: string, applicationIds: string[]): Promise<{
    workflow_id: string;
    executed_at: string;
    results: Array<{
      application_id: string;
      actions_taken: string[];
      success: boolean;
      error?: string;
    }>;
    summary: {
      total_processed: number;
      successful: number;
      failed: number;
    };
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/workflows/${workflowId}/execute`, {
        application_ids: applicationIds
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Workflow execution failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }
  }

  /**
   * Get AI model performance metrics
   */
  async getModelMetrics(): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    model_version: string;
    last_trained: string;
    training_data_size: number;
    performance_by_category: Record<string, {
      accuracy: number;
      sample_size: number;
    }>;
    recent_predictions: Array<{
      prediction: string;
      actual_outcome?: string;
      confidence: number;
      date: string;
    }>;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/model/metrics`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch model metrics');
      }

      return response.data.data;
    } catch (error) {
      console.error('Model metrics error:', error);
      throw error;
    }
  }

  /**
   * Provide feedback on AI recommendations to improve model accuracy
   */
  async provideFeedback(candidateId: string, feedback: {
    ai_recommendation: string;
    actual_decision: string;
    outcome_rating: number; // 1-5 scale
    feedback_notes?: string;
    recommendation_accuracy: number; // 1-5 scale
  }): Promise<{
    feedback_id: string;
    recorded_at: string;
    will_improve_model: boolean;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/feedback`, {
        candidate_id: candidateId,
        ...feedback
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Feedback submission failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Feedback submission error:', error);
      throw error;
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Create standard review criteria templates
   */
  createReviewCriteria(template: 'entry_level' | 'experienced' | 'management' | 'custom'): ReviewCriteria {
    switch (template) {
      case 'entry_level':
        return {
          minimum_experience_years: 0,
          required_skills: ['Customer Service', 'Communication'],
          education_requirements: ['High School'],
          salary_range: { min: 25000, max: 40000 },
          availability_requirements: ['Full-time', 'Part-time']
        };

      case 'experienced':
        return {
          minimum_experience_years: 2,
          required_skills: ['Customer Service', 'PMS Systems', 'Problem Solving'],
          education_requirements: ['High School', 'Associate Degree', 'Bachelor\'s Degree'],
          salary_range: { min: 35000, max: 55000 },
          availability_requirements: ['Full-time']
        };

      case 'management':
        return {
          minimum_experience_years: 5,
          required_skills: ['Leadership', 'Management', 'Customer Service', 'Training'],
          education_requirements: ['Bachelor\'s Degree', 'Master\'s Degree'],
          salary_range: { min: 50000, max: 80000 },
          availability_requirements: ['Full-time']
        };

      default:
        return {
          minimum_experience_years: 1,
          required_skills: ['Customer Service'],
          education_requirements: ['High School'],
          salary_range: { min: 30000, max: 50000 },
          availability_requirements: ['Full-time']
        };
    }
  }

  /**
   * Calculate composite score from multiple metrics
   */
  calculateCompositeScore(metrics: {
    experience_score: number;
    skills_score: number;
    education_score: number;
    communication_score: number;
    cultural_fit_score: number;
  }, weights?: {
    experience: number;
    skills: number;
    education: number;
    communication: number;
    cultural_fit: number;
  }): number {
    const defaultWeights = {
      experience: 0.3,
      skills: 0.25,
      education: 0.15,
      communication: 0.15,
      cultural_fit: 0.15
    };

    const finalWeights = { ...defaultWeights, ...weights };

    return Math.round(
      metrics.experience_score * finalWeights.experience +
      metrics.skills_score * finalWeights.skills +
      metrics.education_score * finalWeights.education +
      metrics.communication_score * finalWeights.communication +
      metrics.cultural_fit_score * finalWeights.cultural_fit
    );
  }

  /**
   * Generate recommendation explanation in natural language
   */
  generateRecommendationExplanation(recommendation: AIRecommendation): string {
    const { overall_score, recommendation: rec, confidence_level, strengths, concerns } = recommendation;

    let explanation = `Based on comprehensive analysis, this candidate scored ${overall_score}/100 with ${confidence_level}% confidence. `;

    switch (rec) {
      case 'hire':
        explanation += `I recommend hiring this candidate. `;
        break;
      case 'interview':
        explanation += `I recommend proceeding with an interview. `;
        break;
      case 'consider':
        explanation += `This candidate shows potential but requires careful consideration. `;
        break;
      case 'reject':
        explanation += `I recommend not proceeding with this candidate. `;
        break;
    }

    if (strengths.length > 0) {
      explanation += `Key strengths include: ${strengths.slice(0, 3).join(', ')}. `;
    }

    if (concerns.length > 0) {
      explanation += `Areas of concern: ${concerns.slice(0, 2).join(', ')}. `;
    }

    return explanation;
  }
}

// Export singleton instance
export const aiRecommendationService = new AIRecommendationService();
export default aiRecommendationService;