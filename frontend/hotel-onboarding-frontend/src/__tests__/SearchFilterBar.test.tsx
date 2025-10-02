import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchFilterBar, FilterOption, useSearchFilter } from '../components/ui/search-filter-bar'

const mockFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  },
  {
    key: 'department',
    label: 'Department',
    type: 'multiselect',
    options: [
      { value: 'hr', label: 'Human Resources' },
      { value: 'it', label: 'Information Technology' },
      { value: 'finance', label: 'Finance' }
    ]
  },
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Enter name'
  },
  {
    key: 'hire_date',
    label: 'Hire Date',
    type: 'date'
  }
]

describe('SearchFilterBar', () => {
  test('renders search input with placeholder', () => {
    render(
      <SearchFilterBar
        searchPlaceholder="Search employees..."
        onSearchChange={jest.fn()}
      />
    )

    expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument()
  })

  test('calls onSearchChange with debounced value', async () => {
    const onSearchChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'test query')

    // Should not call immediately
    expect(onSearchChange).not.toHaveBeenCalled()

    // Should call after debounce delay
    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith('test query')
    }, { timeout: 500 })
  })

  test('renders filter button when filters are provided', () => {
    render(
      <SearchFilterBar
        filters={mockFilters}
        onFilterChange={jest.fn()}
      />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  test('shows filter count badge when filters are active', () => {
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ status: 'active', name: 'John' }}
        onFilterChange={jest.fn()}
        showFilterCount={true}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument() // Badge showing 2 active filters
  })

  test('opens filter popover when filter button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        onFilterChange={jest.fn()}
      />
    )

    const filterButton = screen.getByText('Filters')
    await user.click(filterButton)

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Department')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Hire Date')).toBeInTheDocument()
  })

  test('handles select filter changes', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Find and click the status select
    const statusSelect = screen.getByText('Select Status')
    await user.click(statusSelect)

    // Select "Active" option
    await user.click(screen.getByText('Active'))

    expect(onFilterChange).toHaveBeenCalledWith('status', 'active')
  })

  test('handles text filter changes', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Find name input and type
    const nameInput = screen.getByPlaceholderText('Enter name')
    await user.type(nameInput, 'John Doe')

    expect(onFilterChange).toHaveBeenCalledWith('name', 'John Doe')
  })

  test('handles date filter changes', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Find date input and set value
    const dateInput = screen.getByDisplayValue('')
    await user.type(dateInput, '2024-01-01')

    expect(onFilterChange).toHaveBeenCalledWith('hire_date', '2024-01-01')
  })

  test('handles multiselect filter changes', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ department: [] }}
        onFilterChange={onFilterChange}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Find department multiselect
    const departmentSelect = screen.getByText('Select Department')
    await user.click(departmentSelect)

    // Select "Human Resources"
    await user.click(screen.getByText('Human Resources'))

    expect(onFilterChange).toHaveBeenCalledWith('department', ['hr'])
  })

  test('displays active filter labels', () => {
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{
          status: 'active',
          name: 'John Doe',
          department: ['hr', 'it']
        }}
        onFilterChange={jest.fn()}
      />
    )

    expect(screen.getByText('Active filters:')).toBeInTheDocument()
    expect(screen.getByText('Status: Active')).toBeInTheDocument()
    expect(screen.getByText('Name: John Doe')).toBeInTheDocument()
    expect(screen.getByText('Department: 2 selected')).toBeInTheDocument()
  })

  test('clears all filters when clear button is clicked', async () => {
    const onClearFilters = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ status: 'active', name: 'John' }}
        onClearFilters={onClearFilters}
      />
    )

    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)

    expect(onClearFilters).toHaveBeenCalled()
  })

  test('clears all filters from within popover', async () => {
    const onClearFilters = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ status: 'active', name: 'John' }}
        onClearFilters={onClearFilters}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Click "Clear all" inside popover
    const clearAllButton = screen.getByText('Clear all')
    await user.click(clearAllButton)

    expect(onClearFilters).toHaveBeenCalled()
  })

  test('removes individual multiselect values', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ department: ['hr', 'it'] }}
        onFilterChange={onFilterChange}
      />
    )

    // Open filter popover
    await user.click(screen.getByText('Filters'))

    // Find and remove "Human Resources" badge
    const hrBadge = screen.getByText('Human Resources').closest('span')
    const removeButton = hrBadge?.querySelector('button')
    
    if (removeButton) {
      await user.click(removeButton)
      expect(onFilterChange).toHaveBeenCalledWith('department', ['it'])
    }
  })

  test('applies custom className', () => {
    const { container } = render(
      <SearchFilterBar
        className="custom-search-bar"
        onSearchChange={jest.fn()}
      />
    )

    expect(container.firstChild).toHaveClass('custom-search-bar')
  })

  test('applies custom search className', () => {
    render(
      <SearchFilterBar
        searchClassName="custom-search-input"
        onSearchChange={jest.fn()}
      />
    )

    const searchContainer = screen.getByPlaceholderText('Search...').closest('div')
    expect(searchContainer).toHaveClass('custom-search-input')
  })

  test('hides filter count when showFilterCount is false', () => {
    render(
      <SearchFilterBar
        filters={mockFilters}
        filterValues={{ status: 'active' }}
        showFilterCount={false}
        onFilterChange={jest.fn()}
      />
    )

    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})

