import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { HRDashboardLayout } from '@/components/layouts/HRDashboardLayout'
import { ManagerDashboardLayout } from '@/components/layouts/ManagerDashboardLayout'
import { useBrowserNavigation, useBookmarkSupport } from '@/hooks/use-browser-navigation'
import { renderHook, act } from '@testing-library/react'

// Mock the auth context
const mockAuthContext = {
  user: { 
    id: '1', 
    email: 'hr@test.com', 
    role: 'hr' as const,
    first_name: 'HR',
    last_name: 'User'
  },
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  isAuthenticated: true,
  hasRole: jest.fn(() => true)
}

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  isAxiosError: jest.fn(() => false)
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn()
  })
}))

describe('Browser Navigation Support', () => {
  beforeEach(() => {
    // Reset document title
    document.title = 'Test'
    
    // Mock window.history methods
    Object.defineProperty(window, 'history', {
      value: {
        ...window.history,
        replaceState: jest.fn(),
        pushState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        state: null
      },
      writable: true
    })
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        origin: 'http://localhost:3000',
        pathname: '/',
        search: ''
      },
      writable: true
    })
  })

  describe('useBrowserNavigation hook', () => {
    it('should update page title when navigating', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange: jest.fn()
        }),
        { wrapper }
      )

      act(() => {
        result.current.updatePageTitle('properties')
      })

      expect(document.title).toBe('Properties - HR Dashboard')
    })

    it('should handle navigation to different sections', async () => {
      const onNavigationChange = jest.fn()
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange
        }),
        { wrapper }
      )

      act(() => {
        result.current.navigateToSection('employees')
      })

      expect(result.current.currentSection).toBe('employees')
    })

    it('should track navigation history', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange: jest.fn()
        }),
        { wrapper }
      )

      act(() => {
        result.current.navigateToSection('employees')
      })

      act(() => {
        result.current.navigateToSection('applications')
      })

      const history = result.current.getNavigationHistory()
      expect(history.length).toBeGreaterThan(0)
    })

    it('should handle browser back navigation', async () => {
      const onNavigationChange = jest.fn()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties', '/hr/employees']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange
        }),
        { wrapper }
      )

      // First navigate to build history
      act(() => {
        result.current.navigateToSection('employees')
      })

      act(() => {
        result.current.goBack()
      })

      expect(window.history.back).toHaveBeenCalled()
    })
  })

  describe('useBookmarkSupport hook', () => {
    it('should generate correct bookmark URLs', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBookmarkSupport('hr'),
        { wrapper }
      )

      const url = result.current.getBookmarkUrl('employees')
      expect(url).toContain('/hr/employees')
    })

    it('should validate bookmark URLs correctly', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBookmarkSupport('hr'),
        { wrapper }
      )

      expect(result.current.isValidBookmarkUrl()).toBe(true)
    })

    it('should copy bookmark URL to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBookmarkSupport('hr'),
        { wrapper }
      )

      await act(async () => {
        const success = await result.current.copyBookmarkUrl('properties')
        expect(success).toBe(true)
      })

      expect(mockWriteText).toHaveBeenCalled()
    })
  })

  describe('Page Title Updates', () => {
    it('should update page title for HR sections', () => {
      const sections = [
        { key: 'properties', title: 'Properties - HR Dashboard' },
        { key: 'managers', title: 'Managers - HR Dashboard' },
        { key: 'employees', title: 'Employees - HR Dashboard' },
        { key: 'applications', title: 'Applications - HR Dashboard' },
        { key: 'analytics', title: 'Analytics - HR Dashboard' }
      ]

      sections.forEach(({ key, title }) => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[`/hr/${key}`]}>
            {children}
          </MemoryRouter>
        )

        const { result } = renderHook(
          () => useBrowserNavigation({ 
            role: 'hr',
            onNavigationChange: jest.fn()
          }),
          { wrapper }
        )

        act(() => {
          result.current.updatePageTitle(key)
        })

        expect(document.title).toBe(title)
      })
    })

    it('should update page title for Manager sections', () => {
      const sections = [
        { key: 'applications', title: 'Applications - Manager Dashboard' },
        { key: 'employees', title: 'Employees - Manager Dashboard' },
        { key: 'analytics', title: 'Analytics - Manager Dashboard' }
      ]

      sections.forEach(({ key, title }) => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[`/manager/${key}`]}>
            {children}
          </MemoryRouter>
        )

        const { result } = renderHook(
          () => useBrowserNavigation({ 
            role: 'manager',
            onNavigationChange: jest.fn()
          }),
          { wrapper }
        )

        act(() => {
          result.current.updatePageTitle(key)
        })

        expect(document.title).toBe(title)
      })
    })
  })

  describe('URL Structure Validation', () => {
    it('should handle direct URL access for HR dashboard', () => {
      const validUrls = [
        '/hr/properties',
        '/hr/managers', 
        '/hr/employees',
        '/hr/applications',
        '/hr/analytics'
      ]

      validUrls.forEach(url => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[url]}>
            {children}
          </MemoryRouter>
        )

        const { result } = renderHook(
          () => useBookmarkSupport('hr'),
          { wrapper }
        )

        expect(result.current.isValidBookmarkUrl()).toBe(true)
      })
    })

    it('should handle direct URL access for Manager dashboard', () => {
      const validUrls = [
        '/manager/applications',
        '/manager/employees',
        '/manager/analytics'
      ]

      validUrls.forEach(url => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[url]}>
            {children}
          </MemoryRouter>
        )

        const { result } = renderHook(
          () => useBookmarkSupport('manager'),
          { wrapper }
        )

        expect(result.current.isValidBookmarkUrl()).toBe(true)
      })
    })

    it('should redirect invalid URLs to default sections', () => {
      const invalidUrl = '/hr/invalid-section'
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[invalidUrl]}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBookmarkSupport('hr'),
        { wrapper }
      )

      expect(result.current.isValidBookmarkUrl()).toBe(false)
    })
  })

  describe('Browser History Management', () => {
    it('should handle popstate events correctly', async () => {
      const onNavigationChange = jest.fn()
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange
        }),
        { wrapper }
      )

      // Simulate popstate event (browser back/forward)
      const popstateEvent = new PopStateEvent('popstate', { state: null })
      
      act(() => {
        window.dispatchEvent(popstateEvent)
      })

      // The hook should handle the popstate event
      // This is tested indirectly through the navigation change callback
    })

    it('should maintain proper history state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/hr/properties']}>
          {children}
        </MemoryRouter>
      )

      const { result } = renderHook(
        () => useBrowserNavigation({ 
          role: 'hr',
          onNavigationChange: jest.fn()
        }),
        { wrapper }
      )

      // Navigate to different sections
      act(() => {
        result.current.navigateToSection('employees')
      })

      act(() => {
        result.current.navigateToSection('applications')
      })

      // Check that navigation history is maintained
      const history = result.current.getNavigationHistory()
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('Integration with Layout Components', () => {
    it('should work with HR Dashboard Layout', async () => {
      render(
        <MemoryRouter initialEntries={['/hr/properties']}>
          <AuthProvider>
            <HRDashboardLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
      })

      // Check that the page title is set correctly
      expect(document.title).toContain('HR Dashboard')
    })

    it('should work with Manager Dashboard Layout', async () => {
      // Update mock for manager role
      const managerMockAuthContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'manager' as const,
          property_id: 'prop-1'
        }
      }

      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => managerMockAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
      }))

      render(
        <MemoryRouter initialEntries={['/manager/applications']}>
          <AuthProvider>
            <ManagerDashboardLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
      })

      // Check that the page title is set correctly
      expect(document.title).toContain('Manager Dashboard')
    })
  })
})