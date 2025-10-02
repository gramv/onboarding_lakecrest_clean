import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LanguageContextType {
  language: 'en' | 'es'
  setLanguage: (lang: 'en' | 'es') => void
  t: (key: string) => string
}

const translations = {
  en: {
    'onboarding.welcome': 'Welcome to Your Onboarding Process!',
    'onboarding.language.select': 'Select Language',
    'onboarding.language.english': 'English',
    'onboarding.language.spanish': 'Español',
    'i9.section1.title': 'Section 1. Employee Information and Attestation',
    'i9.section1.instructions': 'Employees must complete and sign Section 1 of Form I-9 no later than the first day of employment, but not before accepting a job offer.',
    'i9.citizenship.1': 'A citizen of the United States',
    'i9.citizenship.2': 'A noncitizen national of the United States',
    'i9.citizenship.3': 'A lawful permanent resident',
    'i9.citizenship.4': 'A noncitizen authorized to work',
    'w4.step1.title': 'Step 1: Personal Information',
    'w4.step2.title': 'Step 2: Multiple Jobs or Spouse Works',
    'w4.step3.title': 'Step 3: Claim Dependents and Other Credits',
    'w4.step4.title': 'Step 4: Other Adjustments (Optional)',
    'w4.step5.title': 'Step 5: Sign Here',
    'signature.sign': 'Sign Here',
    'signature.clear': 'Clear',
    'signature.signed': 'Signed',
    'button.next': 'Next',
    'button.previous': 'Previous',
    'button.submit': 'Submit',
    'form.required': 'Required',
    'form.firstName': 'First Name',
    'form.lastName': 'Last Name',
    'form.middleInitial': 'Middle Initial',
    'form.address': 'Address',
    'form.city': 'City',
    'form.state': 'State',
    'form.zipCode': 'ZIP Code',
    'form.dateOfBirth': 'Date of Birth',
    'form.ssn': 'Social Security Number',
    'form.email': 'Email',
    'form.phone': 'Phone Number'
  },
  es: {
    'onboarding.welcome': '¡Bienvenido a su proceso de incorporación!',
    'onboarding.language.select': 'Seleccionar idioma',
    'onboarding.language.english': 'English',
    'onboarding.language.spanish': 'Español',
    'i9.section1.title': 'Sección 1. Información y Certificación del Empleado',
    'i9.section1.instructions': 'Los empleados deben completar y firmar la Sección 1 del Formulario I-9 a más tardar el primer día de empleo, pero no antes de aceptar una oferta de trabajo.',
    'i9.citizenship.1': 'Un ciudadano de los Estados Unidos',
    'i9.citizenship.2': 'Un nacional no ciudadano de los Estados Unidos',
    'i9.citizenship.3': 'Un residente permanente legal',
    'i9.citizenship.4': 'Un no ciudadano autorizado para trabajar',
    'w4.step1.title': 'Paso 1: Información Personal',
    'w4.step2.title': 'Paso 2: Múltiples Trabajos o Cónyuge Trabaja',
    'w4.step3.title': 'Paso 3: Reclamar Dependientes y Otros Créditos',
    'w4.step4.title': 'Paso 4: Otros Ajustes (Opcional)',
    'w4.step5.title': 'Paso 5: Firmar Aquí',
    'signature.sign': 'Firmar Aquí',
    'signature.clear': 'Limpiar',
    'signature.signed': 'Firmado',
    'button.next': 'Siguiente',
    'button.previous': 'Anterior',
    'button.submit': 'Enviar',
    'form.required': 'Requerido',
    'form.firstName': 'Nombre',
    'form.lastName': 'Apellido',
    'form.middleInitial': 'Inicial del Segundo Nombre',
    'form.address': 'Dirección',
    'form.city': 'Ciudad',
    'form.state': 'Estado',
    'form.zipCode': 'Código Postal',
    'form.dateOfBirth': 'Fecha de Nacimiento',
    'form.ssn': 'Número de Seguro Social',
    'form.email': 'Correo Electrónico',
    'form.phone': 'Número de Teléfono'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<'en' | 'es'>('en')

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
