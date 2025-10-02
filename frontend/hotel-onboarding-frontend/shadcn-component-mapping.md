# Shadcn/UI Component Mapping - Hotel Onboarding System

## Page-by-Page Component Mapping

### 1. Employee Onboarding Portal

#### Onboarding Layout
- **Layout**: `SidebarProvider` + `Sidebar` (for navigation)
- **Progress**: `StepIndicator` (horizontal, size="lg")
- **Navigation**: `Breadcrumb` for current location
- **Container**: `Card` with `CardHeader` and `CardContent`

#### Personal Information Step
```typescript
Components:
- Tabs (for Personal Info / Emergency Contacts)
- FormSection (collapsible sections)
- Input (text fields)
- Select (dropdowns for state, gender)
- DatePicker (date of birth)
- Label (field labels)
- FieldValidation (inline errors)
- ValidationSummary (top of form)
- Button (Continue/Save)
- Badge (required field indicators)
```

#### I-9 Form Step
```typescript
Components:
- StepIndicator (vertical for sub-steps)
- Tabs (Section 1, Documents, Review & Sign, Preview)
- FormSection (for each part of form)
- RadioGroup + RadioGroupItem (citizenship status)
- Input (various fields)
- Alert (SSN mismatch warnings)
- FileUpload (custom using Button + Input)
- DigitalSignatureCapture (custom component)
- PDFViewer (custom component)
- Badge (document status)
- ProgressBar (section completion)
```

#### W-4 Form Step
```typescript
Components:
- Accordion (for optional sections)
- RadioGroup (filing status)
- Checkbox (multiple jobs)
- Input (with number formatting)
- FormSection (Step 1-5 organization)
- Tooltip (help text for fields)
- Calculator (custom card component)
- ValidationSummary
```

#### Direct Deposit Step
```typescript
Components:
- Card (main container)
- FormSection (account information)
- RadioGroup (account type)
- Input (with masking for account numbers)
- FileUpload (voided check)
- Alert (security notice)
- Switch (percentage vs amount toggle)
```

#### Health Insurance Step
```typescript
Components:
- Tabs (Plans, Coverage, Dependents, Beneficiaries)
- Card (plan option cards)
- RadioGroup (coverage level)
- DataTable (dependent listing)
- Dialog (add dependent modal)
- Badge (plan features)
- Button (compare plans)
- Collapsible (plan details)
```

### 2. Manager Dashboard

#### Dashboard Overview
```typescript
Components:
- NavigationMenu (top nav)
- Avatar + DropdownMenu (user menu)
- StatCard (custom metrics cards)
- Tabs (filter by status)
- EnhancedDataTable (employee list)
- Badge (status indicators)
- Button (actions)
- Sheet (employee quick view)
- SearchBar (custom with Input + Search icon)
```

#### Employee Detail View
```typescript
Components:
- Sheet or Dialog (detail container)
- Tabs (Overview, Documents, Timeline, Actions)
- Timeline (custom component)
- Card (information sections)
- Badge (document status)
- Button (approve/reject actions)
- Textarea (comments)
- Alert (compliance warnings)
```

#### I-9 Section 2 Review
```typescript
Components:
- Card (main container)
- FormSection (document verification)
- Select (document types)
- DatePicker (verification date)
- Input (document numbers)
- Checkbox (verification confirmation)
- DigitalSignatureCapture
- ValidationSummary
```

### 3. HR Admin Dashboard

#### Main Dashboard
```typescript
Components:
- Sidebar (navigation)
- CommandMenu (global search - Cmd+K)
- DateRangePicker (reporting period)
- StatCard with Chart integration
- Tabs (view filters)
- EnhancedDataTable (advanced features)
- DropdownMenu (bulk actions)
- Dialog (export options)
- ProgressBar (completion metrics)
```

#### Compliance Center
```typescript
Components:
- Alert (deadline warnings)
- DataTable (compliance tracking)
- Badge (compliance status)
- Timeline (audit trail)
- Card (regulation summaries)
- Accordion (FAQ sections)
- Button (generate reports)
```

#### Settings & Configuration
```typescript
Components:
- Tabs (different settings sections)
- Switch (feature toggles)
- Input (configuration values)
- Select (property selection)
- Slider (threshold settings)
- ColorPicker (custom branding)
- Toast (save confirmations)
```

## Shared Components Across All Views

### Navigation Components
```typescript
- NavigationMenu (main nav)
- Breadcrumb (location indicator)
- Tabs (section navigation)
- Sidebar (app navigation)
```

### Form Components
```typescript
- Form (wrapper)
- FormField
- FormItem
- FormLabel
- FormControl
- FormDescription
- FormMessage
- Input (all variants)
- Select
- Checkbox
- RadioGroup
- Switch
- Textarea
- DatePicker
- TimePicker
```

### Feedback Components
```typescript
- Alert (warnings, info)
- Toast (notifications)
- ProgressBar (loading)
- Skeleton (loading states)
- Badge (status)
- Tooltip (help text)
```

### Data Display
```typescript
- Card (containers)
- Table (basic tables)
- EnhancedDataTable (advanced)
- Avatar (user images)
- Badge (status/labels)
- Separator (dividers)
```

### Interaction Components
```typescript
- Button (all variants)
- DropdownMenu
- ContextMenu
- Dialog (modals)
- Sheet (slide-overs)
- Popover
- Tooltip
- Command (search palette)
```

## Custom Components Needed

### High Priority
1. **StatCard** - Metrics display with trends
2. **Timeline** - Visual progress indicator
3. **FileUpload** - Drag & drop file handler
4. **DigitalSignatureCapture** - Signature pad
5. **PDFViewer** - Document preview

### Medium Priority
1. **EmployeeCard** - Quick info display
2. **ComplianceIndicator** - Federal deadline tracking
3. **ProgressRing** - Circular progress
4. **DateRangePicker** - Report filtering
5. **SearchBar** - Enhanced search with filters

### Low Priority
1. **OnboardingWizard** - Step-by-step guide
2. **MetricChart** - Mini chart for StatCard
3. **NotificationBell** - Alert indicator
4. **LanguageToggle** - EN/ES switcher
5. **ThemeToggle** - Light/dark mode

## Implementation Notes

### Component Composition
- Prefer composition over inheritance
- Use compound components for complex UI
- Maintain consistent prop interfaces
- Document all custom props

### Styling Approach
- Use Tailwind utilities from shadcn/ui
- Extend with custom CSS variables
- Maintain consistent spacing scale
- Follow shadcn/ui naming conventions

### Accessibility Requirements
- All interactive elements keyboard accessible
- Proper ARIA labels and roles
- Focus management in modals/sheets
- Screen reader announcements
- Color contrast compliance

### Performance Considerations
- Lazy load heavy components
- Use React.memo for expensive renders
- Implement virtual scrolling for long lists
- Optimize bundle size with tree shaking
- Code split by route