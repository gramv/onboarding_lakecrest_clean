/**
 * Federal Compliance Disclaimer Component
 * 
 * CRITICAL: This component provides legally required federal compliance disclaimers
 * and warnings for hotel employee onboarding. All text must meet federal law
 * requirements for employment compliance notices.
 */

import React, { useState } from 'react'
import { AlertTriangle, Shield, Scale, FileText, Gavel, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface FederalComplianceDisclaimerProps {
  onAcceptance: (accepted: boolean) => void
  complianceType: 'general' | 'age_verification' | 'i9_form' | 'w4_form' | 'comprehensive'
}

export default function FederalComplianceDisclaimer({ 
  onAcceptance, 
  complianceType 
}: FederalComplianceDisclaimerProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const complianceContent = {
    general: {
      title: "Federal Employment Law Compliance Notice",
      subtitle: "Required disclosure under federal employment regulations",
      icon: Scale,
      legalReferences: [
        "Fair Labor Standards Act (FLSA) - 29 U.S.C. § 203",
        "Immigration and Nationality Act (INA) - 8 U.S.C. § 1324a",
        "Internal Revenue Code (IRC) - 26 U.S.C. § 3402",
        "Equal Employment Opportunity Commission (EEOC) Guidelines"
      ],
      content: [
        {
          section: "Age Requirements",
          text: "Federal law requires employees to be at least 18 years old for most hotel positions. Employment of individuals under 18 may violate federal child labor laws and result in significant penalties."
        },
        {
          section: "Employment Authorization",
          text: "All employees must be legally authorized to work in the United States. Form I-9 verification is required by federal immigration law."
        },
        {
          section: "Tax Compliance",
          text: "Federal tax withholding requires accurate completion of Form W-4. False statements may result in penalties under federal tax law."
        },
        {
          section: "Legal Consequences",
          text: "Violations of federal employment laws may result in civil and criminal penalties, including fines, imprisonment, and permanent employment restrictions."
        }
      ]
    },
    age_verification: {
      title: "Federal Age Verification Requirement",
      subtitle: "CRITICAL: Fair Labor Standards Act (FLSA) Compliance",
      icon: AlertTriangle,
      legalReferences: [
        "Fair Labor Standards Act Section 203 - 29 U.S.C. § 203",
        "Child Labor Provisions - 29 CFR § 570",
        "Department of Labor Wage and Hour Division Guidelines"
      ],
      content: [
        {
          section: "FEDERAL LAW REQUIREMENT",
          text: "Under the Fair Labor Standards Act (FLSA), employees must be at least 18 years old to work in most hotel positions. This is not a company policy - it is federal law."
        },
        {
          section: "NO EXCEPTIONS",
          text: "There are very limited exceptions for minors in the hospitality industry, and these require special work permits and strict hour limitations. Standard hotel operations positions cannot be filled by minors."
        },
        {
          section: "LEGAL PENALTIES",
          text: "Employers who violate federal child labor laws face civil penalties up to $15,138 per violation. Willful or repeated violations may result in criminal prosecution."
        },
        {
          section: "VERIFICATION REQUIRED",
          text: "Age verification through official government-issued identification is required before employment can proceed. False age representation is a federal offense."
        }
      ]
    },
    i9_form: {
      title: "Form I-9 Federal Immigration Compliance",
      subtitle: "Required under Immigration and Nationality Act Section 274A",
      icon: FileText,
      legalReferences: [
        "Immigration and Nationality Act Section 274A - 8 U.S.C. § 1324a",
        "Code of Federal Regulations - 8 CFR § 274a",
        "U.S. Citizenship and Immigration Services (USCIS) Guidelines",
        "Department of Homeland Security Regulations"
      ],
      content: [
        {
          section: "FEDERAL REQUIREMENT",
          text: "Form I-9 completion is required by federal immigration law for ALL employees, regardless of citizenship status. This is mandatory for legal employment in the United States."
        },
        {
          section: "PERJURY WARNING",
          text: "Form I-9 information is provided under penalty of perjury. False statements or use of false documents may result in criminal prosecution, including fines up to $3,000 and imprisonment up to 5 years."
        },
        {
          section: "WORK AUTHORIZATION",
          text: "You must be legally authorized to work in the United States. Unauthorized employment is a federal crime for both employee and employer."
        },
        {
          section: "DOCUMENT VERIFICATION",
          text: "Acceptable documents must be original, unexpired, and reasonably appear genuine. Fraudulent documents are subject to federal criminal penalties."
        }
      ]
    },
    w4_form: {
      title: "Form W-4 Federal Tax Compliance",
      subtitle: "Required under Internal Revenue Code Section 3402",
      icon: Shield,
      legalReferences: [
        "Internal Revenue Code Section 3402 - 26 U.S.C. § 3402",
        "IRS Publication 15 - Employer's Tax Guide",
        "Treasury Regulations - 26 CFR § 31.3402",
        "IRS Circular E Guidelines"
      ],
      content: [
        {
          section: "FEDERAL TAX REQUIREMENT",
          text: "Form W-4 completion is required by federal tax law for proper income tax withholding. Accurate information is mandatory for tax compliance."
        },
        {
          section: "PERJURY DECLARATION",
          text: "Form W-4 is signed under penalties of perjury. False statements may result in civil penalties up to $500 per violation and criminal prosecution for tax fraud."
        },
        {
          section: "WITHHOLDING ACCURACY",
          text: "Deliberately providing false information to reduce tax withholding is tax fraud, punishable by fines and imprisonment under federal tax law."
        },
        {
          section: "IRS REPORTING",
          text: "W-4 information is reported to the IRS. Discrepancies between claimed exemptions and actual tax liability may trigger federal investigation."
        }
      ]
    },
    comprehensive: {
      title: "Comprehensive Federal Employment Compliance",
      subtitle: "Complete disclosure of all federal employment law requirements",
      icon: Gavel,
      legalReferences: [
        "Fair Labor Standards Act (FLSA) - 29 U.S.C. § 203",
        "Immigration and Nationality Act (INA) - 8 U.S.C. § 1324a", 
        "Internal Revenue Code (IRC) - 26 U.S.C. § 3402",
        "Equal Employment Opportunity Commission (EEOC) - 42 U.S.C. § 2000e",
        "Occupational Safety and Health Act (OSHA) - 29 U.S.C. § 651"
      ],
      content: [
        {
          section: "FEDERAL COMPLIANCE REQUIREMENT",
          text: "Your employment is subject to multiple federal laws that require strict compliance. Violations can result in termination, legal penalties, and permanent employment restrictions."
        },
        {
          section: "AGE AND LABOR STANDARDS",
          text: "Federal child labor laws strictly prohibit employment of individuals under 18 in most hotel positions. Age verification is mandatory and violations carry severe penalties."
        },
        {
          section: "IMMIGRATION AND WORK AUTHORIZATION",
          text: "Federal immigration law requires verification of work authorization for all employees. Form I-9 completion is mandatory, and false statements constitute federal crimes."
        },
        {
          section: "TAX COMPLIANCE",
          text: "Federal tax law requires accurate W-4 completion for proper withholding. False statements may result in civil and criminal tax penalties."
        },
        {
          section: "AUDIT AND ENFORCEMENT",
          text: "Federal agencies regularly audit employment compliance. All validation data is logged for legal compliance documentation and may be reviewed by federal investigators."
        },
        {
          section: "LEGAL CONSEQUENCES",
          text: "Violations of federal employment laws may result in: (1) Immediate termination, (2) Civil penalties up to $15,138 per violation, (3) Criminal prosecution with fines and imprisonment, (4) Permanent exclusion from federal employment programs."
        }
      ]
    }
  }

  const content = complianceContent[complianceType]
  const IconComponent = content.icon

  const handleAcceptAll = () => {
    if (acknowledged && understood && accepted) {
      onAcceptance(true)
    }
  }

  const canProceed = acknowledged && understood && accepted

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Critical Warning Banner */}
        <Alert className="bg-red-50 border-red-500 border-2 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-bold text-lg mb-2">🚨 FEDERAL LAW COMPLIANCE REQUIRED</div>
            <div className="text-sm">
              This notice contains legally required federal employment law disclosures. 
              You must read and acknowledge all requirements before proceeding. 
              Failure to comply with federal employment laws may result in legal consequences.
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Compliance Card */}
        <Card className="border-2 border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-full">
                <IconComponent className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-red-800">{content.title}</CardTitle>
                <CardDescription className="text-red-700 font-semibold">
                  {content.subtitle}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Legal References */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Scale className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-blue-800">Legal Authority and References:</h3>
              </div>
              <ul className="space-y-1">
                {content.legalReferences.map((ref, index) => (
                  <li key={index} className="text-blue-700 text-sm flex items-center">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    {ref}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content Sections */}
            <div className="space-y-4">
              {content.content.map((section, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-2 text-lg">{section.section}</h4>
                  <p className="text-gray-700 leading-relaxed">{section.text}</p>
                </div>
              ))}
            </div>

            {/* Additional Warnings */}
            <Alert className="bg-yellow-50 border-yellow-400">
              <Gavel className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="font-bold mb-1">⚖️ IMPORTANT LEGAL NOTICE:</div>
                <div className="text-sm">
                  This disclosure is provided to ensure compliance with federal employment laws. 
                  If you have questions about your legal obligations, consult with qualified legal counsel. 
                  The company cannot provide legal advice regarding federal compliance requirements.
                </div>
              </AlertDescription>
            </Alert>

            {/* Acknowledgment Section */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-gray-800 text-xl mb-4">REQUIRED ACKNOWLEDGMENTS</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acknowledged"
                    checked={acknowledged}
                    onCheckedChange={setAcknowledged}
                    className="mt-1"
                  />
                  <label htmlFor="acknowledged" className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold">I ACKNOWLEDGE</span> that I have read and received this federal 
                    employment law compliance notice. I understand that this information is provided 
                    to ensure compliance with federal employment regulations.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="understood"
                    checked={understood}
                    onCheckedChange={setUnderstood}
                    className="mt-1"
                  />
                  <label htmlFor="understood" className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold">I UNDERSTAND</span> that violations of federal employment laws 
                    may result in civil and criminal penalties, including fines, imprisonment, and 
                    termination of employment. I understand my legal obligations as an employee.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="accepted"
                    checked={accepted}
                    onCheckedChange={setAccepted}
                    className="mt-1"
                  />
                  <label htmlFor="accepted" className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold">I AGREE</span> to comply with all federal employment laws 
                    and regulations. I certify that all information I provide will be true, accurate, 
                    and complete. I understand that false statements may result in legal consequences.
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <Button
                  onClick={handleAcceptAll}
                  disabled={!canProceed}
                  className={`w-full py-4 text-lg font-semibold transition-all ${
                    canProceed 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canProceed ? (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Proceed with Federal Compliance Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Complete All Acknowledgments to Proceed</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-xs text-gray-500 text-center border-t pt-4">
              <div>Federal Compliance Notice Generated: {new Date().toLocaleDateString()}</div>
              <div>This notice complies with federal employment law disclosure requirements</div>
              <div>For legal questions, consult qualified employment law counsel</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}