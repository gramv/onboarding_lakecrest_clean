/**
 * PersonalInfoModal - Collects basic employee information for single-step invitations
 * Shows when employee doesn't exist in the system and we need their info for form generation
 */

import React, { useState } from 'react'
import { FormModal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, User, Mail, Phone, CreditCard } from 'lucide-react'

interface PersonalInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  ssn: string
}

interface PersonalInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PersonalInfo) => Promise<void>
  language?: 'en' | 'es'
  recipientEmail?: string
  recipientName?: string
}

const translations = {
  en: {
    title: 'Welcome! We Need Some Basic Information',
    description: 'Please provide your information to complete this form',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    ssn: 'Social Security Number',
    ssnPlaceholder: '123-45-6789',
    phonePlaceholder: '(555) 123-4567',
    submit: 'Continue',
    cancel: 'Cancel',
    required: 'Required',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid phone number',
    invalidSSN: 'Please enter a valid SSN (9 digits)',
    privacyNote: 'Your information is encrypted and securely stored.',
    helpText: 'This information is needed to generate your direct deposit form.'
  },
  es: {
    title: '¡Bienvenido! Necesitamos Información Básica',
    description: 'Por favor proporcione su información para completar este formulario',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Número de Teléfono',
    ssn: 'Número de Seguro Social',
    ssnPlaceholder: '123-45-6789',
    phonePlaceholder: '(555) 123-4567',
    submit: 'Continuar',
    cancel: 'Cancelar',
    required: 'Requerido',
    invalidEmail: 'Por favor ingrese un correo electrónico válido',
    invalidPhone: 'Por favor ingrese un número de teléfono válido',
    invalidSSN: 'Por favor ingrese un SSN válido (9 dígitos)',
    privacyNote: 'Su información está encriptada y almacenada de forma segura.',
    helpText: 'Esta información es necesaria para generar su formulario de depósito directo.'
  }
}

export function PersonalInfoModal({
  isOpen,
  onClose,
  onSubmit,
  language = 'en',
  recipientEmail,
  recipientName
}: PersonalInfoModalProps) {
  const t = translations[language]
  
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: recipientName?.split(' ')[0] || '',
    lastName: recipientName?.split(' ').slice(1).join(' ') || '',
    email: recipientEmail || '',
    phone: '',
    ssn: ''
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    return digits.length === 10
  }

  const validateSSN = (ssn: string): boolean => {
    // Remove all non-digits
    const digits = ssn.replace(/\D/g, '')
    return digits.length === 9
  }

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const formatSSN = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
  }

  const handleChange = (field: keyof PersonalInfo, value: string) => {
    let formattedValue = value
    
    if (field === 'phone') {
      formattedValue = formatPhone(value)
    } else if (field === 'ssn') {
      formattedValue = formatSSN(value)
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfo, string>> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t.required
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t.required
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t.required
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t.invalidEmail
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = t.required
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t.invalidPhone
    }
    
    if (!formData.ssn.trim()) {
      newErrors.ssn = t.required
    } else if (!validateSSN(formData.ssn)) {
      newErrors.ssn = t.invalidSSN
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Failed to submit personal info:', error)
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.title}
      description={t.description}
      size="md"
      onSubmit={handleSubmit}
      submitLabel={t.submit}
      cancelLabel={t.cancel}
      isSubmitting={isSubmitting}
      submitDisabled={isSubmitting}
    >
      <div className="space-y-4">
        {/* Help Text */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            {t.helpText}
          </AlertDescription>
        </Alert>

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.firstName} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className={errors.firstName ? 'border-red-500' : ''}
            disabled={isSubmitting}
            autoFocus
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.lastName} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className={errors.lastName ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t.email} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {t.phone} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t.phonePlaceholder}
            className={errors.phone ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* SSN */}
        <div className="space-y-2">
          <Label htmlFor="ssn" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t.ssn} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ssn"
            type="text"
            value={formData.ssn}
            onChange={(e) => handleChange('ssn', e.target.value)}
            placeholder={t.ssnPlaceholder}
            className={errors.ssn ? 'border-red-500' : ''}
            disabled={isSubmitting}
            maxLength={11} // 9 digits + 2 hyphens
          />
          {errors.ssn && (
            <p className="text-sm text-red-600">{errors.ssn}</p>
          )}
        </div>

        {/* Privacy Note */}
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-xs text-green-800">
            🔒 {t.privacyNote}
          </AlertDescription>
        </Alert>
      </div>
    </FormModal>
  )
}

