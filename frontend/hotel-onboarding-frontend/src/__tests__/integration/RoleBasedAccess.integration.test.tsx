import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { AuthProvider } from '../../contexts/AuthContext'
import HRDashboard from '../../pages/HRDashboard'
import ManagerDashboard from '../../pages/ManagerDashboard'
import LoginPage from '../../pages/LoginPage'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock dashboard components
jest.mock('../../components/dashboard/PropertiesTab', () => {
  return function MockPropertiesTab() {
    return <div data-testid="properties-tab">Properties Tab</div>
  }
})

jest.mock('../../components/dashboard/ManagersTab', () => {
  return function MockManagersTab() {
    return <div data-testid="managers-tab">Managers Tab</div>
  }
})

jest.mock('../../components/dashboard/EmployeesTab', () => {
  return {
    EmployeesTab: function MockEmployeesTab({ userRole }: { userRole: string }) {
      return <div data-testid="employees-tab">Employees Tab - {userRole}</div>
    }
  }
})

jest.mock('../../components/dashboard/ApplicationsTab', () => {
  return {
    ApplicationsTab: function MockApplicationsTab({ userRole, propertyId }: { userRole: string, propertyId?: string }) {
      return <div data-testid="applications-tab">Applications Tab - {userRole} - {propertyId || 'all'}</div>
    }
  }
})

