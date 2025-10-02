import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { AuthProvider } from '../../contexts/AuthContext'
import ManagerDashboard from '../../pages/ManagerDashboard'
import LoginPage from '../../pages/LoginPage'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the dashboard tab components
jest.mock('../../components/dashboard/ApplicationsTab', () => {
  return {
    ApplicationsTab: function MockApplicationsTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return (
        <div data-testid="applications-tab">
          <h2>Applications for Property {propertyId}</h2>
          <div data-testid="applications-list">
            <div data-testid="application-1">
              <span>John Applicant - Housekeeping</span>
              <button data-testid="approve-btn-1">Approve</button>
              <button data-testid="reject-btn-1">Reject</button>
            </div>
            <div data-testid="application-2">
              <span>Jane Candidate - Front Desk</span>
              <button data-testid="approve-btn-2">Approve</button>
              <button data-testid="reject-btn-2">Reject</button>
            </div>
          </div>
        </div>
      )
    }
  }
})

jest.mock('../../components/dashboard/EmployeesTab', () => {
  return {
    EmployeesTab: function MockEmployeesTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return (
        <div data-testid="employees-tab">
          <h2>Employees for Property {propertyId}</h2>
          <div data-testid="employees-list">
            <div>Alice Employee - Housekeeping - Active</div>
            <div>Bob Worker - Maintenance - Active</div>
            <div>Carol Staff - Front Desk - Inactive</div>
          </div>
        </div>
      )
    }
  }
})

jest.mock('../../components/dashboard/AnalyticsTab', () => {
  return {
    AnalyticsTab: function MockAnalyticsTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return (
        <div data-testid="analytics-tab">
          <h2>Analytics for Property {propertyId}</h2>
          <div data-testid="property-metrics">
            <div>Occupancy Rate: 78%</div>
            <div>Staff Efficiency: 85%</div>
            <div>Application Response Time: 2.3 days</div>
          </div>
        </div>
      )
    }
  }
})

// Mock toast hook
jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    error: jest.fn(),
    success: jest.fn()
  })
}))

const mockManagerUser = {
  id: '1',
  email: 'manager@test.com',
  role: 'manager' as const,
  first_name: 'John',
  last_name: 'Manager',
  property_id: 'property-123'
}

const mockProperty = {
  id: 'property-123',
  name: 'Sunset Resort',
  address: '456 Beach Ave',
  city: 'Miami',
  state: 'FL',
  zip_code: '33101',
  phone: '305-555-0123',
  qr_code_url: 'http://example.com/qr/property-123',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z'
}

const mockApplications = [
  { id: '1', status: 'pending', applicant_data: { first_name: 'John', last_name: 'Applicant' } },
  { id: '2', status: 'pending', applicant_data: { first_name: 'Jane', last_name: 'Candidate' } },
  { id: '3', status: 'approved', applicant_data: { first_name: 'Bob', last_name: 'Approved' } }
]

const mockEmployees = [
  { id: '1', employment_status: 'active', first_name: 'Alice', last_name: 'Employee' },
  { id: '2', employment_status: 'active', first_name: 'Bob', last_name: 'Worker' },
  { id: '3', employment_status: 'inactive', first_name: 'Carol', last_name: 'Staff' }
]

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

// Mock AuthContext with manager user
const mockAuthContext = {
  user: mockManagerUser,
  token: 'manager-token-123',
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  isAuthenticated: true
}

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuthContext
}))

