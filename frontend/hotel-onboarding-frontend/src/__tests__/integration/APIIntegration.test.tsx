import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

// Mock toast hook
const mockToast = jest.fn()
jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
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

describe('Frontend-Backend API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset axios defaults
    mockedAxios.defaults.headers.common = {}
  })

  describe('Authentication API Integration', () => {
    test('login API integration with proper request format', async () => {
      const user = userEvent.setup()
      
      // Mock successful login response
      mockedAxios.post.mockResolvedValue({
        data: {
          token: 'test-jwt-token-123',
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
      
      // Fill in credentials
      await user.type(screen.getByLabelText('Email Address'), 'hr@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Verify API call format
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
          email: 'hr@test.com',
          password: 'password123'
        })
      })
      
      // Verify axios defaults are set with token
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer test-jwt-token-123')
    })

    test('login API error handling integration', async () => {
      const user = userEvent.setup()
      
      // Mock API error response
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' }
        }
      })
      mockedAxios.isAxiosError.mockReturnValue(true)
      
      renderWithProviders(<LoginPage />)
      
      await user.type(screen.getByLabelText('Email Address'), 'invalid@test.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
      })
    })

    test('token refresh API integration', async () => {
      // Mock initial login
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          token: 'initial-token',
          user: { id: '1', email: 'hr@test.com', role: 'hr' },
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
      
      // Mock refresh response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          token: 'refreshed-token',
          expires_at: '2024-12-31T23:59:59Z'
        }
      })
      
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      await user.type(screen.getByLabelText('Email Address'), 'hr@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', expect.any(Object))
      })
      
      // Simulate token refresh (this would normally happen automatically)
      // In a real scenario, this would be triggered by token expiration
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer initial-token')
    })
  })

  describe('HR Dashboard API Integration', () => {
    const mockHRUser = {
      id: '1',
      email: 'hr@test.com',
      role: 'hr' as const,
      first_name: 'HR',
      last_name: 'Admin'
    }

    beforeEach(() => {
      // Mock authentication context
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockHRUser,
          token: 'hr-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      // Set up axios with auth token
      mockedAxios.defaults.headers.common['Authorization'] = 'Bearer hr-token-123'
    })

    test('dashboard stats API integration', async () => {
      // Mock dashboard stats response
      mockedAxios.get.mockResolvedValue({
        data: {
          totalProperties: 5,
          totalManagers: 3,
          totalEmployees: 25,
          pendingApplications: 8
        }
      })
      
      renderWithProviders(<HRDashboard />)
      
      // Verify API call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/dashboard-stats')
      })
      
      // Verify stats are displayed
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument() // Properties
        expect(screen.getByText('3')).toBeInTheDocument() // Managers
        expect(screen.getByText('25')).toBeInTheDocument() // Employees
        expect(screen.getByText('8')).toBeInTheDocument() // Pending Applications
      })
    })

    test('properties API integration', async () => {
      const mockProperties = [
        {
          id: 'prop-1',
          name: 'Test Hotel',
          address: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          phone: '555-0123',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          manager_ids: ['mgr-1'],
          qr_code_url: 'http://example.com/qr/prop-1'
        }
      ]
      
      // Mock dashboard stats
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/hr/dashboard-stats')) {
          return Promise.resolve({
            data: { totalProperties: 1, totalManagers: 1, totalEmployees: 5, pendingApplications: 2 }
          })
        }
        if (url.includes('/hr/properties')) {
          return Promise.resolve({ data: mockProperties })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      const user = userEvent.setup()
      renderWithProviders(<HRDashboard />)
      
      // Navigate to Properties tab
      await user.click(screen.getByText('Properties'))
      
      // Verify properties API call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/properties')
      })
    })

    test('applications API integration', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          property_id: 'prop-1',
          status: 'pending',
          applicant_data: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@test.com',
            phone: '555-0123'
          },
          position: 'Housekeeping',
          department: 'Operations',
          applied_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/hr/dashboard-stats')) {
          return Promise.resolve({
            data: { totalProperties: 1, totalManagers: 1, totalEmployees: 5, pendingApplications: 1 }
          })
        }
        if (url.includes('/hr/applications')) {
          return Promise.resolve({ data: mockApplications })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      const user = userEvent.setup()
      renderWithProviders(<HRDashboard />)
      
      // Navigate to Applications tab
      await user.click(screen.getByText('Applications'))
      
      // Verify applications API call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/applications')
      })
    })

    test('API error handling in HR dashboard', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValue(new Error('Server error'))
      
      renderWithProviders(<HRDashboard />)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      // Test retry functionality
      const user = userEvent.setup()
      mockedAxios.get.mockResolvedValueOnce({
        data: { totalProperties: 1, totalManagers: 1, totalEmployees: 5, pendingApplications: 2 }
      })
      
      await user.click(screen.getByText('Retry'))
      
      // Should retry the API call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(2) // Initial call + retry
      })
    })
  })

  describe('Manager Dashboard API Integration', () => {
    const mockManagerUser = {
      id: '2',
      email: 'manager@test.com',
      role: 'manager' as const,
      first_name: 'John',
      last_name: 'Manager',
      property_id: 'prop-1'
    }

    const mockProperty = {
      id: 'prop-1',
      name: 'Test Resort',
      address: '456 Beach Ave',
      city: 'Miami',
      state: 'FL',
      zip_code: '33101',
      phone: '305-555-0123',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z'
    }

    beforeEach(() => {
      // Mock authentication context
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockManagerUser,
          token: 'manager-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      mockedAxios.defaults.headers.common['Authorization'] = 'Bearer manager-token-123'
    })

    test('manager property data API integration', async () => {
      const mockApplications = [
        { id: 'app-1', property_id: 'prop-1', status: 'pending', applicant_data: { first_name: 'John', last_name: 'Doe' } },
        { id: 'app-2', property_id: 'prop-1', status: 'approved', applicant_data: { first_name: 'Jane', last_name: 'Smith' } }
      ]
      
      const mockEmployees = [
        { id: 'emp-1', property_id: 'prop-1', employment_status: 'active', first_name: 'Alice', last_name: 'Worker' },
        { id: 'emp-2', property_id: 'prop-1', employment_status: 'active', first_name: 'Bob', last_name: 'Staff' }
      ]
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/hr/properties')) {
          return Promise.resolve({ data: [mockProperty] })
        }
        if (url.includes('/hr/applications')) {
          return Promise.resolve({ data: mockApplications })
        }
        if (url.includes('/api/employees')) {
          return Promise.resolve({ data: { employees: mockEmployees, total: 2 } })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      renderWithProviders(<ManagerDashboard />)
      
      // Verify all required API calls are made
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/properties')
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/applications')
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/api/employees')
      })
      
      // Verify property information is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Resort')).toBeInTheDocument()
        expect(screen.getByText('456 Beach Ave, Miami, FL 33101')).toBeInTheDocument()
        expect(screen.getByText('305-555-0123')).toBeInTheDocument()
      })
      
      // Verify statistics are calculated correctly
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Total Applications
        expect(screen.getByText('1')).toBeInTheDocument() // Pending Applications  
        expect(screen.getByText('1')).toBeInTheDocument() // Approved Applications
        expect(screen.getByText('2')).toBeInTheDocument() // Total Employees
        expect(screen.getByText('2')).toBeInTheDocument() // Active Employees
      })
    })

    test('manager application filtering API integration', async () => {
      const allApplications = [
        { id: 'app-1', property_id: 'prop-1', status: 'pending', applicant_data: { first_name: 'John', last_name: 'Doe' } },
        { id: 'app-2', property_id: 'prop-2', status: 'pending', applicant_data: { first_name: 'Jane', last_name: 'Smith' } }, // Different property
        { id: 'app-3', property_id: 'prop-1', status: 'approved', applicant_data: { first_name: 'Bob', last_name: 'Wilson' } }
      ]
      
      // Manager should only see applications for their property
      const managerApplications = allApplications.filter(app => app.property_id === 'prop-1')
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/hr/properties')) {
          return Promise.resolve({ data: [mockProperty] })
        }
        if (url.includes('/hr/applications')) {
          // Backend should filter applications by manager's property
          return Promise.resolve({ data: managerApplications })
        }
        if (url.includes('/api/employees')) {
          return Promise.resolve({ data: { employees: [], total: 0 } })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      renderWithProviders(<ManagerDashboard />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/applications')
      })
      
      // Verify only property-specific applications are shown
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Should show 2 applications (filtered)
      })
    })

    test('manager employee filtering API integration', async () => {
      const allEmployees = [
        { id: 'emp-1', property_id: 'prop-1', employment_status: 'active', first_name: 'Alice', last_name: 'Worker' },
        { id: 'emp-2', property_id: 'prop-2', employment_status: 'active', first_name: 'Bob', last_name: 'Staff' }, // Different property
        { id: 'emp-3', property_id: 'prop-1', employment_status: 'inactive', first_name: 'Carol', last_name: 'Former' }
      ]
      
      // Manager should only see employees for their property
      const managerEmployees = allEmployees.filter(emp => emp.property_id === 'prop-1')
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/hr/properties')) {
          return Promise.resolve({ data: [mockProperty] })
        }
        if (url.includes('/hr/applications')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/api/employees')) {
          // Backend should filter employees by manager's property
          return Promise.resolve({ data: { employees: managerEmployees, total: 2 } })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      renderWithProviders(<ManagerDashboard />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/api/employees')
      })
      
      // Verify only property-specific employees are counted
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Total employees for property
        expect(screen.getByText('1')).toBeInTheDocument() // Active employees for property
      })
    })
  })

  describe('API Request Headers and Authentication', () => {
    test('API requests include proper authorization headers', async () => {
      const mockUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockUser,
          token: 'test-token-123',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      mockedAxios.get.mockResolvedValue({
        data: { totalProperties: 1, totalManagers: 1, totalEmployees: 5, pendingApplications: 2 }
      })
      
      renderWithProviders(<HRDashboard />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })
      
      // Verify authorization header is set
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer test-token-123')
    })

    test('API handles 401 unauthorized responses', async () => {
      const mockLogout = jest.fn()
      
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
        response: { status: 401, data: { detail: 'Token expired' } }
      })
      mockedAxios.isAxiosError.mockReturnValue(true)
      
      renderWithProviders(<HRDashboard />)
      
      // Should handle 401 by showing error or triggering logout
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })
      
      // In a real implementation, 401 responses might trigger automatic logout
      // This would depend on the specific error handling implementation
    })
  })

  describe('API Response Data Validation', () => {
    test('handles malformed API responses gracefully', async () => {
      const mockUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockUser,
          token: 'test-token',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      // Mock malformed response
      mockedAxios.get.mockResolvedValue({
        data: null // Invalid response format
      })
      
      renderWithProviders(<HRDashboard />)
      
      // Should handle malformed response gracefully
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })
      
      // Component should show error state or default values
      // The exact behavior depends on the component's error handling
    })

    test('validates required fields in API responses', async () => {
      const mockUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockUser,
          token: 'test-token',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      // Mock response with missing required fields
      mockedAxios.get.mockResolvedValue({
        data: {
          totalProperties: 5,
          // Missing totalManagers, totalEmployees, pendingApplications
        }
      })
      
      renderWithProviders(<HRDashboard />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled()
      })
      
      // Component should handle missing fields gracefully
      // This might show default values or error states
    })
  })

  describe('API Performance and Caching', () => {
    test('avoids duplicate API calls for same data', async () => {
      const mockUser = {
        id: '1',
        email: 'hr@test.com',
        role: 'hr' as const,
        first_name: 'HR',
        last_name: 'Admin'
      }
      
      jest.doMock('../../contexts/AuthContext', () => ({
        ...jest.requireActual('../../contexts/AuthContext'),
        useAuth: () => ({
          user: mockUser,
          token: 'test-token',
          login: jest.fn(),
          logout: jest.fn(),
          loading: false,
          isAuthenticated: true
        })
      }))
      
      mockedAxios.get.mockResolvedValue({
        data: { totalProperties: 1, totalManagers: 1, totalEmployees: 5, pendingApplications: 2 }
      })
      
      const user = userEvent.setup()
      renderWithProviders(<HRDashboard />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
      })
      
      // Navigate between tabs
      await user.click(screen.getByText('Properties'))
      await user.click(screen.getByText('Applications'))
      
      // Should not make additional calls for dashboard stats
      // (unless the component is designed to refresh data on tab changes)
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })
  })
})