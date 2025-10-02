import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DashboardNavigation, HR_NAVIGATION_ITEMS, MANAGER_NAVIGATION_ITEMS } from '@/components/ui/dashboard-navigation'

// Mock useLocation to return a specific path
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/hr/properties'
  })
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('DashboardNavigation', () => {
  describe('HR Navigation', () => {
    it('renders all HR navigation items', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
        />
      )

      expect(screen.getByText('Properties')).toBeInTheDocument()
      expect(screen.getByText('Managers')).toBeInTheDocument()
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('highlights active navigation item', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
        />
      )

      const propertiesLink = screen.getByRole('link', { name: /manage hotel properties/i })
      expect(propertiesLink).toHaveAttribute('aria-current', 'page')
    })

    it('shows badge when provided', () => {
      const itemsWithBadge = HR_NAVIGATION_ITEMS.map(item => ({
        ...item,
        badge: item.key === 'applications' ? 5 : undefined
      }))

      renderWithRouter(
        <DashboardNavigation 
          items={itemsWithBadge}
          userRole="hr"
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('calls onNavigate when item is clicked', () => {
      const mockOnNavigate = jest.fn()
      
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
          onNavigate={mockOnNavigate}
        />
      )

      const managersLink = screen.getByRole('link', { name: /manage property managers/i })
      fireEvent.click(managersLink)

      expect(mockOnNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'managers',
          label: 'Managers'
        })
      )
    })
  })

  describe('Manager Navigation', () => {
    it('renders only manager-accessible items', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={MANAGER_NAVIGATION_ITEMS}
          userRole="manager"
        />
      )

      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      
      // Should not show HR-only items
      expect(screen.queryByText('Properties')).not.toBeInTheDocument()
      expect(screen.queryByText('Managers')).not.toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    it('renders mobile menu button in mobile variant', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
          variant="mobile"
        />
      )

      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument()
    })

    it('opens mobile menu when button is clicked', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
          variant="mobile"
        />
      )

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i })
      fireEvent.click(menuButton)

      expect(screen.getByRole('navigation', { name: /dashboard navigation/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
        />
      )

      const navigation = screen.getByRole('navigation', { name: /dashboard navigation/i })
      expect(navigation).toBeInTheDocument()

      const propertiesLink = screen.getByRole('link', { name: /manage hotel properties/i })
      expect(propertiesLink).toHaveAttribute('aria-current', 'page')
    })

    it('supports keyboard navigation', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
        />
      )

      const managersLink = screen.getByRole('link', { name: /manage property managers/i })
      
      // Focus the link
      managersLink.focus()
      expect(managersLink).toHaveFocus()

      // Should be able to activate with Enter key
      fireEvent.keyDown(managersLink, { key: 'Enter' })
      // Note: In a real test, this would trigger navigation
    })
  })

  describe('Sidebar Variant', () => {
    it('renders in sidebar layout', () => {
      renderWithRouter(
        <DashboardNavigation 
          items={HR_NAVIGATION_ITEMS}
          userRole="hr"
          variant="sidebar"
          orientation="vertical"
        />
      )

      const navigation = screen.getByRole('navigation', { name: /dashboard navigation/i })
      expect(navigation).toHaveClass('flex-col')
    })
  })
})