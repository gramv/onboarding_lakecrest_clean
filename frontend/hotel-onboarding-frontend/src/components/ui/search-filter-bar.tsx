import * as React from "react"
import { Search, Filter, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'text' | 'date' | 'multiselect'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface SearchFilterBarProps {
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  filters?: FilterOption[]
  filterValues?: Record<string, any>
  onFilterChange?: (key: string, value: any) => void
  onClearFilters?: () => void
  showFilterCount?: boolean
  className?: string
  searchClassName?: string
  filtersClassName?: string
}

export function SearchFilterBar({
  searchValue = "",
  searchPlaceholder = "Search...",
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  showFilterCount = true,
  className,
  searchClassName,
  filtersClassName,
}: SearchFilterBarProps) {
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue)
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && debouncedSearchValue !== searchValue) {
        onSearchChange(debouncedSearchValue)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [debouncedSearchValue, onSearchChange, searchValue])

  // Update local search value when prop changes
  React.useEffect(() => {
    setDebouncedSearchValue(searchValue)
  }, [searchValue])

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    return Object.entries(filterValues).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== undefined && value !== null && value !== ''
    }).length
  }, [filterValues])

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    onFilterChange?.(key, value)
  }

  // Handle clear all filters
  const handleClearFilters = () => {
    onClearFilters?.()
    setIsFilterOpen(false)
  }

  // Render filter input based on type
  const renderFilterInput = (filter: FilterOption) => {
    const value = filterValues[filter.key]

    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => handleFilterChange(filter.key, newValue === 'all' ? '' : newValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <Select
              onValueChange={(newValue) => {
                if (newValue && !selectedValues.includes(newValue)) {
                  handleFilterChange(filter.key, [...selectedValues, newValue])
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.filter(option => !selectedValues.includes(option.value)).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((selectedValue) => {
                  const option = filter.options?.find(opt => opt.value === selectedValue)
                  return (
                    <Badge
                      key={selectedValue}
                      variant="secondary"
                      className="text-xs"
                    >
                      {option?.label || selectedValue}
                      <button
                        onClick={() => {
                          handleFilterChange(
                            filter.key,
                            selectedValues.filter(v => v !== selectedValue)
                          )
                        }}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'text':
        return (
          <Input
            type="text"
            placeholder={filter.placeholder || `Enter ${filter.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            placeholder={filter.placeholder || `Select ${filter.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        )

      default:
        return null
    }
  }

  // Get active filter labels for display
  const getActiveFilterLabels = () => {
    return Object.entries(filterValues)
      .filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0
        }
        return value !== undefined && value !== null && value !== ''
      })
      .map(([key, value]) => {
        const filter = filters.find(f => f.key === key)
        if (!filter) return null

        if (Array.isArray(value)) {
          return `${filter.label}: ${value.length} selected`
        }

        if (filter.type === 'select') {
          const option = filter.options?.find(opt => opt.value === value)
          return `${filter.label}: ${option?.label || value}`
        }

        return `${filter.label}: ${value}`
      })
      .filter(Boolean)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Search Input */}
        <div className={cn("relative flex-1 sm:max-w-sm", searchClassName)}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={debouncedSearchValue}
            onChange={(e) => setDebouncedSearchValue(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filter Button */}
          {filters.length > 0 && (
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative flex-shrink-0">
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  {showFilterCount && activeFilterCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 sm:ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className={cn("space-y-3", filtersClassName)}>
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          {filter.label}
                        </label>
                        {renderFilterInput(filter)}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 flex-shrink-0">Active filters:</span>
          <div className="flex flex-wrap gap-1">
            {getActiveFilterLabels().map((label, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing search and filter state
export function useSearchFilter<T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[],
  filterConfig?: {
    [key: string]: (item: T, value: any) => boolean
  }
) {
  const [searchValue, setSearchValue] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, any>>({})

  // Filter data based on search and filters
  const filteredData = React.useMemo(() => {
    let result = data

    // Apply search filter
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase()
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field]
          return String(value || '').toLowerCase().includes(searchTerm)
        })
      )
    }

    // Apply custom filters
    if (filterConfig) {
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const filterFn = filterConfig[key]
          if (filterFn) {
            result = result.filter((item) => filterFn(item, value))
          }
        }
      })
    }

    return result
  }, [data, searchValue, filterValues, searchFields, filterConfig])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleClearFilters = () => {
    setSearchValue("")
    setFilterValues({})
  }

  return {
    searchValue,
    filterValues,
    filteredData,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
  }
}