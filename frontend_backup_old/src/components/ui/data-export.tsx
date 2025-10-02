import * as React from "react"
import { Download, FileText, FileSpreadsheet, Settings, Calendar, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export interface ExportColumn {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'boolean'
  format?: (value: any) => string
  width?: number
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json'
  filename?: string
  columns: string[]
  includeHeaders: boolean
  dateRange?: {
    start: string
    end: string
    field: string
  }
  filters?: Record<string, any>
  title?: string
  description?: string
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'a4' | 'letter' | 'legal'
}

export interface DataExportProps<T> {
  data: T[]
  columns: ExportColumn[]
  filename?: string
  title?: string
  className?: string
  onExport?: (options: ExportOptions) => void
  enableCustomReports?: boolean
  enableDateFilter?: boolean
  dateFields?: { key: string; label: string }[]
}

export function DataExport<T extends Record<string, any>>({
  data,
  columns,
  filename = 'export',
  title = 'Data Export',
  className,
  onExport,
  enableCustomReports = true,
  enableDateFilter = true,
  dateFields = []
}: DataExportProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isCustomReportOpen, setIsCustomReportOpen] = React.useState(false)
  const [exportOptions, setExportOptions] = React.useState<ExportOptions>({
    format: 'csv',
    filename,
    columns: columns.map(col => col.key),
    includeHeaders: true,
    title,
    orientation: 'portrait',
    pageSize: 'a4'
  })

  const handleQuickExport = (format: 'csv' | 'pdf') => {
    const options: ExportOptions = {
      ...exportOptions,
      format,
      filename: `${filename}-${new Date().toISOString().split('T')[0]}`
    }
    
    if (format === 'csv') {
      exportToCSV(data, columns, options)
    } else if (format === 'pdf') {
      exportToPDF(data, columns, options)
    }
    
    onExport?.(options)
    setIsOpen(false)
  }

  const handleCustomExport = () => {
    const options: ExportOptions = {
      ...exportOptions,
      filename: exportOptions.filename || `${filename}-${new Date().toISOString().split('T')[0]}`
    }
    
    if (exportOptions.format === 'csv') {
      exportToCSV(data, columns, options)
    } else if (exportOptions.format === 'pdf') {
      exportToPDF(data, columns, options)
    } else if (exportOptions.format === 'json') {
      exportToJSON(data, columns, options)
    }
    
    onExport?.(options)
    setIsCustomReportOpen(false)
    setIsOpen(false)
  }

  const updateExportOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }))
  }

  const toggleColumn = (columnKey: string) => {
    const newColumns = exportOptions.columns.includes(columnKey)
      ? exportOptions.columns.filter(key => key !== columnKey)
      : [...exportOptions.columns, columnKey]
    
    updateExportOptions({ columns: newColumns })
  }

  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply date range filter
    if (exportOptions.dateRange && exportOptions.dateRange.field) {
      const { start, end, field } = exportOptions.dateRange
      if (start || end) {
        result = result.filter(item => {
          const value = getNestedValue(item, field)
          const date = new Date(value)
          
          if (start && date < new Date(start)) return false
          if (end && date > new Date(end)) return false
          return true
        })
      }
    }

    // Apply custom filters
    if (exportOptions.filters) {
      Object.entries(exportOptions.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, key)
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
          })
        }
      })
    }

    return result
  }, [data, exportOptions.dateRange, exportOptions.filters])

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 px-3 text-sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-4 border-b">
            <h4 className="font-medium">Export Data</h4>
            <p className="text-sm text-gray-600 mt-1">
              {filteredData.length} records available
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Quick Export Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Export</Label>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleQuickExport('csv')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleQuickExport('pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </div>

            {enableCustomReports && (
              <>
                <Separator />
                
                {/* Custom Report Builder */}
                <Dialog open={isCustomReportOpen} onOpenChange={setIsCustomReportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Custom Report
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Custom Report Builder</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Basic Settings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Settings</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="export-format">Format</Label>
                            <Select
                              value={exportOptions.format}
                              onValueChange={(value) => updateExportOptions({ format: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="csv">CSV</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="export-filename">Filename</Label>
                            <Input
                              id="export-filename"
                              value={exportOptions.filename}
                              onChange={(e) => updateExportOptions({ filename: e.target.value })}
                              placeholder="Enter filename..."
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="export-title">Report Title</Label>
                          <Input
                            id="export-title"
                            value={exportOptions.title}
                            onChange={(e) => updateExportOptions({ title: e.target.value })}
                            placeholder="Enter report title..."
                          />
                        </div>

                        <div>
                          <Label htmlFor="export-description">Description</Label>
                          <Input
                            id="export-description"
                            value={exportOptions.description || ''}
                            onChange={(e) => updateExportOptions({ description: e.target.value })}
                            placeholder="Enter report description..."
                          />
                        </div>
                      </div>

                      {/* PDF Settings */}
                      {exportOptions.format === 'pdf' && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">PDF Settings</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Orientation</Label>
                              <Select
                                value={exportOptions.orientation}
                                onValueChange={(value) => updateExportOptions({ orientation: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="portrait">Portrait</SelectItem>
                                  <SelectItem value="landscape">Landscape</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Page Size</Label>
                              <Select
                                value={exportOptions.pageSize}
                                onValueChange={(value) => updateExportOptions({ pageSize: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="a4">A4</SelectItem>
                                  <SelectItem value="letter">Letter</SelectItem>
                                  <SelectItem value="legal">Legal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Column Selection */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Columns</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateExportOptions({ columns: columns.map(col => col.key) })}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateExportOptions({ columns: [] })}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {columns.map(column => (
                            <div key={column.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`column-${column.key}`}
                                checked={exportOptions.columns.includes(column.key)}
                                onCheckedChange={() => toggleColumn(column.key)}
                              />
                              <Label
                                htmlFor={`column-${column.key}`}
                                className="text-sm font-normal"
                              >
                                {column.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {exportOptions.columns.length} of {columns.length} columns selected
                        </div>
                      </div>

                      {/* Date Range Filter */}
                      {enableDateFilter && dateFields.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Date Range Filter</h3>
                          
                          <div>
                            <Label>Date Field</Label>
                            <Select
                              value={exportOptions.dateRange?.field || ''}
                              onValueChange={(field) => updateExportOptions({
                                dateRange: { ...exportOptions.dateRange, field, start: '', end: '' }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select date field..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No date filter</SelectItem>
                                {dateFields.map(field => (
                                  <SelectItem key={field.key} value={field.key}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {exportOptions.dateRange?.field && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Start Date</Label>
                                <Input
                                  type="date"
                                  value={exportOptions.dateRange.start || ''}
                                  onChange={(e) => updateExportOptions({
                                    dateRange: { ...exportOptions.dateRange!, start: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <Label>End Date</Label>
                                <Input
                                  type="date"
                                  value={exportOptions.dateRange.end || ''}
                                  onChange={(e) => updateExportOptions({
                                    dateRange: { ...exportOptions.dateRange!, end: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Options</h3>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="include-headers"
                            checked={exportOptions.includeHeaders}
                            onCheckedChange={(checked) => updateExportOptions({ includeHeaders: checked as boolean })}
                          />
                          <Label htmlFor="include-headers">Include column headers</Label>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Export Summary</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Format: {exportOptions.format.toUpperCase()}</div>
                          <div>Records: {filteredData.length}</div>
                          <div>Columns: {exportOptions.columns.length}</div>
                          {exportOptions.dateRange?.field && (
                            <div>Date Filter: {dateFields.find(f => f.key === exportOptions.dateRange?.field)?.label}</div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCustomReportOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCustomExport}
                          disabled={exportOptions.columns.length === 0}
                        >
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Utility functions for export
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function exportToCSV<T>(data: T[], columns: ExportColumn[], options: ExportOptions) {
  const selectedColumns = columns.filter(col => options.columns.includes(col.key))
  
  let csvContent = ''
  
  // Add headers
  if (options.includeHeaders) {
    csvContent += selectedColumns.map(col => `"${col.label}"`).join(',') + '\n'
  }
  
  // Add data rows
  data.forEach(row => {
    const values = selectedColumns.map(col => {
      const value = getNestedValue(row, col.key)
      const formattedValue = col.format ? col.format(value) : String(value || '')
      return `"${formattedValue.replace(/"/g, '""')}"`
    })
    csvContent += values.join(',') + '\n'
  })
  
  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${options.filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function exportToPDF<T>(data: T[], columns: ExportColumn[], options: ExportOptions) {
  // This is a simplified PDF export - in a real application, you'd use a library like jsPDF
  const selectedColumns = columns.filter(col => options.columns.includes(col.key))
  
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.title || 'Report'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; margin-bottom: 10px; }
        .description { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>${options.title || 'Report'}</h1>
      ${options.description ? `<div class="description">${options.description}</div>` : ''}
      
      <table>
        <thead>
          <tr>
            ${selectedColumns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${selectedColumns.map(col => {
                const value = getNestedValue(row, col.key)
                const formattedValue = col.format ? col.format(value) : String(value || '')
                return `<td>${formattedValue}</td>`
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Generated on ${new Date().toLocaleString()} | ${data.length} records
      </div>
    </body>
    </html>
  `
  
  // Open in new window for printing/saving as PDF
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

function exportToJSON<T>(data: T[], columns: ExportColumn[], options: ExportOptions) {
  const selectedColumns = columns.filter(col => options.columns.includes(col.key))
  
  const exportData = data.map(row => {
    const filteredRow: any = {}
    selectedColumns.forEach(col => {
      const value = getNestedValue(row, col.key)
      filteredRow[col.key] = col.format ? col.format(value) : value
    })
    return filteredRow
  })
  
  const jsonContent = JSON.stringify({
    title: options.title,
    description: options.description,
    exportedAt: new Date().toISOString(),
    recordCount: data.length,
    data: exportData
  }, null, 2)
  
  // Download file
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${options.filename}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}