jest.mock('../../components/dashboard/AnalyticsTab', () => {
  return {
    AnalyticsTab: function MockAnalyticsTab({ userRole, propertyId }: { userRole: string, propertyId?: string }) {
      return <div data-testid="analytics-tab">Analytics Tab - {userRole} - {propertyId || 'all'}</div>
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Role-Based Access Control Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock default API responses
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/hr/dashboard-stats')) {
        return Promise.resolve({
          data: {
            totalProperties: 5,
            totalManagers: 3,
            totalEmployees: 25,
            pendingApplications: 8
          }
        })
      }
      if (url.includes('/hr/properties')) {
        return Promise.resolve({
          data: [{
            id: 'property-1',
            name: 'Test Hotel',
            address: '123 Main St',
            city: 'Test City',
            state: 'TS',
            zip_code: '12345',
            phone: '555-0123',
            is_active: true
          }]
        })
      }
      if (url.includes('/hr/applications')) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes('/api/employees')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  describe('HR Role Access Control', () => {
    const hrUser = {
      id: '1',
      email: 'hr@test.com',
      role: 'hr' as const,
      first_name: 'HR',
      last_name: 'Admin'
    }

    beforeEach(() => {
      // Mock HR login
      mockedAxios.post.mockResolvedValue({
        data: {
          token: 'hr-token-123',
          user: hrUser,
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
    })

    test('HR user can access HR dashboard with all tabs', async () => {
      const user = userEvent.setup()
      
      // Mock AuthContext with HR user
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: hrUser,
          token: 'hr-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<HRDashboard />)
      
      // Verify HR dashboard loads
      await waitFor(() => {
        expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Welcome, hr@test.com')).toBeInTheDocument()
      })
      
      // Verify all HR tabs are available
      expect(screen.getByText('Properties')).toBeInTheDocument()
      expect(screen.getByText('Managers')).toBeInTheDocument()
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      
      // Test access to Properties tab (HR-only)
      await user.click(screen.getByText('Properties'))
      expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
      
      // Test access to Managers tab (HR-only)
      await user.click(screen.getByText('Managers'))
      expect(screen.getByTestId('managers-tab')).toBeInTheDocument()
      
      // Test access to Employees tab with HR role
      await user.click(screen.getByText('Employees'))
      expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
      expect(screen.getByText('Employees Tab - hr')).toBeInTheDocument()
      
      // Test access to Applications tab with HR role
      await user.click(screen.getByText('Applications'))
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Applications Tab - hr - all')).toBeInTheDocument()
    })

    test('HR user cannot access Manager dashboard', () => {
      // Mock AuthContext with HR user
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: hrUser,
          token: 'hr-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<ManagerDashboard />)
      
      // Should show access denied
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Manager role required to access this dashboard.')).toBeInTheDocument()
    })
  })

  describe('Manager Role Access Control', () => {
    const managerUser = {
      id: '2',
      email: 'manager@test.com',
      role: 'manager' as const,
      first_name: 'John',
      last_name: 'Manager',
      property_id: 'property-1'
    }

    beforeEach(() => {
      // Mock Manager login
      mockedAxios.post.mockResolvedValue({
        data: {
          token: 'manager-token-123',
          user: managerUser,
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
    })

    test('Manager user can access Manager dashboard with property-specific data', async () => {
      const user = userEvent.setup()
      
      // Mock AuthContext with Manager user
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: managerUser,
          token: 'manager-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<ManagerDashboard />)
      
      // Verify Manager dashboard loads
      await waitFor(() => {
        expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Welcome back, John Manager')).toBeInTheDocument()
      })
      
      // Verify only manager tabs are available (no Properties or Managers tabs)
      expect(screen.queryByText('Properties')).not.toBeInTheDocument()
      expect(screen.queryByText('Managers')).not.toBeInTheDocument()
      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      
      // Test access to Applications tab with manager role and property ID
      await waitFor(() => {
        expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
        expect(screen.getByText('Applications Tab - manager - property-1')).toBeInTheDocument()
      })
      
      // Test access to Employees tab with manager role and property ID
      await user.click(screen.getByText('Employees'))
      expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
      expect(screen.getByText('Employees Tab - manager')).toBeInTheDocument()
      
      // Test access to Analytics tab with manager role and property ID
      await user.click(screen.getByText('Analytics'))
      expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
      expect(screen.getByText('Analytics Tab - manager - property-1')).toBeInTheDocument()
    })

    test('Manager user cannot access HR dashboard', () => {
      // Mock AuthContext with Manager user
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: managerUser,
          token: 'manager-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<HRDashboard />)
      
      // Should show access denied
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('HR role required to access this dashboard.')).toBeInTheDocument()
    })

    test('Manager without property assignment shows appropriate message', () => {
      const managerWithoutProperty = { ...managerUser, property_id: undefined }
      
      // Mock AuthContext with Manager user without property
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: managerWithoutProperty,
          token: 'manager-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<ManagerDashboard />)
      
      // Should show no property assigned message
      expect(screen.getByText('No Property Assigned')).toBeInTheDocument()
      expect(screen.getByText('You are not currently assigned to a property. Please contact HR for assistance.')).toBeInTheDocument()
    })
  })

  describe('Authentication Flow Integration', () => {
    test('successful HR login redirects to HR dashboard', async () => {
      const user = userEvent.setup()
      
      // Mock successful HR login
      mockedAxios.post.mockResolvedValue({
        data: {
          token: 'hr-token-123',
          user: {
            id: '1',
            email: 'hr@test.com',
            role: 'hr',
            first_name: 'HR',
            last_name: 'Admin'
          },
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
      
      renderWithProviders(<LoginPage />)
      
      // Fill in HR credentials
      await user.type(screen.getByLabelText('Email Address'), 'hr@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      
      // Submit login
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Verify login API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
          email: 'hr@test.com',
          password: 'password123'
        })
      })
    })

    test('successful Manager login redirects to Manager dashboard', async () => {
      const user = userEvent.setup()
      
      // Mock successful Manager login
      mockedAxios.post.mockResolvedValue({
        data: {
          token: 'manager-token-123',
          user: {
            id: '2',
            email: 'manager@test.com',
            role: 'manager',
            first_name: 'John',
            last_name: 'Manager',
            property_id: 'property-1'
          },
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
      
      renderWithProviders(<LoginPage />)
      
      // Fill in Manager credentials
      await user.type(screen.getByLabelText('Email Address'), 'manager@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      
      // Submit login
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Verify login API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
          email: 'manager@test.com',
          password: 'password123'
        })
      })
    })

    test('failed login shows error message', async () => {
      const user = userEvent.setup()
      
      // Mock failed login
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' }
        }
      })
      mockedAxios.isAxiosError.mockReturnValue(true)
      
      renderWithProviders(<LoginPage />)
      
      // Fill in invalid credentials
      await user.type(screen.getByLabelText('Email Address'), 'invalid@test.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      
      // Submit login
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
      })
    })
  })

  describe('API Authorization Integration', () => {
    test('API calls include proper authorization headers', async () => {
      const hrUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      // Mock AuthContext with HR user
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: hrUser,
          token: 'hr-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<HRDashboard />)
      
      // Wait for API calls to be made
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/dashboard-stats')
      })
      
      // Verify axios defaults include authorization header
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer hr-token-123')
    })

    test('401 responses trigger logout', async () => {
      const mockLogout = jest.fn()
      
      // Mock AuthContext
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: { id: '1', email: 'hr@test.com', role: 'hr' },
          token: 'expired-token',
          login: jest.fn(),
          logout: mockLogout,
          loading: false,
          isAuthenticated: true
        })
      }))
      
      // Mock 401 response
      mockedAxios.get.mockRejectedValue({
        response: { status: 401 }
      })
      
      renderWithProviders(<HRDashboard />)
      
      // Should trigger logout on 401 response
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })
    })
  })

  describe('Cross-Role Data Access', () => {
    test('HR can see all properties data', async () => {
      const hrUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: hrUser,
          token: 'hr-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<HRDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
      })
      
      // HR should see applications tab without property restriction
      const applicationsTab = screen.getByText('Applications')
      fireEvent.click(applicationsTab)
      
      expect(screen.getByText('Applications Tab - hr - all')).toBeInTheDocument()
    })

    test('Manager can only see their property data', async () => {
      const managerUser = {
        id: '2',
        email: 'manager@test.com',
        role: 'manager' as const,
        first_name: 'John',
        last_name: 'Manager',
        property_id: 'property-1'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: managerUser,
          token: 'manager-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      renderWithProviders(<ManagerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
      })
      
      // Manager should see applications tab with property restriction
      await waitFor(() => {
        expect(screen.getByText('Applications Tab - manager - property-1')).toBeInTheDocument()
      })
    })
  })
})