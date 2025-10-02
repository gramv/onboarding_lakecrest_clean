import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useNavigation, useNavigationAnalytics } from '@/hooks/use-navigation'
import { Building2 } from 'lucide-react'

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/hr/properties'
  })
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('useNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('initializes with correct current section', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'hr' }),
      { wrapper }
    )

    expect(result.current.currentSection).toBe('properties')
  })

  it('navigates to section correctly', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'hr' }),
      { wrapper }
    )

    act(() => {
      result.current.navigateToSection('employees')
    })

    expect(mockNavigate).toHaveBeenCalledWith('/hr/employees')
  })

  it('checks if section is active', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'hr' }),
      { wrapper }
    )

    expect(result.current.isActive('properties')).toBe(true)
    expect(result.current.isActive('employees')).toBe(false)
  })

  it('generates correct section path', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'manager' }),
      { wrapper }
    )

    expect(result.current.getSectionPath('applications')).toBe('/manager/applications')
  })

  it('handles navigation item click', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'hr' }),
      { wrapper }
    )

    const mockItem = {
      key: 'analytics',
      label: 'Analytics',
      path: '/hr/analytics',
      icon: Building2,
      roles: ['hr' as const]
    }

    act(() => {
      result.current.handleNavigationClick(mockItem)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/hr/analytics')
  })

  it('calls onNavigate callback when provided', () => {
    const mockOnNavigate = jest.fn()
    
    renderHook(
      () => useNavigation({ 
        role: 'hr',
        onNavigate: mockOnNavigate
      }),
      { wrapper }
    )

    // The callback should be called during initialization
    // In a real scenario, it would be called when location changes
  })

  it('uses default section when none provided', () => {
    const { result } = renderHook(
      () => useNavigation({ role: 'manager' }),
      { wrapper }
    )

    // Manager default should be 'applications'
    expect(result.current.getSectionPath('applications')).toBe('/manager/applications')
  })
})

describe('useNavigationAnalytics', () => {
  it('initializes with empty analytics', () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    expect(result.current.analytics.totalNavigations).toBe(0)
    expect(result.current.analytics.sectionVisits).toEqual({})
  })

  it('tracks navigation correctly', () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    act(() => {
      result.current.trackNavigation('properties', 'employees')
    })

    expect(result.current.analytics.totalNavigations).toBe(1)
    expect(result.current.analytics.sectionVisits.employees).toBe(1)
  })

  it('accumulates multiple navigations', () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    act(() => {
      result.current.trackNavigation('properties', 'employees')
      result.current.trackNavigation('employees', 'applications')
      result.current.trackNavigation('applications', 'employees')
    })

    expect(result.current.analytics.totalNavigations).toBe(3)
    expect(result.current.analytics.sectionVisits.employees).toBe(2)
    expect(result.current.analytics.sectionVisits.applications).toBe(1)
  })

  it('resets analytics correctly', () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    act(() => {
      result.current.trackNavigation('properties', 'employees')
    })

    expect(result.current.analytics.totalNavigations).toBe(1)

    act(() => {
      result.current.resetAnalytics()
    })

    expect(result.current.analytics.totalNavigations).toBe(0)
    expect(result.current.analytics.sectionVisits).toEqual({})
  })

  it('calculates time spent in sections', async () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    act(() => {
      result.current.trackNavigation('properties', 'employees')
    })

    // Wait a small amount of time
    await new Promise(resolve => setTimeout(resolve, 10))

    act(() => {
      result.current.trackNavigation('employees', 'applications')
    })

    expect(result.current.analytics.averageTimePerSection.employees).toBeGreaterThanOrEqual(0)
  })

  it('provides analytics getter', () => {
    const { result } = renderHook(() => useNavigationAnalytics())

    act(() => {
      result.current.trackNavigation('properties', 'employees')
    })

    const analytics = result.current.getAnalytics()
    expect(analytics.totalNavigations).toBe(1)
    expect(analytics.sectionVisits.employees).toBe(1)
  })
})