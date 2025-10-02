/**
 * Enhanced Component Library - Main Export
 * Professional component system for the hotel management platform
 */

// ===== COMPONENT EXPORTS =====

// Card Components
export { Card, CardHeader, CardContent, CardFooter } from './Card'
export { default as CardCompound } from './Card'

// Button Components
export { Button, IconButton, ButtonGroup } from './Button'
export { default as ButtonDefault } from './Button'

// Input Components
export { Input, Textarea, InputGroup } from './Input'
export { default as InputDefault } from './Input'

// Layout Components
export { Container, Stack, Grid, Flex, Spacer, Divider } from './Layout'
export { default as ContainerDefault } from './Layout'

// Data Table Component
export { DataTable } from './DataTable'
export { default as DataTableDefault } from './DataTable'

// Metric Components
export { MetricCard, KPIWidget, TrendIndicator } from './MetricCard'
export { default as MetricCardDefault } from './MetricCard'

// State Components
export { LoadingStates, Skeleton, EmptyStates, ErrorBoundary } from './States'
export { default as LoadingStatesDefault } from './States'

// ===== TYPE EXPORTS =====

export type {
  // Base types
  BaseComponentProps,
  VariantProps,
  StateProps,
  ComponentSize,
  ComponentVariant,
  ComponentColor,
  ComponentRadius,
  ComponentShadow,
  ComponentSpacing,
  ResponsiveValue,
  ResponsiveProp,
  AnimationProps,
  AccessibilityProps,

  // Card types
  CardProps,
  CardHeaderProps,
  CardContentProps,
  CardFooterProps,

  // Button types
  ButtonProps,
  IconButtonProps,

  // Input types
  InputProps,
  TextareaProps,

  // Layout types
  ContainerProps,
  StackProps,
  GridProps,

  // Data Table types
  DataTableProps,
  ColumnDefinition,
  SortConfig,
  FilterConfig,
  PaginationConfig,
  SelectionConfig,
  BulkActionConfig,
  ExportConfig,

  // Metric types
  MetricCardProps,
  KPIWidgetProps,
  TrendData,
  KPIData,

  // State types
  LoadingStatesProps,
  SkeletonProps,
  EmptyStatesProps,
  ErrorBoundaryProps,
  ErrorFallbackProps,
} from './types'

// ===== COMPONENT COLLECTIONS =====

/**
 * Core UI Components
 * Essential components for building interfaces
 */
export const CoreComponents = {
  Button,
  IconButton,
  ButtonGroup,
  Input,
  Textarea,
  InputGroup,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} as const

/**
 * Layout Components
 * Components for structuring and organizing content
 */
export const LayoutComponents = {
  Container,
  Stack,
  Grid,
  Flex,
  Spacer,
  Divider,
} as const

/**
 * Data Components
 * Components for displaying and interacting with data
 */
export const DataComponents = {
  DataTable,
  MetricCard,
  KPIWidget,
  TrendIndicator,
} as const

/**
 * State Components
 * Components for handling different application states
 */
export const StateComponents = {
  LoadingStates,
  Skeleton,
  EmptyStates,
  ErrorBoundary,
} as const

/**
 * All Components
 * Complete collection of all available components
 */
export const AllComponents = {
  ...CoreComponents,
  ...LayoutComponents,
  ...DataComponents,
  ...StateComponents,
} as const

// ===== UTILITY FUNCTIONS =====

/**
 * Get component by name
 * @param name - Component name
 * @returns Component or undefined if not found
 */
export function getComponent(name: keyof typeof AllComponents) {
  return AllComponents[name]
}

/**
 * Get components by category
 * @param category - Component category
 * @returns Collection of components in the category
 */
export function getComponentsByCategory(
  category: 'core' | 'layout' | 'data' | 'state'
) {
  switch (category) {
    case 'core':
      return CoreComponents
    case 'layout':
      return LayoutComponents
    case 'data':
      return DataComponents
    case 'state':
      return StateComponents
    default:
      return {}
  }
}

/**
 * List all available components
 * @returns Array of component names
 */
export function listComponents(): (keyof typeof AllComponents)[] {
  return Object.keys(AllComponents) as (keyof typeof AllComponents)[]
}

/**
 * Check if component exists
 * @param name - Component name
 * @returns True if component exists
 */
export function hasComponent(name: string): name is keyof typeof AllComponents {
  return name in AllComponents
}

// ===== COMPONENT METADATA =====

export const COMPONENT_METADATA = {
  version: '1.0.0',
  totalComponents: Object.keys(AllComponents).length,
  categories: {
    core: Object.keys(CoreComponents).length,
    layout: Object.keys(LayoutComponents).length,
    data: Object.keys(DataComponents).length,
    state: Object.keys(StateComponents).length,
  },
  lastUpdated: new Date().toISOString(),
} as const

// ===== DEFAULT EXPORT =====

/**
 * Default export containing all components and utilities
 */
export default {
  // Components
  ...AllComponents,
  
  // Collections
  CoreComponents,
  LayoutComponents,
  DataComponents,
  StateComponents,
  AllComponents,
  
  // Utilities
  getComponent,
  getComponentsByCategory,
  listComponents,
  hasComponent,
  
  // Metadata
  COMPONENT_METADATA,
} as const

// ===== RE-EXPORTS FOR CONVENIENCE =====

// Re-export commonly used components for easier imports
export {
  Button as Btn,
  Input as TextInput,
  Card as Panel,
  Container as Wrapper,
  Stack as VStack, // Vertical stack by default
  LoadingStates as Loader,
  EmptyStates as EmptyState,
}

// Create horizontal stack alias
export const HStack = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Stack>>((props, ref) => 
  React.createElement(Stack, { ...props, direction: "row", ref })
)

// Create centered container alias
export const CenteredContainer = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Container>>((props, ref) => 
  React.createElement(Container, { ...props, center: true, ref })
)

// Create responsive grid alias
export const ResponsiveGrid = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Grid>>((props, ref) => 
  React.createElement(Grid, { ...props, columns: "responsive", ref })
)