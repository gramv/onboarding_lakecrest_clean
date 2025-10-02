import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText, Users } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';

interface WeaponsPolicyAcknowledgmentProps {
  onComplete: (data: any) => void;
  language?: 'en' | 'es';
}

const WeaponsPolicyAcknowledgment: React.FC<WeaponsPolicyAcknowledgmentProps> = ({
  onComplete,
  language = 'en'
}) => {
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  const content = {
    en: {
      title: "Weapons and Workplace Violence Prevention Policy",
      subtitle: "Required Acknowledgment - Please Read Carefully",
      policy: {
        title: "Company Weapons Policy",
        sections: [
          {
            title: "Prohibited Items",
            icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
            content: [
              "Firearms, guns, pistols, revolvers, or any other weapon designed to propel a projectile",
              "Knives with blades longer than 3 inches (except for approved kitchen/work tools)",
              "Explosives, ammunition, or incendiary devices",
              "Chemical sprays, mace, or pepper spray (except where required by job duties)",
              "Martial arts weapons including nunchucks, throwing stars, or batons",
              "Any item that could reasonably be considered a weapon or used to threaten or intimidate"
            ]
          },
          {
            title: "Workplace Violence Prevention",
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            content: [
              "Threatening, intimidating, or hostile behavior toward any person is strictly prohibited",
              "Physical altercations, fighting, or aggressive behavior will result in immediate termination",
              "Verbal threats, including threats made in jest, are taken seriously and prohibited",
              "Harassment, stalking, or intimidation of employees, guests, or visitors is forbidden",
              "Reporting suspicious behavior or potential threats is encouraged and protected"
            ]
          },
          {
            title: "Enforcement and Consequences",
            icon: <FileText className="w-6 h-6 text-orange-500" />,
            content: [
              "Violation of this policy will result in immediate disciplinary action, up to and including termination",
              "Criminal violations will be reported to law enforcement authorities",
              "The company reserves the right to search personal belongings, lockers, and vehicles on company property",
              "Employees who report violations in good faith will be protected from retaliation",
              "This policy applies to all company property, company-sponsored events, and work-related activities"
            ]
          },
          {
            title: "Reporting Procedures",
            icon: <Users className="w-6 h-6 text-green-500" />,
            content: [
              "Report any policy violations immediately to your supervisor or HR department",
              "In case of immediate danger, call 911 first, then notify management",
              "Anonymous reporting is available through the company hotline",
              "All reports will be investigated promptly and thoroughly",
              "Confidentiality will be maintained to the extent possible during investigations"
            ]
          }
        ],
        exceptions: [
          "Law enforcement officers acting in their official capacity",
          "Security personnel specifically authorized by the company",
          "Kitchen staff using approved culinary knives within designated work areas",
          "Maintenance staff using approved tools within the scope of their duties"
        ]
      },
      acknowledgments: [
        "I have read and understood the complete Weapons and Workplace Violence Prevention Policy",
        "I understand that bringing prohibited weapons or items to the workplace is grounds for immediate termination",
        "I agree to report any violations of this policy that I observe",
        "I understand that this policy applies to all company property and company-related activities",
        "I acknowledge that the company may search personal belongings and vehicles on company property",
        "I understand that making threats, even in jest, is prohibited and subject to disciplinary action"
      ],
      signatureSection: {
        title: "Employee Acknowledgment and Signature",
        statement: "By signing below, I acknowledge that I have read, understood, and agree to comply with the Weapons and Workplace Violence Prevention Policy. I understand that violation of this policy may result in disciplinary action up to and including termination of employment."
      }
    },
    es: {
      title: "Política de Armas y Prevención de Violencia en el Lugar de Trabajo",
      subtitle: "Reconocimiento Requerido - Por Favor Lea Cuidadosamente",
      policy: {
        title: "Política de Armas de la Empresa",
        sections: [],
        exceptions: []
      },
      acknowledgments: [],
      signatureSection: {
        title: "Reconocimiento y Firma del Empleado",
        statement: "Al firmar abajo, reconozco que he leído, entendido y acepto cumplir con la Política de Armas y Prevención de Violencia en el Lugar de Trabajo."
      }
    }
  };

  const currentContent = content[language];

  const handleAcknowledgmentChange = (index: number, checked: boolean) => {
    setAcknowledgments({
      ...acknowledgments,
      [index]: checked
    });
  };

  const handleSignature = (signatureData: any) => {
    setSignatureData(signatureData.signatureData);
  };

  const allAcknowledgmentsChecked = currentContent.acknowledgments.every(
    (_, index) => acknowledgments[index] === true
  );

  const canComplete = hasReadPolicy && allAcknowledgmentsChecked && signatureData;

  const handleComplete = () => {
    if (!canComplete) return;

    const completionData = {
      policy_read: hasReadPolicy,
      acknowledgments: acknowledgments,
      signature_data: signatureData,
      completed_at: new Date().toISOString(),
      language: language,
      ip_address: '', // Would be captured on backend
      user_agent: navigator.userAgent
    };

    setIsComplete(true);
    onComplete(completionData);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Policy Acknowledgment Complete</h2>
          <p className="text-gray-600">Your acknowledgment has been recorded and saved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{currentContent.title}</h1>
              <p className="text-gray-600">{currentContent.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Policy Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentContent.policy.title}</h2>
          
          <div className="space-y-8">
            {currentContent.policy.sections.map((section, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-6">
                <div className="flex items-center gap-3 mb-4">
                  {section.icon}
                  <h3 className="text-xl font-semibold text-gray-800">{section.title}</h3>
                </div>
                <ul className="space-y-2">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Exceptions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-3">Limited Exceptions</h4>
            <ul className="space-y-1">
              {currentContent.policy.exceptions.map((exception, index) => (
                <li key={index} className="flex items-start gap-2 text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{exception}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Read Confirmation */}
          <div className="mt-6 flex items-center gap-3">
            <input
              type="checkbox"
              id="policy-read"
              checked={hasReadPolicy}
              onChange={(e) => setHasReadPolicy(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="policy-read" className="text-gray-700 font-medium">
              I have read and understand the complete policy above
            </label>
          </div>
        </div>

        {/* Acknowledgments */}
        {hasReadPolicy && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Required Acknowledgments</h3>
            <div className="space-y-4">
              {currentContent.acknowledgments.map((acknowledgment, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`ack-${index}`}
                    checked={acknowledgments[index] || false}
                    onChange={(e) => handleAcknowledgmentChange(index, e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-1"
                  />
                  <label htmlFor={`ack-${index}`} className="text-gray-700 leading-relaxed">
                    {acknowledgment}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Section */}
        {hasReadPolicy && allAcknowledgmentsChecked && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {currentContent.signatureSection.title}
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-gray-700 leading-relaxed">
                {currentContent.signatureSection.statement}
              </p>
            </div>

            <DigitalSignatureCapture
              documentName="Weapons and Workplace Violence Prevention Policy"
              signerName="Employee"
              acknowledgments={currentContent.acknowledgments}
              requireIdentityVerification={true}
              language={language}
              onSignatureComplete={handleSignature}
              onCancel={() => {}}
            />
          </div>
        )}

        {/* Complete Button */}
        {canComplete && (
          <div className="text-center">
            <button
              onClick={handleComplete}
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
            >
              Submit Policy Acknowledgment
            </button>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-500 mb-2">Completion Progress</div>
          <div className="flex justify-center gap-4">
            <div className={`flex items-center gap-2 ${hasReadPolicy ? 'text-green-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-4 h-4" />
              <span>Policy Read</span>
            </div>
            <div className={`flex items-center gap-2 ${allAcknowledgmentsChecked ? 'text-green-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-4 h-4" />
              <span>Acknowledgments</span>
            </div>
            <div className={`flex items-center gap-2 ${signatureData ? 'text-green-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-4 h-4" />
              <span>Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeaponsPolicyAcknowledgment;