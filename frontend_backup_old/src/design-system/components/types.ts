/**
 * Enhanced Component Library Types
 * TypeScript interfaces for the professional component system
 */

import React from 'react'

// ===== BASE COMPONENT TYPES =====

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  'data-testid'?: string
}

export interface VariantProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface StateProps {
  loading?: boolean
  disabled?: boolean
  error?: boolean
  success?: boolean
}

// ===== ENHANCED CARD COMPONENT =====

export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  hover?: boolean
  focus?: boolean
}

export interface CardHeaderProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  avatar?: React.ReactNode
  badge?: React.ReactNode
}

export interface CardContentProps extends BaseComponentProps {
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export interface CardFooterProps extends BaseComponentProps {
  justify?: 'start' | 'center' | 'end' | 'between'
  actions?: React.ReactNode
}

// ===== ENHANCED BUTTON COMPONENT =====

export interface ButtonProps extends BaseComponentProps, VariantProps, StateProps {
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  iconOnly?: boolean
  href?: string
  target?: string
  rel?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void
}

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode
  'aria-label': string
  tooltip?: string
}

// ===== ENHANCED INPUT COMPONENT =====

export interface InputProps extends BaseComponentProps, StateProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
  placeholder?: string
  value?: string
  defaultValue?: string
  required?: boolean
  readOnly?: boolean
  autoComplete?: string
  autoFocus?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
  helperText?: string
  errorMessage?: string
  successMessage?: string
  label?: string
  labelRequired?: boolean
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export interface TextareaProps extends Omit<InputProps, 'type' | 'leftIcon' | 'rightIcon' | 'leftAddon' | 'rightAddon'> {
  rows?: number
  cols?: number
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// ===== ENHANCED LAYOUT COMPONENTS =====

export interface ContainerProps extends BaseComponentProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  center?: boolean
  fluid?: boolean
}

export interface StackProps extends BaseComponentProps {
  direction?: 'row' | 'column'
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  divider?: React.ReactNode
}

export interface GridProps extends BaseComponentProps {
  columns?: number | 'auto' | 'responsive'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  rows?: number | 'auto'
  autoFit?: boolean
  minItemWidth?: string
}

// ===== ADVANCED DATA TABLE COMPONENT =====

export interface ColumnDefinition<T = any> {
  key: string
  title: string
  dataIndex?: keyof T
  width?: number | string
  minWidth?: number
  maxWidth?: number
  fixed?: 'left' | 'right'
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  renderHeader?: () => React.ReactNode
  align?: 'left' | 'center' | 'right'
  ellipsis?: boolean
  copyable?: boolean
  editable?: boolean
  required?: boolean
  validator?: (value: any) => string | null
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  key: string
  value: any
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith'
}

export interface PaginationConfig {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean
  pageSizeOptions?: number[]
}

export interface SelectionConfig<T = any> {
  type: 'checkbox' | 'radio'
  selectedRowKeys: React.Key[]
  onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
  getCheckboxProps?: (record: T) => { disabled?: boolean }
  fixed?: boolean
  columnWidth?: number
}

export interface BulkActionConfig {
  key: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  confirm?: {
    title: string
    description?: string
    okText?: string
    cancelText?: string
  }
}

export interface ExportConfig {
  formats: ('csv' | 'excel' | 'pdf' | 'json')[]
  filename?: string
  includeHeaders?: boolean
  selectedOnly?: boolean
}

export interface DataTableProps<T = any> extends BaseComponentProps {
  data: T[]
  columns: ColumnDefinition<T>[]
  loading?: boolean
  empty?: React.ReactNode
  error?: string | React.ReactNode
  
  // Pagination
  pagination?: PaginationConfig | false
  onPaginationChange?: (page: number, pageSize: number) => void
  
  // Sorting
  sortable?: boolean
  defaultSort?: SortConfig
  onSortChange?: (sort: SortConfig | null) => void
  
  // Filtering
  filterable?: boolean
  filters?: FilterConfig[]
  onFiltersChange?: (filters: FilterConfig[]) => void
  
  // Selection
  selection?: SelectionConfig<T>
  
  // Bulk Actions
  bulkActions?: BulkActionConfig[]
  onBulkAction?: (action: string, selectedRows: T[]) => void
  
  // Export
  exportConfig?: ExportConfig
  onExport?: (format: string, data: T[]) => void
  
  // Virtual Scrolling
  virtualScrolling?: boolean
  itemHeight?: number
  overscan?: number
  
  // Row Props
  rowKey?: string | ((record: T) => React.Key)
  onRowClick?: (record: T, index: number) => void
  onRowDoubleClick?: (record: T, index: number) => void
  rowClassName?: string | ((record: T, index: number) => string)
  
  // Table Props
  size?: 'sm' | 'md' | 'lg'
  bordered?: boolean
  striped?: boolean
  hover?: boolean
  sticky?: boolean
  resizable?: boolean
  
  // Search
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (value: string) => void
}

// ===== METRIC CARD COMPONENT =====

export interface TrendData {
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  period: string
}

export interface MetricCardProps extends BaseComponentProps {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  trend?: TrendData
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  interactive?: boolean
  onClick?: () => void
  actions?: React.ReactNode
  footer?: React.ReactNode
}

// ===== KPI WIDGET COMPONENT =====

export interface KPIData {
  current: number
  target?: number
  previous?: number
  benchmark?: number
}

export interface KPIWidgetProps extends BaseComponentProps {
  title: string
  data: KPIData
  unit?: string
  format?: 'number' | 'currency' | 'percentage'
  precision?: number
  trend?: TrendData
  chart?: {
    type: 'line' | 'bar' | 'area' | 'donut'
    data: any[]
    height?: number
  }
  status?: 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  error?: string
  actions?: React.ReactNode
  onClick?: () => void
}

// ===== LOADING STATES COMPONENT =====

export interface LoadingStatesProps extends BaseComponentProps {
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'dots' | 'bars'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'neutral'
  text?: string
  overlay?: boolean
  fullScreen?: boolean
  delay?: number
}

export interface SkeletonProps extends BaseComponentProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded'
  width?: number | string
  height?: number | string
  lines?: number
  animation?: 'pulse' | 'wave' | 'none'
}

// ===== EMPTY STATES COMPONENT =====

export interface EmptyStatesProps extends BaseComponentProps {
  variant?: 'default' | 'search' | 'error' | 'maintenance' | 'permission'
  title: string
  description?: string
  icon?: React.ReactNode
  image?: string
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

// ===== ERROR BOUNDARY COMPONENT =====

export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

export interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  hasError: boolean
}

// ===== UTILITY TYPES =====

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'filled'
export type ComponentColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type ComponentRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
export type ComponentShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type ComponentSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// ===== RESPONSIVE PROPS =====

export interface ResponsiveValue<T> {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

export type ResponsiveProp<T> = T | ResponsiveValue<T>

// ===== ANIMATION PROPS =====

export interface AnimationProps {
  animate?: boolean
  duration?: 'fast' | 'normal' | 'slow'
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  delay?: number
  enter?: string
  exit?: string
}

// ===== ACCESSIBILITY PROPS =====

export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  'aria-required'?: boolean
  'aria-invalid'?: boolean
  role?: string
  tabIndex?: number
}