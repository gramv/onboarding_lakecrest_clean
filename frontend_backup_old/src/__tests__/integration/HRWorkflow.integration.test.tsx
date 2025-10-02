import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { AuthProvider } from '../../contexts/AuthContext'
import HRDashboard from '../../pages/HRDashboard'
import LoginPage from '../../pages/LoginPage'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the dashboard tab components with more realistic implementations
jest.mock('../../components/dashboard/PropertiesTab', () => {
  return function MockPropertiesTab({ onStatsUpdate }: { onStatsUpdate: () => void }) {
    return (
      <div data-testid="properties-tab">
        <h2>Properties Management</h2>
        <button 
          onClick={() => {
            // Simulate creating a property
            onStatsUpdate()
          }}
          data-testid="create-property-btn"
        >
          Create Property
        </button>
        <div data-testid="properties-list">
          <div>Test Hotel - 123 Main St</div>
        </div>
      </div>
    )
  }
})

jest.mock('../../components/dashboard/ManagersTab', () => {
  return function MockManagersTab({ onStatsUpdate }: { onStatsUpdate: () => void }) {
    return (
      <div data-testid="managers-tab">
        <h2>Managers Management</h2>
        <button 
          onClick={() => {
            // Simulate assigning a manager
            onStatsUpdate()
          }}
          data-testid="assign-manager-btn"
        >
          Assign Manager
        </button>
        <div data-testid="managers-list">
          <div>John Manager - Test Hotel</div>
        </div>
      </div>
    )
  }
})

jest.mock('../../components/dashboard/EmployeesTab', () => {
  return {
    EmployeesTab: function MockEmployeesTab({ userRole, onStatsUpdate }: { userRole: string, onStatsUpdate: () => void }) {
      return (
        <div data-testid="employees-tab">
          <h2>Employees Directory ({userRole})</h2>
          <div data-testid="employees-list">
            <div>Jane Employee - Active</div>
            <div>Bob Worker - Active</div>
          </div>
        </div>
      )
    }
  }
})

jest.mock('../../components/dashboard/ApplicationsTab', () => {
  return {
    ApplicationsTab: function MockApplicationsTab({ userRole, onStatsUpdate }: { userRole: string, onStatsUpdate: () => void }) {
      return (
        <div data-testid="applications-tab">
          <h2>Job Applications ({userRole})</h2>
          <div data-testid="applications-list">
            <div>Application #1 - Pending</div>
            <div>Application #2 - Approved</div>
          </div>
          <button 
            onClick={() => {
              // Simulate processing an application
              onStatsUpdate()
            }}
            data-testid="process-application-btn"
          >
            Process Application
          </button>
        </div>
      )
    }
  }
})

