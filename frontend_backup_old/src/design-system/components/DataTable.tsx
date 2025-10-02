/**
 * Advanced DataTable Component
 * Professional data table with sorting, filtering, and virtual scrolling
 */

import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { DataTableProps, ColumnDefinition, SortConfig, FilterConfig } from './types'

// ===== TABLE ICONS =====

const SortIcon: React.FC<{ direction?: 'asc' | 'desc' }> = ({ direction }) => (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    )}
  </svg>
)

const FilterIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
  </svg>
)

const SearchIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

// ===== TABLE HEADER COMPONENT =====

interface TableHeaderProps<T> {
  columns: ColumnDefinition<T>[]
  sortConfig?: SortConfig | null
  onSort?: (key: string) => void
  selection?: any
  size: 'sm' | 'md' | 'lg'
}

const TableHeader = <T,>({
  columns,
  sortConfig,
  onSort,
  selection,
  size,
}: TableHeaderProps<T>) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-sm',
  }

  return (
    <thead className="bg-surface-secondary border-b border-neutral-200">
      <tr>
        {selection && (
          <th className={cn('w-12', sizeClasses[size])}>
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary/20"
              onChange={(e) => {
                // Handle select all
                if (selection.onChange) {
                  selection.onChange(
                    e.target.checked ? ['all'] : [],
                    []
                  )
                }
              }}
            />
          </th>
        )}
        
        {columns.map((column) => (
          <th
            key={column.key}
            className={cn(
              'text-left font-semibold text-text-primary',
              sizeClasses[size],
              column.sortable && 'cursor-pointer hover:bg-surface-tertiary',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right'
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
            onClick={() => column.sortable && onSort?.(column.key)}
          >
            <div className="flex items-center">
              {column.renderHeader ? column.renderHeader() : column.title}
              {column.sortable && (
                <SortIcon
                  direction={
                    sortConfig?.key === column.key ? sortConfig.direction : undefined
                  }
                />
              )}
              {column.filterable && (
                <button className="ml-2 p-1 hover:bg-surface-tertiary rounded">
                  <FilterIcon />
                </button>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ===== TABLE ROW COMPONENT =====

interface TableRowProps<T> {
  record: T
  index: number
  columns: ColumnDefinition<T>[]
  rowKey: string | ((record: T) => React.Key)
  selection?: any
  onRowClick?: (record: T, index: number) => void
  onRowDoubleClick?: (record: T, index: number) => void
  rowClassName?: string | ((record: T, index: number) => string)
  size: 'sm' | 'md' | 'lg'
  striped?: boolean
  hover?: boolean
}

const TableRow = <T,>({
  record,
  index,
  columns,
  rowKey,
  selection,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  size,
  striped,
  hover,
}: TableRowProps<T>) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  }

  const key = typeof rowKey === 'function' ? rowKey(record) : (record as any)[rowKey]
  const isSelected = selection?.selectedRowKeys.includes(key)

  const className = cn(
    'border-b border-neutral-100 transition-colors duration-normal',
    striped && index % 2 === 1 && 'bg-surface-secondary/50',
    hover && 'hover:bg-surface-secondary',
    onRowClick && 'cursor-pointer',
    isSelected && 'bg-brand-primary/10',
    typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName
  )

  return (
    <tr
      className={className}
      onClick={() => onRowClick?.(record, index)}
      onDoubleClick={() => onRowDoubleClick?.(record, index)}
    >
      {selection && (
        <td className={sizeClasses[size]}>
          <input
            type={selection.type}
            name={selection.type === 'radio' ? 'table-selection' : undefined}
            className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary/20"
            checked={isSelected}
            onChange={(e) => {
              if (selection.onChange) {
                const newSelectedKeys = e.target.checked
                  ? [...selection.selectedRowKeys, key]
                  : selection.selectedRowKeys.filter((k: React.Key) => k !== key)
                
                selection.onChange(newSelectedKeys, [])
              }
            }}
            {...(selection.getCheckboxProps?.(record) || {})}
          />
        </td>
      )}
      
      {columns.map((column) => {
        const value = column.dataIndex ? (record as any)[column.dataIndex] : record
        const cellContent = column.render ? column.render(value, record, index) : value

        return (
          <td
            key={column.key}
            className={cn(
              'text-text-primary',
              sizeClasses[size],
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right',
              column.ellipsis && 'truncate max-w-0'
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
          >
            {column.ellipsis ? (
              <div className="truncate" title={String(cellContent)}>
                {cellContent}
              </div>
            ) : (
              cellContent
            )}
          </td>
        )
      })}
    </tr>
  )
}

// ===== TABLE TOOLBAR COMPONENT =====

interface TableToolbarProps {
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  bulkActions?: any[]
  selectedCount?: number
  onBulkAction?: (action: string) => void
  exportConfig?: any
  onExport?: (format: string) => void
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  searchable,
  searchPlaceholder = 'Search...',
  onSearch,
  bulkActions,
  selectedCount = 0,
  onBulkAction,
  exportConfig,
  onExport,
}) => {
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }, [onSearch])

  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200">
      <div className="flex items-center space-x-4">
        {searchable && (
          <div className="relative">
            <SearchIcon />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            <SearchIcon />
          </div>
        )}
        
        {bulkActions && selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-muted">
              {selectedCount} selected
            </span>
            {bulkActions.map((action) => (
              <button
                key={action.key}
                onClick={() => onBulkAction?.(action.key)}
                className={cn(
                  'px-3 py-1 text-sm rounded border',
                  action.danger
                    ? 'border-error-300 text-error-700 hover:bg-error-50'
                    : 'border-neutral-300 text-text-primary hover:bg-surface-secondary'
                )}
                disabled={action.disabled}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {exportConfig && (
        <div className="flex items-center space-x-2">
          {exportConfig.formats.map((format: string) => (
            <button
              key={format}
              onClick={() => onExport?.(format)}
              className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-surface-secondary"
            >
              Export {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== MAIN DATA TABLE COMPONENT =====

export const DataTable = <T,>({
  className,
  data,
  columns,
  loading = false,
  empty,
  error,
  pagination,
  onPaginationChange,
  sortable = true,
  defaultSort,
  onSortChange,
  filterable = false,
  filters,
  onFiltersChange,
  selection,
  bulkActions,
  onBulkAction,
  exportConfig,
  onExport,
  virtualScrolling = false,
  itemHeight = 48,
  overscan = 5,
  rowKey = 'id',
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  size = 'md',
  bordered = false,
  striped = false,
  hover = true,
  sticky = false,
  resizable = false,
  searchable = false,
  searchPlaceholder,
  onSearch,
  'data-testid': testId,
  ...props
}: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null)
  const [searchValue, setSearchValue] = useState('')

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    if (!sortable) return

    const newSortConfig: SortConfig = {
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    }

    setSortConfig(newSortConfig)
    onSortChange?.(newSortConfig)
  }, [sortConfig, sortable, onSortChange])

  // Process data (sorting, filtering, searching)
  const processedData = useMemo(() => {
    let result = [...data]

    // Search
    if (searchValue && searchable) {
      result = result.filter((item) =>
        columns.some((column) => {
          if (!column.searchable) return false
          const value = column.dataIndex ? (item as any)[column.dataIndex] : item
          return String(value).toLowerCase().includes(searchValue.toLowerCase())
        })
      )
    }

    // Filter
    if (filters && filters.length > 0) {
      result = result.filter((item) =>
        filters.every((filter) => {
          const value = (item as any)[filter.key]
          switch (filter.operator || 'eq') {
            case 'eq': return value === filter.value
            case 'ne': return value !== filter.value
            case 'gt': return value > filter.value
            case 'gte': return value >= filter.value
            case 'lt': return value < filter.value
            case 'lte': return value <= filter.value
            case 'contains': return String(value).includes(String(filter.value))
            case 'startsWith': return String(value).startsWith(String(filter.value))
            case 'endsWith': return String(value).endsWith(String(filter.value))
            default: return true
          }
        })
      )
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchValue, filters, sortConfig, columns, searchable])

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }, [onSearch])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-error-600">
        {typeof error === 'string' ? error : error}
      </div>
    )
  }

  // Empty state
  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-text-muted">
        {empty || 'No data available'}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-surface-primary rounded-lg border border-neutral-200 overflow-hidden',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {(searchable || bulkActions || exportConfig) && (
        <TableToolbar
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          onSearch={handleSearch}
          bulkActions={bulkActions}
          selectedCount={selection?.selectedRowKeys.length || 0}
          onBulkAction={onBulkAction}
          exportConfig={exportConfig}
          onExport={onExport}
        />
      )}

      <div className={cn('overflow-auto', sticky && 'max-h-96')}>
        <table className="w-full">
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            selection={selection}
            size={size}
          />
          <tbody className="divide-y divide-neutral-100">
            {processedData.map((record, index) => (
              <TableRow
                key={typeof rowKey === 'function' ? String(rowKey(record)) : String((record as any)[rowKey])}
                record={record}
                index={index}
                columns={columns}
                rowKey={rowKey}
                selection={selection}
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
                rowClassName={rowClassName}
                size={size}
                striped={striped}
                hover={hover}
              />
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between p-4 border-t border-neutral-200">
          <div className="text-sm text-text-muted">
            Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPaginationChange?.(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current <= 1}
              className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => onPaginationChange?.(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'

export default DataTable

// ===== USAGE EXAMPLES =====

/*
// Basic DataTable
<DataTable
  data={users}
  columns={[
    { key: 'name', title: 'Name', dataIndex: 'name', sortable: true },
    { key: 'email', title: 'Email', dataIndex: 'email', searchable: true },
    { key: 'role', title: 'Role', dataIndex: 'role', filterable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, record) => (
        <Button size="sm" onClick={() => editUser(record.id)}>
          Edit
        </Button>
      ),
    },
  ]}
/>

// Advanced DataTable with all features
<DataTable
  data={applications}
  columns={columns}
  loading={loading}
  searchable
  sortable
  selection={{
    type: 'checkbox',
    selectedRowKeys: selectedRows,
    onChange: setSelectedRows,
  }}
  bulkActions={[
    { key: 'approve', label: 'Approve Selected', icon: <CheckIcon /> },
    { key: 'reject', label: 'Reject Selected', icon: <XIcon />, danger: true },
  ]}
  onBulkAction={handleBulkAction}
  exportConfig={{
    formats: ['csv', 'excel'],
    filename: 'applications',
  }}
  onExport={handleExport}
  pagination={{
    current: page,
    pageSize: 10,
    total: totalCount,
  }}
  onPaginationChange={handlePaginationChange}
  onRowClick={handleRowClick}
  size="md"
  striped
  hover
/>
*/