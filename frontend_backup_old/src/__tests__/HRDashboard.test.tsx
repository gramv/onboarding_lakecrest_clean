import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import HRDashboard from '../pages/HRDashboard'
import { AuthProvider } from '../contexts/AuthContext'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the dashboard tab components
jest.mock('../components/dashboard/PropertiesTab', () => {
  return function MockPropertiesTab({ onStatsUpdate }: { onStatsUpdate: () => void }) {
    return <div data-testid="properties-tab">Properties Tab</div>
  }
})

jest.mock('../components/dashboard/ManagersTab', () => {
  return function MockManagersTab({ onStatsUpdate }: { onStatsUpdate: () => void }) {
    return <div data-testid="managers-tab">Managers Tab</div>
  }
})

jest.mock('../components/dashboard/EmployeesTab', () => {
  return {
    EmployeesTab: function MockEmployeesTab({ userRole, onStatsUpdate }: { userRole: string, onStatsUpdate: () => void }) {
      return <div data-testid="employees-tab">Employees Tab - {userRole}</div>
    }
  }
})

jest.mock('../components/dashboard/ApplicationsTab', () => {
  return {
    ApplicationsTab: function MockApplicationsTab({ userRole, onStatsUpdate }: { userRole: string, onStatsUpdate: () => void }) {
      return <div data-testid="applications-tab">Applications Tab - {userRole}</div>
    }
  }
})

jest.mock('../components/dashboard/AnalyticsTab', () => {
  return {
    AnalyticsTab: function MockAnalyticsTab({ userRole }: { userRole: string }) {
      return <div data-testid="analytics-tab">Analytics Tab - {userRole}</div>
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

const mockUser = {
  id: '1',
  email: 'hr@test.com',
  role: 'hr' as const,
  first_name: 'HR',
  last_name: 'User'
}

const mockStats = {
  totalProperties: 5,
  totalManagers: 3,
  totalEmployees: 25,
  pendingApplications: 8
}

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
  user: mockUser,
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

describe('HRDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: mockStats })
  })

  test('renders HR dashboard with correct title and user info', async () => {
    renderWithProviders(<HRDashboard />)
    
    expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome, hr@test.com')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  test('fetches and displays dashboard statistics', async () => {
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/hr/dashboard-stats')
    })

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument() // Properties
      expect(screen.getByText('3')).toBeInTheDocument() // Managers
      expect(screen.getByText('25')).toBeInTheDocument() // Employees
      expect(screen.getByText('8')).toBeInTheDocument() // Pending Applications
    })
  })

  test('displays loading skeleton while fetching data', () => {
    renderWithProviders(<HRDashboard />)
    
    // Should show loading skeletons initially
    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
  })

  test('handles API error gracefully', async () => {
    const errorMessage = 'Failed to fetch stats'
    mockedAxios.get.mockRejectedValue(new Error(errorMessage))
    
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  test('retry button refetches data', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
    mockedAxios.get.mockResolvedValueOnce({ data: mockStats })
    
    renderWithProviders(<HRDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Retry'))
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })
  })

  test('renders all navigation tabs', () => {
    renderWithProviders(<HRDashboard />)
    
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Managers')).toBeInTheDocument()
    expect(screen.getByText('Employees')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  test('switches between tabs correctly', async () => {
    renderWithProviders(<HRDashboard />)
    
    // Properties tab should be active by default
    await waitFor(() => {
      expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
    })
    
    // Click on Employees tab
    fireEvent.click(screen.getByText('Employees'))
    await waitFor(() => {
      expect(screen.getByTestId('employees-tab')).toBeInTheDocument()
      expect(screen.getByText('Employees Tab - hr')).toBeInTheDocument()
    })
    
    // Click on Applications tab
    fireEvent.click(screen.getByText('Applications'))
    await waitFor(() => {
      expect(screen.getByTestId('applications-tab')).toBeInTheDocument()
      expect(screen.getByText('Applications Tab - hr')).toBeInTheDocument()
    })
  })

  test('denies access for non-HR users', () => {
    const nonHRUser = { ...mockUser, role: 'manager' as const }
    const mockNonHRContext = { ...mockAuthContext, user: nonHRUser }
    
    jest.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(mockNonHRContext)
    
    renderWithProviders(<HRDashboard />)
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('HR role required to access this dashboard.')).toBeInTheDocument()
    expect(screen.getByText('Return to Login')).toBeInTheDocument()
  })

  test('logout button calls logout function', () => {
    renderWithProviders(<HRDashboard />)
    
    fireEvent.click(screen.getByText('Logout'))
    expect(mockAuthContext.logout).toHaveBeenCalled()
  })

  test('passes correct props to tab components', async () => {
    renderWithProviders(<HRDashboard />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('properties-tab')).toBeInTheDocument()
    })
    
    // Switch to employees tab and verify userRole prop
    fireEvent.click(screen.getByText('Employees'))
    await waitFor(() => {
      expect(screen.getByText('Employees Tab - hr')).toBeInTheDocument()
    })
    
    // Switch to applications tab and verify userRole prop
    fireEvent.click(screen.getByText('Applications'))
    await waitFor(() => {
      expect(screen.getByText('Applications Tab - hr')).toBeInTheDocument()
    })
  })
})