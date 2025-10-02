import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Breadcrumb, DashboardBreadcrumb } from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Breadcrumb', () => {
  const mockItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      ariaLabel: 'Navigate to home page'
    },
    {
      label: 'Dashboard',
      path: '/hr',
      ariaLabel: 'Navigate to HR dashboard'
    },
    {
      label: 'Properties',
      ariaLabel: 'Current page: Properties'
    }
  ]

  it('renders all breadcrumb items', () => {
    renderWithRouter(<Breadcrumb items={mockItems} />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('renders links for non-last items', () => {
    renderWithRouter(<Breadcrumb items={mockItems} />)

    const homeLink = screen.getByRole('link', { name: /navigate to home page/i })
    expect(homeLink).toHaveAttribute('href', '/')

    const dashboardLink = screen.getByRole('link', { name: /navigate to hr dashboard/i })
    expect(dashboardLink).toHaveAttribute('href', '/hr')
  })

  it('marks last item as current page', () => {
    renderWithRouter(<Breadcrumb items={mockItems} />)

    const currentItem = screen.getByText('Properties')
    expect(currentItem.parentElement).toHaveAttribute('aria-current', 'page')
  })

  it('shows chevron separators between items', () => {
    renderWithRouter(<Breadcrumb items={mockItems} />)

    // Should have 2 chevrons for 3 items (they have aria-hidden="true")
    const chevrons = document.querySelectorAll('[aria-hidden="true"]')
    expect(chevrons).toHaveLength(2)
  })

  it('truncates items when maxItems is exceeded', () => {
    const manyItems = [
      { label: 'Home', path: '/' },
      { label: 'Level 1', path: '/level1' },
      { label: 'Level 2', path: '/level2' },
      { label: 'Level 3', path: '/level3' },
      { label: 'Level 4', path: '/level4' },
      { label: 'Current' }
    ]

    renderWithRouter(<Breadcrumb items={manyItems} maxItems={4} />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
    expect(screen.getByText('Level 4')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
    
    // Should not show middle items
    expect(screen.queryByText('Level 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Level 3')).not.toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    renderWithRouter(<Breadcrumb items={mockItems} />)

    const nav = screen.getByRole('navigation', { name: /breadcrumb navigation/i })
    expect(nav).toBeInTheDocument()

    const homeLink = screen.getByRole('link', { name: /navigate to home page/i })
    expect(homeLink).toHaveAttribute('aria-label', 'Navigate to home page')
  })
})

describe('DashboardBreadcrumb', () => {
  it('renders HR dashboard breadcrumb', () => {
    renderWithRouter(
      <DashboardBreadcrumb 
        role="hr" 
        currentSection="properties" 
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('renders Manager dashboard breadcrumb', () => {
    renderWithRouter(
      <DashboardBreadcrumb 
        role="manager" 
        currentSection="applications" 
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
  })

  it('includes property name for manager breadcrumb', () => {
    renderWithRouter(
      <DashboardBreadcrumb 
        role="manager" 
        currentSection="employees"
        propertyName="Grand Hotel Downtown"
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Grand Hotel Downtown')).toBeInTheDocument()
    expect(screen.getByText('Employees')).toBeInTheDocument()
  })

  it('handles unknown sections gracefully', () => {
    renderWithRouter(
      <DashboardBreadcrumb 
        role="hr" 
        currentSection="unknown-section" 
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('HR Dashboard')).toBeInTheDocument()
    expect(screen.getByText('unknown-section')).toBeInTheDocument()
  })

  it('has proper navigation links', () => {
    renderWithRouter(
      <DashboardBreadcrumb 
        role="hr" 
        currentSection="analytics" 
      />
    )

    const homeLink = screen.getByRole('link', { name: /navigate to home page/i })
    expect(homeLink).toHaveAttribute('href', '/')

    const dashboardLink = screen.getByRole('link', { name: /navigate to hr dashboard/i })
    expect(dashboardLink).toHaveAttribute('href', '/hr')
  })
})