// Test the useSearchFilter hook
describe('useSearchFilter hook', () => {
  const TestComponent = ({ data, searchFields, filterConfig }: any) => {
    const {
      searchValue,
      filterValues,
      filteredData,
      handleSearchChange,
      handleFilterChange,
      handleClearFilters
    } = useSearchFilter(data, searchFields, filterConfig)

    return (
      <div>
        <div data-testid="search-value">{searchValue}</div>
        <div data-testid="filter-values">{JSON.stringify(filterValues)}</div>
        <div data-testid="filtered-count">{filteredData.length}</div>
        <button onClick={() => handleSearchChange('test')}>Set Search</button>
        <button onClick={() => handleFilterChange('status', 'active')}>Set Filter</button>
        <button onClick={handleClearFilters}>Clear All</button>
        <div data-testid="filtered-data">
          {filteredData.map((item: any) => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>
      </div>
    )
  }

  const mockData = [
    { id: '1', name: 'John Doe', status: 'active' },
    { id: '2', name: 'Jane Smith', status: 'inactive' },
    { id: '3', name: 'Bob Johnson', status: 'active' }
  ]

  const searchFields = ['name']
  const filterConfig = {
    status: (item: any, value: any) => item.status === value
  }

  test('initializes with empty search and filters', () => {
    render(
      <TestComponent
        data={mockData}
        searchFields={searchFields}
        filterConfig={filterConfig}
      />
    )

    expect(screen.getByTestId('search-value')).toHaveTextContent('')
    expect(screen.getByTestId('filter-values')).toHaveTextContent('{}')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('3')
  })

  test('filters data by search term', async () => {
    const user = userEvent.setup()
    
    render(
      <TestComponent
        data={mockData}
        searchFields={searchFields}
        filterConfig={filterConfig}
      />
    )

    await user.click(screen.getByText('Set Search'))

    expect(screen.getByTestId('search-value')).toHaveTextContent('test')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('0') // No matches for "test"
  })

  test('filters data by custom filter', async () => {
    const user = userEvent.setup()
    
    render(
      <TestComponent
        data={mockData}
        searchFields={searchFields}
        filterConfig={filterConfig}
      />
    )

    await user.click(screen.getByText('Set Filter'))

    expect(screen.getByTestId('filter-values')).toHaveTextContent('{"status":"active"}')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('2') // John and Bob are active
  })

  test('clears all filters and search', async () => {
    const user = userEvent.setup()
    
    render(
      <TestComponent
        data={mockData}
        searchFields={searchFields}
        filterConfig={filterConfig}
      />
    )

    // Set search and filter
    await user.click(screen.getByText('Set Search'))
    await user.click(screen.getByText('Set Filter'))

    // Clear all
    await user.click(screen.getByText('Clear All'))

    expect(screen.getByTestId('search-value')).toHaveTextContent('')
    expect(screen.getByTestId('filter-values')).toHaveTextContent('{}')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('3')
  })
})