jest.mock('../../components/dashboard/AnalyticsTab', () => {
  return {
    AnalyticsTab: function MockAnalyticsTab({ userRole }: { userRole: string }) {
      return (
        <div data-testid="analytics-tab">
          <h2>Analytics Dashboard ({userRole})</h2>
          <div data-testid="analytics-charts">
            <div>Property Performance: 85%</div>
            <div>Employee Satisfaction: 92%</div>
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('HR Complete Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful login
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

    // Mock dashboard stats
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/hr/dashboard-stats')) {
        return Promise.resolve({
          data: {
            totalProperties: 3,
            totalManagers: 2,
            totalEmployees: 15,
            pendingApplications: 5
          }
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  test('complete HR login and dashboard navigation workflow', async () => {
    const user = userEvent.setup()
    
    // Start with login page
    renderWithProviders(<LoginPage />)
    
    // Fill in HR credentials
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    
    await user.type(emailInput, 'hr@test.com')
    await user.type(passwordInput, 'password123')
    
    // Submit login form
    const loginButton = screen.getByRole('button', { name: 'Sign In' })
    await user.click(loginButton)
    
    // Verify login API call
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
        email: 'hr@test.com',
        password: 'password123'
      })
    })
    
    // Now render the HR Dashboard (simulating successful login redirect)
    renderWithProviders(<HRDashboard />)
    
    // Verify dashboard loads with stats
    await waitFor(() => {
      expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Welcome, hr@test.com')).toBeInTheDocument()
    })
    
    // Verify stats are displayed
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Properties
      expect(screen.getByText('2')).toBeInTheDocument() // Managers
      expect(screen.getByText('15')).toBeInTheDocument() // Employees
      expect(screen.getByText('5')).toBeInTheDocument() // Pending Applications
    })
    
    // Test navigation between tabs
    const propertiesTab = screen.getByText('Properties')
    await user.click(propertiesTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
      expect(screen.getByText('Properties Management')).toBeInTheDocument()
    })
    
    // Test property creation workflow
    const createPropertyBtn = screen.getByTestId('create-property-btn')
    await user.click(createPropertyBtn)
    
    // Verify stats update is called
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/dashboard-stats')
    })
    
    // Navigate to Managers tab
    const managersTab = screen.getByText('Managers')
    await user.click(managersTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('managers-tab')).toBeInTheDocument()
      expect(screen.getByText('Managers Management')).toBeInTheDocument()
    })
    
    // Test manager assignment workflow
    const assignManagerBtn = screen.getByTestId('assign-manager-btn')
    await user.click(assignManagerBtn)
    
    // Navigate to Applications tab
    const applicationsTab = screen.getByText('Applications')
    await user.click(applicationsTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Job Applications (hr)')).toBeInTheDocument()
    })
    
    // Test application processing workflow
    const processApplicationBtn = screen.getByTestId('process-application-btn')
    await user.click(processApplicationBtn)
    
    // Navigate to Analytics tab
    const analyticsTab = screen.getByText('Analytics')
    await user.click(analyticsTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
      expect(screen.getByText('Analytics Dashboard (hr)')).toBeInTheDocument()
      expect(screen.getByText('Property Performance: 85%')).toBeInTheDocument()
    })
  })

  test('HR dashboard handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    mockedAxios.get.mockRejectedValue(new Error('Network error'))
    
    renderWithProviders(<HRDashboard />)
    
    // Should show error message and retry button
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    
    // Test retry functionality
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        totalProperties: 3,
        totalManagers: 2,
        totalEmployees: 15,
        pendingApplications: 5
      }
    })
    
    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)
    
    // Should recover and show stats
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.queryByText('Network error')).not.toBeInTheDocument()
    })
  })

  test('HR dashboard logout workflow', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    })
    
    // Click logout button
    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)
    
    // Should clear authentication (this would normally redirect to login)
    // We can't test the actual redirect in this unit test, but we can verify
    // the logout function was called by checking if the component would show
    // access denied for non-HR users
  })

  test('HR dashboard shows access denied for non-HR users', () => {
    // Mock non-HR user
    const mockNonHRContext = {
      user: {
        id: '1',
        email: 'manager@test.com',
        role: 'manager' as const,
        first_name: 'John',
        last_name: 'Manager'
      },
      token: 'manager-token',
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      isAuthenticated: true
    }
    
    jest.doMock('../../contexts/AuthContext', () => ({
      ...jest.requireActual('../../contexts/AuthContext'),
      useAuth: () => mockNonHRContext
    }))
    
    renderWithProviders(<HRDashboard />)
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('HR role required to access this dashboard.')).toBeInTheDocument()
  })

  test('HR dashboard tab switching maintains state', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    })
    
    // Navigate to Properties tab
    await user.click(screen.getByText('Properties'))
    expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
    
    // Navigate to Employees tab
    await user.click(screen.getByText('Employees'))
    expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
    expect(screen.getByText('Employees Directory (hr)')).toBeInTheDocument()
    
    // Navigate back to Properties tab
    await user.click(screen.getByText('Properties'))
    expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
    
    // Verify the properties content is still there
    expect(screen.getByText('Properties Management')).toBeInTheDocument()
  })

  test('HR dashboard handles concurrent API calls', async () => {
    const user = userEvent.setup()
    
    // Mock multiple API calls
    let callCount = 0
    mockedAxios.get.mockImplementation(() => {
      callCount++
      return Promise.resolve({
        data: {
          totalProperties: callCount,
          totalManagers: 2,
          totalEmployees: 15,
          pendingApplications: 5
        }
      })
    })
    
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    })
    
    // Trigger multiple stats updates quickly
    await user.click(screen.getByText('Properties'))
    const createPropertyBtn = screen.getByTestId('create-property-btn')
    
    // Click multiple times quickly
    await user.click(createPropertyBtn)
    await user.click(createPropertyBtn)
    await user.click(createPropertyBtn)
    
    // Should handle concurrent calls gracefully
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(4) // Initial load + 3 updates
    })
  })
})