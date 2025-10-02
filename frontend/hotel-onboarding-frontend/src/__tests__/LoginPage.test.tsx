import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import { AuthProvider } from '../contexts/AuthContext'

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn()
}))

const mockNavigate = jest.fn()
const mockSearchParams = new URLSearchParams()

// Mock AuthContext
const mockAuthContext = {
  user: null,
  token: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  isAuthenticated: false
}

jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: () => mockAuthContext
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

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)
    ;(useSearchParams as jest.Mock).mockReturnValue([mockSearchParams])
    mockSearchParams.get = jest.fn().mockReturnValue(null)
  })

  test('renders default login form', () => {
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByText('Hotel Management System')).toBeInTheDocument()
    expect(screen.getByText('User Login')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  test('renders HR-specific login form when role=hr', () => {
    mockSearchParams.get = jest.fn().mockReturnValue('hr')
    
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByText('HR Administrative Portal')).toBeInTheDocument()
    expect(screen.getByText('HR Administrator')).toBeInTheDocument()
    expect(screen.getByText('Access comprehensive property and employee management tools')).toBeInTheDocument()
    expect(screen.getByText('Use Test Credentials')).toBeInTheDocument()
  })

  test('renders Manager-specific login form when role=manager', () => {
    mockSearchParams.get = jest.fn().mockReturnValue('manager')
    
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByText('Property Manager Portal')).toBeInTheDocument()
    expect(screen.getByText('Property Manager')).toBeInTheDocument()
    expect(screen.getByText('Manage applications and employees for your property')).toBeInTheDocument()
    expect(screen.getByText('Use Test Credentials')).toBeInTheDocument()
  })

  test('validates required email field', async () => {
    renderWithProviders(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
    
    expect(mockAuthContext.login).not.toHaveBeenCalled()
  })

  test('validates required password field', async () => {
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
    
    expect(mockAuthContext.login).not.toHaveBeenCalled()
  })

  test('submits form with valid credentials', async () => {
    mockAuthContext.login.mockResolvedValue(undefined)
    
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockAuthContext.login).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  test('displays loading state during login', async () => {
    mockAuthContext.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  test('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials'
    mockAuthContext.login.mockRejectedValue(new Error(errorMessage))
    
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('fills test credentials for HR role', () => {
    mockSearchParams.get = jest.fn().mockReturnValue('hr')
    
    renderWithProviders(<LoginPage />)
    
    const testCredentialsButton = screen.getByText('Use Test Credentials')
    fireEvent.click(testCredentialsButton)
    
    const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    
    expect(emailInput.value).toBe('hr@hoteltest.com')
    expect(passwordInput.value).toBe('password')
  })

  test('fills test credentials for Manager role', () => {
    mockSearchParams.get = jest.fn().mockReturnValue('manager')
    
    renderWithProviders(<LoginPage />)
    
    const testCredentialsButton = screen.getByText('Use Test Credentials')
    fireEvent.click(testCredentialsButton)
    
    const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    
    expect(emailInput.value).toBe('manager@hoteltest.com')
    expect(passwordInput.value).toBe('password')
  })

  test('navigates back to home when back button is clicked', () => {
    renderWithProviders(<LoginPage />)
    
    const backButton = screen.getByText('← Back to Home')
    fireEvent.click(backButton)
    
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('redirects authenticated HR user to HR dashboard', () => {
    const authenticatedHRContext = {
      ...mockAuthContext,
      user: { id: '1', email: 'hr@test.com', role: 'hr' as const },
      isAuthenticated: true
    }
    
    jest.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(authenticatedHRContext)
    
    renderWithProviders(<LoginPage />)
    
    expect(mockNavigate).toHaveBeenCalledWith('/hr', { replace: true })
  })

  test('redirects authenticated Manager user to Manager dashboard', () => {
    const authenticatedManagerContext = {
      ...mockAuthContext,
      user: { id: '1', email: 'manager@test.com', role: 'manager' as const },
      isAuthenticated: true
    }
    
    jest.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(authenticatedManagerContext)
    
    renderWithProviders(<LoginPage />)
    
    expect(mockNavigate).toHaveBeenCalledWith('/manager', { replace: true })
  })

  test('trims whitespace from email input', async () => {
    mockAuthContext.login.mockResolvedValue(undefined)
    
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockAuthContext.login).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  test('disables form inputs during loading', async () => {
    mockAuthContext.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    const testCredentialsButton = screen.queryByText('Use Test Credentials')
    const backButton = screen.getByText('← Back to Home')
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(backButton).toBeDisabled()
    
    if (testCredentialsButton) {
      expect(testCredentialsButton).toBeDisabled()
    }
    
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    })
  })
})