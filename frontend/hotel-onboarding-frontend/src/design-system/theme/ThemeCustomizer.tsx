/**
 * Theme Customizer
 * Interface for customizing brand colors and layout preferences
 */

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from './ThemeProvider'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card'
import { Stack } from '../components/Layout'
import type { DesignTokens, ColorScale } from '../tokens/types'

// ===== THEME CUSTOMIZER TYPES =====

interface ThemeCustomizerProps {
  className?: string
  onClose?: () => void
  showPreview?: boolean
  allowReset?: boolean
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

interface ColorScaleEditorProps {
  label: string
  scale: Partial<ColorScale>
  onChange: (scale: Partial<ColorScale>) => void
}

// ===== COLOR PICKER COMPONENT =====

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  className,
}) => {
  const [inputValue, setInputValue] = useState(value)

  const handleChange = useCallback((newValue: string) => {
    setInputValue(newValue)
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
      onChange(newValue)
    }
  }, [onChange])

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <div
          className="w-10 h-10 rounded-lg border-2 border-neutral-300 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm"
          pattern="^#[0-9A-F]{6}$"
        />
        <input
          type="color"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-10 h-10 rounded border-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

// ===== COLOR SCALE EDITOR =====

const ColorScaleEditor: React.FC<ColorScaleEditorProps> = ({
  label,
  scale,
  onChange,
}) => {
  const scaleSteps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

  const handleColorChange = useCallback((step: string, color: string) => {
    onChange({
      ...scale,
      [step]: color,
    })
  }, [scale, onChange])

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-text-primary">{label}</h4>
      <div className="grid grid-cols-2 gap-4">
        {scaleSteps.map((step) => (
          <ColorPicker
            key={step}
            label={`${step}`}
            value={scale[step] || '#000000'}
            onChange={(color) => handleColorChange(step, color)}
          />
        ))}
      </div>
    </div>
  )
}

// ===== THEME PREVIEW COMPONENT =====

