import React from 'react'
import ReviewAndSign from '../ReviewAndSign'
import { format } from 'date-fns'

interface PolicyAcknowledgmentReviewProps {
  policies: Array<{
    id: string
    title: string
    content: string
    acknowledged: boolean
    acknowledgedAt?: string
  }>
  employeeName: string
  language: 'en' | 'es'
  onSign: (signatureData: any) => void
  onBack: () => void
}

export default function PolicyAcknowledgmentReview({
  policies,
  employeeName,
  language,
  onSign,
  onBack
}: PolicyAcknowledgmentReviewProps) {
  
  const renderPolicyPreview = (data: any) => {
    return (
      <div className="space-y-6">
        {/* Employee Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Employee</h4>
          <p className="font-medium">{employeeName}</p>
        </div>

        {/* Acknowledged Policies */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Company Policies Acknowledged</h4>
          <div className="space-y-3">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{policy.title}</h5>
                    {policy.acknowledgedAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        Acknowledged on {format(new Date(policy.acknowledgedAt), 'PPP')}
                      </p>
                    )}
                  </div>
                  {policy.acknowledged && (
                    <div className="flex items-center text-green-600">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Policy Summary */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">Key Policies Include:</h5>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• At-Will Employment Agreement</li>
            <li>• Equal Employment Opportunity Policy</li>
            <li>• Anti-Harassment and Anti-Discrimination Policy</li>
            <li>• Workplace Violence Prevention Policy</li>
            <li>• Code of Conduct and Ethics</li>
            <li>• Confidentiality and Data Protection</li>
            <li>• Safety and Emergency Procedures</li>
          </ul>
        </div>

        {/* Acknowledgment Statement */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            By signing below, I acknowledge that I have received, read, understood, and agree to comply with all company policies presented to me during the onboarding process. I understand that these policies may be updated from time to time and that it is my responsibility to stay informed of any changes.
          </p>
        </div>
      </div>
    )
  }

  const agreementText = language === 'en' 
    ? "I acknowledge that I have received, read, understood, and agree to comply with all company policies. I understand that violation of these policies may result in disciplinary action, up to and including termination of employment."
    : "Reconozco que he recibido, leído, entendido y acepto cumplir con todas las políticas de la empresa. Entiendo que la violación de estas políticas puede resultar en acción disciplinaria, hasta e incluyendo la terminación del empleo."

  return (
    <ReviewAndSign
      formType="policy_acknowledgment"
      formData={{ policies, employeeName }}
      title={language === 'en' ? 'Company Policy Acknowledgment' : 'Reconocimiento de Políticas de la Empresa'}
      description={language === 'en' 
        ? 'Confirmation of receipt and understanding of company policies' 
        : 'Confirmación de recepción y comprensión de las políticas de la empresa'}
      language={language}
      onSign={onSign}
      onBack={onBack}
      renderPreview={() => renderPolicyPreview({ policies, employeeName })}
      signatureLabel={employeeName}
      agreementText={agreementText}
    />
  )
}