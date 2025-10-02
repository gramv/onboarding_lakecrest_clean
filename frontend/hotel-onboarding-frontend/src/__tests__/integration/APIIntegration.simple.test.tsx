import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { AuthProvider } from '../../contexts/AuthContext'
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

describe('Simple API Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockToast.mockClear()

        // Reset axios defaults
        mockedAxios.defaults.headers.common = {}
    })

    describe('Authentication API Integration', () => {
        test('successful HR login sets authorization header', async () => {
            const user = userEvent.setup()

            // Mock successful login response
            mockedAxios.post.mockResolvedValue({
                data: {
                    token: 'test-jwt-token-123',
                    user: {
                        id: '1',
                        email: 'hr@hoteltest.com',
                        role: 'hr',
                        first_name: 'HR',
                        last_name: 'Admin'
                    },
                    expires_at: '2024-12-31T23:59:59Z'
                }
            })

            renderWithRouter(<LoginPage />)

            // Fill in credentials
            await user.type(screen.getByLabelText('Email Address'), 'hr@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'admin123')

            // Submit form
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Verify API call format
            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
                    email: 'hr@hoteltest.com',
                    password: 'admin123'
                })
            })

            // Verify axios defaults are set with token
            expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer test-jwt-token-123')
        })

        test('successful manager login sets authorization header', async () => {
            const user = userEvent.setup()

            // Mock successful login response
            mockedAxios.post.mockResolvedValue({
                data: {
                    token: 'manager-token-456',
                    user: {
                        id: '2',
                        email: 'manager@hoteltest.com',
                        role: 'manager',
                        first_name: 'John',
                        last_name: 'Manager',
                        property_id: 'prop-1'
                    },
                    expires_at: '2024-12-31T23:59:59Z'
                }
            })

            renderWithRouter(<LoginPage />)

            // Fill in credentials
            await user.type(screen.getByLabelText('Email Address'), 'manager@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'manager123')

            // Submit form
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Verify API call format
            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
                    email: 'manager@hoteltest.com',
                    password: 'manager123'
                })
            })

            // Verify axios defaults are set with token
            expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer manager-token-456')
        })

        test('failed login shows error message', async () => {
            const user = userEvent.setup()

            // Mock API error response
            mockedAxios.post.mockRejectedValue({
                response: {
                    status: 401,
                    data: { detail: 'Invalid credentials' }
                }
            })
            mockedAxios.isAxiosError.mockReturnValue(true)

            renderWithRouter(<LoginPage />)

            await user.type(screen.getByLabelText('Email Address'), 'invalid@test.com')
            await user.type(screen.getByLabelText('Password'), 'wrongpassword')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should show error message
            await waitFor(() => {
                expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
            })
        })

        test('network error shows appropriate message', async () => {
            const user = userEvent.setup()

            // Mock network error
            mockedAxios.post.mockRejectedValue(new Error('Network Error'))
            mockedAxios.isAxiosError.mockReturnValue(false)

            renderWithRouter(<LoginPage />)

            await user.type(screen.getByLabelText('Email Address'), 'hr@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'admin123')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should show network error message
            await waitFor(() => {
                expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
            })
        })

        test('form validation prevents empty submission', async () => {
            const user = userEvent.setup()

            renderWithRouter(<LoginPage />)

            // Try to submit without filling fields
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should not make API call
            expect(mockedAxios.post).not.toHaveBeenCalled()

            // Should show validation errors
            expect(screen.getByText('Email is required')).toBeInTheDocument()
            expect(screen.getByText('Password is required')).toBeInTheDocument()
        })

        test('form validation checks email format', async () => {
            const user = userEvent.setup()

            renderWithRouter(<LoginPage />)

            // Enter invalid email
            await user.type(screen.getByLabelText('Email Address'), 'invalid-email')
            await user.type(screen.getByLabelText('Password'), 'password123')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should not make API call
            expect(mockedAxios.post).not.toHaveBeenCalled()

            // Should show email validation error
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        })
    })

    describe('API Error Handling', () => {
        test('handles 500 server errors', async () => {
            const user = userEvent.setup()

            // Mock server error
            mockedAxios.post.mockRejectedValue({
                response: {
                    status: 500,
                    data: { detail: 'Internal server error' }
                }
            })
            mockedAxios.isAxiosError.mockReturnValue(true)

            renderWithRouter(<LoginPage />)

            await user.type(screen.getByLabelText('Email Address'), 'hr@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'admin123')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should show server error message
            await waitFor(() => {
                expect(screen.getByText('Server error. Please try again later.')).toBeInTheDocument()
            })
        })

        test('handles 400 bad request errors', async () => {
            const user = userEvent.setup()

            // Mock bad request error
            mockedAxios.post.mockRejectedValue({
                response: {
                    status: 400,
                    data: { detail: 'Invalid request format' }
                }
            })
            mockedAxios.isAxiosError.mockReturnValue(true)

            renderWithRouter(<LoginPage />)

            await user.type(screen.getByLabelText('Email Address'), 'hr@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'admin123')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should show bad request error message
            await waitFor(() => {
                expect(screen.getByText('Invalid request format')).toBeInTheDocument()
            })
        })
    })

    describe('Loading States', () => {
        test('shows loading state during login', async () => {
            const user = userEvent.setup()

            // Mock delayed response
            mockedAxios.post.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    data: {
                        token: 'test-token',
                        user: { id: '1', email: 'hr@hoteltest.com', role: 'hr' },
                        expires_at: '2024-12-31T23:59:59Z'
                    }
                }), 100))
            )

            renderWithRouter(<LoginPage />)

            await user.type(screen.getByLabelText('Email Address'), 'hr@hoteltest.com')
            await user.type(screen.getByLabelText('Password'), 'admin123')
            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            // Should show loading state
            expect(screen.getByText('Signing in...')).toBeInTheDocument()

            // Wait for completion
            await waitFor(() => {
                expect(screen.queryByText('Signing in...')).not.toBeInTheDocument()
            })
        })
    })

    describe('Form Accessibility', () => {
        test('form has proper labels and accessibility attributes', () => {
            renderWithRouter(<LoginPage />)

            // Check for proper labels
            expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
            expect(screen.getByLabelText('Password')).toBeInTheDocument()

            // Check for form structure
            expect(screen.getByRole('form')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()

            // Check for required attributes
            const emailInput = screen.getByLabelText('Email Address')
            const passwordInput = screen.getByLabelText('Password')

            expect(emailInput).toHaveAttribute('type', 'email')
            expect(emailInput).toHaveAttribute('required')
            expect(passwordInput).toHaveAttribute('type', 'password')
            expect(passwordInput).toHaveAttribute('required')
        })

        test('form can be navigated with keyboard', async () => {
            const user = userEvent.setup()

            renderWithRouter(<LoginPage />)

            // Tab through form elements
            await user.tab()
            expect(screen.getByLabelText('Email Address')).toHaveFocus()

            await user.tab()
            expect(screen.getByLabelText('Password')).toHaveFocus()

            await user.tab()
            expect(screen.getByRole('button', { name: 'Sign In' })).toHaveFocus()
        })
    })
})