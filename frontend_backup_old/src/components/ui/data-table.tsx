import * as React from "react"
import { ChevronUp, ChevronDown, Search, Grid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { AdvancedSearch, SearchFieldConfig, useAdvancedSearch } from "@/components/ui/advanced-search"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { AdvancedFilter, FilterFieldConfig, useAdvancedFilter } from "@/components/ui/advanced-filter"
import { DataExport, ExportColumn } from "@/components/ui/data-export"

export interface ColumnDefinition<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDefinition<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: SearchFieldConfig[]
  enableAdvancedSearch?: boolean
  enableAdvancedFilter?: boolean
  filterFields?: FilterFieldConfig[]
  enableExport?: boolean
  exportColumns?: ExportColumn[]
  exportFilename?: string
  exportTitle?: string
  sortable?: boolean
  pagination?: boolean
  pageSize?: number
  selectable?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  onRowClick?: (row: T, index: number) => void
  className?: string
  emptyMessage?: string
  loading?: boolean
  loadingRows?: number
  mobileCardView?: boolean
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  searchFields,
  enableAdvancedSearch = false,
  enableAdvancedFilter = false,
  filterFields,
  enableExport = false,
  exportColumns,
  exportFilename = 'data-export',
  exportTitle = 'Data Export',
  sortable = true,
  pagination = true,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  onRowClick,
  className,
  emptyMessage = "No data available",
  loading = false,
  loadingRows = 5,
  mobileCardView = true,
  mobileBreakpoint = 'md',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table')

  // Advanced search setup
  const defaultSearchFields: SearchFieldConfig[] = React.useMemo(() => {
    return columns.map(col => ({
      key: col.key,
      weight: 1,
      searchable: true,
      highlightable: true
    }))
  }, [columns])

  const finalSearchFields = searchFields || defaultSearchFields

  const {
    filteredData: searchFilteredData,
    searchQuery,
    handleSearchResults,
    handleSearchChange
  } = useAdvancedSearch(data, finalSearchFields)

  // Advanced filter setup
  const defaultFilterFields: FilterFieldConfig[] = React.useMemo(() => {
    return columns.map(col => ({
      key: col.key,
      label: col.label,
      type: 'text' as const
    }))
  }, [columns])

  const finalFilterFields = filterFields || defaultFilterFields

  const {
    filteredData: filterFilteredData,
    setRules: setFilterRules,
    setSortConfig: setFilterSortConfig
  } = useAdvancedFilter(data, finalFilterFields)

  // Export setup
  const defaultExportColumns: ExportColumn[] = React.useMemo(() => {
    return columns
      .filter(col => col.key !== 'actions') // Exclude action columns
      .map(col => ({
        key: col.key,
        label: col.label,
        type: 'text' as const,
        format: (value: any) => {
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        }
      }))
  }, [columns])

  const finalExportColumns = exportColumns || defaultExportColumns

  // Date fields for export filtering
  const exportDateFields = React.useMemo(() => {
    return finalExportColumns
      .filter(col => col.type === 'date' || col.key.includes('date') || col.key.includes('at'))
      .map(col => ({ key: col.key, label: col.label }))
  }, [finalExportColumns])

  // Debounced search for basic search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")

  React.useEffect(() => {
    if (!enableAdvancedSearch) {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm)
        setCurrentPage(1) // Reset to first page when searching
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [searchTerm, enableAdvancedSearch])

  // Reset page when search changes
  React.useEffect(() => {
    if (enableAdvancedSearch) {
      setCurrentPage(1)
    }
  }, [searchQuery, enableAdvancedSearch])

  // Filter data based on search and filters
  const filteredData = React.useMemo(() => {
    if (enableAdvancedFilter) {
      return filterFilteredData
    }

    if (enableAdvancedSearch) {
      return searchFilteredData
    }

    if (!debouncedSearchTerm) return data

    return data.filter((row) => {
      return columns.some((column) => {
        const value = column.key.includes('.')
          ? column.key.split('.').reduce((obj: any, key: string) => obj?.[key], row)
          : row[column.key]

        return String(value || '')
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())
      })
    })
  }, [data, debouncedSearchTerm, columns, enableAdvancedSearch, searchFilteredData, enableAdvancedFilter, filterFilteredData])

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = sortConfig.key.includes('.')
        ? sortConfig.key.split('.').reduce((obj: any, key: string) => obj?.[key], a)
        : a[sortConfig.key]
      const bValue = sortConfig.key.includes('.')
        ? sortConfig.key.split('.').reduce((obj: any, key: string) => obj?.[key], b)
        : b[sortConfig.key]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Handle sorting
  const handleSort = (key: string) => {
    if (!sortable) return

    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' }
        } else {
          return null // Remove sorting
        }
      }
      return { key, direction: 'asc' }
    })
  }

  // Handle row selection
  const handleRowSelection = (index: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows)
    if (checked) {
      newSelectedRows.add(index)
    } else {
      newSelectedRows.delete(index)
    }
    setSelectedRows(newSelectedRows)

    if (onSelectionChange) {
      const selectedData = Array.from(newSelectedRows).map(i => sortedData[i])
      onSelectionChange(selectedData)
    }
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(sortedData.map((_, index) => index))
      setSelectedRows(allIndices)
      if (onSelectionChange) {
        onSelectionChange(sortedData)
      }
    } else {
      setSelectedRows(new Set())
      if (onSelectionChange) {
        onSelectionChange([])
      }
    }
  }

  const isAllSelected = selectedRows.size === sortedData.length && sortedData.length > 0
  // const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sortedData.length

  // Generate pagination items
  const getPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(i)
    }

    return items
  }

  // Loading skeleton for table
  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: loadingRows }).map((_, index) => (
        <TableRow key={`loading-${index}`}>
          {selectable && (
            <TableCell>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </TableCell>
          )}
          {columns.map((_, colIndex) => (
            <TableCell key={`loading-${index}-${colIndex}`}>
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )

  // Loading skeleton for cards
  const LoadingCardsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: loadingRows }).map((_, index) => (
        <Card key={`loading-card-${index}`} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // Mobile card view component
  const MobileCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedData.map((row, index) => {
        const originalIndex = sortedData.indexOf(row)
        const isSelected = selectedRows.has(originalIndex)

        return (
          <Card
            key={index}
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              isSelected && "ring-2 ring-blue-500 bg-blue-50"
            )}
            onClick={() => onRowClick?.(row, index)}
          >
            <CardContent className="p-4 space-y-3">
              {selectable && (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleRowSelection(originalIndex, checked as boolean)}
                    aria-label={`Select item ${index + 1}`}
                  />
                </div>
              )}
              {columns.map((column) => {
                const value = column.key.includes('.')
                  ? String(column.key).split('.').reduce((obj: any, key: string) => obj?.[key], row)
                  : row[column.key]

                return (
                  <div key={String(column.key)} className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-gray-500">{column.label}</span>
                    <div className="text-sm text-gray-900">
                      {column.render ? (
                        column.render(value, row, index)
                      ) : enableAdvancedSearch && searchQuery ? (
                        <HighlightedText
                          text={String(value || '')}
                          highlight={searchQuery}
                        />
                      ) : (
                        String(value || '')
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const breakpointClass = {
    sm: 'sm',
    md: 'md',
    lg: 'lg'
  }[mobileBreakpoint]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {searchable && (
          <div className="flex-1 max-w-sm">
            {enableAdvancedSearch ? (
              <AdvancedSearch
                data={data}
                searchFields={finalSearchFields}
                onSearchResults={handleSearchResults}
                onSearchChange={handleSearchChange}
                placeholder={searchPlaceholder}
                enableHistory={true}
                enableSuggestions={true}
              />
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          {selectedRows.size > 0 && (
            <div className="text-sm text-gray-600">
              {selectedRows.size} of {sortedData.length} selected
            </div>
          )}

          {/* Advanced Filter */}
          {enableAdvancedFilter && (
            <AdvancedFilter
              fields={finalFilterFields}
              onFiltersChange={setFilterRules}
              onSortChange={setFilterSortConfig}
              enablePresets={true}
              enableMultiSort={true}
            />
          )}

          {/* Data Export */}
          {enableExport && (
            <DataExport
              data={filteredData}
              columns={finalExportColumns}
              filename={exportFilename}
              title={exportTitle}
              enableCustomReports={true}
              enableDateFilter={exportDateFields.length > 0}
              dateFields={exportDateFields}
            />
          )}

          {/* View Mode Toggle - Only show on mobile when mobileCardView is enabled */}
          {mobileCardView && (
            <div className={`flex items-center gap-1 ${breakpointClass}:hidden`}>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="p-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="p-2"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        mobileCardView && viewMode === 'cards' ? (
          <LoadingCardsSkeleton />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && <TableHead className="w-12" />}
                  {columns.map((column) => (
                    <TableHead key={String(column.key)}>
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <LoadingSkeleton />
              </TableBody>
            </Table>
          </div>
        )
      ) : paginatedData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          {mobileCardView && (
            <div className={`${breakpointClass}:hidden`}>
              {viewMode === 'cards' ? (
                <MobileCardView />
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectable && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all rows"
                            />
                          </TableHead>
                        )}
                        {columns.map((column) => (
                          <TableHead
                            key={String(column.key)}
                            className={cn(
                              column.headerClassName,
                              "whitespace-nowrap",
                              sortable && column.sortable !== false && "cursor-pointer hover:bg-gray-50 select-none"
                            )}
                            onClick={() => column.sortable !== false && handleSort(String(column.key))}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{column.label}</span>
                              {sortable && column.sortable !== false && (
                                <div className="flex flex-col">
                                  <ChevronUp
                                    className={cn(
                                      "h-3 w-3 -mb-1",
                                      sortConfig?.key === column.key && sortConfig.direction === 'asc'
                                        ? "text-gray-900"
                                        : "text-gray-400"
                                    )}
                                  />
                                  <ChevronDown
                                    className={cn(
                                      "h-3 w-3",
                                      sortConfig?.key === column.key && sortConfig.direction === 'desc'
                                        ? "text-gray-900"
                                        : "text-gray-400"
                                    )}
                                  />
                                </div>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row, index) => {
                        const originalIndex = sortedData.indexOf(row)
                        const isSelected = selectedRows.has(originalIndex)

                        return (
                          <TableRow
                            key={index}
                            className={cn(
                              onRowClick && "cursor-pointer hover:bg-gray-50",
                              isSelected && "bg-blue-50"
                            )}
                            onClick={() => onRowClick?.(row, index)}
                          >
                            {selectable && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleRowSelection(originalIndex, checked as boolean)}
                                  aria-label={`Select row ${index + 1}`}
                                />
                              </TableCell>
                            )}
                            {columns.map((column) => {
                              const value = column.key.includes('.')
                                ? String(column.key).split('.').reduce((obj: any, key: string) => obj?.[key], row)
                                : row[column.key]

                              return (
                                <TableCell key={String(column.key)} className={cn(column.className, "whitespace-nowrap")}>
                                  {column.render ? (
                                    column.render(value, row, index)
                                  ) : enableAdvancedSearch && searchQuery ? (
                                    <HighlightedText
                                      text={String(value || '')}
                                      highlight={searchQuery}
                                    />
                                  ) : (
                                    String(value || '')
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Desktop Table View */}
          <div className={mobileCardView ? `hidden ${breakpointClass}:block` : ''}>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectable && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                        />
                      </TableHead>
                    )}
                    {columns.map((column) => (
                      <TableHead
                        key={String(column.key)}
                        className={cn(
                          column.headerClassName,
                          sortable && column.sortable !== false && "cursor-pointer hover:bg-gray-50 select-none"
                        )}
                        onClick={() => column.sortable !== false && handleSort(String(column.key))}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.label}</span>
                          {sortable && column.sortable !== false && (
                            <div className="flex flex-col">
                              <ChevronUp
                                className={cn(
                                  "h-3 w-3 -mb-1",
                                  sortConfig?.key === column.key && sortConfig.direction === 'asc'
                                    ? "text-gray-900"
                                    : "text-gray-400"
                                )}
                              />
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3",
                                  sortConfig?.key === column.key && sortConfig.direction === 'desc'
                                    ? "text-gray-900"
                                    : "text-gray-400"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, index) => {
                    const originalIndex = sortedData.indexOf(row)
                    const isSelected = selectedRows.has(originalIndex)

                    return (
                      <TableRow
                        key={index}
                        className={cn(
                          onRowClick && "cursor-pointer hover:bg-gray-50",
                          isSelected && "bg-blue-50"
                        )}
                        onClick={() => onRowClick?.(row, index)}
                      >
                        {selectable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleRowSelection(originalIndex, checked as boolean)}
                              aria-label={`Select row ${index + 1}`}
                            />
                          </TableCell>
                        )}
                        {columns.map((column) => {
                          const value = column.key.includes('.')
                            ? String(column.key).split('.').reduce((obj: any, key: string) => obj?.[key], row)
                            : row[column.key]

                          return (
                            <TableCell key={String(column.key)} className={column.className}>
                              {column.render ? (
                                column.render(value, row, index)
                              ) : enableAdvancedSearch && searchQuery ? (
                                <HighlightedText
                                  text={String(value || '')}
                                  highlight={searchQuery}
                                />
                              ) : (
                                String(value || '')
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={cn(
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {getPaginationItems().map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={cn(
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}