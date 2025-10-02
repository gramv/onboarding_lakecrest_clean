import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PositionAvailabilityStep from '../PositionAvailabilityStep'

describe('PositionAvailabilityStep', () => {
  const mockUpdateFormData = jest.fn()
  const mockOnComplete = jest.fn()
  
  const mockPropertyInfo = {
    property: {
      id: 'test-123',
      name: 'Test Hotel',
      city: 'Test City',
      state: 'CA'
    },
    departments_and_positions: {
      'Front Desk': ['Guest Service Agent', 'Night Auditor', 'Front Desk Supervisor'],
      'Housekeeping': ['Room Attendant', 'Housekeeping Supervisor', 'Laundry Attendant'],
      'Restaurant': ['Server', 'Cook', 'Bartender', 'Host/Hostess']
    }
  }
  
  const defaultProps = {
    formData: {},
    updateFormData: mockUpdateFormData,
    validationErrors: {},
    propertyInfo: mockPropertyInfo,
    onComplete: mockOnComplete
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Department and Position Selection', () => {
    it('should render department dropdown with all departments', () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const departmentSelect = screen.getByLabelText(/Department \*/)
      fireEvent.click(departmentSelect)
      
      expect(screen.getByText('Front Desk')).toBeInTheDocument()
      expect(screen.getByText('Housekeeping')).toBeInTheDocument()
      expect(screen.getByText('Restaurant')).toBeInTheDocument()
    })

    it('should update position options when department is selected', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      // Select Front Desk department
      const departmentSelect = screen.getByLabelText(/Department \*/)
      fireEvent.click(departmentSelect)
      fireEvent.click(screen.getByText('Front Desk'))
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ department: 'Front Desk' })
      
      // Check position dropdown is enabled and has correct options
      const positionSelect = screen.getByLabelText(/Position \*/)
      fireEvent.click(positionSelect)
      
      expect(screen.getByText('Guest Service Agent')).toBeInTheDocument()
      expect(screen.getByText('Night Auditor')).toBeInTheDocument()
      expect(screen.getByText('Front Desk Supervisor')).toBeInTheDocument()
    })

    it('should clear position when department changes', async () => {
      const propsWithData = {
        ...defaultProps,
        formData: {
          department: 'Front Desk',
          position: 'Guest Service Agent'
        }
      }
      
      render(<PositionAvailabilityStep {...propsWithData} />)
      
      // Change department
      const departmentSelect = screen.getByLabelText(/Department \*/)
      fireEvent.click(departmentSelect)
      fireEvent.click(screen.getByText('Housekeeping'))
      
      // Position should be cleared
      expect(mockUpdateFormData).toHaveBeenCalledWith({ 
        department: 'Housekeeping',
        position: '' 
      })
    })
  })

  describe('Employment Type and Schedule', () => {
    it('should handle employment type selection', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const fullTimeRadio = screen.getByLabelText('Full-Time')
      await userEvent.click(fullTimeRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ employment_type: 'full-time' })
      
      const partTimeRadio = screen.getByLabelText('Part-Time')
      await userEvent.click(partTimeRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ employment_type: 'part-time' })
    })

    it('should handle shift preference selection', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const shiftSelect = screen.getByLabelText(/Shift Preference \*/)
      fireEvent.click(shiftSelect)
      
      const options = ['Day Shift', 'Evening Shift', 'Night Shift', 'Any Shift']
      options.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Night Shift'))
      expect(mockUpdateFormData).toHaveBeenCalledWith({ shift_preference: 'night' })
    })

    it('should handle start date selection', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/Available Start Date \*/)
      await userEvent.type(dateInput, '2025-02-15')
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ start_date: '2025-02-15' })
    })

    it('should validate start date is not in the past', () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/Available Start Date \*/) as HTMLInputElement
      
      // Check min date is set to today
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput.min).toBe(today)
    })
  })

  describe('Availability Questions', () => {
    it('should handle weekend availability', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const yesRadio = screen.getAllByLabelText('Yes')[0]
      await userEvent.click(yesRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ availability_weekends: 'yes' })
      
      const noRadio = screen.getAllByLabelText('No')[0]
      await userEvent.click(noRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ availability_weekends: 'no' })
    })

    it('should handle holiday availability', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const radios = screen.getAllByRole('radio', { name: 'Yes' })
      // Second set of Yes/No is for holidays
      await userEvent.click(radios[1])
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ availability_holidays: 'yes' })
    })

    it('should handle overtime availability', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const radios = screen.getAllByRole('radio', { name: 'Yes' })
      // Third set is for overtime
      await userEvent.click(radios[2])
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ availability_overtime: 'yes' })
    })
  })

  describe('Salary and Compensation', () => {
    it('should handle desired salary input', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const salaryInput = screen.getByLabelText(/Desired Salary/)
      await userEvent.type(salaryInput, '45000')
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ desired_salary: '45000' })
    })

    it('should format salary with thousand separators on blur', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const salaryInput = screen.getByLabelText(/Desired Salary/)
      await userEvent.type(salaryInput, '45000')
      await userEvent.tab() // Trigger blur
      
      // Component should format the display
      expect(salaryInput).toHaveValue('45,000')
    })

    it('should accept salary ranges', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const salaryInput = screen.getByLabelText(/Desired Salary/)
      await userEvent.type(salaryInput, '40000-50000')
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ desired_salary: '40000-50000' })
    })
  })

  describe('Work Authorization', () => {
    it('should handle work authorization status', async () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      const yesRadio = screen.getByRole('radio', { name: /Yes.*authorized to work/ })
      await userEvent.click(yesRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ work_authorized: 'yes' })
    })

    it('should show sponsorship question when not authorized', async () => {
      const propsWithData = {
        ...defaultProps,
        formData: { work_authorized: 'no' }
      }
      
      render(<PositionAvailabilityStep {...propsWithData} />)
      
      // Should show sponsorship question
      expect(screen.getByText(/Will you require sponsorship/)).toBeInTheDocument()
      
      const sponsorshipYes = screen.getByRole('radio', { name: /Yes.*sponsorship/ })
      await userEvent.click(sponsorshipYes)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ sponsorship_required: 'yes' })
    })

    it('should not show sponsorship question when authorized', () => {
      const propsWithData = {
        ...defaultProps,
        formData: { work_authorized: 'yes' }
      }
      
      render(<PositionAvailabilityStep {...propsWithData} />)
      
      // Should not show sponsorship question
      expect(screen.queryByText(/Will you require sponsorship/)).not.toBeInTheDocument()
    })
  })

  describe('Form Completion', () => {
    it('should mark step complete when all required fields are filled', async () => {
      const completeData = {
        department: 'Front Desk',
        position: 'Guest Service Agent',
        employment_type: 'full-time',
        shift_preference: 'any',
        start_date: '2025-02-01',
        availability_weekends: 'yes',
        availability_holidays: 'yes',
        availability_overtime: 'yes',
        work_authorized: 'yes',
        desired_salary: '35000'
      }
      
      render(<PositionAvailabilityStep {...defaultProps} formData={completeData} />)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(true)
      })
    })

    it('should mark step incomplete when required fields are missing', () => {
      const incompleteData = {
        department: 'Front Desk',
        // Missing position and other required fields
      }
      
      render(<PositionAvailabilityStep {...defaultProps} formData={incompleteData} />)
      
      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })
  })

  describe('Validation', () => {
    it('should show validation errors for required fields', async () => {
      const propsWithErrors = {
        ...defaultProps,
        validationErrors: {
          department: 'Department is required',
          position: 'Position is required',
          start_date: 'Start date is required'
        }
      }
      
      render(<PositionAvailabilityStep {...propsWithErrors} />)
      
      expect(screen.getByText('Department is required')).toBeInTheDocument()
      expect(screen.getByText('Position is required')).toBeInTheDocument()
      expect(screen.getByText('Start date is required')).toBeInTheDocument()
    })
  })

  describe('Special Cases', () => {
    it('should handle property with no departments', () => {
      const propsNoDepts = {
        ...defaultProps,
        propertyInfo: {
          ...mockPropertyInfo,
          departments_and_positions: {}
        }
      }
      
      render(<PositionAvailabilityStep {...propsNoDepts} />)
      
      const departmentSelect = screen.getByLabelText(/Department \*/)
      fireEvent.click(departmentSelect)
      
      // Should show no departments message or be empty
      expect(screen.queryByText('Front Desk')).not.toBeInTheDocument()
    })

    it('should display helpful tooltips and descriptions', () => {
      render(<PositionAvailabilityStep {...defaultProps} />)
      
      // Check for helpful text
      expect(screen.getByText(/Please select your preferred work schedule/)).toBeInTheDocument()
      expect(screen.getByText(/legally authorized to work/)).toBeInTheDocument()
    })
  })
})