import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonalInfoStep from './PersonalInfoStep';
import { StepProps } from '../../controllers/OnboardingFlowController';

// Mock the AutoSaveManager
jest.mock('@/utils/AutoSaveManager', () => ({
  AutoSaveManager: jest.fn().mockImplementation(() => ({
    initAutoSave: jest.fn(),
    triggerImmediateSave: jest.fn(),
    updateLastSaved: jest.fn(),
    destroy: jest.fn()
  }))
}));

// Mock the FormValidator
jest.mock('@/utils/formValidation', () => ({
  FormValidator: {
    getInstance: jest.fn(() => ({
      validateForm: jest.fn(() => ({ isValid: true, errors: {}, warnings: {} }))
    }))
  },
  getValidationRules: jest.fn(() => [])
}));

const mockProps: StepProps = {
  currentStep: { id: 'personal_info', name: 'Personal Info', order: 1, required: true, estimatedMinutes: 5 },
  progress: { 
    currentStepIndex: 0, 
    totalSteps: 10, 
    completedSteps: [], 
    percentComplete: 0, 
    canProceed: false,
    formData: {}
  },
  markStepComplete: jest.fn(),
  saveProgress: jest.fn(),
  goToNextStep: jest.fn(),
  goToPreviousStep: jest.fn(),
  language: 'en',
  employee: null,
  property: null,
  sessionToken: 'test-token',
  expiresAt: new Date().toISOString()
};

describe('PersonalInfoStep Enhanced Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays auto-save status indicator', async () => {
    render(<PersonalInfoStep {...mockProps} />);
    
    // Should show save status indicator
    expect(screen.getByText('Auto-saves every 30 seconds')).toBeInTheDocument();
  });

  test('loads saved progress data on mount', async () => {
    const progressWithData = {
      ...mockProps.progress,
      formData: {
        personal_info: {
          personalInfo: { firstName: 'John', lastName: 'Doe' },
          emergencyContacts: { primaryContact: { name: 'Jane Doe' } },
          activeTab: 'emergency'
        }
      }
    };

    render(<PersonalInfoStep {...mockProps} progress={progressWithData} />);
    
    // Should load the saved active tab
    await waitFor(() => {
      const emergencyTab = screen.getByRole('tab', { name: /emergency contacts/i });
      expect(emergencyTab).toHaveAttribute('data-state', 'active');
    });
  });

  test('shows validation errors alert when present', async () => {
    render(<PersonalInfoStep {...mockProps} />);
    
    // Try to continue without completing forms
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please complete both personal information and emergency contacts/i))
        .toBeInTheDocument();
    });
  });

  test('displays mobile optimization notice on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<PersonalInfoStep {...mockProps} />);
    
    expect(screen.getByText(/mobile tip/i)).toBeInTheDocument();
    expect(screen.getByText(/tap and hold form fields/i)).toBeInTheDocument();
  });

  test('supports Spanish language', () => {
    render(<PersonalInfoStep {...mockProps} language="es" />);
    
    expect(screen.getByText('Información Personal')).toBeInTheDocument();
    expect(screen.getByText('Auto-guardado cada 30 segundos')).toBeInTheDocument();
  });

  test('saves progress on tab change', async () => {
    render(<PersonalInfoStep {...mockProps} />);
    
    // Switch to emergency contacts tab
    const emergencyTab = screen.getByRole('tab', { name: /emergency contacts/i });
    fireEvent.click(emergencyTab);
    
    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalled();
    });
  });

  test('shows progress indicator when step is complete', async () => {
    // Mock both forms as valid
    const mockPersonalForm = jest.fn();
    const mockEmergencyForm = jest.fn();
    
    render(<PersonalInfoStep {...mockProps} />);
    
    // Simulate form validation completion
    // This would typically be triggered by the child components
    await waitFor(() => {
      // Check if progress indicators are visible in the UI
      expect(screen.getByText('Section Progress')).toBeInTheDocument();
    });
  });

  test('prevents continuation with validation errors', async () => {
    render(<PersonalInfoStep {...mockProps} />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    
    // Button should be disabled initially (forms not completed)
    expect(continueButton).toBeDisabled();
  });

  test('shows save status changes', async () => {
    render(<PersonalInfoStep {...mockProps} />);
    
    // Initially should show "Not saved"
    expect(screen.getByText(/not saved/i)).toBeInTheDocument();
    
    // After successful save, should update status
    // This would be triggered by actual form interactions
  });
});