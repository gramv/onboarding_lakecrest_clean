import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import ManagerDashboard from '../pages/ManagerDashboard'
import { AuthProvider } from '../contexts/AuthContext'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the dashboard tab components
jest.mock('../components/dashboard/ApplicationsTab', () => {
  return {
    ApplicationsTab: function MockApplicationsTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return <div data-testid="applications-tab">Applications Tab - {userRole} - {propertyId}</div>
    }
  }
})

jest.mock('../components/dashboard/EmployeesTab', () => {
  return {
    EmployeesTab: function MockEmployeesTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return <div data-testid="employees-tab">Employees Tab - {userRole} - {propertyId}</div>
    }
  }
})

jest.mock('../components/dashboard/AnalyticsTab', () => {
  return {
    AnalyticsTab: function MockAnalyticsTab({ userRole, propertyId }: { userRole: string, propertyId: string }) {
      return <div data-testid="analytics-tab">Analytics Tab - {userRole} - {propertyId}</div>
    }
  }
})

// Mock toast hook
jest.mock('../hooks/use-toast', () => ({
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
  property_id: 'property-1'
}

const mockProperty = {
  id: 'property-1',
  name: 'Test Hotel',
  address: '123 Main St',
  city: 'Test City',
  state: 'TS',
  zip_code: '12345',
  phone: '555-0123',
  qr_code_url: 'http://example.com/qr',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z'
}

const mockApplications = [
  { id: '1', status: 'pending' },
  { id: '2', status: 'pending' },
  { id: '3', status: 'approved' }
]

const mockEmployees = [
  { id: '1', employment_status: 'active' },
  { id: '2', employment_status: 'active' },
  { id: '3', employment_status: 'inactive' }
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

// Mock AuthContext
const mockAuthContext = {
  user: mockManagerUser,
  token: 'mock-token',
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  isAuthenticated: true
}

jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: () => mockAuthContext
}))

describe('ManagerDashboard', () => {
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
  })

  test('renders manager dashboard with correct title and user info', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome back, John Manager')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  test('fetches and displays property information', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Hotel')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Test City, TS 12345')).toBeInTheDocument()
      expect(screen.getByText('555-0123')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  test('calculates and displays correct statistics', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Total Applications
      expect(screen.getByText('2')).toBeInTheDocument() // Pending Applications
      expect(screen.getByText('1')).toBeInTheDocument() // Approved Applications
      expect(screen.getByText('3')).toBeInTheDocument() // Total Employees
      expect(screen.getByText('2')).toBeInTheDocument() // Active Employees
    })
  })

  test('displays loading skeleton while fetching data', () => {
    renderWithProviders(<ManagerDashboard />)
    
    // Should show loading skeletons initially
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument()
    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
  })

  test('handles API error gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  test('retry button refetches data', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
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
    
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Retry'))
    
    await waitFor(() => {
      expect(screen.getByText('Test Hotel')).toBeInTheDocument()
    })
  })

  test('renders all navigation tabs with correct badges', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      
      // Check for pending applications badge
      expect(screen.getByText('2')).toBeInTheDocument() // Badge showing pending count
    })
  })

  test('switches between tabs correctly', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    // Applications tab should be active by default
    await waitFor(() => {
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Applications Tab - manager - property-1')).toBeInTheDocument()
    })
    
    // Click on Employees tab
    fireEvent.click(screen.getByText('Employees'))
    await waitFor(() => {
      expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
      expect(screen.getByText('Employees Tab - manager - property-1')).toBeInTheDocument()
    })
    
    // Click on Analytics tab
    fireEvent.click(screen.getByText('Analytics'))
    await waitFor(() => {
      expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
      expect(screen.getByText('Analytics Tab - manager - property-1')).toBeInTheDocument()
    })
  })

  test('denies access for non-manager users', () => {
    const nonManagerUser = { ...mockManagerUser, role: 'hr' as const }
    const mockNonManagerContext = { ...mockAuthContext, user: nonManagerUser }
    
    jest.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(mockNonManagerContext)
    
    renderWithProviders(<ManagerDashboard />)
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('Manager role required to access this dashboard.')).toBeInTheDocument()
    expect(screen.getByText('Return to Login')).toBeInTheDocument()
  })

  test('shows no property assigned message when property_id is missing', () => {
    const userWithoutProperty = { ...mockManagerUser, property_id: undefined }
    const mockContextWithoutProperty = { ...mockAuthContext, user: userWithoutProperty }
    
    jest.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(mockContextWithoutProperty)
    
    renderWithProviders(<ManagerDashboard />)
    
    expect(screen.getByText('No Property Assigned')).toBeInTheDocument()
    expect(screen.getByText('You are not currently assigned to a property. Please contact HR for assistance.')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  test('logout button calls logout function', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Logout'))
    expect(mockAuthContext.logout).toHaveBeenCalled()
  })

  test('passes correct props to tab components', async () => {
    renderWithProviders(<ManagerDashboard />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Applications Tab - manager - property-1')).toBeInTheDocument()
    })
    
    // Switch to employees tab and verify props
    fireEvent.click(screen.getByText('Employees'))
    await waitFor(() => {
      expect(screen.getByText('Employees Tab - manager - property-1')).toBeInTheDocument()
    })
    
    // Switch to analytics tab and verify props
    fireEvent.click(screen.getByText('Analytics'))
    await waitFor(() => {
      expect(screen.getByText('Analytics Tab - manager - property-1')).toBeInTheDocument()
    })
  })
})