const ThemePreview: React.FC = () => {
  return (
    <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
      <h4 className="font-medium text-text-primary">Preview</h4>
      
      {/* Color swatches */}
      <div className="grid grid-cols-4 gap-2">
        <div className="h-8 bg-brand-primary rounded" title="Primary" />
        <div className="h-8 bg-success-500 rounded" title="Success" />
        <div className="h-8 bg-warning-500 rounded" title="Warning" />
        <div className="h-8 bg-error-500 rounded" title="Error" />
      </div>
      
      {/* Sample components */}
      <div className="space-y-3">
        <Button size="sm">Primary Button</Button>
        <Button variant="secondary" size="sm">Secondary Button</Button>
        <Input placeholder="Sample input" size="sm" />
        
        <Card className="p-3">
          <div className="text-sm">
            <div className="font-medium text-text-primary">Sample Card</div>
            <div className="text-text-secondary">With some content</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ===== MAIN THEME CUSTOMIZER COMPONENT =====

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  className,
  onClose,
  showPreview = true,
  allowReset = true,
}) => {
  const { 
    mode, 
    setMode, 
    customTokens, 
    updateTokens, 
    resetTokens,
    systemPreference 
  } = useTheme()

  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing'>('colors')
  const [localTokens, setLocalTokens] = useState<Partial<DesignTokens>>(customTokens)

  // Handle brand color changes
  const handleBrandColorChange = useCallback((colorKey: string, value: string) => {
    const newTokens = {
      ...localTokens,
      colors: {
        ...localTokens.colors,
        brand: {
          ...localTokens.colors?.brand,
          [colorKey]: value,
        },
      },
    }
    setLocalTokens(newTokens)
  }, [localTokens])

  // Handle semantic color changes
  const handleSemanticColorChange = useCallback((
    category: 'success' | 'warning' | 'error' | 'info',
    scale: Partial<ColorScale>
  ) => {
    const newTokens = {
      ...localTokens,
      colors: {
        ...localTokens.colors,
        semantic: {
          ...localTokens.colors?.semantic,
          [category]: scale,
        },
      },
    }
    setLocalTokens(newTokens)
  }, [localTokens])

  // Handle typography changes
  const handleTypographyChange = useCallback((key: string, value: any) => {
    const newTokens = {
      ...localTokens,
      typography: {
        ...localTokens.typography,
        [key]: value,
      },
    }
    setLocalTokens(newTokens)
  }, [localTokens])

  // Apply changes
  const handleApply = useCallback(() => {
    updateTokens(localTokens)
  }, [localTokens, updateTokens])

  // Reset to defaults
  const handleReset = useCallback(() => {
    resetTokens()
    setLocalTokens({})
  }, [resetTokens])

  // Cancel changes
  const handleCancel = useCallback(() => {
    setLocalTokens(customTokens)
    onClose?.()
  }, [customTokens, onClose])

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader
        title="Theme Customizer"
        subtitle="Customize colors, typography, and layout preferences"
        actions={
          onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )
        }
      />

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main customization area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Theme mode selector */}
            <div className="space-y-3">
              <h3 className="font-medium text-text-primary">Theme Mode</h3>
              <div className="flex space-x-2">
                {(['light', 'dark', 'auto'] as const).map((themeMode) => (
                  <Button
                    key={themeMode}
                    variant={mode === themeMode ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setMode(themeMode)}
                  >
                    {themeMode === 'auto' ? `Auto (${systemPreference})` : 
                     themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tab navigation */}
            <div className="border-b border-neutral-200">
              <nav className="flex space-x-8">
                {(['colors', 'typography', 'spacing'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                      activeTab === tab
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="space-y-6">
              {activeTab === 'colors' && (
                <Stack spacing="lg">
                  {/* Brand colors */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-text-primary">Brand Colors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorPicker
                        label="Primary"
                        value={localTokens.colors?.brand?.primary || '#3B82F6'}
                        onChange={(value) => handleBrandColorChange('primary', value)}
                      />
                      <ColorPicker
                        label="Secondary"
                        value={localTokens.colors?.brand?.secondary || '#F59E0B'}
                        onChange={(value) => handleBrandColorChange('secondary', value)}
                      />
                      <ColorPicker
                        label="Accent"
                        value={localTokens.colors?.brand?.accent || '#8B5CF6'}
                        onChange={(value) => handleBrandColorChange('accent', value)}
                      />
                      <ColorPicker
                        label="Logo"
                        value={localTokens.colors?.brand?.logo || '#1E40AF'}
                        onChange={(value) => handleBrandColorChange('logo', value)}
                      />
                    </div>
                  </div>

                  {/* Semantic colors */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-text-primary">Semantic Colors</h4>
                    <div className="space-y-6">
                      {(['success', 'warning', 'error', 'info'] as const).map((category) => (
                        <ColorScaleEditor
                          key={category}
                          label={category.charAt(0).toUpperCase() + category.slice(1)}
                          scale={localTokens.colors?.semantic?.[category] || {}}
                          onChange={(scale) => handleSemanticColorChange(category, scale)}
                        />
                      ))}
                    </div>
                  </div>
                </Stack>
              )}

              {activeTab === 'typography' && (
                <Stack spacing="lg">
                  <div className="space-y-4">
                    <h4 className="font-medium text-text-primary">Font Sizes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {(['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map((size) => (
                        <div key={size} className="space-y-2">
                          <label className="block text-sm font-medium text-text-primary">
                            {size}
                          </label>
                          <Input
                            type="text"
                            placeholder="1rem"
                            onChange={(e) => handleTypographyChange(`fontSizes.${size}`, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Stack>
              )}

              {activeTab === 'spacing' && (
                <Stack spacing="lg">
                  <div className="space-y-4">
                    <h4 className="font-medium text-text-primary">Spacing Scale</h4>
                    <p className="text-sm text-text-muted">
                      Customize the spacing scale used throughout the interface.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {(['1', '2', '3', '4', '6', '8', '12', '16', '20', '24'] as const).map((space) => (
                        <div key={space} className="space-y-2">
                          <label className="block text-sm font-medium text-text-primary">
                            {space}
                          </label>
                          <Input
                            type="text"
                            placeholder="0.25rem"
                            onChange={(e) => {
                              const newTokens = {
                                ...localTokens,
                                spacing: {
                                  ...localTokens.spacing,
                                  [space]: e.target.value,
                                },
                              }
                              setLocalTokens(newTokens)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Stack>
              )}
            </div>
          </div>

          {/* Preview panel */}
          {showPreview && (
            <div className="lg:col-span-1">
              <ThemePreview />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter justify="between">
        <div>
          {allowReset && (
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
          )}
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// ===== THEME CUSTOMIZER MODAL =====

interface ThemeCustomizerModalProps extends ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-surface-overlay backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] overflow-y-auto">
        <ThemeCustomizer
          {...props}
          onClose={onClose}
          className="w-full max-w-5xl"
        />
      </div>
    </div>
  )
}

// ===== THEME TOGGLE BUTTON =====

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, toggleMode, isDark } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      className={className}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </Button>
  )
}

// ===== EXPORTS =====

export default ThemeCustomizer

// ===== USAGE EXAMPLES =====

/*
// Basic Theme Customizer
<ThemeCustomizer />

// Theme Customizer Modal
function App() {
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  return (
    <div>
      <Button onClick={() => setShowCustomizer(true)}>
        Customize Theme
      </Button>
      
      <ThemeCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        showPreview
        allowReset
      />
    </div>
  )
}

// Theme Toggle Button
<ThemeToggle className="ml-auto" />

// In a navigation bar
<nav className="flex items-center justify-between p-4">
  <h1>My App</h1>
  <div className="flex items-center space-x-4">
    <Button onClick={() => setShowCustomizer(true)}>
      Customize
    </Button>
    <ThemeToggle />
  </div>
</nav>
*/