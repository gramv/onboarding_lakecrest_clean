import {
  HealthInsuranceError,
  HealthInsuranceErrorType,
  ErrorSeverity,
  isHealthInsuranceError
} from '../types/healthInsuranceErrors';

class HealthInsuranceErrorHandler {
  private static instance: HealthInsuranceErrorHandler;
  private errorCallbacks: ((error: HealthInsuranceError) => void)[] = [];

  private constructor() {}

  static getInstance(): HealthInsuranceErrorHandler {
    if (!HealthInsuranceErrorHandler.instance) {
      HealthInsuranceErrorHandler.instance = new HealthInsuranceErrorHandler();
    }
    return HealthInsuranceErrorHandler.instance;
  }

  createError(
    type: HealthInsuranceErrorType,
    message: string,
    severity: ErrorSeverity = 'medium',
    details?: any
  ): HealthInsuranceError {
    const error = new Error(message) as HealthInsuranceError;
    error.type = type;
    error.severity = severity;
    error.details = details;
    error.timestamp = new Date();
    return error;
  }

  handleError(error: Error | HealthInsuranceError, language?: 'en' | 'es'): void {
    let healthError: HealthInsuranceError;

    if (isHealthInsuranceError(error)) {
      healthError = error;
    } else {
      healthError = this.createError(
        'UNKNOWN_ERROR',
        error.message || 'An unexpected error occurred',
        'medium'
      );
    }

    // Notify all registered callbacks
    this.errorCallbacks.forEach(callback => callback(healthError));

    // Log error based on severity
    this.logError(healthError);
  }

  private logError(error: HealthInsuranceError): void {
    const logMessage = `[Health Insurance Error] ${error.type}: ${error.message}`;

    switch (error.severity) {
      case 'critical':
      case 'high':
        console.error(logMessage, error.details);
        break;
      case 'medium':
        console.warn(logMessage, error.details);
        break;
      case 'low':
        console.info(logMessage, error.details);
        break;
    }
  }

  onError(callback: (error: HealthInsuranceError) => void): () => void {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  getErrorMessage(error: HealthInsuranceError, language: 'en' | 'es' = 'en'): string {
    const messages: Record<HealthInsuranceErrorType, Record<'en' | 'es', string>> = {
      PROVIDER_NOT_FOUND: {
        en: 'The selected insurance provider could not be found.',
        es: 'No se pudo encontrar el proveedor de seguro seleccionado.'
      },
      INVALID_COVERAGE_LEVEL: {
        en: 'The selected coverage level is not available.',
        es: 'El nivel de cobertura seleccionado no está disponible.'
      },
      DEPENDENT_LIMIT_EXCEEDED: {
        en: 'You have exceeded the maximum number of dependents.',
        es: 'Ha excedido el número máximo de dependientes.'
      },
      ENROLLMENT_PERIOD_CLOSED: {
        en: 'The enrollment period for health insurance has closed.',
        es: 'El período de inscripción para el seguro de salud ha cerrado.'
      },
      INVALID_EFFECTIVE_DATE: {
        en: 'The effective date selected is invalid.',
        es: 'La fecha efectiva seleccionada es inválida.'
      },
      MISSING_REQUIRED_DOCUMENTS: {
        en: 'Required documents are missing for enrollment.',
        es: 'Faltan documentos requeridos para la inscripción.'
      },
      SIGNATURE_REQUIRED: {
        en: 'Your signature is required to complete enrollment.',
        es: 'Se requiere su firma para completar la inscripción.'
      },
      UNKNOWN_ERROR: {
        en: 'An unexpected error occurred. Please try again.',
        es: 'Ocurrió un error inesperado. Por favor intente de nuevo.'
      }
    };

    return messages[error.type]?.[language] || error.message;
  }

  getUserActionMessage(error: HealthInsuranceError, language: 'en' | 'es' = 'en'): string | undefined {
    const actions: Partial<Record<HealthInsuranceErrorType, Record<'en' | 'es', string>>> = {
      PROVIDER_NOT_FOUND: {
        en: 'Please select a different provider or contact HR.',
        es: 'Por favor seleccione un proveedor diferente o contacte a RH.'
      },
      ENROLLMENT_PERIOD_CLOSED: {
        en: 'Contact HR for special enrollment options.',
        es: 'Contacte a RH para opciones de inscripción especial.'
      },
      MISSING_REQUIRED_DOCUMENTS: {
        en: 'Upload all required documents to continue.',
        es: 'Suba todos los documentos requeridos para continuar.'
      },
      SIGNATURE_REQUIRED: {
        en: 'Click the signature field to sign the form.',
        es: 'Haga clic en el campo de firma para firmar el formulario.'
      }
    };

    return actions[error.type]?.[language];
  }
}

export const healthInsuranceErrorHandler = HealthInsuranceErrorHandler.getInstance();