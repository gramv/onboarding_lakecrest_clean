import React from 'react'
import ReviewAndSign from '../ReviewAndSign'

interface W4ReviewProps {
  formData: any
  language: 'en' | 'es'
  onSign: (signatureData: any) => void
  onBack: () => void
}

export default function W4Review({
  formData,
  language,
  onSign,
  onBack
}: W4ReviewProps) {
  
  const renderW4Preview = (data: any) => {
    const filingStatusLabels: Record<string, string> = {
      single: 'Single or Married filing separately',
      married: 'Married filing jointly',
      head_of_household: 'Head of household'
    }

    return (
      <div className="space-y-6">
        {/* Employee Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Employee Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{data.first_name} {data.middle_initial ? `${data.middle_initial}. ` : ''}{data.last_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Social Security Number</label>
              <p className="font-medium">***-**-{data.ssn?.slice(-4) || '****'}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
          <div className="space-y-2">
            <p className="font-medium">{data.address}</p>
            <p className="font-medium">{data.city}, {data.state} {data.zip_code}</p>
          </div>
        </div>

        {/* Filing Status */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Filing Status</h4>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-medium text-blue-900">
              {filingStatusLabels[data.filing_status] || data.filing_status}
            </p>
          </div>
        </div>

        {/* Multiple Jobs */}
        {data.multiple_jobs && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Multiple Jobs or Spouse Works</h4>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Employee has indicated they have multiple jobs or spouse works
              </p>
            </div>
          </div>
        )}

        {/* Dependents */}
        {(data.qualifying_children > 0 || data.other_dependents > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Dependents</h4>
            <div className="grid grid-cols-2 gap-4">
              {data.qualifying_children > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-sm text-gray-600">Qualifying Children</label>
                  <p className="font-medium">{data.qualifying_children}</p>
                  <p className="text-sm text-gray-500">${data.qualifying_children * 2000} credit</p>
                </div>
              )}
              {data.other_dependents > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-sm text-gray-600">Other Dependents</label>
                  <p className="font-medium">{data.other_dependents}</p>
                  <p className="text-sm text-gray-500">${data.other_dependents * 500} credit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other Income & Deductions */}
        {(data.other_income > 0 || data.deductions > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Adjustments</h4>
            <div className="grid grid-cols-2 gap-4">
              {data.other_income > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-sm text-gray-600">Other Income</label>
                  <p className="font-medium">${data.other_income.toLocaleString()}</p>
                </div>
              )}
              {data.deductions > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-sm text-gray-600">Other Deductions</label>
                  <p className="font-medium">${data.deductions.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Extra Withholding */}
        {data.extra_withholding > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Extra Withholding</h4>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="font-medium text-green-900">
                Additional amount to withhold each pay period: ${data.extra_withholding}
              </p>
            </div>
          </div>
        )}

        {/* Exempt Status */}
        {data.exempt && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Exemption Status</h4>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="font-medium text-red-900">
                Employee claims exemption from withholding
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const agreementText = language === 'en' 
    ? "Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete."
    : "Bajo pena de perjurio, declaro que este certificado, a mi leal saber y entender, es verdadero, correcto y completo."

  return (
    <ReviewAndSign
      formType="w4"
      formData={formData}
      title={language === 'en' ? 'Form W-4' : 'Formulario W-4'}
      description={language === 'en' 
        ? "Employee's Withholding Certificate" 
        : 'Certificado de Retención del Empleado'}
      language={language}
      onSign={onSign}
      onBack={onBack}
      renderPreview={renderW4Preview}
      signatureLabel={`${formData.first_name} ${formData.last_name}`}
      agreementText={agreementText}
      federalCompliance={{
        formName: 'IRS Form W-4 (2024)',
        requiresWitness: false,
        retentionPeriod: '4 years after the later of the due date of the tax return or the date the tax was paid'
      }}
      pdfEndpoint="http://localhost:8000/api/forms/w4/generate"
      usePDFPreview={true}
    />
  )
}