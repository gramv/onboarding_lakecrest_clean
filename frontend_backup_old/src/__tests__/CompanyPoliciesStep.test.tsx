import React from 'react'
import { render, screen } from '@testing-library/react'
import CompanyPoliciesStep from '../pages/onboarding/CompanyPoliciesStep'

// Mock the DigitalSignatureCapture component to avoid complex dependencies
jest.mock('../components/DigitalSignatureCapture', () => {
  return function MockDigitalSignatureCapture({ onSignatureComplete, onCancel }: any) {
    return (
      <div data-testid="digital-signature-capture">
        <button onClick={() => onSignatureComplete('mock-signature')}>Sign</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

const mockProps = {
  currentStep: { id: 'company-policies', name: 'Company Policies' },
  progress: {
    currentStep: 0,
    totalSteps: 5,
    completedSteps: [],
    stepData: {}
  },
  markStepComplete: jest.fn(),
  saveProgress: jest.fn(),
  language: 'en' as const,
  employee: { name: 'John Doe', position: 'Test Employee' },
  property: { name: 'Test Hotel' }
}

describe('CompanyPoliciesStep', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console.error to catch any unexpected errors
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders without console errors', () => {
    render(<CompanyPoliciesStep {...mockProps} />)
    
    // Check that the component renders main elements
    expect(screen.getByText('Company Policies')).toBeInTheDocument()
    expect(screen.getByText(/Please review and acknowledge our company policies/)).toBeInTheDocument()
    
    // Verify no console errors occurred during rendering
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('renders policy accordion without DOM nesting warnings', () => {
    render(<CompanyPoliciesStep {...mockProps} />)
    
    // Check that policies are rendered - use partial text matching since they might be in accordion
    expect(screen.getByText(/At-Will Employment/)).toBeInTheDocument()
    expect(screen.getByText(/Equal Employment Opportunity/)).toBeInTheDocument()
    
    // Verify no DOM nesting warnings in console
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/validateDOMNesting/),
      expect.anything()
    )
  })
})