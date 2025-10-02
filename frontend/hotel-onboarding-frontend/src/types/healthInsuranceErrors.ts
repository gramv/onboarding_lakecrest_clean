export type HealthInsuranceErrorType =
  | 'PROVIDER_NOT_FOUND'
  | 'INVALID_COVERAGE_LEVEL'
  | 'DEPENDENT_LIMIT_EXCEEDED'
  | 'ENROLLMENT_PERIOD_CLOSED'
  | 'INVALID_EFFECTIVE_DATE'
  | 'MISSING_REQUIRED_DOCUMENTS'
  | 'SIGNATURE_REQUIRED'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface HealthInsuranceError extends Error {
  type: HealthInsuranceErrorType;
  severity: ErrorSeverity;
  details?: any;
  timestamp: Date;
  userAction?: string;
  systemAction?: string;
}

export interface HealthInsuranceErrorState {
  hasError: boolean;
  error?: HealthInsuranceError;
  errorCount: number;
  lastError?: Date;
}

export const isHealthInsuranceError = (error: any): error is HealthInsuranceError => {
  return error &&
    typeof error === 'object' &&
    'type' in error &&
    'severity' in error;
};