describe('Manager Complete Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock API responses
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/hr/properties')) {
        return Promise.resolve({ data: [mockProperty] })
      }
      if (url.includes('/hr/applications')) {
        return Promise.resolve({ data: mockApplications })
      }
      if (url.includes('/api/employees')) {
        return Promise.resolve({ data: mockEmployees })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    // Mock login
    mockedAxios.post.mockResolvedValue({
      data: {
        token: 'manager-token-123',
        user: mockManagerUser,
        expires_at: '2024-12-31T23:59:59Z'
      }
    })
  })

  test('complete manager login and dashboard workflow', async () => {
    const user = userEvent.setup()
    
    // Start with login page
    renderWithProviders(<LoginPage />)
    
    // Fill in manager credentials
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    
    await user.type(emailInput, 'manager@test.com')
    await user.type(passwordInput, 'password123')
    
    // Submit login form
    const loginButton = screen.getByRole('button', { name: 'Sign In' })
    await user.click(loginButton)
    
    // Verify login API call
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
        email: 'manager@test.com',
        password: 'password123'
      })
    })
    
    // Now render the Manager Dashboard (simulating successful login redirect)
    renderWithProviders(<ManagerDashboard />)
    
    // Verify dashboard loads with property info
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Welcome back, John Manager')).toBeInTheDocument()
      expect(screen.getByText('Sunset Resort')).toBeInTheDocument()
    })
    
    // Verify property details are displayed
    await waitFor(() => {
      expect(screen.getByText('456 Beach Ave, Miami, FL 33101')).toBeInTheDocument()
      expect(screen.getByText('305-555-0123')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
    
    // Verify statistics are calculated and displayed
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Total Applications
      expect(screen.getByText('2')).toBeInTheDocument() // Pending Applications
      expect(screen.getByText('1')).toBeInTheDocument() // Approved Applications
      expect(screen.getByText('3')).toBeInTheDocument() // Total Employees
      expect(screen.getByText('2')).toBeInTheDocument() // Active Employees
    })
  })

  test('manager application review workflow', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<ManagerDashboard />)
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Applications tab should be active by default
    await waitFor(() => {
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Applications for Property property-123')).toBeInTheDocument()
    })
    
    // Verify applications are listed
    expect(screen.getByText('John Applicant - Housekeeping')).toBeInTheDocument()
    expect(screen.getByText('Jane Candidate - Front Desk')).toBeInTheDocument()
    
    // Test approve application workflow
    const approveBtn = screen.getByTestId('approve-btn-1')
    await user.click(approveBtn)
    
    // Test reject application workflow
    const rejectBtn = screen.getByTestId('reject-btn-2')
    await user.click(rejectBtn)
    
    // Verify buttons are present and clickable
    expect(screen.getByTestId('approve-btn-1')).toBeInTheDocument()
    expect(screen.getByTestId('reject-btn-1')).toBeInTheDocument()
  })

  test('manager employee management workflow', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Navigate to Employees tab
    const employeesTab = screen.getByText('Employees')
    await user.click(employeesTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
      expect(screen.getByText('Employees for Property property-123')).toBeInTheDocument()
    })
    
    // Verify employees are listed
    expect(screen.getByText('Alice Employee - Housekeeping - Active')).toBeInTheDocument()
    expect(screen.getByText('Bob Worker - Maintenance - Active')).toBeInTheDocument()
    expect(screen.getByText('Carol Staff - Front Desk - Inactive')).toBeInTheDocument()
  })

  test('manager analytics workflow', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Navigate to Analytics tab
    const analyticsTab = screen.getByText('Analytics')
    await user.click(analyticsTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
      expect(screen.getByText('Analytics for Property property-123')).toBeInTheDocument()
    })
    
    // Verify analytics metrics are displayed
    expect(screen.getByText('Occupancy Rate: 78%')).toBeInTheDocument()
    expect(screen.getByText('Staff Efficiency: 85%')).toBeInTheDocument()
    expect(screen.getByText('Application Response Time: 2.3 days')).toBeInTheDocument()
  })

  test('manager dashboard handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    mockedAxios.get.mockRejectedValue(new Error('Server unavailable'))
    
    renderWithProviders(<ManagerDashboard />)
    
    // Should show error message and retry button
    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    
    // Test retry functionality
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/hr/properties')) {
        return Promise.resolve({ data: [mockProperty] })
      }
      if (url.includes('/hr/applications')) {
        return Promise.resolve({ data: mockApplications })
      }
      if (url.includes('/api/employees')) {
        return Promise.resolve({ data: mockEmployees })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
    
    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)
    
    // Should recover and show property info
    await waitFor(() => {
      expect(screen.getByText('Sunset Resort')).toBeInTheDocument()
      expect(screen.queryByText('Server unavailable')).not.toBeInTheDocument()
    })
  })

  test('manager dashboard shows no property assigned message', () => {
    // Mock user without property
    const userWithoutProperty = { ...mockManagerUser, property_id: undefined }
    const mockContextWithoutProperty = { ...mockAuthContext, user: userWithoutProperty }
    
    jest.doMock('../../contexts/AuthContext', () => ({
      ...jest.requireActual('../../contexts/AuthContext'),
      useAuth: () => mockContextWithoutProperty
    }))
    
    renderWithProviders(<ManagerDashboard />)
    
    expect(screen.getByText('No Property Assigned')).toBeInTheDocument()
    expect(screen.getByText('You are not currently assigned to a property. Please contact HR for assistance.')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  test('manager dashboard shows access denied for non-manager users', () => {
    // Mock HR user trying to access manager dashboard
    const hrUser = {
      id: '1',
      email: 'hr@test.com',
      role: 'hr' as const,
      first_name: 'HR',
      last_name: 'Admin'
    }
    const mockHRContext = { ...mockAuthContext, user: hrUser }
    
    jest.doMock('../../contexts/AuthContext', () => ({
      ...jest.requireActual('../../contexts/AuthContext'),
      useAuth: () => mockHRContext
    }))
    
    renderWithProviders(<ManagerDashboard />)
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('Manager role required to access this dashboard.')).toBeInTheDocument()
  })

  test('manager dashboard tab navigation maintains state', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Start on Applications tab (default)
    expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
    
    // Navigate to Employees tab
    await user.click(screen.getByText('Employees'))
    expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
    
    // Navigate to Analytics tab
    await user.click(screen.getByText('Analytics'))
    expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
    
    // Navigate back to Applications tab
    await user.click(screen.getByText('Applications'))
    expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
    
    // Verify applications content is still there
    expect(screen.getByText('John Applicant - Housekeeping')).toBeInTheDocument()
  })

  test('manager dashboard shows pending applications badge', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Should show badge with pending applications count
    await waitFor(() => {
      const badge = screen.getByText('2') // 2 pending applications
      expect(badge).toBeInTheDocument()
    })
  })

  test('manager logout workflow', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    })
    
    // Click logout button
    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)
    
    // Verify logout function was called
    expect(mockAuthContext.logout).toHaveBeenCalled()
  })
})