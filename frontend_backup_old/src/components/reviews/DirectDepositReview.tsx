import React from 'react'
import ReviewAndSign from '../ReviewAndSign'

interface DirectDepositReviewProps {
  formData: any
  language: 'en' | 'es'
  onSign: (signatureData: any) => void
  onBack: () => void
}

export default function DirectDepositReview({
  formData,
  language,
  onSign,
  onBack
}: DirectDepositReviewProps) {
  
  const renderDirectDepositPreview = (data: any) => {
    const maskAccountNumber = (accountNum: string) => {
      if (!accountNum || accountNum.length < 4) return '****'
      return '*'.repeat(accountNum.length - 4) + accountNum.slice(-4)
    }

    const maskRoutingNumber = (routingNum: string) => {
      if (!routingNum || routingNum.length < 4) return '*****'
      return routingNum.slice(0, 2) + '***' + routingNum.slice(-2)
    }

    return (
      <div className="space-y-6">
        {/* Primary Account */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Primary Bank Account</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Bank Name</label>
                <p className="font-medium">{data.primaryAccount?.bankName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Account Type</label>
                <p className="font-medium capitalize">{data.primaryAccount?.accountType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Routing Number</label>
                <p className="font-medium">{maskRoutingNumber(data.primaryAccount?.routingNumber)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Account Number</label>
                <p className="font-medium">{maskAccountNumber(data.primaryAccount?.accountNumber)}</p>
              </div>
            </div>
            {data.primaryAccount?.depositAmount && (
              <div className="mt-4">
                <label className="text-sm text-gray-600">Deposit Amount</label>
                <p className="font-medium">
                  {data.primaryAccount.depositAmount === 'full' 
                    ? 'Full Net Pay' 
                    : `$${data.primaryAccount.specificAmount || 0}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Account (if applicable) */}
        {data.secondaryAccount?.enabled && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Secondary Bank Account</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Bank Name</label>
                  <p className="font-medium">{data.secondaryAccount.bankName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Type</label>
                  <p className="font-medium capitalize">{data.secondaryAccount.accountType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Routing Number</label>
                  <p className="font-medium">{maskRoutingNumber(data.secondaryAccount.routingNumber)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Number</label>
                  <p className="font-medium">{maskAccountNumber(data.secondaryAccount.accountNumber)}</p>
                </div>
              </div>
              {data.secondaryAccount.depositAmount && (
                <div className="mt-4">
                  <label className="text-sm text-gray-600">Deposit Amount</label>
                  <p className="font-medium">
                    {data.secondaryAccount.depositAmount === 'remainder' 
                      ? 'Remainder of Net Pay' 
                      : `$${data.secondaryAccount.specificAmount || 0}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Important Notice */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h5 className="font-medium text-yellow-900 mb-2">Important Information</h5>
          <ul className="space-y-1 text-sm text-yellow-800">
            <li>• Direct deposit typically takes 1-2 pay periods to become active</li>
            <li>• You will receive paper checks until direct deposit is established</li>
            <li>• A prenote verification will be sent to validate your account</li>
            <li>• Contact HR immediately if any banking information changes</li>
          </ul>
        </div>

        {/* Authorization Statement */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            I hereby authorize {data.employerName || 'the Company'} to deposit my wages directly into the bank account(s) listed above. I understand that this authorization will remain in effect until I provide written notice of cancellation to the Payroll Department, allowing reasonable time for the change to take effect.
          </p>
        </div>
      </div>
    )
  }

  const agreementText = language === 'en' 
    ? "I authorize my employer to deposit my wages into the account(s) specified above. I understand that it is my responsibility to ensure the accuracy of the information provided and to notify the company immediately of any changes."
    : "Autorizo a mi empleador a depositar mi salario en la(s) cuenta(s) especificada(s) arriba. Entiendo que es mi responsabilidad asegurar la exactitud de la información proporcionada y notificar a la empresa inmediatamente de cualquier cambio."

  return (
    <ReviewAndSign
      formType="direct_deposit"
      formData={formData}
      title={language === 'en' ? 'Direct Deposit Authorization' : 'Autorización de Depósito Directo'}
      description={language === 'en' 
        ? 'Employee authorization for electronic wage payment' 
        : 'Autorización del empleado para pago electrónico de salarios'}
      language={language}
      onSign={onSign}
      onBack={onBack}
      renderPreview={renderDirectDepositPreview}
      signatureLabel={formData.employeeName || 'Employee'}
      agreementText={agreementText}
    />
  )
}