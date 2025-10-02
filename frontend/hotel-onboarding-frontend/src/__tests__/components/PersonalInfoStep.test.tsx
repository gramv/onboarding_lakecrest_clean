/**
 * Tests for PersonalInfoStep component
 * Tests personal information collection and emergency contacts
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PersonalInfoStep from '@/pages/onboarding/PersonalInfoStep'
import { StepProps } from '@/types/form'

// Mock the form components
jest.mock('@/components/PersonalInformationForm', () => {
  return function MockPersonalInformationForm({ onSave, onValidate, initialData }: any) {
    return (
      <div data-testid="personal-info-form">
        <button onClick={() => {
          const mockData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '555-0123',
            birthDate: '1990-01-01'
          }
          onSave(mockData)
          onValidate(true)
        }}>Save Personal Info</button>
      </div>
    )
  }
})

jest.mock('@/components/EmergencyContactsForm', () => {
  return function MockEmergencyContactsForm({ onSave, onValidate, initialData }: any) {
    return (
      <div data-testid="emergency-contacts-form">
        <button onClick={() => {
          const mockData = {
            primaryContact: {
              name: 'Jane Doe',
              relationship: 'spouse',
              phone: '555-1111'
            }
          }
          onSave(mockData)
          onValidate(true)
        }}>Save Emergency Contacts</button>
      </div>
    )
  }
})

describe('PersonalInfoStep', () => {
  const mockProps: StepProps = {
    currentStep: { id: 'personal-info', title: 'Personal Information' },
    progress: { stepData: {} },
    markStepComplete: jest.fn(),
    saveProgress: jest.fn(),
    language: 'en',
    employee: { id: 'emp-123', name: 'Test Employee' },
    property: { id: 'prop-123', name: 'Test Hotel' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without errors', () => {
    render(<PersonalInfoStep {...mockProps} />)
    expect(screen.getByText(/personal information/i)).toBeInTheDocument()
  })

  it('should display both personal info and emergency contacts tabs', () => {
    render(<PersonalInfoStep {...mockProps} />)
    
    expect(screen.getByRole('tab', { name: /personal information/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /emergency contacts/i })).toBeInTheDocument()
  })

  it('should load existing data from progress', () => {
    const propsWithData = {
      ...mockProps,
      progress: {
        stepData: {
          'personal-info': {
            personalInfo: { firstName: 'Existing', lastName: 'User' },
            emergencyContacts: { primaryContact: { name: 'Contact Name' } }
          }
        }
      }
    }

    render(<PersonalInfoStep {...propsWithData} />)
    // Forms should receive the initial data
    expect(screen.getByTestId('personal-info-form')).toBeInTheDocument()
  })

  it('should save progress when personal info is updated', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...mockProps} />)

    const saveButton = screen.getByText('Save Personal Info')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('personal-info', {
        personalInfo: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        }),
        emergencyContacts: null
      })
    })
  })

  it('should save progress when emergency contacts are updated', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...mockProps} />)

    // Switch to emergency contacts tab
    const emergencyTab = screen.getByRole('tab', { name: /emergency contacts/i })
    await user.click(emergencyTab)

    const saveButton = screen.getByText('Save Emergency Contacts')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('personal-info', {
        personalInfo: null,
        emergencyContacts: expect.objectContaining({
          primaryContact: expect.objectContaining({
            name: 'Jane Doe',
            relationship: 'spouse'
          })
        })
      })
    })
  })

  it('should enable completion only when both forms are valid', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...mockProps} />)

    // Initially, continue button should be disabled
    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).toBeDisabled()

    // Complete personal info
    await user.click(screen.getByText('Save Personal Info'))

    // Still disabled - need emergency contacts
    expect(continueButton).toBeDisabled()

    // Switch to emergency contacts
    await user.click(screen.getByRole('tab', { name: /emergency contacts/i }))
    await user.click(screen.getByText('Save Emergency Contacts'))

    // Now should be enabled
    await waitFor(() => {
      expect(continueButton).not.toBeDisabled()
    })
  })

  it('should mark step complete when continue is clicked', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...mockProps} />)

    // Complete both forms
    await user.click(screen.getByText('Save Personal Info'))
    await user.click(screen.getByRole('tab', { name: /emergency contacts/i }))
    await user.click(screen.getByText('Save Emergency Contacts'))

    // Click continue
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await waitFor(() => expect(continueButton).not.toBeDisabled())
    await user.click(continueButton)

    expect(mockProps.markStepComplete).toHaveBeenCalledWith('personal-info', {
      personalInfo: expect.any(Object),
      emergencyContacts: expect.any(Object)
    })
  })

  it('should handle language switching', () => {
    const spanishProps = { ...mockProps, language: 'es' as const }
    render(<PersonalInfoStep {...spanishProps} />)

    // Check for Spanish text
    expect(screen.getByText(/información personal/i)).toBeInTheDocument()
  })

  it('should show validation status indicators', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...mockProps} />)

    // Complete personal info
    await user.click(screen.getByText('Save Personal Info'))

    // Should show completion indicator for personal info tab
    const personalTab = screen.getByRole('tab', { name: /personal information/i })
    expect(personalTab).toHaveClass('data-[state=active]:text-primary')
  })

  it('should handle save errors gracefully', async () => {
    const errorProps = {
      ...mockProps,
      saveProgress: jest.fn().mockRejectedValue(new Error('Save failed'))
    }

    const user = userEvent.setup()
    render(<PersonalInfoStep {...errorProps} />)

    await user.click(screen.getByText('Save Personal Info'))

    // Should still update local state even if save fails
    await waitFor(() => {
      expect(errorProps.saveProgress).toHaveBeenCalled()
    })
  })
})