import React from 'react'
import ReviewAndSign from '../ReviewAndSign'
import { format } from 'date-fns'

interface I9Section1ReviewProps {
  formData: any
  language: 'en' | 'es'
  onSign: (signatureData: any) => void
  onBack: () => void
}

export default function I9Section1Review({
  formData,
  language,
  onSign,
  onBack
}: I9Section1ReviewProps) {
  
  const renderI9Preview = (data: any) => {
    const citizenshipLabels: Record<string, string> = {
      citizen: 'U.S. Citizen',
      national: 'U.S. National',
      lpr: 'Lawful Permanent Resident',
      alien_authorized: 'Alien Authorized to Work'
    }

    return (
      <div className="space-y-6">
        {/* Employee Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Employee Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Last Name</label>
              <p className="font-medium">{data.employee_last_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">First Name</label>
              <p className="font-medium">{data.employee_first_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Middle Initial</label>
              <p className="font-medium">{data.employee_middle_initial || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Other Last Names</label>
              <p className="font-medium">{data.other_last_names || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
          <div className="space-y-2">
            <p className="font-medium">{data.address_street}</p>
            <p className="font-medium">
              {data.apt_number && `Apt. ${data.apt_number}, `}
              {data.address_city}, {data.address_state} {data.address_zip}
            </p>
          </div>
        </div>

        {/* Birth Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Birth Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Date of Birth</label>
              <p className="font-medium">
                {data.date_of_birth ? format(new Date(data.date_of_birth), 'MM/dd/yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Social Security Number</label>
              <p className="font-medium">***-**-{data.ssn?.slice(-4) || '****'}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Email Address</label>
              <p className="font-medium">{data.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone Number</label>
              <p className="font-medium">{data.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Citizenship Status */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Citizenship Status</h4>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-medium text-blue-900">
              {citizenshipLabels[data.citizenship_status] || data.citizenship_status}
            </p>
            {data.citizenship_status === 'lpr' && data.uscis_number && (
              <p className="text-sm text-blue-700 mt-2">
                USCIS Number: {data.uscis_number}
              </p>
            )}
            {data.citizenship_status === 'alien_authorized' && (
              <div className="mt-2 space-y-1">
                {data.form_i94_number && (
                  <p className="text-sm text-blue-700">Form I-94 #: {data.form_i94_number}</p>
                )}
                {data.foreign_passport_number && (
                  <p className="text-sm text-blue-700">Passport #: {data.foreign_passport_number}</p>
                )}
                {data.country_of_issuance && (
                  <p className="text-sm text-blue-700">Country: {data.country_of_issuance}</p>
                )}
                {data.expiration_date && (
                  <p className="text-sm text-blue-700">
                    Expires: {format(new Date(data.expiration_date), 'MM/dd/yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preparer/Translator */}
        {data.used_preparer_translator && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Preparer/Translator Certification</h4>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                A preparer and/or translator assisted the employee in completing Section 1.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const agreementText = language === 'en' 
    ? "I attest, under penalty of perjury, that I have examined the information entered in Section 1, and to the best of my knowledge, the information is true and correct. I am aware that federal law provides for imprisonment and/or fines for false statements or use of false documents in connection with the completion of this form."
    : "Atestiguo, bajo pena de perjurio, que he examinado la información ingresada en la Sección 1, y a mi leal saber y entender, la información es verdadera y correcta. Soy consciente de que la ley federal establece encarcelamiento y/o multas por declaraciones falsas o uso de documentos falsos en relación con la cumplimentación de este formulario."

  return (
    <ReviewAndSign
      formType="i9_section1"
      formData={formData}
      title={language === 'en' ? 'Form I-9, Section 1' : 'Formulario I-9, Sección 1'}
      description={language === 'en' 
        ? 'Employment Eligibility Verification' 
        : 'Verificación de Elegibilidad de Empleo'}
      language={language}
      onSign={onSign}
      onBack={onBack}
      renderPreview={renderI9Preview}
      signatureLabel={`${formData.employee_first_name} ${formData.employee_last_name}`}
      agreementText={agreementText}
      federalCompliance={{
        formName: 'USCIS Form I-9',
        requiresWitness: false,
        retentionPeriod: '3 years after hire date or 1 year after termination, whichever is later'
      }}
      pdfEndpoint="http://localhost:8000/api/forms/i9/generate"
      usePDFPreview={true}
    />
  )
}