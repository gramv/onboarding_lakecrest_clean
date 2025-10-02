import * as React from "react"
import { Filter, X, Save, Settings, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

export interface FilterRule {
  id: string
  field: string
  operator: FilterOperator
  value: any
  type: FilterType
}

export interface FilterPreset {
  id: string
  name: string
  rules: FilterRule[]
  sortConfig?: SortConfig[]
  isDefault?: boolean
  createdAt: Date
  lastUsed?: Date
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface FilterFieldConfig {
  key: string
  label: string
  type: FilterType
  options?: { value: string; label: string }[]
  operators?: FilterOperator[]
}

export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with'
  | 'greater_than' 
  | 'less_than' 
  | 'greater_equal' 
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'

export interface AdvancedFilterProps {
  fields: FilterFieldConfig[]
  onFiltersChange?: (rules: FilterRule[]) => void
  onSortChange?: (sortConfig: SortConfig[]) => void
  onPresetSave?: (preset: Omit<FilterPreset, 'id' | 'createdAt'>) => void
  onPresetLoad?: (preset: FilterPreset) => void
  presets?: FilterPreset[]
  className?: string
  enablePresets?: boolean
  enableMultiSort?: boolean
  maxRules?: number
}

const FILTER_OPERATORS: Record<FilterType, FilterOperator[]> = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_empty', 'is_not_empty'],
  date: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_empty', 'is_not_empty'],
  select: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
  multiselect: ['in', 'not_in', 'is_empty', 'is_not_empty'],
  boolean: ['equals', 'not_equals']
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  not_contains: 'Does not contain',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  greater_than: 'Greater than',
  less_than: 'Less than',
  greater_equal: 'Greater than or equal',
  less_equal: 'Less than or equal',
  between: 'Between',
  in: 'In',
  not_in: 'Not in',
  is_empty: 'Is empty',
  is_not_empty: 'Is not empty'
}

// Storage keys
const FILTER_PRESETS_KEY = 'hr-dashboard-filter-presets'
const LAST_FILTER_STATE_KEY = 'hr-dashboard-last-filter-state'

export function AdvancedFilter({
  fields,
  onFiltersChange,
  onSortChange,
  onPresetSave,
  onPresetLoad,
  presets: externalPresets,
  className,
  enablePresets = true,
  enableMultiSort = true,
  maxRules = 10
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [rules, setRules] = React.useState<FilterRule[]>([])
  const [sortConfig, setSortConfig] = React.useState<SortConfig[]>([])
  const [presets, setPresets] = React.useState<FilterPreset[]>([])
  const [isPresetDialogOpen, setIsPresetDialogOpen] = React.useState(false)
  const [presetName, setPresetName] = React.useState("")
  const [activePreset, setActivePreset] = React.useState<string | null>(null)

  // Load presets and last state on mount
  React.useEffect(() => {
    if (enablePresets) {
      loadPresets()
      loadLastState()
    }
  }, [enablePresets])

  // Use external presets if provided
  React.useEffect(() => {
    if (externalPresets) {
      setPresets(externalPresets)
    }
  }, [externalPresets])

  // Save state when rules or sort config changes
  React.useEffect(() => {
    if (enablePresets) {
      saveLastState()
    }
    onFiltersChange?.(rules)
  }, [rules, enablePresets, onFiltersChange])

  React.useEffect(() => {
    if (enablePresets) {
      saveLastState()
    }
    onSortChange?.(sortConfig)
  }, [sortConfig, enablePresets, onSortChange])

  const loadPresets = () => {
    try {
      const stored = localStorage.getItem(FILTER_PRESETS_KEY)
      if (stored) {
        const parsedPresets = JSON.parse(stored).map((preset: any) => ({
          ...preset,
          createdAt: new Date(preset.createdAt),
          lastUsed: preset.lastUsed ? new Date(preset.lastUsed) : undefined
        }))
        setPresets(parsedPresets)
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error)
    }
  }

  const savePresets = (newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(newPresets))
      setPresets(newPresets)
    } catch (error) {
      console.error('Failed to save filter presets:', error)
    }
  }

  const loadLastState = () => {
    try {
      const stored = localStorage.getItem(LAST_FILTER_STATE_KEY)
      if (stored) {
        const state = JSON.parse(stored)
        if (state.rules) setRules(state.rules)
        if (state.sortConfig) setSortConfig(state.sortConfig)
      }
    } catch (error) {
      console.error('Failed to load last filter state:', error)
    }
  }

  const saveLastState = () => {
    try {
      const state = { rules, sortConfig }
      localStorage.setItem(LAST_FILTER_STATE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save filter state:', error)
    }
  }

  const addRule = () => {
    if (rules.length >= maxRules) return

    const newRule: FilterRule = {
      id: `rule-${Date.now()}`,
      field: fields[0]?.key || '',
      operator: 'equals',
      value: '',
      type: fields[0]?.type || 'text'
    }
    setRules([...rules, newRule])
    setActivePreset(null)
  }

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ))
    setActivePreset(null)
  }

  const removeRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id))
    setActivePreset(null)
  }

  const clearAllRules = () => {
    setRules([])
    setSortConfig([])
    setActivePreset(null)
  }

  const addSortField = () => {
    const usedFields = sortConfig.map(s => s.field)
    const availableField = fields.find(f => !usedFields.includes(f.key))
    
    if (availableField) {
      const newSort: SortConfig = {
        field: availableField.key,
        direction: 'asc',
        priority: sortConfig.length
      }
      setSortConfig([...sortConfig, newSort])
    }
  }

  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    setSortConfig(sortConfig.map((sort, i) => 
      i === index ? { ...sort, ...updates } : sort
    ))
  }

  const removeSort = (index: number) => {
    setSortConfig(sortConfig.filter((_, i) => i !== index).map((sort, i) => ({
      ...sort,
      priority: i
    })))
  }

  const moveSortUp = (index: number) => {
    if (index === 0) return
    const newConfig = [...sortConfig]
    ;[newConfig[index - 1], newConfig[index]] = [newConfig[index], newConfig[index - 1]]
    newConfig.forEach((sort, i) => sort.priority = i)
    setSortConfig(newConfig)
  }

  const moveSortDown = (index: number) => {
    if (index === sortConfig.length - 1) return
    const newConfig = [...sortConfig]
    ;[newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]]
    newConfig.forEach((sort, i) => sort.priority = i)
    setSortConfig(newConfig)
  }

  const savePreset = () => {
    if (!presetName.trim()) return

    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      rules: [...rules],
      sortConfig: [...sortConfig],
      createdAt: new Date()
    }

    const updatedPresets = [...presets, newPreset]
    savePresets(updatedPresets)
    onPresetSave?.(newPreset)
    
    setPresetName("")
    setIsPresetDialogOpen(false)
    setActivePreset(newPreset.id)
  }

  const loadPreset = (preset: FilterPreset) => {
    setRules([...preset.rules])
    setSortConfig([...(preset.sortConfig || [])])
    setActivePreset(preset.id)
    setIsOpen(false)

    // Update last used
    const updatedPreset = { ...preset, lastUsed: new Date() }
    const updatedPresets = presets.map(p => p.id === preset.id ? updatedPreset : p)
    savePresets(updatedPresets)
    onPresetLoad?.(updatedPreset)
  }

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId)
    savePresets(updatedPresets)
    if (activePreset === presetId) {
      setActivePreset(null)
    }
  }

  const getFieldConfig = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)
  }

  const getAvailableOperators = (fieldKey: string) => {
    const field = getFieldConfig(fieldKey)
    if (!field) return []
    
    return field.operators || FILTER_OPERATORS[field.type] || []
  }

  const renderRuleValue = (rule: FilterRule) => {
    const field = getFieldConfig(rule.field)
    if (!field) return null

    if (['is_empty', 'is_not_empty'].includes(rule.operator)) {
      return null
    }

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder="Enter value..."
            value={rule.value || ''}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            className="w-full"
          />
        )

      case 'number':
        if (rule.operator === 'between') {
          const [min, max] = Array.isArray(rule.value) ? rule.value : ['', '']
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={min}
                onChange={(e) => updateRule(rule.id, { value: [e.target.value, max] })}
                className="w-20"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={max}
                onChange={(e) => updateRule(rule.id, { value: [min, e.target.value] })}
                className="w-20"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            placeholder="Enter number..."
            value={rule.value || ''}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            className="w-full"
          />
        )

      case 'date':
        if (rule.operator === 'between') {
          const [start, end] = Array.isArray(rule.value) ? rule.value : ['', '']
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={start}
                onChange={(e) => updateRule(rule.id, { value: [e.target.value, end] })}
                className="w-36"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="date"
                value={end}
                onChange={(e) => updateRule(rule.id, { value: [start, e.target.value] })}
                className="w-36"
              />
            </div>
          )
        }
        return (
          <Input
            type="date"
            value={rule.value || ''}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            className="w-full"
          />
        )

      case 'select':
        if (['in', 'not_in'].includes(rule.operator)) {
          const selectedValues = Array.isArray(rule.value) ? rule.value : []
          return (
            <div className="space-y-2">
              <Select
                onValueChange={(value) => {
                  if (!selectedValues.includes(value)) {
                    updateRule(rule.id, { value: [...selectedValues, value] })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select values..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.filter(opt => !selectedValues.includes(opt.value)).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map(value => {
                    const option = field.options?.find(opt => opt.value === value)
                    return (
                      <Badge key={value} variant="secondary" className="text-xs">
                        {option?.label || value}
                        <button
                          onClick={() => updateRule(rule.id, { 
                            value: selectedValues.filter(v => v !== value) 
                          })}
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
        }
        return (
          <Select
            value={rule.value || ''}
            onValueChange={(value) => updateRule(rule.id, { value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return (
          <Select
            value={rule.value?.toString() || ''}
            onValueChange={(value) => updateRule(rule.id, { value: value === 'true' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  const activeRulesCount = rules.filter(rule => rule.value !== '' && rule.value !== null && rule.value !== undefined).length
  const activeSortCount = sortConfig.length

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {(activeRulesCount > 0 || activeSortCount > 0) && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {activeRulesCount + activeSortCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
              <div className="flex items-center gap-2">
                {enablePresets && (
                  <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Save className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Filter Preset</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="preset-name">Preset Name</Label>
                          <Input
                            id="preset-name"
                            placeholder="Enter preset name..."
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsPresetDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={savePreset}
                            disabled={!presetName.trim()}
                          >
                            Save Preset
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllRules}
                  disabled={rules.length === 0 && sortConfig.length === 0}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Presets */}
            {enablePresets && presets.length > 0 && (
              <div className="p-4 border-b">
                <Label className="text-sm font-medium mb-2 block">Saved Presets</Label>
                <div className="space-y-1">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between">
                      <Button
                        variant={activePreset === preset.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => loadPreset(preset)}
                        className="flex-1 justify-start"
                      >
                        {preset.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 h-6 w-6"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Rules */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Filter Rules</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRule}
                  disabled={rules.length >= maxRules}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={rule.field}
                        onValueChange={(field) => {
                          const fieldConfig = getFieldConfig(field)
                          updateRule(rule.id, { 
                            field, 
                            type: fieldConfig?.type || 'text',
                            operator: 'equals',
                            value: ''
                          })
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={rule.operator}
                        onValueChange={(operator) => updateRule(rule.id, { 
                          operator: operator as FilterOperator,
                          value: ['between', 'in', 'not_in'].includes(operator) ? [] : ''
                        })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableOperators(rule.field).map(operator => (
                            <SelectItem key={operator} value={operator}>
                              {OPERATOR_LABELS[operator]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(rule.id)}
                        className="p-1 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {renderRuleValue(rule)}
                  </div>
                ))}

                {rules.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No filter rules. Click "Add Rule" to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Sorting */}
            {enableMultiSort && (
              <>
                <Separator />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Sorting</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addSortField}
                      disabled={sortConfig.length >= fields.length}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Sort
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {sortConfig.map((sort, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSortUp(index)}
                            disabled={index === 0}
                            className="p-1 h-6 w-6"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSortDown(index)}
                            disabled={index === sortConfig.length - 1}
                            className="p-1 h-6 w-6"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <Select
                          value={sort.field}
                          onValueChange={(field) => updateSort(index, { field })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={sort.direction}
                          onValueChange={(direction) => updateSort(index, { direction: direction as 'asc' | 'desc' })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Asc</SelectItem>
                            <SelectItem value="desc">Desc</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSort(index)}
                          className="p-1 h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {sortConfig.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No sorting applied. Click "Add Sort" to sort data.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Hook for using advanced filtering
export function useAdvancedFilter<T extends Record<string, any>>(
  data: T[],
  fields: FilterFieldConfig[]
) {
  const [rules, setRules] = React.useState<FilterRule[]>([])
  const [sortConfig, setSortConfig] = React.useState<SortConfig[]>([])

  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply filter rules
    rules.forEach(rule => {
      if (!rule.value && !['is_empty', 'is_not_empty'].includes(rule.operator)) {
        return
      }

      result = result.filter(item => {
        const fieldValue = getNestedValue(item, rule.field)
        return applyFilterRule(fieldValue, rule)
      })
    })

    // Apply sorting
    if (sortConfig.length > 0) {
      result.sort((a, b) => {
        for (const sort of sortConfig) {
          const aValue = getNestedValue(a, sort.field)
          const bValue = getNestedValue(b, sort.field)
          
          const comparison = compareValues(aValue, bValue)
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison
          }
        }
        return 0
      })
    }

    return result
  }, [data, rules, sortConfig])

  return {
    filteredData,
    rules,
    sortConfig,
    setRules,
    setSortConfig
  }
}

// Utility functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function applyFilterRule(value: any, rule: FilterRule): boolean {
  const { operator, value: ruleValue } = rule

  switch (operator) {
    case 'equals':
      return value === ruleValue
    case 'not_equals':
      return value !== ruleValue
    case 'contains':
      return String(value || '').toLowerCase().includes(String(ruleValue || '').toLowerCase())
    case 'not_contains':
      return !String(value || '').toLowerCase().includes(String(ruleValue || '').toLowerCase())
    case 'starts_with':
      return String(value || '').toLowerCase().startsWith(String(ruleValue || '').toLowerCase())
    case 'ends_with':
      return String(value || '').toLowerCase().endsWith(String(ruleValue || '').toLowerCase())
    case 'greater_than':
      return Number(value) > Number(ruleValue)
    case 'less_than':
      return Number(value) < Number(ruleValue)
    case 'greater_equal':
      return Number(value) >= Number(ruleValue)
    case 'less_equal':
      return Number(value) <= Number(ruleValue)
    case 'between':
      if (Array.isArray(ruleValue) && ruleValue.length === 2) {
        const [min, max] = ruleValue
        return Number(value) >= Number(min) && Number(value) <= Number(max)
      }
      return false
    case 'in':
      return Array.isArray(ruleValue) ? ruleValue.includes(value) : false
    case 'not_in':
      return Array.isArray(ruleValue) ? !ruleValue.includes(value) : true
    case 'is_empty':
      return value === null || value === undefined || value === ''
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== ''
    default:
      return true
  }
}

function compareValues(a: any, b: any): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1
  if (b === null || b === undefined) return 1
  
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
  
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  
  return String(a).localeCompare(String(b))
}