import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  showColumnVisibility?: boolean
  showPagination?: boolean
  pageSize?: number
  className?: string
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  loading?: boolean
}

export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  showColumnVisibility = true,
  showPagination = true,
  pageSize = 10,
  className,
  onRowClick,
  emptyMessage = "No results found.",
  loading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  })

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-9"
          />
        </div>
        
        {showColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50 border-b">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      className="text-xs font-medium text-gray-700 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-600">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: table.getPageCount() }, (_, i) => i).map((page) => {
                const isCurrentPage = page === table.getState().pagination.pageIndex
                const showPage = 
                  page === 0 || 
                  page === table.getPageCount() - 1 ||
                  Math.abs(page - table.getState().pagination.pageIndex) <= 1
                
                if (!showPage && page !== 1 && page !== table.getPageCount() - 2) {
                  return null
                }
                
                if (
                  page === 1 && 
                  table.getState().pagination.pageIndex > 3
                ) {
                  return <span key={page} className="px-1 text-gray-400">...</span>
                }
                
                if (
                  page === table.getPageCount() - 2 && 
                  table.getState().pagination.pageIndex < table.getPageCount() - 4
                ) {
                  return <span key={page} className="px-1 text-gray-400">...</span>
                }
                
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => table.setPageIndex(page)}
                    className={cn(
                      "h-8 w-8 p-0",
                      isCurrentPage && "pointer-events-none"
                    )}
                  >
                    {page + 1}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Column helper for sortable headers
export function createSortableHeader<TData>(
  label: string,
  accessorKey: keyof TData
): ColumnDef<TData> {
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 p-0 font-medium hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {label}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      )
    },
  }
}

// Status badge helper
export function StatusBadge({ 
  status,
  variant
}: { 
  status: string
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}) {
  const variantMap: Record<string, typeof variant> = {
    'active': 'success',
    'completed': 'success',
    'pending': 'warning',
    'inactive': 'secondary',
    'error': 'destructive',
    'failed': 'destructive',
  }
  
  return (
    <Badge variant={variant || variantMap[status.toLowerCase()] || 'default'}>
      {status}
    </Badge>
  )
}