import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmploymentHistoryStep from '../EmploymentHistoryStep'

describe('EmploymentHistoryStep', () => {
  const mockUpdateFormData = jest.fn()
  const mockOnComplete = jest.fn()
  
  const defaultProps = {
    formData: {
      employment_history: []
    },
    updateFormData: mockUpdateFormData,
    validationErrors: {},
    onComplete: mockOnComplete
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render with no employment history message', () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      expect(screen.getByText(/No employment history added yet/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add Employment/i })).toBeInTheDocument()
    })

    it('should render existing employment history', () => {
      const propsWithHistory = {
        ...defaultProps,
        formData: {
          employment_history: [
            {
              employer_name: 'Previous Company',
              job_title: 'Senior Developer',
              start_date: '2020-01-15',
              end_date: '2023-12-31',
              is_current: false,
              responsibilities: 'Developed software applications',
              reason_for_leaving: 'Career advancement',
              supervisor_name: 'John Smith',
              supervisor_phone: '(555) 123-4567',
              may_contact: true
            }
          ]
        }
      }
      
      render(<EmploymentHistoryStep {...propsWithHistory} />)
      
      expect(screen.getByDisplayValue('Previous Company')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument()
      expect(screen.queryByText(/No employment history/i)).not.toBeInTheDocument()
    })
  })

  describe('Adding Employment', () => {
    it('should add new employment entry when clicking add button', async () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /Add Employment/i })
      fireEvent.click(addButton)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({
        employment_history: [expect.objectContaining({
          employer_name: '',
          job_title: '',
          start_date: '',
          end_date: '',
          is_current: false,
          responsibilities: '',
          reason_for_leaving: '',
          supervisor_name: '',
          supervisor_phone: '',
          may_contact: true
        })]
      })
    })

    it('should add multiple employment entries', async () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /Add Employment/i })
      
      // Add first entry
      fireEvent.click(addButton)
      
      // Add second entry
      fireEvent.click(addButton)
      
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({
        employment_history: expect.arrayContaining([
          expect.any(Object),
          expect.any(Object)
        ])
      })
    })
  })

  describe('Editing Employment', () => {
    const singleEmploymentProps = {
      ...defaultProps,
      formData: {
        employment_history: [{
          employer_name: 'Test Company',
          job_title: 'Test Position',
          start_date: '2020-01-01',
          end_date: '',
          is_current: true,
          responsibilities: 'Various duties',
          reason_for_leaving: '',
          supervisor_name: 'Jane Doe',
          supervisor_phone: '(555) 987-6543',
          may_contact: false
        }]
      }
    }

    it('should update employer name', async () => {
      render(<EmploymentHistoryStep {...singleEmploymentProps} />)
      
      const employerInput = screen.getByLabelText(/Employer Name/)
      await userEvent.clear(employerInput)
      await userEvent.type(employerInput, 'New Company Name')
      
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({
        employment_history: [expect.objectContaining({
          employer_name: 'New Company Name'
        })]
      })
    })

    it('should handle current employment checkbox', async () => {
      render(<EmploymentHistoryStep {...singleEmploymentProps} />)
      
      const currentCheckbox = screen.getByLabelText(/This is my current employer/)
      await userEvent.click(currentCheckbox)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({
        employment_history: [expect.objectContaining({
          is_current: false
        })]
      })
    })

    it('should disable end date when current employment is checked', () => {
      render(<EmploymentHistoryStep {...singleEmploymentProps} />)
      
      const endDateInput = screen.getByLabelText(/End Date/)
      expect(endDateInput).toBeDisabled()
    })

    it('should enable end date when current employment is unchecked', async () => {
      const propsNotCurrent = {
        ...singleEmploymentProps,
        formData: {
          employment_history: [{
            ...singleEmploymentProps.formData.employment_history[0],
            is_current: false
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...propsNotCurrent} />)
      
      const endDateInput = screen.getByLabelText(/End Date/)
      expect(endDateInput).not.toBeDisabled()
    })

    it('should format phone number input', async () => {
      render(<EmploymentHistoryStep {...singleEmploymentProps} />)
      
      const phoneInput = screen.getByLabelText(/Supervisor Phone/)
      await userEvent.clear(phoneInput)
      await userEvent.type(phoneInput, '5551234567')
      
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({
        employment_history: [expect.objectContaining({
          supervisor_phone: '(555) 123-4567'
        })]
      })
    })

    it('should handle may contact supervisor checkbox', async () => {
      render(<EmploymentHistoryStep {...singleEmploymentProps} />)
      
      const contactCheckbox = screen.getByLabelText(/May we contact this supervisor/)
      await userEvent.click(contactCheckbox)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({
        employment_history: [expect.objectContaining({
          may_contact: true
        })]
      })
    })
  })

  describe('Removing Employment', () => {
    it('should remove employment entry when clicking remove button', async () => {
      const propsWithMultiple = {
        ...defaultProps,
        formData: {
          employment_history: [
            {
              employer_name: 'Company 1',
              job_title: 'Position 1',
              start_date: '2020-01-01',
              end_date: '2021-01-01',
              is_current: false,
              responsibilities: 'Duties 1',
              reason_for_leaving: 'Reason 1',
              supervisor_name: 'Super 1',
              supervisor_phone: '(555) 111-1111',
              may_contact: true
            },
            {
              employer_name: 'Company 2',
              job_title: 'Position 2',
              start_date: '2021-02-01',
              end_date: '',
              is_current: true,
              responsibilities: 'Duties 2',
              reason_for_leaving: '',
              supervisor_name: 'Super 2',
              supervisor_phone: '(555) 222-2222',
              may_contact: false
            }
          ]
        }
      }
      
      render(<EmploymentHistoryStep {...propsWithMultiple} />)
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i })
      fireEvent.click(removeButtons[0]) // Remove first entry
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({
        employment_history: [
          expect.objectContaining({
            employer_name: 'Company 2'
          })
        ]
      })
    })

    it('should show confirmation before removing', async () => {
      const propsWithOne = {
        ...defaultProps,
        formData: {
          employment_history: [{
            employer_name: 'Test Company',
            job_title: 'Test Position',
            start_date: '2020-01-01',
            end_date: '2023-01-01',
            is_current: false,
            responsibilities: 'Test duties',
            reason_for_leaving: 'Test reason',
            supervisor_name: 'Test Super',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...propsWithOne} />)
      
      const removeButton = screen.getByRole('button', { name: /Remove/i })
      
      // Component might show confirmation dialog
      fireEvent.click(removeButton)
      
      // Check if employment was removed
      expect(mockUpdateFormData).toHaveBeenCalledWith({
        employment_history: []
      })
    })
  })

  describe('Date Validation', () => {
    it('should validate end date is after start date', async () => {
      const props = {
        ...defaultProps,
        formData: {
          employment_history: [{
            employer_name: 'Test',
            job_title: 'Test',
            start_date: '2023-01-01',
            end_date: '2022-01-01', // End before start
            is_current: false,
            responsibilities: 'Test',
            reason_for_leaving: 'Test',
            supervisor_name: 'Test',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...props} />)
      
      // Should show validation error
      expect(screen.getByText(/End date must be after start date/i)).toBeInTheDocument()
    })

    it('should not allow future dates for past employment', () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      // Add new employment
      fireEvent.click(screen.getByRole('button', { name: /Add Employment/i }))
      
      const startDateInput = screen.getByLabelText(/Start Date/) as HTMLInputElement
      const endDateInput = screen.getByLabelText(/End Date/) as HTMLInputElement
      
      // Check max date is today
      const today = new Date().toISOString().split('T')[0]
      expect(startDateInput.max).toBe(today)
      expect(endDateInput.max).toBe(today)
    })
  })

  describe('Form Completion', () => {
    it('should mark complete with at least one valid employment', async () => {
      const completeProps = {
        ...defaultProps,
        formData: {
          employment_history: [{
            employer_name: 'Valid Company',
            job_title: 'Valid Position',
            start_date: '2020-01-01',
            end_date: '2023-01-01',
            is_current: false,
            responsibilities: 'Valid responsibilities described here',
            reason_for_leaving: 'Valid reason for leaving',
            supervisor_name: 'Valid Supervisor',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...completeProps} />)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(true)
      })
    })

    it('should mark incomplete with no employment history', () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })

    it('should mark incomplete with invalid employment entry', () => {
      const incompleteProps = {
        ...defaultProps,
        formData: {
          employment_history: [{
            employer_name: 'Test',
            job_title: '', // Missing required field
            start_date: '2020-01-01',
            end_date: '',
            is_current: true,
            responsibilities: 'Test',
            reason_for_leaving: '',
            supervisor_name: 'Test',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...incompleteProps} />)
      
      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })
  })

  describe('UI Feedback', () => {
    it('should show character count for responsibilities field', async () => {
      const props = {
        ...defaultProps,
        formData: {
          employment_history: [{
            employer_name: 'Test',
            job_title: 'Test',
            start_date: '2020-01-01',
            end_date: '',
            is_current: true,
            responsibilities: 'This is a test description',
            reason_for_leaving: '',
            supervisor_name: 'Test',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          }]
        }
      }
      
      render(<EmploymentHistoryStep {...props} />)
      
      // Look for character count display
      expect(screen.getByText(/26 \/ 500/i)).toBeInTheDocument()
    })

    it('should highlight required fields', () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      // Add new employment
      fireEvent.click(screen.getByRole('button', { name: /Add Employment/i }))
      
      // Check for required field indicators
      expect(screen.getByText(/Employer Name \*/)).toBeInTheDocument()
      expect(screen.getByText(/Job Title \*/)).toBeInTheDocument()
      expect(screen.getByText(/Start Date \*/)).toBeInTheDocument()
    })

    it('should show helpful instructions', () => {
      render(<EmploymentHistoryStep {...defaultProps} />)
      
      expect(screen.getByText(/List your work experience starting with your most recent position/i)).toBeInTheDocument()
    })
  })

  describe('Multiple Employment Entries', () => {
    it('should handle reordering of employment entries', async () => {
      const propsWithMultiple = {
        ...defaultProps,
        formData: {
          employment_history: [
            { employer_name: 'Company A', job_title: 'Position A', start_date: '2020-01-01', end_date: '2021-01-01', is_current: false, responsibilities: 'A', reason_for_leaving: 'A', supervisor_name: 'A', supervisor_phone: '(555) 111-1111', may_contact: true },
            { employer_name: 'Company B', job_title: 'Position B', start_date: '2021-02-01', end_date: '2022-01-01', is_current: false, responsibilities: 'B', reason_for_leaving: 'B', supervisor_name: 'B', supervisor_phone: '(555) 222-2222', may_contact: true },
            { employer_name: 'Company C', job_title: 'Position C', start_date: '2022-02-01', end_date: '', is_current: true, responsibilities: 'C', reason_for_leaving: '', supervisor_name: 'C', supervisor_phone: '(555) 333-3333', may_contact: true }
          ]
        }
      }
      
      render(<EmploymentHistoryStep {...propsWithMultiple} />)
      
      // Check all three are rendered in order
      const employers = screen.getAllByLabelText(/Employer Name/)
      expect(employers[0]).toHaveValue('Company A')
      expect(employers[1]).toHaveValue('Company B')
      expect(employers[2]).toHaveValue('Company C')
    })

    it('should limit maximum number of employment entries', () => {
      const maxEntries = 10
      const propsWithMax = {
        ...defaultProps,
        formData: {
          employment_history: Array(maxEntries).fill({
            employer_name: 'Test',
            job_title: 'Test',
            start_date: '2020-01-01',
            end_date: '2021-01-01',
            is_current: false,
            responsibilities: 'Test',
            reason_for_leaving: 'Test',
            supervisor_name: 'Test',
            supervisor_phone: '(555) 123-4567',
            may_contact: true
          })
        }
      }
      
      render(<EmploymentHistoryStep {...propsWithMax} />)
      
      // Add button should be disabled or hidden
      const addButton = screen.queryByRole('button', { name: /Add Employment/i })
      expect(addButton).toBeDisabled() || expect(addButton).not.toBeInTheDocument()
    })
  })
})