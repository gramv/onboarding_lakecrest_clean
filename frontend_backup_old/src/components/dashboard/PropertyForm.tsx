import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
}

interface PropertyFormProps {
  formData: PropertyFormData
  setFormData: (data: PropertyFormData) => void
  onSubmit: (e: React.FormEvent) => void
  title: string
  submitting: boolean
  onCancel: () => void
}

export const PropertyForm: React.FC<PropertyFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  title,
  submitting,
  onCancel
}) => {
  const [formErrors, setFormErrors] = useState<string[]>([])

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10)
    
    // Format based on length
    if (limitedDigits.length >= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
    } else if (limitedDigits.length >= 3) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    }
    return limitedDigits
  }

  const validateForm = () => {
    const errors: string[] = []
    
    if (!formData.name.trim()) errors.push('Property name is required')
    if (!formData.address.trim()) errors.push('Street address is required')
    if (!formData.city.trim()) errors.push('City is required')
    if (!formData.state.trim()) errors.push('State is required')
    if (!formData.zip_code.trim()) errors.push('ZIP code is required')
    
    // Validate state format (2 letters)
    if (formData.state && !/^[A-Za-z]{2}$/.test(formData.state)) {
      errors.push('State must be 2 letters (e.g., CA, NY)')
    }
    
    // Validate ZIP code format
    if (formData.zip_code && !/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
      errors.push('ZIP code must be in format 12345 or 12345-6789')
    }
    
    // Validate phone format if provided (more flexible)
    if (formData.phone && formData.phone.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length !== 10) {
        errors.push('Phone must be 10 digits')
      }
    }
    
    return errors
  }



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors([])
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Please fix the following errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Property Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Grand Plaza Hotel"
            className={formErrors.some(e => e.includes('Property name')) ? 'border-red-300' : ''}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
            placeholder="(555) 123-4567"
            maxLength={14}
            className={formErrors.some(e => e.includes('Phone')) ? 'border-red-300' : ''}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="address">Street Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Main Street"
          className={formErrors.some(e => e.includes('Street address')) ? 'border-red-300' : ''}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Miami Beach"
            className={formErrors.some(e => e.includes('City')) ? 'border-red-300' : ''}
          />
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
            placeholder="FL"
            maxLength={2}
            className={formErrors.some(e => e.includes('State')) ? 'border-red-300' : ''}
          />
        </div>
        <div>
          <Label htmlFor="zip_code">ZIP Code *</Label>
          <Input
            id="zip_code"
            value={formData.zip_code}
            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            placeholder="33139"
            className={formErrors.some(e => e.includes('ZIP code')) ? 'border-red-300' : ''}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : title}
        </Button>
      </div>
    </form>
  )
}