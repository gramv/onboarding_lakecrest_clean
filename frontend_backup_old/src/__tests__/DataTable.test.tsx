import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable, ColumnDefinition } from '../components/ui/data-table'

// Mock the advanced search and filter components
jest.mock('../components/ui/advanced-search', () => ({
  AdvancedSearch: ({ onSearchResults, onSearchChange, placeholder }: any) => (
    <input
      data-testid="advanced-search"
      placeholder={placeholder}
      onChange={(e) => {
        onSearchChange(e.target.value)
        onSearchResults([])
      }}
    />
  ),
  useAdvancedSearch: (data: any[], fields: any[]) => ({
    filteredData: data,
    searchQuery: '',
    handleSearchResults: jest.fn(),
    handleSearchChange: jest.fn()
  })
}))

jest.mock('../components/ui/advanced-filter', () => ({
  AdvancedFilter: ({ onFiltersChange, onSortChange }: any) => (
    <button data-testid="advanced-filter" onClick={() => onFiltersChange([])}>
      Advanced Filter
    </button>
  ),
  useAdvancedFilter: (data: any[], fields: any[]) => ({
    filteredData: data,
    setRules: jest.fn(),
    setSortConfig: jest.fn()
  })
}))

jest.mock('../components/ui/data-export', () => ({
  DataExport: ({ data, columns, filename }: any) => (
    <button data-testid="data-export">Export ({data.length} rows)</button>
  )
}))

jest.mock('../components/ui/highlighted-text', () => ({
  HighlightedText: ({ text, highlight }: any) => <span>{text}</span>
}))

interface TestData {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  created_at: string
}

const mockData: TestData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
    created_at: '2024-01-01'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'inactive',
    created_at: '2024-01-02'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    status: 'active',
    created_at: '2024-01-03'
  }
]

const mockColumns: ColumnDefinition<TestData>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (value) => (
      <span className={value === 'active' ? 'text-green-600' : 'text-red-600'}>
        {value}
      </span>
    )
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true
  }
]

describe('DataTable', () => {
  test('renders table with data and columns', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )

    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()

    // Check data rows
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  test('displays empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No users found"
      />
    )

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  test('renders loading skeleton when loading', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={true}
        loadingRows={3}
      />
    )

    // Should show loading skeleton rows
    const skeletonRows = screen.getAllByRole('row')
    expect(skeletonRows).toHaveLength(4) // 1 header + 3 loading rows
  })

  test('enables search functionality', async () => {
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
        searchPlaceholder="Search users..."
      />
    )

    const searchInput = screen.getByPlaceholderText('Search users...')
    expect(searchInput).toBeInTheDocument()

    // Search for "John"
    await user.type(searchInput, 'John')

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    }, { timeout: 500 })
  })

  test('enables advanced search when configured', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
        enableAdvancedSearch={true}
      />
    )

    expect(screen.getByTestId('advanced-search')).toBeInTheDocument()
  })

  test('enables advanced filter when configured', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        enableAdvancedFilter={true}
      />
    )

    expect(screen.getByTestId('advanced-filter')).toBeInTheDocument()
  })

  test('enables data export when configured', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        enableExport={true}
      />
    )

    expect(screen.getByTestId('data-export')).toBeInTheDocument()
    expect(screen.getByText('Export (3 rows)')).toBeInTheDocument()
  })

  test('handles column sorting', async () => {
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        sortable={true}
      />
    )

    const nameHeader = screen.getByText('Name')
    
    // Click to sort ascending
    await user.click(nameHeader)
    
    // Check that data is sorted (Bob should come first alphabetically)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Bob Johnson')
    
    // Click again to sort descending
    await user.click(nameHeader)
    
    // John should come first in descending order
    const rowsDesc = screen.getAllByRole('row')
    expect(rowsDesc[1]).toHaveTextContent('John Doe')
  })

  test('handles pagination', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: 'active' as const,
      created_at: '2024-01-01'
    }))

    render(
      <DataTable
        data={largeData}
        columns={mockColumns}
        pagination={true}
        pageSize={10}
      />
    )

    // Should show pagination info
    expect(screen.getByText(/Showing 1 to 10 of 25 results/)).toBeInTheDocument()
    
    // Should show pagination controls
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('handles row selection', async () => {
    const user = userEvent.setup()
    const onSelectionChange = jest.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    )

    // Should show select all checkbox
    const selectAllCheckbox = screen.getByLabelText('Select all rows')
    expect(selectAllCheckbox).toBeInTheDocument()

    // Should show individual row checkboxes
    const rowCheckboxes = screen.getAllByLabelText(/Select row/)
    expect(rowCheckboxes).toHaveLength(3)

    // Select first row
    await user.click(rowCheckboxes[0])
    
    expect(onSelectionChange).toHaveBeenCalledWith([mockData[0]])

    // Select all rows
    await user.click(selectAllCheckbox)
    
    expect(onSelectionChange).toHaveBeenCalledWith(mockData)
  })

  test('handles row click events', async () => {
    const user = userEvent.setup()
    const onRowClick = jest.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onRowClick={onRowClick}
      />
    )

    const firstRow = screen.getByText('John Doe').closest('tr')
    expect(firstRow).toBeInTheDocument()

    await user.click(firstRow!)
    
    expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0)
  })

  test('renders custom cell content with render function', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )

    // Status column uses custom render function
    const activeStatus = screen.getAllByText('active')
    expect(activeStatus[0]).toHaveClass('text-green-600')

    const inactiveStatus = screen.getByText('inactive')
    expect(inactiveStatus).toHaveClass('text-red-600')
  })

  test('shows selection count when rows are selected', async () => {
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selectable={true}
      />
    )

    const rowCheckboxes = screen.getAllByLabelText(/Select row/)
    
    // Select first two rows
    await user.click(rowCheckboxes[0])
    await user.click(rowCheckboxes[1])

    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument()
  })

  test('disables sorting when sortable is false', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        sortable={false}
      />
    )

    const nameHeader = screen.getByText('Name')
    expect(nameHeader).not.toHaveClass('cursor-pointer')
  })

  test('disables pagination when pagination is false', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: 'active' as const,
      created_at: '2024-01-01'
    }))

    render(
      <DataTable
        data={largeData}
        columns={mockColumns}
        pagination={false}
      />
    )

    // Should show all rows without pagination
    expect(screen.getAllByRole('row')).toHaveLength(26) // 1 header + 25 data rows
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        className="custom-table-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-table-class')
  })

  test('handles nested object properties in columns', () => {
    const nestedData = [
      {
        id: '1',
        user: {
          name: 'John Doe',
          profile: {
            email: 'john@example.com'
          }
        }
      }
    ]

    const nestedColumns: ColumnDefinition<any>[] = [
      {
        key: 'user.name',
        label: 'Name'
      },
      {
        key: 'user.profile.email',
        label: 'Email'
      }
    ]

    render(
      <DataTable
        data={nestedData}
        columns={nestedColumns}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})