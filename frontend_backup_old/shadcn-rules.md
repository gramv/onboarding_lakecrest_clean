# Shadcn/UI Implementation Rules for Hotel Onboarding System

## Core Principle
When a task requires building or modifying user interface components, always use tools and patterns available in the shadcn/ui component library and MCP server whenever possible.

## Planning Rules

### 1. Component Discovery
- Always use `list_components` to see all available shadcn/ui components
- Use `list_blocks` to find pre-built UI patterns (dashboards, forms, data tables)
- Check component metadata for dependencies before implementation

### 2. Analysis Process
- Analyze user requirements and map them to available shadcn/ui components
- Prioritize using blocks for complex UI patterns (e.g., onboarding flows, dashboards)
- Consider component composition for custom needs

### 3. Component Selection Priority
1. **Blocks First**: Use pre-built blocks for entire sections (e.g., sidebar layouts, data tables with filters)
2. **Existing Components**: Use individual shadcn/ui components for specific needs
3. **Custom Extensions**: Extend shadcn/ui components only when necessary

## Implementation Rules

### 1. Component Usage
- Always call `get_component_demo` first to understand usage patterns
- Retrieve component source code with `get_component`
- Check component dependencies and ensure all are installed

### 2. Styling Guidelines
- Use Tailwind CSS utility classes as defined in shadcn/ui
- Maintain consistent spacing using our design system classes
- Follow the existing color scheme (hotel-primary, hotel-secondary, etc.)

### 3. Form Components
For government forms (I-9, W-4):
- Use `FormSection` component for logical groupings
- Implement `ValidationSummary` for error display
- Use `FieldValidation` for inline field errors
- Apply `ProgressBar` or `StepIndicator` for multi-step forms

### 4. Data Display
For manager/HR dashboards:
- Use `EnhancedDataTable` with sorting and filtering
- Implement `StatCard` for metrics display
- Use `Badge` components for status indicators
- Apply skeleton loaders during data fetching

### 5. Navigation & Progress
- Use `StepIndicator` for onboarding flow progress
- Implement breadcrumbs for navigation context
- Use `Tabs` with proper transitions for form sections

## Specific Component Mappings

### Onboarding Forms
- **Personal Info Step**: 
  - `FormSection` with collapsible sections
  - `Input`, `Select`, `DatePicker` for fields
  - `ValidationSummary` for errors

- **I-9 Form**:
  - `Tabs` for form sections
  - `StepIndicator` for Section 1, Documents, Review
  - `Alert` for compliance warnings
  - `PDFViewer` component for preview

- **W-4 Form**:
  - `RadioGroup` for filing status
  - `Checkbox` for multiple jobs
  - `Input` with number validation for amounts

### Manager Dashboard
- `EnhancedDataTable` for employee listings
- `StatCard` for metrics (pending, completed, etc.)
- `Badge` for status indicators
- `DropdownMenu` for bulk actions

### HR Dashboard
- `DataTable` with advanced filters
- `DateRangePicker` for report generation
- `Progress` bars for completion rates
- `Sheet` for employee detail views

## Best Practices

### 1. Accessibility
- Ensure all interactive elements have proper ARIA labels
- Maintain keyboard navigation support
- Use semantic HTML elements

### 2. Performance
- Lazy load heavy components (PDFViewer, DataTables)
- Use React.memo for expensive renders
- Implement virtual scrolling for long lists

### 3. Responsive Design
- Test all components on mobile, tablet, and desktop
- Use responsive variants (sm:, md:, lg:)
- Ensure touch-friendly interactions on mobile

### 4. Error Handling
- Always show loading states
- Provide clear error messages
- Implement retry mechanisms for failed operations

## Component Creation Workflow

1. **Identify Need**: Determine what UI element is required
2. **Search Existing**: Check shadcn/ui components and blocks
3. **Get Demo**: Retrieve usage examples
4. **Implement**: Add component with proper props and styling
5. **Test**: Verify functionality and accessibility
6. **Document**: Add comments for complex implementations

## Federal Compliance UI Requirements

### Visual Indicators
- Red asterisks (*) for required fields
- Warning icons for validation issues
- Success checkmarks for completed sections
- Info icons with tooltips for help text

### Form Layout
- Clear section headers with descriptions
- Logical grouping of related fields
- Progress indication for multi-step processes
- Save status indicators (auto-save notifications)

### Validation Display
- Real-time field validation
- Summary of all errors at form top
- Clear instructions for corrections
- Prevent submission with errors

## Integration with Existing System

### Maintain Consistency
- Use existing color variables (--hotel-primary, etc.)
- Follow established spacing patterns
- Match existing button styles and variants
- Keep consistent icon usage (Lucide React)

### Progressive Enhancement
- Start with core functionality
- Add animations and transitions gradually
- Implement advanced features (drag-drop, etc.) as enhancements
- Ensure graceful degradation

Remember: The goal is to create a professional, accessible, and compliant UI that enhances the user experience while maintaining consistency with the existing design system.