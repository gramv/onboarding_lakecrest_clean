import * as React from "react"
import { Search, History, X, Clock, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface SearchResult<T> {
  item: T
  score: number
  matches: SearchMatch[]
}

export interface SearchMatch {
  field: string
  value: string
  indices: [number, number][]
}

export interface SearchSuggestion {
  text: string
  type: 'history' | 'suggestion' | 'trending'
  count?: number
  lastUsed?: Date
}

export interface AdvancedSearchProps<T> {
  data: T[]
  searchFields: SearchFieldConfig[]
  onSearchResults?: (results: SearchResult<T>[]) => void
  onSearchChange?: (query: string) => void
  placeholder?: string
  className?: string
  enableHistory?: boolean
  enableSuggestions?: boolean
  maxHistoryItems?: number
  maxSuggestions?: number
  debounceMs?: number
}

export interface SearchFieldConfig {
  key: string
  weight?: number
  searchable?: boolean
  highlightable?: boolean
  type?: 'text' | 'email' | 'number' | 'date'
}

// Search history storage key
const SEARCH_HISTORY_KEY = 'hr-dashboard-search-history'

export function AdvancedSearch<T extends Record<string, any>>({
  data,
  searchFields,
  onSearchResults,
  onSearchChange,
  placeholder = "Search...",
  className,
  enableHistory = true,
  enableSuggestions = true,
  maxHistoryItems = 10,
  maxSuggestions = 5,
  debounceMs = 300,
}: AdvancedSearchProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchHistory, setSearchHistory] = React.useState<SearchSuggestion[]>([])
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Load search history on mount
  React.useEffect(() => {
    if (enableHistory) {
      loadSearchHistory()
    }
  }, [enableHistory])

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, debounceMs])

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
    } else {
      onSearchResults?.([])
    }
    onSearchChange?.(debouncedQuery)
  }, [debouncedQuery, data])

  // Generate suggestions when query changes
  React.useEffect(() => {
    if (enableSuggestions && searchQuery) {
      generateSuggestions(searchQuery)
    }
  }, [searchQuery, enableSuggestions])

  const loadSearchHistory = () => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) {
        const history = JSON.parse(stored).map((item: any) => ({
          ...item,
          lastUsed: new Date(item.lastUsed)
        }))
        setSearchHistory(history)
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }

  const saveSearchHistory = (query: string) => {
    if (!enableHistory || !query.trim()) return

    try {
      const newItem: SearchSuggestion = {
        text: query.trim(),
        type: 'history',
        lastUsed: new Date(),
        count: 1
      }

      const updatedHistory = [
        newItem,
        ...searchHistory.filter(item => item.text !== query.trim())
      ].slice(0, maxHistoryItems)

      setSearchHistory(updatedHistory)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  }

  const generateSuggestions = (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    const queryLower = query.toLowerCase()
    const suggestionSet = new Set<string>()

    // Extract unique values from searchable fields
    data.forEach(item => {
      searchFields.forEach(field => {
        if (field.searchable !== false) {
          const value = getNestedValue(item, field.key)
          if (value && typeof value === 'string') {
            const words = value.toLowerCase().split(/\s+/)
            words.forEach(word => {
              if (word.includes(queryLower) && word !== queryLower && word.length > 2) {
                suggestionSet.add(word)
              }
            })
          }
        }
      })
    })

    const newSuggestions: SearchSuggestion[] = Array.from(suggestionSet)
      .slice(0, maxSuggestions)
      .map(text => ({
        text,
        type: 'suggestion' as const
      }))

    setSuggestions(newSuggestions)
  }

  const performSearch = (query: string) => {
    if (!query.trim()) {
      onSearchResults?.([])
      return
    }

    setIsSearching(true)
    
    try {
      const results = fuzzySearch(data, query, searchFields)
      onSearchResults?.(results)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query)
    setIsOpen(false)
    saveSearchHistory(query)
    inputRef.current?.focus()
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setDebouncedQuery("")
    onSearchResults?.([])
    onSearchChange?.("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      handleSearchSubmit(searchQuery)
    }
  }

  const combinedSuggestions = React.useMemo(() => {
    const all: SearchSuggestion[] = []
    
    if (searchQuery) {
      // Add matching history items
      const matchingHistory = searchHistory.filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
      all.push(...matchingHistory)
      
      // Add suggestions
      all.push(...suggestions.slice(0, maxSuggestions - matchingHistory.length))
    } else {
      // Show recent history when no query
      all.push(...searchHistory.slice(0, 5))
    }
    
    return all
  }, [searchQuery, searchHistory, suggestions, maxSuggestions])

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {isSearching && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandList>
              {combinedSuggestions.length === 0 ? (
                <CommandEmpty>
                  {searchQuery ? "No suggestions found" : "No search history"}
                </CommandEmpty>
              ) : (
                <>
                  {searchHistory.length > 0 && !searchQuery && (
                    <CommandGroup heading="Recent Searches">
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <CommandItem
                          key={`history-${index}`}
                          onSelect={() => handleSearchSubmit(item.text)}
                          className="flex items-center gap-2"
                        >
                          <History className="h-4 w-4 text-gray-400" />
                          <span className="flex-1">{item.text}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.count || 1}
                          </Badge>
                        </CommandItem>
                      ))}
                      <CommandItem
                        onSelect={clearSearchHistory}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear history
                      </CommandItem>
                    </CommandGroup>
                  )}
                  
                  {suggestions.length > 0 && searchQuery && (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((item, index) => (
                        <CommandItem
                          key={`suggestion-${index}`}
                          onSelect={() => handleSearchSubmit(item.text)}
                          className="flex items-center gap-2"
                        >
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="flex-1">{item.text}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {searchHistory.length > 0 && searchQuery && (
                    <CommandGroup heading="From History">
                      {searchHistory
                        .filter(item => item.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 3)
                        .map((item, index) => (
                          <CommandItem
                            key={`filtered-history-${index}`}
                            onSelect={() => handleSearchSubmit(item.text)}
                            className="flex items-center gap-2"
                          >
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="flex-1">{item.text}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Utility function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Fuzzy search implementation with scoring and highlighting
function fuzzySearch<T>(
  data: T[],
  query: string,
  fields: SearchFieldConfig[]
): SearchResult<T>[] {
  if (!query.trim()) return []

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0)

  const results: SearchResult<T>[] = []

  data.forEach(item => {
    let totalScore = 0
    const matches: SearchMatch[] = []

    fields.forEach(field => {
      if (field.searchable === false) return

      const value = getNestedValue(item, field.key)
      if (!value) return

      const stringValue = String(value).toLowerCase()
      const fieldWeight = field.weight || 1

      // Calculate field score
      let fieldScore = 0
      const fieldMatches: [number, number][] = []

      queryWords.forEach(word => {
        const index = stringValue.indexOf(word)
        if (index !== -1) {
          // Exact word match
          fieldScore += 10 * fieldWeight
          fieldMatches.push([index, index + word.length])
          
          // Bonus for start of string
          if (index === 0) {
            fieldScore += 5 * fieldWeight
          }
          
          // Bonus for start of word
          if (index === 0 || stringValue[index - 1] === ' ') {
            fieldScore += 3 * fieldWeight
          }
        } else {
          // Fuzzy matching for partial matches
          let partialScore = 0
          for (let i = 0; i < word.length; i++) {
            const char = word[i]
            const charIndex = stringValue.indexOf(char, i > 0 ? fieldMatches[fieldMatches.length - 1]?.[1] || 0 : 0)
            if (charIndex !== -1) {
              partialScore += 1
              if (fieldMatches.length === 0 || charIndex > fieldMatches[fieldMatches.length - 1][1]) {
                fieldMatches.push([charIndex, charIndex + 1])
              }
            }
          }
          fieldScore += (partialScore / word.length) * 2 * fieldWeight
        }
      })

      if (fieldScore > 0) {
        totalScore += fieldScore
        matches.push({
          field: field.key,
          value: String(value),
          indices: fieldMatches
        })
      }
    })

    if (totalScore > 0) {
      results.push({
        item,
        score: totalScore,
        matches
      })
    }
  })

  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score)
}

// Hook for using advanced search
export function useAdvancedSearch<T extends Record<string, any>>(
  data: T[],
  _searchFields: SearchFieldConfig[]
) {
  const [searchResults, setSearchResults] = React.useState<SearchResult<T>[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearchResults = React.useCallback((results: SearchResult<T>[]) => {
    setSearchResults(results)
    setIsSearching(false)
  }, [])

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(!!query)
  }, [])

  const filteredData = React.useMemo(() => {
    return searchQuery ? searchResults.map(result => result.item) : data
  }, [searchQuery, searchResults, data])

  const highlightText = React.useCallback((text: string, fieldKey: string) => {
    if (!searchQuery) return text

    const result = searchResults.find(r => 
      r.matches.some(m => m.field === fieldKey)
    )
    
    if (!result) return text

    const match = result.matches.find(m => m.field === fieldKey)
    if (!match || match.indices.length === 0) return text

    // Sort indices by start position
    const sortedIndices = [...match.indices].sort((a, b) => a[0] - b[0])
    
    let highlightedText = ""
    let lastIndex = 0

    sortedIndices.forEach(([start, end]) => {
      // Add text before highlight
      highlightedText += text.slice(lastIndex, start)
      // Add highlighted text
      highlightedText += `<mark class="bg-yellow-200 px-1 rounded">${text.slice(start, end)}</mark>`
      lastIndex = end
    })

    // Add remaining text
    highlightedText += text.slice(lastIndex)

    return highlightedText
  }, [searchQuery, searchResults])

  return {
    searchResults,
    searchQuery,
    isSearching,
    filteredData,
    handleSearchResults,
    handleSearchChange,
    highlightText
  }
}