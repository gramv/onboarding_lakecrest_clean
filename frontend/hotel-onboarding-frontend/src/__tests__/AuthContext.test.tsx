import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Test component to access AuthContext
const TestComponent = () => {
  const { user, token, login, logout, loading, isAuthenticated } = useAuth()
  
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

const renderWithProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  )
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockedAxios.defaults = { headers: { common: {} } } as any
    mockedAxios.interceptors = {
      response: {
        use: jest.fn().mockReturnValue(1),
        eject: jest.fn()
      }
    } as any
  })

  test('initializes with null user and token', () => {
    renderWithProvider()
    
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  test('initializes loading state correctly', async () => {
    renderWithProvider()
    
    // Should start with loading true, then become false
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  test('restores auth state from localStorage', async () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'hr' }
    const mockToken = 'stored-token'
    
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return mockToken
      if (key === 'user') return JSON.stringify(mockUser)
      return null
    })
    
    renderWithProvider()
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser))
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken)
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
    
    expect(mockedAxios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`)
  })

  test('handles corrupted localStorage data gracefully', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token'
      if (key === 'user') return 'invalid-json'
      return null
    })
    
    renderWithProvider()
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('token')).toHaveTextContent('null')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
  })

  test('successful login updates state and localStorage', async () => {
    const mockLoginResponse = {
      data: {
        token: 'new-token',
        user: { id: '1', email: 'test@example.com', role: 'hr' },
        expires_at: '2024-12-31T23:59:59Z'
      }
    }
    
    mockedAxios.post.mockResolvedValue(mockLoginResponse)
    
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockLoginResponse.data.user))
      expect(screen.getByTestId('token')).toHaveTextContent('new-token')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/auth/login', {
      email: 'test@example.com',
      password: 'password'
    })
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockLoginResponse.data.user))
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token_expires_at', '2024-12-31T23:59:59Z')
    
    expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer new-token')
  })

  test('login handles network connection error', async () => {
    const networkError = new Error('Network Error')
    networkError.code = 'ECONNREFUSED'
    mockedAxios.post.mockRejectedValue(networkError)
    
    renderWithProvider()
    
    let thrownError: Error | null = null
    try {
      fireEvent.click(screen.getByText('Login'))
      await waitFor(() => {
        // Wait for the promise to reject
      })
    } catch (error) {
      thrownError = error as Error
    }
    
    // Since we can't directly catch the error from the click handler,
    // we'll verify the state remains unchanged
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('token')).toHaveTextContent('null')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  test('login handles 401 unauthorized error', async () => {
    const unauthorizedError = {
      response: {
        status: 401,
        data: { detail: 'Invalid credentials' }
      }
    }
    mockedAxios.post.mockRejectedValue(unauthorizedError)
    mockedAxios.isAxiosError.mockReturnValue(true)
    
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('token')).toHaveTextContent('null')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  test('login handles 400 bad request error', async () => {
    const badRequestError = {
      response: {
        status: 400,
        data: { detail: 'Invalid request format' }
      }
    }
    mockedAxios.post.mockRejectedValue(badRequestError)
    mockedAxios.isAxiosError.mockReturnValue(true)
    
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('token')).toHaveTextContent('null')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  test('login handles 500 server error', async () => {
    const serverError = {
      response: {
        status: 500,
        data: { detail: 'Internal server error' }
      }
    }
    mockedAxios.post.mockRejectedValue(serverError)
    mockedAxios.isAxiosError.mockReturnValue(true)
    
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('token')).toHaveTextContent('null')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  test('logout clears state and localStorage', async () => {
    // First set up authenticated state
    const mockUser = { id: '1', email: 'test@example.com', role: 'hr' }
    const mockToken = 'test-token'
    
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return mockToken
      if (key === 'user') return JSON.stringify(mockUser)
      return null
    })
    
    renderWithProvider()
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
    
    // Now logout
    fireEvent.click(screen.getByText('Logout'))
    
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token_expires_at')
    
    expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined()
  })

  test('sets up axios response interceptor for 401 errors', () => {
    renderWithProvider()
    
    expect(mockedAxios.interceptors.response.use).toHaveBeenCalled()
    
    // Get the interceptor function
    const interceptorCall = (mockedAxios.interceptors.response.use as jest.Mock).mock.calls[0]
    const errorHandler = interceptorCall[1]
    
    // Test that 401 errors trigger logout
    const mockError = { response: { status: 401 } }
    
    expect(() => errorHandler(mockError)).toThrow()
  })

  test('throws error when useAuth is used outside AuthProvider', () => {
    const TestComponentOutsideProvider = () => {
      useAuth()
      return <div>Test</div>
    }
    
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => render(<TestComponentOutsideProvider />)).toThrow(
      'useAuth must be used within an AuthProvider'
    )
    
    console.error = originalError
  })

  test('axios timeout is configured correctly', () => {
    renderWithProvider()
    
    expect(mockedAxios.defaults.timeout).toBe(10000)
    expect(mockedAxios.defaults.headers.common['Content-Type']).toBe('application/json')
  })
})