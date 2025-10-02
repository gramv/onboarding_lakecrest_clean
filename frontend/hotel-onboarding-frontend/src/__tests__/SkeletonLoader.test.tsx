import React from 'react'
import { render, screen } from '@testing-library/react'
import { 
  StatsSkeleton, 
  SkeletonCard, 
  TableSkeleton, 
  FormSkeleton 
} from '../components/ui/skeleton-loader'

describe('SkeletonLoader Components', () => {
  describe('StatsSkeleton', () => {
    test('renders default number of skeleton cards', () => {
      render(<StatsSkeleton />)
      
      const skeletonContainer = screen.getByTestId('stats-skeleton')
      expect(skeletonContainer).toBeInTheDocument()
      
      // Should render 4 skeleton cards by default
      const skeletonCards = screen.getAllByTestId('skeleton-card')
      expect(skeletonCards).toHaveLength(4)
    })

    test('renders custom number of skeleton cards', () => {
      render(<StatsSkeleton count={6} />)
      
      const skeletonCards = screen.getAllByTestId('skeleton-card')
      expect(skeletonCards).toHaveLength(6)
    })

    test('applies custom className', () => {
      render(<StatsSkeleton className="custom-stats-skeleton" />)
      
      const skeletonContainer = screen.getByTestId('stats-skeleton')
      expect(skeletonContainer).toHaveClass('custom-stats-skeleton')
    })

    test('renders with responsive grid layout', () => {
      render(<StatsSkeleton />)
      
      const skeletonContainer = screen.getByTestId('stats-skeleton')
      expect(skeletonContainer).toHaveClass('responsive-grid-4')
    })
  })

  describe('SkeletonCard', () => {
    test('renders skeleton card with default content', () => {
      render(<SkeletonCard />)
      
      const skeletonCard = screen.getByTestId('skeleton-card')
      expect(skeletonCard).toBeInTheDocument()
      expect(skeletonCard).toHaveClass('card-elevated', 'card-rounded-md')
    })

    test('applies custom className', () => {
      render(<SkeletonCard className="custom-skeleton-card" />)
      
      const skeletonCard = screen.getByTestId('skeleton-card')
      expect(skeletonCard).toHaveClass('custom-skeleton-card')
    })

    test('renders with animate-pulse class', () => {
      render(<SkeletonCard />)
      
      const skeletonCard = screen.getByTestId('skeleton-card')
      expect(skeletonCard).toHaveClass('animate-pulse')
    })

    test('renders skeleton lines with different widths', () => {
      render(<SkeletonCard />)
      
      const skeletonLines = screen.getAllByRole('presentation')
      expect(skeletonLines.length).toBeGreaterThan(0)
      
      // Check that different width classes are applied
      const hasVariousWidths = skeletonLines.some(line => 
        line.classList.contains('w-3/4') || 
        line.classList.contains('w-1/2') || 
        line.classList.contains('w-2/3')
      )
      expect(hasVariousWidths).toBe(true)
    })
  })

  describe('TableSkeleton', () => {
    test('renders table skeleton with default rows', () => {
      render(<TableSkeleton />)
      
      const tableSkeleton = screen.getByTestId('table-skeleton')
      expect(tableSkeleton).toBeInTheDocument()
      
      // Should render 5 rows by default
      const skeletonRows = screen.getAllByRole('row')
      expect(skeletonRows).toHaveLength(5)
    })

    test('renders custom number of rows', () => {
      render(<TableSkeleton rows={8} />)
      
      const skeletonRows = screen.getAllByRole('row')
      expect(skeletonRows).toHaveLength(8)
    })

    test('renders custom number of columns', () => {
      render(<TableSkeleton columns={6} />)
      
      const firstRow = screen.getAllByRole('row')[0]
      const cells = firstRow.querySelectorAll('td')
      expect(cells).toHaveLength(6)
    })

    test('applies custom className', () => {
      render(<TableSkeleton className="custom-table-skeleton" />)
      
      const tableSkeleton = screen.getByTestId('table-skeleton')
      expect(tableSkeleton).toHaveClass('custom-table-skeleton')
    })

    test('renders with proper table structure', () => {
      render(<TableSkeleton />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const tbody = table.querySelector('tbody')
      expect(tbody).toBeInTheDocument()
    })
  })

  describe('FormSkeleton', () => {
    test('renders form skeleton with default fields', () => {
      render(<FormSkeleton />)
      
      const formSkeleton = screen.getByTestId('form-skeleton')
      expect(formSkeleton).toBeInTheDocument()
      
      // Should render 6 form fields by default
      const formFields = screen.getAllByTestId('form-field-skeleton')
      expect(formFields).toHaveLength(6)
    })

    test('renders custom number of fields', () => {
      render(<FormSkeleton fields={10} />)
      
      const formFields = screen.getAllByTestId('form-field-skeleton')
      expect(formFields).toHaveLength(10)
    })

    test('applies custom className', () => {
      render(<FormSkeleton className="custom-form-skeleton" />)
      
      const formSkeleton = screen.getByTestId('form-skeleton')
      expect(formSkeleton).toHaveClass('custom-form-skeleton')
    })

    test('renders form fields with labels and inputs', () => {
      render(<FormSkeleton />)
      
      const formFields = screen.getAllByTestId('form-field-skeleton')
      
      formFields.forEach(field => {
        // Each field should have a label skeleton
        const labelSkeleton = field.querySelector('[role="presentation"]')
        expect(labelSkeleton).toBeInTheDocument()
        expect(labelSkeleton).toHaveClass('h-4', 'bg-gray-200', 'rounded')
        
        // Each field should have an input skeleton
        const inputSkeleton = field.querySelectorAll('[role="presentation"]')[1]
        expect(inputSkeleton).toBeInTheDocument()
        expect(inputSkeleton).toHaveClass('h-10', 'bg-gray-200', 'rounded')
      })
    })

    test('renders with proper spacing between fields', () => {
      render(<FormSkeleton />)
      
      const formSkeleton = screen.getByTestId('form-skeleton')
      expect(formSkeleton).toHaveClass('space-y-4')
    })

    test('includes submit button skeleton', () => {
      render(<FormSkeleton />)
      
      const buttonSkeleton = screen.getByTestId('button-skeleton')
      expect(buttonSkeleton).toBeInTheDocument()
      expect(buttonSkeleton).toHaveClass('h-10', 'bg-gray-200', 'rounded')
    })
  })

  describe('Accessibility', () => {
    test('skeleton elements have proper ARIA attributes', () => {
      render(<StatsSkeleton />)
      
      const skeletonElements = screen.getAllByRole('presentation')
      expect(skeletonElements.length).toBeGreaterThan(0)
      
      // All skeleton elements should have role="presentation"
      skeletonElements.forEach(element => {
        expect(element).toHaveAttribute('role', 'presentation')
      })
    })

    test('skeleton containers have loading indicators', () => {
      render(<TableSkeleton />)
      
      const tableSkeleton = screen.getByTestId('table-skeleton')
      expect(tableSkeleton).toHaveAttribute('aria-label', 'Loading table data')
    })
  })

  describe('Animation', () => {
    test('skeleton elements have pulse animation', () => {
      render(<SkeletonCard />)
      
      const skeletonCard = screen.getByTestId('skeleton-card')
      expect(skeletonCard).toHaveClass('animate-pulse')
    })

    test('skeleton lines have pulse animation', () => {
      render(<FormSkeleton />)
      
      const skeletonElements = screen.getAllByRole('presentation')
      skeletonElements.forEach(element => {
        expect(element).toHaveClass('animate-pulse')
      })
    })
  })

  describe('Responsive Design', () => {
    test('stats skeleton uses responsive grid classes', () => {
      render(<StatsSkeleton />)
      
      const container = screen.getByTestId('stats-skeleton')
      expect(container).toHaveClass('responsive-grid-4')
    })

    test('skeleton cards maintain aspect ratio', () => {
      render(<SkeletonCard />)
      
      const skeletonCard = screen.getByTestId('skeleton-card')
      // Should have consistent padding and structure
      expect(skeletonCard.querySelector('.card-padding-md')).toBeInTheDocument()
    })
  })
})