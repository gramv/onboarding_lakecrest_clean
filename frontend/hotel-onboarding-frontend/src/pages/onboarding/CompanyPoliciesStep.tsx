import React, { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DigitalSignatureCapture from '@/components/DigitalSignatureCapture'
import ReviewAndSign from '@/components/ReviewAndSign'
import { CheckCircle, Building, FileText, ScrollText, PenTool, Check, Shield, Briefcase, Lock, Heart, AlertCircle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import PDFViewer from '@/components/PDFViewer'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { companyPoliciesValidator } from '@/utils/stepValidators'
import { scrollToTop } from '@/utils/scrollHelpers'
import { fetchStepDocumentMetadata, listStepDocuments, StepDocumentMetadata } from '@/services/documentService'
import StepNavigator from '@/components/navigation/StepNavigator'
import { StepStatus } from '@/types/onboarding'
import { cn } from '@/lib/utils'

// Helper component to render formatted text with bold markdown and HTML tables
const FormattedPolicyText = ({ text, className = '' }: { text: string; className?: string }) => {
  // Check if text contains HTML table
  if (text.includes('<table')) {
    // Process the text in segments - handle tables and markdown separately
    const segments = text.split(/(<table[\s\S]*?<\/table>)/g)
    
    return (
      <div className={`font-sans text-gray-700 ${className}`}>
        {segments.map((segment, segmentIndex) => {
          if (segment.startsWith('<table')) {
            // Render table as HTML
            return (
              <div 
                key={segmentIndex}
                dangerouslySetInnerHTML={{ __html: segment }}
                className="my-4"
              />
            )
          } else {
            // Process markdown for non-table segments
            const parts = segment.split(/\*\*(.*?)\*\*/g)
            return (
              <div key={segmentIndex} className="whitespace-pre-wrap">
                {parts.map((part, index) => {
                  // Even indexes are normal text, odd indexes are bold
                  if (index % 2 === 0) {
                    return <span key={index}>{part}</span>
                  } else {
                    return <strong key={index} className="font-bold">{part}</strong>
                  }
                })}
              </div>
            )
          }
        })}
      </div>
    )
  }
  
  // Original logic for text without tables
  const parts = text.split(/\*\*(.*?)\*\*/g)
  
  return (
    <div className={`whitespace-pre-wrap font-sans text-gray-700 ${className}`}>
      {parts.map((part, index) => {
        // Even indexes are normal text, odd indexes are bold
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>
        } else {
          return <strong key={index} className="font-bold">{part}</strong>
        }
      })}
    </div>
  )
}

// All Company Policies merged into one section
const COMPANY_POLICIES_TEXT = `**AT WILL EMPLOYMENT**

Your employment relationship with the Hotel is 'At-Will' which means that it is a voluntary one which may by be terminated by either the Hotel or yourself, with or without cause, and with or without notice, at any time. Nothing in these policies shall be interpreted to be in conflict with or to eliminate or modify in any way the 'employment-at-will' status of Hotel associates.

**WORKPLACE VIOLENCE PREVENTION POLICY**

The Hotel strives to maintain a productive work environment free of violence and the threat of violence. We are committed to the safety of our associates, vendors, customers and visitors.

The Hotel does not tolerate any type of workplace violence committed by or against associates. Any threats or acts of violence against an associate, vendor customer, visitor or property will not be tolerated. Any associate who threatens violence or acts in a violent manner while on Hotel premises, or during working hours will be subject to disciplinary action, up to and including termination. Where appropriate, the Hotel will report violent incidents to local law enforcement authorities.

A violent act, or threat of violence, is defined as any direct or indirect action or behavior that could be interpreted, in light of known facts, circumstances and information, by a reasonable person, as indicating the potential for or intent to harm, endanger or inflict pain or injury on any person or property.

Examples of prohibited conduct include but are not limited to:
• Physical assault, threat to assault or stalking an associate or customer;
• Possessing or threatening with a weapon on hotel premises;
• Intentionally damaging property of the Hotel or personal property of another;
• Aggressive or hostile behavior that creates a reasonable fear of injury to another person;
• Harassing or intimidating statements, phone calls, voice mails, or e-mail messages, or those which are unwanted or deemed offensive by the receiver, including cursing and/or name calling;
• Racial or cultural epithets or other derogatory remarks associated with hate crime threats.
• Conduct that threatens, intimidates or coerces another associate, customer, vendor or business associate
• Use of hotel resources to threaten, stalk or harass anyone at the workplace or outside of the workplace.

The Hotel treats threats coming from an abusive personal relationship as it does other forms of violence and associates should promptly inform their immediate supervisor or General Manager of any protective or restraining order that they have obtained that lists the workplace as a protected area.

Any associate who feels threatened or is subjected to violent conduct or who witnesses threatening or violent conduct at the workplace should report the incident to his or her supervisor or any member of management immediately. In addition, associates should report all suspicious individuals or activities as soon as possible.

Associates who are not comfortable reporting incidents at the property level may contact the administrative office at **(908) 444-8139** or via email at **njbackoffice@lakecrest.com**. A representative will promptly and thoroughly investigate all reports of threats or actual violence as well as suspicious individuals and activities at the workplace.

The Hotel will not retaliate against associates making good-faith reports of violence, threats or suspicious individuals or activities.

Anyone determined to be responsible for threats of or actual violence or other conduct that is in violation of this policy will be subject to disciplinary action, up to and including termination.

In order to maintain workplace safety and the integrity of its investigation, the Hotel may suspend associates suspected of workplace violence or threats of violence, either with or without pay, pending investigation.

The Hotel strictly forbids any employee to possess, concealed, or otherwise, any weapon on their person while on the Hotel premises, including but not limited to fire arms. The Hotel also forbids brandishing firearms in the parking lot (other than for lawful self-defense) and prohibiting threats or threatening behavior of any type.

**SURVEILLANCE**

For safety, visual and audio recording devices are installed throughout the property and the footage is recorded.

**PAY, PAY PERIOD AND PAY DAY**

Associates are paid biweekly (every other week) for their hours worked during the preceding pay period.

• A pay period consists of two consecutive pay weeks, at 7 days per week.

For employees who haves elected direct deposit as payment method, a pay stub will not be issued at the Hotel. Contact your General Manager for electronic access to your pay stub through a payroll portal. For employees who do not select direct deposit, a check and pay stub will be made available for you, customarily on Friday by 1PM local time. Employee pay checks will not be released to anyone other than you, except with your written permission (required for every instance), and submitted to your General Manager.

Non-exempt associates will be paid for all work in excess of 40 hours a week at hourly rate plus ½ hourly wages, in accordance with Federal and State laws.
• Overtime must be approved by your manager before it is performed.
• Personal Time Off will not be counted towards hours worked for overtime calculations.

Failure to work scheduled overtime or overtime worked without prior authorization from the supervisor may result in disciplinary action, up to and including possible termination of employment.

**FRATERNIZING WITH GUESTS AND DATING AT THE WORK PLACE**

Contact with guests, other than in the normal course of day-to-day operations of the hotel is not permitted at any time. Unauthorized presence at guest functions, or unauthorized presence anywhere on the hotel premises, including guest rooms, may be considered a violation of Hotel policy and disciplinary action may result.

Supervisors and associates under their supervision are strongly discouraged from forming romantic or sexual relationships. Such relationships can create the impression of impropriety in terms and conditions of employment and can interfere with productivity and the overall work environment.

If you are unsure of the appropriateness of an interaction with another associate of the Hotel, contact any member of management or the administrative office for guidance.

If you are encouraged or pressured to become involved with a customer or associate in a way that makes you feel uncomfortable, you should also notify management immediately.

**CONTACT WITH MEDIA**

In the event that you are contacted by any member of the media or any outside party regarding hotel business or incident, occurring on or off property, kindly refer such inquiries to your General Manager.

**ELECTRONIC MAIL**

Electronic mail may be provided to facilitate the business of the Hotel. It is to be used for business purposes only. The electronic mail and other information systems are not to be used in a way that may be disruptive, offensive to others, or harmful to morale.

Specifically, it is against Hotel policy to display or transmit sexually explicit messages, or cartoons. Therefore, any such transmission or use of e-mail that contain ethnic slurs, racial epithets, or anything else that may be construed as harassment or offensive to others based on their race, national origin, sex, sexual orientation, age, disability, religious, or political beliefs is strictly prohibited and could result in appropriate disciplinary action up to and including termination.

Destroying or deleting e-mail messages which are considered business records is strictly prohibited. The Hotel reserves the right to monitor all electronic mail retention and take appropriate management action, if necessary, including disciplinary action, for violations of this policy up to and including termination.

The Hotel reserves the right to take immediate action, up to and including termination, regarding activities (1) that create security and/or safety issues for the Hotel, associates, vendors, network or computer resources, or (2) that expend Hotel resources on content the Hotel in its sole discretion determines lacks legitimate business content/purpose, (3) other activities as determined by Hotel as inappropriate, or (4) violation of any federal or state regulations.

**REMOVAL OF ITEMS OFF HOTEL PREMISES**

No items other than an associate's own personal property may be removed from Hotel premises without authorization. Permission must be obtained from your General Manager in order to remove any item from the hotel premises. (An example of such is a small article of minimal value that the guest did not take with him/her). The hotel has the right of inspection and retention of any such items suspected to being removed from the premises. At no time is food of any type or form, full or partial, containers of alcoholic beverages to be removed from the Hotel.

**ACCESS TO HOTEL FACILITIES AND SOLICITATION POLICY**

The hotel and its facilities are for the use and enjoyment of the hotel guests. Associates are to leave the building and premises immediately after their scheduled shifts. Returning to the hotel after scheduled hours for any reason is not permitted without previous approval from the General Manager.

Only associates, guests, visitors, vendors and suppliers doing business with the Hotel or its affiliates are permitted at any time on the Hotel's premises. Persons other than associates of the Hotel may never engage in solicitation, distribution or postings of written or printed materials of any nature at any time in or on the Hotel's premises.

Employees are prohibited from engaging in solicitation or distribution of any kind during working time, in any working areas, including guest rooms, guest dining areas, parking lot or areas within the Hotel where guests congregate (lobby, lounge, etc.).

For the purpose of this policy, "working time" includes the working time of both the associate doing the solicitation or distribution and the associate to whom it is directed, but does not include break, lunch or other duty-free periods of time.

Off-duty associates are not permitted access to the interior of the Hotel's premises except where they are attending a Hotel event, or to conduct business with the Hotel's management or administrative office that cannot be conducted during the associate's regular work shift. Unless explicitly approved by the asset manager, associates are not permitted to stay on property.

**HAZARD COMMUNICATION PLAN**

The Hotel values employee safety and gives it the utmost priority. A Hazard Communication Plan is located in the Hotel, which each employee is required to review prior to start of their first shift of work. Please ask your General Manager where it is located.

**PAID TIME OFF AND HOLIDAY POLICY**

The Company offers PTO to 'regular full-time and part-time associates' only. Temporary/seasonal associates do not earn PTO. Eligible associates begin to accrue PTO immediately, at hire and accrual is rate is only based on regular hours worked. This PTO can be used for any reason that the associate deems appropriate, with advance notice and management approval, and is paid at the rate of pay when PTO is paid out. All PTO earned during each calendar year will be paid out on the last payroll of the calendar year. If associates choose, they may elect to carry over no more than 5 hours of PTO can be carried over into the following year. The rate of accrual and maximum PTO hours that an associate may accrue during a given calendar year will vary with the associate's length of service and hours worked.

<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <thead>
    <tr style="background-color: #f3f4f6;">
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">YEAR OF EMPLOYMENT</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">PTO ACCRUAL RATE<br/>NON-EXEMPT/HOURLY ASSOCIATES<br/>(PER PAID HOUR)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">ACCRUED PTO PER ANNIVERSARY YEAR<br/>(ASSUMING 2080 HOURS WORKED PER YR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px;">1 - 3</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">0.019</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">5 days (40 hours)</td>
    </tr>
    <tr style="background-color: #f9fafb;">
      <td style="border: 1px solid #d1d5db; padding: 8px;">4 - 8</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">0.027</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">7 days (56 hours)</td>
    </tr>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px;">9 +</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">0.038</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">10 days (80 hours)</td>
    </tr>
  </tbody>
</table>

Notes:
• PTO is granted as a benefit and in order to be paid for this benefit, the day(s) must be taken off.
• Upon termination of employment, associate is not be entitled for payment of any unused PTO, regardless of when it was earned or reason for termination.
• All requests for days off/PTO must be in submitted in advance in writing and approved by your manager.
• Associates can not borrow from their PTO and will accrue PTO when working at the rates specified in the table above.
• PTO is paid at the pay rate at time of payment.

The Company pays associates for six holidays, in addition to accrued PTO. Full time employees are paid for 8 hours, at regular pay. Part time employees, classified as working less than 30 hours a week will be paid for 4 hours.

• New Year's Day (January 1)
• Memorial Day
• Independence Day (July 4)
• Labor Day
• Thanksgiving Day
• Christmas Day (December 25)

The above policy supersedes any previously communicated policies, including any previously issued employee handbooks.

**DRUG-FREE WORKPLACE POLICY**

The Hotel is committed to maintaining a drug-free workplace. The use, possession, distribution, or being under the influence of illegal drugs or alcohol during work hours is strictly prohibited. Employees may be subject to drug testing as a condition of employment, after accidents, or based on reasonable suspicion. Violation of this policy will result in immediate termination.

**BACKGROUND CHECK AUTHORIZATION**

As a condition of employment, all employees must pass a background check. This may include criminal history, employment verification, education verification, and credit checks where applicable. By accepting employment, you authorize the Hotel to conduct these checks both pre-employment and during employment as necessary.

**MANDATORY ARBITRATION AGREEMENT**

Any dispute arising out of or relating to your employment, including claims of discrimination, harassment, wrongful termination, or wage disputes, shall be resolved through binding arbitration rather than court proceedings. By accepting employment, you waive your right to a jury trial for employment-related disputes.

**EMPLOYEE HANDBOOK ACKNOWLEDGMENT**

I acknowledge that I have received access to the Employee Handbook and understand it is my responsibility to read and comply with all policies contained therein. I understand that the handbook may be updated at any time and it is my responsibility to stay informed of changes. The handbook does not constitute an employment contract.

**WEAPONS POLICY**

The Company strictly forbids any employee to possess, concealed, or otherwise, any weapon on their person while on the Hotel premises. This includes but is not limited to fire arms, knives, etc and regardless of whether an Employee possesses any governmental licenses and/or approvals. The Company also forbids brandishing firearms in the parking lot (other than for lawful self-defense) and prohibiting threats or threatening behavior of any type. Violation of this policy may lead to disciplinary action, up to and including termination of employment.`

// Equal Employment Opportunity Policy (requiring initials)
const EEO_POLICY = {
  title: 'EQUAL EMPLOYMENT OPPORTUNITY',
  content: `Your employer (the "Hotel") provides equal employment opportunities to all employees and applicants for employment without regard to race, color, religion, sex, sexual orientation, national origin, age, disability, genetic predisposition, military or veteran status in accordance with applicable federal, state or local laws. This policy applies to all terms and conditions of employment, including but not limited to, hiring, placement, promotion, termination, transfer, leaves of absence, compensation, and training.`
}

// Sexual Harassment Policy (requiring initials)
const SEXUAL_HARASSMENT_POLICY = {
  title: 'SEXUAL AND OTHER UNLAWFUL HARASSMENT',
  content: `We are committed to providing a work environment that is free from sexual discrimination and sexual harassment in any form, as well as unlawful harassment based upon any other protected characteristic. In keeping with that commitment, we have established procedures by which allegations of sexual or other unlawful harassment may be reported, investigated and resolved. Each manager and associate has the responsibility to maintain a workplace free of sexual and other unlawful harassment. This duty includes ensuring that associates do not endure insulting, degrading or exploitative sexual treatment.

Sexual harassment is a form of associate misconduct which interferes with work productivity and wrongfully deprives associates of the opportunity to work in an environment free from unsolicited and unwelcome sexual advances, requests for sexual favors and other such verbal or physical conduct. Sexual harassment has many different definitions and it is not the intent of this policy to limit the definition of sexual harassment, but rather to give associates as much guidance as possible concerning what activities may constitute sexual harassment.

Prohibited conduct includes, but is not limited to, unwelcome sexual advances, requests for sexual favors and other similar verbal or physical contact of a sexual nature where:
• Submission to such conduct is either an explicit or implicit condition of employment;
• Submission to or rejection of such conduct is used as a basis for making an employment-related decision;
• The conduct unreasonably interferes with an individual's work performance; or
• The conduct creates a hostile, intimidating or offensive work environment.

Sexual harassment may be male to female, female to male, female to female or male to male. Similarly, other unlawful harassment may be committed by and between individuals who share the same protected characteristics, such as race, age or national origin. Actions which may result in charges of sexual harassment include, but are not limited to, the following:
• Unwelcome physical contact, including touching on any part of the body, kissing, hugging or standing so close as to brush up against another person;
• Requests for sexual favors either directly or indirectly;
• Requiring explicit or implicit sexual conduct as a condition of employment, a condition of obtaining a raise, a condition of obtaining new duties or any type of advancement in the workplace; or
• Requiring an associate to perform certain duties or responsibilities simply because of his or her gender or other protected characteristic.

Other behavior that may seem innocent or acceptable to some people can constitute sexual harassment to others. Prohibited behaviors include, but are not limited to:
• unwelcome sexual flirtations, advances, jokes or propositions;
• unwelcome comments about an individual's body or personal life;
• openly discussing intimate details of one's own personal life;
• sexually degrading words to describe an individual; or
• displays in the workplace of objects, pictures, cartoons or writings, which might be perceived as sexually suggestive.

Unwelcome conduct such as degrading jokes, foul language direct to or at a person, racial slurs, comments, cartoons or writing based upon any other protected characteristic is similarly prohibited.

All associates are required to report any incidents of sexual or other unlawful harassment of which they have knowledge. Similarly, if you ever feel aggrieved because of sexual harassment, you have an obligation to communicate the problem immediately and should report such concerns to your manager, and/or the offending associate directly. If this is not an acceptable option, you should report your concern directly to the administrative office confidentially. In all cases in which a manager or another member of management is notified first, the administrative office should be notified immediately. Management has an obligation to report any suspected violations of this policy to the asset manager. A manager who is aware of a violation, even if the associate is outside the manager's immediate area of supervision, but doesn't report it, will be held accountable for his or her inaction. The asset manager shall conduct a prompt investigation of the allegations to obtain the facts from any and all parties or witnesses.

While we will attempt to maintain the confidentiality of the information received, it will not always be possible to do so. Should the facts support the allegations made, we will remedy the situation and, if appropriate under the circumstances, take disciplinary action up to and including termination.`
}

// Confidential Associate Hotline (from page 20)
const CONFIDENTIAL_HOTLINE_TEXT = `**CONFIDENTIAL ASSOCIATE HOTLINE**

We rely on our associates to protect the assets and reputation of our company. If you have knowledge of:

**THEFT, HARASSMENT, ABUSE, DANGEROUS, SUSPICIOUS OR QUESTIONABLE PRACTICES**

Send an e-mail to: **feedback@lakecrest.com**

**ALL REPORTS WILL BE CONFIDENTIAL AND TAKEN SERIOUSLY**

When reporting, please remember to:
• Identify the name of the hotel where the incident occurred
• Explain details of the Incident to include:
  - Date(s)
  - Time(s)
  - Name(s) of involved person(s)
  - A clear, detailed account of the event

Our 'No Retaliation' policy strictly prohibits any adverse action taken on employees who, in good faith, file a report.`

// Acknowledgment text (from page 9)
const ACKNOWLEDGMENT_TEXT = `In consideration of my employment, I agree to conform to the rules and regulations of the Hotel. I understand my employment and compensation can be terminated, with or without cause, with or without notice, at any time and at the option of either the Hotel or myself. I understand that no representative of the Hotel has any authority to enter into any agreement of employment for any specific period of time or to make any agreement contrary to this paragraph. I further understand that if, during the course of my employment, I acquire confidential or proprietary information about the Company or any division thereof, and its clients, that this information is to be handled in strict confidence and will not be disclosed to or discussed with outsiders during the term of my employment or any time thereafter. I also understand that should I have any questions or concerns, at any point during my employment, I may speak to my direct supervisor, or if necessary, contact the administrative office at **(908) 444-8139** or via email at **njbackoffice@lakecrest.com**.

Note - while every attempt has been made to create these policies consistent with federal and state law, if an inconsistency arises, the policy(ies) will be enforced consistent with the applicable law.

My signature below certifies that I have read and understood the above information as well as the remainder of the contents asked of me to review. Further, my signature below certifies that I have located the Hotel's Hazard Communication Plan and I have reviewed it. I understand that if I have any questions, at any point during my employment, I should go to my direct supervisor, or the General Manager immediately.`

export default function CompanyPoliciesStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  completeAndAdvance,
  advanceToNextStep,
  goToPreviousStep,
  language = 'en',
  employee,
  property,
  isSingleStepMode = false,
  singleStepMeta,
  sessionToken,
  canProceedToNext: _canProceedToNext
}: StepProps) {
  
  // Section state - progressive flow
  const [currentSection, setCurrentSection] = useState(1)
  
  // Form state
  const [companyPoliciesInitials, setCompanyPoliciesInitials] = useState('')
  const [eeoInitials, setEeoInitials] = useState('')
  const [sexualHarassmentInitials, setSexualHarassmentInitials] = useState('')
  const [acknowledgmentChecked, setAcknowledgmentChecked] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [signatureData, setSignatureData] = useState(null)
  const [documentMetadata, setDocumentMetadata] = useState<StepDocumentMetadata | null>(null)
  const [remotePdfUrl, setRemotePdfUrl] = useState<string | null>(null)
  const [inlinePdfData, setInlinePdfData] = useState<string | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [metadataRequested, setMetadataRequested] = useState(false)

  const hrContactEmail = singleStepMeta?.hrContactEmail || singleStepMeta?.hr_contact_email

  const employeeIdEncoded = React.useMemo(() => {
    if (!employee?.id) {
      return null
    }
    try {
      return encodeURIComponent(employee.id)
    } catch (error) {
      console.error('CompanyPolicies: failed to encode employee id for PDF endpoint', error)
      return null
    }
  }, [employee?.id])

  const pdfGenerationEndpoint = React.useMemo(() => {
    if (!employeeIdEncoded) {
      return null
    }
    return `${getApiUrl()}/onboarding/${employeeIdEncoded}/company-policies/generate-pdf`
  }, [employeeIdEncoded])

  const notifySingleStepCompletion = async (pdfBase64: string | null) => {
    if (!isSingleStepMode || !employee?.id || !pdfBase64) {
      return
    }

    try {
      await fetch(`${getApiUrl()}/onboarding/single-step/notify-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          step_id: currentStep.id,
          step_name: currentStep.name,
          pdf_data: pdfBase64,
          property_id: property?.id,
          session_id: singleStepMeta?.sessionId,
          hr_email: hrContactEmail,
          recipient_email: singleStepMeta?.recipientEmail || undefined
        })
      })
    } catch (error) {
      console.error('Failed to notify HR about company policies completion:', error)
    }
  }

  // Section completion state
  const [section1Complete, setSection1Complete] = useState(false)
  const [section2Complete, setSection2Complete] = useState(false)
  const [section3Complete, setSection3Complete] = useState(false)
  const [section4Complete, setSection4Complete] = useState(false)
  const [section5Complete, setSection5Complete] = useState(false)

  // Get user initials for validation
  const getUserInitials = () => {
    // Try to get from session storage first
    const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
    if (personalInfoData) {
      try {
        const parsed = JSON.parse(personalInfoData)
        const firstName = parsed.personalInfo?.firstName || ''
        const lastName = parsed.personalInfo?.lastName || ''
        if (firstName && lastName) {
          return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
        }
      } catch (e) {
        console.warn('Failed to parse personal info data:', e)
      }
    }
    
    // Fallback to employee prop
    if (employee?.firstName && employee?.lastName) {
      return (employee.firstName.charAt(0) + employee.lastName.charAt(0)).toUpperCase()
    }
    
    return ''
  }

  const expectedInitials = getUserInitials()

  // Validation for initials
  const validateInitials = (initials: string, fieldName: string) => {
    if (initials.trim().length < 2) return false
    if (expectedInitials && initials.trim() !== expectedInitials) {
      return `Initials must match your name (${expectedInitials})`
    }
    return true
  }

  // Form data for saving
  const formData = {
    currentSection,
    companyPoliciesInitials,
    sexualHarassmentInitials,
    eeoInitials,
    acknowledgmentChecked,
    isSigned,
    signatureData,
    documentMetadata,
    inlinePdfData,
    section1Complete,
    section2Complete,
    section3Complete,
    section4Complete,
    section5Complete
  }

  // Validation hook
  const { errors, validate, clearErrors } = useStepValidation()

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, {
        ...data,
        isSingleStepMode
      })
    }
  })

  // Load existing data
  useEffect(() => {
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        // Always restore the section state
        setCurrentSection(parsed.currentSection || 1)
        setCompanyPoliciesInitials(parsed.companyPoliciesInitials || '')
        setSexualHarassmentInitials(parsed.sexualHarassmentInitials || '')
        setEeoInitials(parsed.eeoInitials || '')
        setAcknowledgmentChecked(parsed.acknowledgmentChecked || false)
        setSignatureData(parsed.signatureData || null)

        // Restore document metadata and PDF URL if available
        if (parsed.documentMetadata) {
          setDocumentMetadata(parsed.documentMetadata as StepDocumentMetadata)
          if (parsed.documentMetadata?.signed_url) {
            setRemotePdfUrl(parsed.documentMetadata.signed_url as string)
            console.log('Restored PDF URL from metadata:', parsed.documentMetadata.signed_url)
          }
        }

        // Also check for remotePdfUrl directly saved
        if (parsed.remotePdfUrl) {
          setRemotePdfUrl(parsed.remotePdfUrl as string)
          console.log('Restored remote PDF URL:', parsed.remotePdfUrl)
        }

        // Legacy storage of signedPdfUrl (base64 or URL)
        if (parsed.signedPdfUrl) {
          const legacyValue = parsed.signedPdfUrl as string
          if (legacyValue.startsWith('http')) {
            setRemotePdfUrl(legacyValue)
          } else {
            setInlinePdfData(legacyValue)
          }
        }

        const derivedSigned = Boolean(parsed.isSigned || parsed.signatureData || parsed.documentMetadata?.signed_url || parsed.remotePdfUrl)
        setIsSigned(derivedSigned)

        const section1 = validateInitials(parsed.companyPoliciesInitials || '', 'Company Policies') === true
        const section2 = validateInitials(parsed.eeoInitials || '', 'EEO') === true
        const section3 = validateInitials(parsed.sexualHarassmentInitials || '', 'Sexual Harassment') === true
        const section4 = Boolean(parsed.acknowledgmentChecked)
        const section5 = Boolean(parsed.section5Complete || (derivedSigned && section4))

        setSection1Complete(section1)
        setSection2Complete(section2)
        setSection3Complete(section3)
        setSection4Complete(section4)
        setSection5Complete(section5)

        if (section1 && section2 && section3 && section4 && section5 && derivedSigned) {
          setCurrentSection(5)
        }
      } catch (e) {
        console.warn('Failed to parse saved company policies data:', e)
      }
    } else if (progress.completedSteps.includes(currentStep.id)) {
      // Only set all complete if no saved data exists but step is marked complete
      // Note: We don't have the PDF URL here, so the PDF won't display until re-signed
      setIsSigned(true)
      setSection5Complete(true)
      setSection4Complete(true)
      setSection3Complete(true)
      setSection2Complete(true)
      setSection1Complete(true)
      setCurrentSection(5)
    }
  }, [currentStep.id, progress.completedSteps])

  useEffect(() => {
    setMetadataRequested(false)
  }, [sessionToken, currentStep.id, employee?.id])

  // Fetch latest document metadata from backend when available
  useEffect(() => {
    if (!sessionToken || !employee?.id) {
      return
    }

    // Skip if we've already requested and have the data
    if (metadataRequested && documentMetadata?.signed_url) {
      return
    }

    // Always fetch if step is complete or we don't have the PDF URL yet
    const shouldFetch = progress.completedSteps.includes(currentStep.id) ||
                        !remotePdfUrl ||
                        (isSigned && !documentMetadata?.signed_url)

    if (!shouldFetch) {
      return
    }

    let isMounted = true
    setMetadataRequested(true)
    setMetadataLoading(true)
    setMetadataError(null)

    fetchStepDocumentMetadata(employee.id, currentStep.id, sessionToken)
      .then(response => {
        if (!isMounted) {
          return
        }
        if (response.document_metadata) {
          setDocumentMetadata(response.document_metadata)
          if (response.document_metadata.signed_url) {
            setRemotePdfUrl(response.document_metadata.signed_url)
          }
        }
        return listStepDocuments(employee.id, currentStep.id, sessionToken)
      })
      .then(documents => {
        if (!isMounted) {
          return
        }
        if ((!documents || documents.length === 0) && !remotePdfUrl && !inlinePdfData) {
          setMetadataError('Document file missing from storage')
        }
      })
      .catch(error => {
        if (isMounted) {
          if (process.env.NODE_ENV === 'development' && !(error instanceof Error && error.message.includes('404'))) {
            console.warn('CompanyPolicies: metadata fetch error', error)
          }
          // Treat 404 as "no documents yet" without logging an error state
          if (error instanceof Error) {
            if (!error.message.includes('404')) {
              setMetadataError(error.message)
            }
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setMetadataLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [sessionToken, employee?.id, currentStep.id, progress.completedSteps, metadataRequested, documentMetadata?.signed_url, remotePdfUrl, isSigned])


  // Handle signature completion
  const handleSignature = async (signature) => {
    setSignatureData(signature)
    setIsSigned(true)

    // Check if all fields are valid
    const companyValidation = validateInitials(companyPoliciesInitials, 'Company Policies')
    const eeoValidation = validateInitials(eeoInitials, 'EEO')
    const shValidation = validateInitials(sexualHarassmentInitials, 'Sexual Harassment')
    
    if (companyValidation === true && eeoValidation === true && shValidation === true && acknowledgmentChecked) {
      const completeData = {
        ...formData,
        signatureData: signature, // Use original signature
        isSigned: true,
        completedAt: new Date().toISOString()
      }

      if (isSingleStepMode) {
        completeData.is_single_step = true
        completeData.single_step_mode = true
        if (singleStepMeta?.sessionId) {
          completeData.session_id = singleStepMeta.sessionId
        }
        if (singleStepMeta?.recipientEmail) {
          completeData.recipient_email = singleStepMeta.recipientEmail
        }
      }
      
      // Generate signed PDF
      let generatedPdfBase64: string | null = null
      let latestMetadata: StepDocumentMetadata | null = documentMetadata

      try {
        if (!pdfGenerationEndpoint) {
          console.error('CompanyPolicies: cannot generate PDF without employee id')
        } else {
          const response = await fetch(pdfGenerationEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employee_data: employee,
              form_data: {
                companyPoliciesInitials,
                eeoInitials,
                sexualHarassmentInitials,
                acknowledgmentChecked,
                ...completeData
              },
              signature_data: signature, // Use original signature
              is_single_step: isSingleStepMode,
              session_id: singleStepMeta?.sessionId
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data.data?.pdf) {
              generatedPdfBase64 = data.data.pdf
              setInlinePdfData(data.data.pdf)
            }

            if (data.data?.document_metadata) {
              latestMetadata = data.data.document_metadata as StepDocumentMetadata
              setDocumentMetadata(latestMetadata)
              setMetadataError(null)
              if (latestMetadata.signed_url) {
                setRemotePdfUrl(latestMetadata.signed_url)
              }
            }
          } else {
            console.error('CompanyPolicies: PDF generation response not OK', response.status)
          }
        }
      } catch (error) {
        console.error('Failed to generate signed PDF:', error)
      }
      
      const persistedData = {
        currentSection,
        companyPoliciesInitials,
        sexualHarassmentInitials,
        eeoInitials,
        acknowledgmentChecked,
        isSigned: true,
        signatureData: signature,
        documentMetadata: latestMetadata,
        inlinePdfData: inlinePdfData || generatedPdfBase64,
        section1Complete: true,
        section2Complete: true,
        section3Complete: true,
        section4Complete: true,
        section5Complete: true,
        allSectionsComplete: true,
        isFormComplete: true,
        remotePdfUrl: latestMetadata?.signed_url || remotePdfUrl || null,
        pdfGeneratedAt: new Date().toISOString()
      }

      // Save to session storage immediately for offline access
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(persistedData))

      // Save progress first to ensure data is stored
      await saveProgress(currentStep.id, persistedData)
      // Then mark as complete
      await markStepComplete(currentStep.id, persistedData)

      await notifySingleStepCompletion(generatedPdfBase64 || inlinePdfData)
    } else {
      const errorMessages = []
      if (companyValidation !== true) errorMessages.push(`Company Policies: ${companyValidation}`)
      if (eeoValidation !== true) errorMessages.push(`EEO Policy: ${eeoValidation}`)
      if (shValidation !== true) errorMessages.push(`Sexual Harassment Policy: ${shValidation}`)
      if (!acknowledgmentChecked) errorMessages.push('Please check the acknowledgment agreement')
      
      alert('Please complete all required fields before signing:\n' + errorMessages.join('\n'))
    }
  }

  // Computed values
  const isFormComplete = validateInitials(companyPoliciesInitials, 'Company Policies') === true &&
                        validateInitials(eeoInitials, 'EEO') === true && 
                        validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true && 
                        acknowledgmentChecked
  
  const isStepComplete = isFormComplete && isSigned && (section5Complete || (isSigned && allSectionsComplete))
  const allSectionsComplete = section1Complete && section2Complete && section3Complete && section4Complete

  // Helper function to check if a specific section is complete
  const isSectionComplete = (sectionNum: number): boolean => {
    switch (sectionNum) {
      case 1: return section1Complete
      case 2: return section2Complete
      case 3: return section3Complete
      case 4: return section4Complete
      case 5: return true // Section 5 is the review section
      default: return false
    }
  }

  const getSectionStatus = (sectionNum: number): StepStatus => {
    if (isSectionComplete(sectionNum)) {
      return 'complete'
    }

    if (currentSection === sectionNum) {
      return 'in-progress'
    }

    const prerequisiteComplete = sectionNum === 1 || isSectionComplete(sectionNum - 1)
    return prerequisiteComplete ? 'ready' : 'locked'
  }

  const overallStepStatus: StepStatus = currentSection < 5
    ? getSectionStatus(currentSection)
    : (isStepComplete ? 'complete' : 'in-progress')

  const saving = Boolean(saveStatus?.saving)
  const hasErrors = Array.isArray(errors) && errors.length > 0

  const translations = {
    en: {
      title: 'Company Policies & Terms',
      description: 'Please read through all company policies in the sections below. You will need to provide your initials on specific sections and accept the terms.',
      
      // Section titles
      section1Title: 'Section 1: All Company Policies',
      section2Title: 'Section 2: Equal Employment Opportunity',
      section3Title: 'Section 3: Sexual and Other Unlawful Harassment',
      section4Title: 'Section 4: Confidential Associate Hotline',
      section5Title: 'Section 5: Final Acknowledgment & Signature',
      
      // Section descriptions
      section1Desc: 'Core policies including employment terms, workplace violence prevention, pay policies, technology usage, and benefits',
      section2Desc: 'Equal employment opportunity commitment and policies',
      section3Desc: 'Sexual harassment prevention and reporting procedures',
      section4Desc: 'Confidential reporting hotline information',
      section5Desc: 'Final acknowledgment and digital signature',
      
      continue: 'Continue to Next Section',
      back: 'Back to Previous Section',
      
      initialsLabel: 'Your initials to acknowledge reading and understanding:',
      initialsValidationError: 'Initials must match your name',
      acknowledgmentTitle: 'Acknowledgment of Receipt & Agreement',
      acknowledgmentText: 'I have read, understood, and agree to all company policies, terms of employment, and confidentiality requirements outlined above.',
      signatureTitle: 'Digital Signature Required',
      completionTitle: 'Company Policies Acknowledged!',
      completionMessage: 'Thank you for reviewing and accepting our company policies.',
      incompleteTitle: 'Complete All Requirements',
      toProceeed: 'To proceed, please complete all sections and requirements.',
      continueToNext: 'Continue to W-4 Tax Form',
      confidentialHotlineTitle: 'Confidential Associate Hotline',
      acknowledgmentSectionTitle: 'ACKNOWLEDGEMENT OF RECEIPT'
    },
    es: {
      title: 'Políticas de la Empresa y Términos',
      description: 'Por favor, lea todas las políticas de la empresa en las secciones a continuación. Deberá proporcionar sus iniciales en secciones específicas y aceptar los términos.',
      
      // Section titles
      section1Title: 'Sección 1: Todas las Políticas de la Empresa',
      section2Title: 'Sección 2: Igualdad de Oportunidades de Empleo',
      section3Title: 'Sección 3: Acoso Sexual y Otros Acosos Ilegales',
      section4Title: 'Sección 4: Línea Directa Confidencial del Asociado',
      section5Title: 'Sección 5: Reconocimiento Final y Firma',
      
      // Section descriptions
      section1Desc: 'Políticas centrales incluyendo términos de empleo, prevención de violencia en el lugar de trabajo, políticas de pago, uso de tecnología y beneficios',
      section2Desc: 'Compromiso y políticas de igualdad de oportunidades de empleo',
      section3Desc: 'Prevención de acoso sexual y procedimientos de denuncia',
      section4Desc: 'Información de línea directa de denuncia confidencial',
      section5Desc: 'Reconocimiento final y firma digital',
      
      continue: 'Continuar a la Siguiente Sección',
      back: 'Volver a la Sección Anterior',
      
      initialsLabel: 'Sus iniciales para reconocer lectura y comprensión:',
      initialsValidationError: 'Las iniciales deben coincidir con su nombre',
      acknowledgmentTitle: 'Reconocimiento de Recibo y Acuerdo',
      acknowledgmentText: 'He leído, entendido y acepto todas las políticas de la empresa, términos de empleo y requisitos de confidencialidad descritos anteriormente.',
      signatureTitle: 'Firma Digital Requerida',
      completionTitle: '¡Políticas de la Empresa Reconocidas!',
      completionMessage: 'Gracias por revisar y aceptar nuestras políticas de la empresa.',
      incompleteTitle: 'Complete Todos los Requisitos',
      toProceeed: 'Para continuar, por favor complete todas las secciones y requisitos.',
      continueToNext: 'Continuar al formulario W-4',
      confidentialHotlineTitle: 'Línea Directa Confidencial del Asociado',
      acknowledgmentSectionTitle: 'RECONOCIMIENTO DE RECIBO'
    }
  }

  const t = translations[language]

  const sectionNavigatorConfig = [
    {
      id: 'section1',
      title: t.section1Title,
      description: t.section1Desc,
      status: getSectionStatus(1),
      icon: <Shield className="h-4 w-4" />
    },
    {
      id: 'section2',
      title: t.section2Title,
      description: t.section2Desc,
      status: getSectionStatus(2),
      icon: <Building className="h-4 w-4" />
    },
    {
      id: 'section3',
      title: t.section3Title,
      description: t.section3Desc,
      status: getSectionStatus(3),
      icon: <Heart className="h-4 w-4" />
    },
    {
      id: 'section4',
      title: t.section4Title,
      description: t.section4Desc,
      status: getSectionStatus(4),
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: 'section5',
      title: t.section5Title,
      description: t.section5Desc,
      status: getSectionStatus(5),
      icon: <PenTool className="h-4 w-4" />
    }
  ]

  // Get section icon and status
  const getSectionIcon = (sectionNum: number) => {
    const isCompleted = 
      (sectionNum === 1 && section1Complete) ||
      (sectionNum === 2 && section2Complete) ||
      (sectionNum === 3 && section3Complete) ||
      (sectionNum === 4 && section4Complete) ||
      (sectionNum === 5 && section5Complete)

    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }

    if (sectionNum === currentSection) {
      switch (sectionNum) {
        case 1: return <Shield className="h-5 w-5 text-blue-600" />
        case 2: return <Building className="h-5 w-5 text-blue-600" />
        case 3: return <Heart className="h-5 w-5 text-blue-600" />
        case 4: return <FileText className="h-5 w-5 text-blue-600" />
        case 5: return <PenTool className="h-5 w-5 text-blue-600" />
        default: return <FileText className="h-5 w-5 text-blue-600" />
      }
    }

    switch (sectionNum) {
      case 1: return <Shield className="h-5 w-5 text-gray-400" />
      case 2: return <Building className="h-5 w-5 text-gray-400" />
      case 3: return <Heart className="h-5 w-5 text-gray-400" />
      case 4: return <FileText className="h-5 w-5 text-gray-400" />
      case 5: return <PenTool className="h-5 w-5 text-gray-400" />
      default: return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  const handleSection1Complete = () => setSection1Complete(true)
  const handleSection2Complete = () => setSection2Complete(true)
  const handleSection3Complete = () => setSection3Complete(true)
  const handleSection4Complete = () => setSection4Complete(true)
  const handleSection5Complete = () => setSection5Complete(true)

  return (
    <StepContainer
      errors={errors}
      saveStatus={saveStatus}
      canProceed={isStepComplete}
    >
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Header */}
        <div className="text-center px-4">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {isSingleStepMode && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              This standalone review covers all company policies you need to acknowledge. Once you sign below, HR will receive an automatic confirmation{singleStepMeta?.recipientEmail ? ` at ${singleStepMeta.recipientEmail}` : ''}.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                {language === 'es' ? `Sección ${currentSection} de ${sectionNavigatorConfig.length}` : `Section ${currentSection} of ${sectionNavigatorConfig.length}`}
              </p>
              <p className="text-xs text-blue-600">
                {sectionNavigatorConfig[currentSection - 1]?.title}
              </p>
            </div>
            <div className="text-xs text-blue-700">
              {isStepComplete
                ? (language === 'es' ? 'Listo para continuar a W-4.' : 'All sections complete. Ready to continue.')
                : (language === 'es'
                    ? 'Complete cada sección para desbloquear el botón Siguiente.'
                    : 'Complete each section to unlock Continue.')}
            </div>
          </div>
          <div className="relative h-2 rounded-full bg-white/70">
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentSection / sectionNavigatorConfig.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
            {sectionNavigatorConfig.map((section, index) => {
              const isCurrent = index + 1 === currentSection
              const isComplete = section.status === 'complete'
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    if (index + 1 === currentSection) return
                    if (index + 1 < currentSection || isSectionComplete(index)) {
                      setCurrentSection(index + 1)
                      scrollToTop()
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center rounded-xl border px-2 py-2 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0 min-w-[80px] sm:min-w-[100px] min-h-[72px] sm:min-h-[80px]',
                    isCurrent ? 'border-blue-500 bg-white shadow-md' : 'border-transparent bg-blue-100/60 hover:bg-white',
                    (index + 1 > currentSection && !isSectionComplete(index)) && 'cursor-not-allowed opacity-60'
                  )}
                  disabled={(index + 1 > currentSection && !isSectionComplete(index))}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div className={cn(
                    'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0',
                    isComplete ? 'bg-green-100 text-green-700 border border-green-300' : isCurrent ? 'bg-blue-600 text-white' : 'bg-white text-blue-500'
                  )}>
                    {isComplete ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : index + 1}
                  </div>
                  <span className="mt-1 text-[10px] sm:text-[11px] font-medium text-blue-800 line-clamp-2 leading-tight">
                    {section.title.replace(/Section \d+:\s?/, '')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Completion Alert */}
        {isStepComplete && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Section Content */}
        <div className="space-y-6">

          {/* Section 1: All Company Policies */}
          {currentSection === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getSectionIcon(1)}
                  <span>{t.section1Title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{t.section1Desc}</p>
              </CardHeader>
              <CardContent>
                {/* All Company Policies in One Section */}
                <div className="mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg max-h-[600px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <FormattedPolicyText text={COMPANY_POLICIES_TEXT} />
                    </div>
                  </div>
                </div>

                {/* Initials for all company policies */}
                <Card className="border-orange-200 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PenTool className="h-5 w-5 text-orange-600" />
                      <span>Company Policies Acknowledgment</span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {language === 'en' ? 'Initials Required' : 'Iniciales Requeridas'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="company-initials" className="text-sm">
                        {t.initialsLabel}
                      </Label>
                      <Input
                        id="company-initials"
                        value={companyPoliciesInitials}
                        onChange={(e) => setCompanyPoliciesInitials(e.target.value.toUpperCase())}
                        placeholder={expectedInitials || "XX"}
                        className="w-24 text-center font-mono text-lg"
                        maxLength={4}
                      />
                      {validateInitials(companyPoliciesInitials, 'Company Policies') === true && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {typeof validateInitials(companyPoliciesInitials, 'Company Policies') === 'string' && companyPoliciesInitials.trim().length >= 2 && (
                        <span className="text-xs text-red-600">
                          {t.initialsValidationError} ({expectedInitials})
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button
                    onClick={() => {
                      if (validateInitials(companyPoliciesInitials, 'Company Policies') === true) {
                        handleSection1Complete()
                        setCurrentSection(2)
                        scrollToTop()
                      }
                    }}
                    disabled={validateInitials(companyPoliciesInitials, 'Company Policies') !== true}
                  >
                    {language === 'es' ? 'Continuar a Sección 2' : 'Continue to Section 2'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Equal Employment Opportunity */}
          {currentSection === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getSectionIcon(2)}
                  <span>{t.section2Title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{t.section2Desc}</p>
              </CardHeader>
              <CardContent>
                <Card className="border-orange-200 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PenTool className="h-5 w-5 text-orange-600" />
                      <span>{EEO_POLICY.title}</span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {language === 'en' ? 'Initials Required' : 'Iniciales Requeridas'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto mb-4">
                      <div className="prose prose-sm max-w-none">
                        <FormattedPolicyText text={EEO_POLICY.content} />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="eeo-initials" className="text-sm">
                        {t.initialsLabel}
                      </Label>
                      <Input
                        id="eeo-initials"
                        value={eeoInitials}
                        onChange={(e) => setEeoInitials(e.target.value.toUpperCase())}
                        placeholder={expectedInitials || "XX"}
                        className="w-24 text-center font-mono text-lg"
                        maxLength={4}
                      />
                      {validateInitials(eeoInitials, 'EEO') === true && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {typeof validateInitials(eeoInitials, 'EEO') === 'string' && eeoInitials.trim().length >= 2 && (
                        <span className="text-xs text-red-600">
                          {t.initialsValidationError} ({expectedInitials})
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentSection(1)
                      scrollToTop()
                    }}
                  >
                    {language === 'es' ? 'Regresar a Sección 1' : 'Back to Section 1'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (validateInitials(eeoInitials, 'EEO') === true) {
                        handleSection2Complete()
                        setCurrentSection(3)
                        scrollToTop()
                      }
                    }}
                    disabled={validateInitials(eeoInitials, 'EEO') !== true}
                  >
                    {language === 'es' ? 'Continuar a Sección 3' : 'Continue to Section 3'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Sexual Harassment Policy */}
          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getSectionIcon(3)}
                  <span>{t.section3Title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{t.section3Desc}</p>
              </CardHeader>
              <CardContent>
                <Card className="border-orange-200 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PenTool className="h-5 w-5 text-orange-600" />
                      <span>{SEXUAL_HARASSMENT_POLICY.title}</span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {language === 'en' ? 'Initials Required' : 'Iniciales Requeridas'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto mb-4">
                      <div className="prose prose-sm max-w-none">
                        <FormattedPolicyText text={SEXUAL_HARASSMENT_POLICY.content} />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <Label htmlFor="sexual-harassment-initials" className="text-sm">
                        {t.initialsLabel}
                      </Label>
                      <Input
                        id="sexual-harassment-initials"
                        value={sexualHarassmentInitials}
                        onChange={(e) => setSexualHarassmentInitials(e.target.value.toUpperCase())}
                        placeholder={expectedInitials || "XX"}
                        className="w-24 text-center font-mono text-lg"
                        maxLength={4}
                      />
                      {validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {typeof validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === 'string' && sexualHarassmentInitials.trim().length >= 2 && (
                        <span className="text-xs text-red-600">
                          {t.initialsValidationError} ({expectedInitials})
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentSection(2)
                      scrollToTop()
                    }}
                  >
                    {language === 'es' ? 'Regresar a Sección 2' : 'Back to Section 2'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true) {
                        handleSection3Complete()
                        setCurrentSection(4)
                        scrollToTop()
                      }
                    }}
                    disabled={validateInitials(sexualHarassmentInitials, 'Sexual Harassment') !== true}
                  >
                    {language === 'es' ? 'Continuar a Sección 4' : 'Continue to Section 4'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Confidential Associate Hotline */}
          {currentSection === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getSectionIcon(4)}
                  <span>{t.section4Title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{t.section4Desc}</p>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg mb-6">
                  <FormattedPolicyText text={CONFIDENTIAL_HOTLINE_TEXT} />
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentSection(3)
                      scrollToTop()
                    }}
                  >
                    {language === 'es' ? 'Regresar a Sección 3' : 'Back to Section 3'}
                  </Button>
                  <Button
                    onClick={() => {
                      handleSection4Complete()
                      setCurrentSection(5)
                      scrollToTop()
                    }}
                  >
                    {language === 'es' ? 'Continuar a Sección 5' : 'Continue to Section 5'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: Final Acknowledgment & Signature */}
          {currentSection === 5 && (
            <div className="space-y-6">
              {/* Acknowledgment Section - Only show when all sections are complete and initials are provided */}
              {allSectionsComplete && 
               validateInitials(companyPoliciesInitials, 'Company Policies') === true &&
               validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true && 
               validateInitials(eeoInitials, 'EEO') === true && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-800">
                      <FileText className="h-5 w-5" />
                      <span>{t.acknowledgmentSectionTitle}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto mb-4">
                      <div className="prose prose-sm max-w-none">
                        <FormattedPolicyText text={ACKNOWLEDGMENT_TEXT} className="text-sm" />
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acknowledgment"
                        checked={acknowledgmentChecked}
                        onCheckedChange={(checked) => {
                          setAcknowledgmentChecked(checked as boolean)
                          if (checked) {
                            handleSection5Complete()
                          }
                        }}
                        className="mt-1"
                      />
                      <Label htmlFor="acknowledgment" className="text-sm leading-relaxed cursor-pointer">
                        {t.acknowledgmentText}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Digital Signature Section - Only show when form is complete */}
              {isFormComplete && allSectionsComplete && !isSigned && (
                <ReviewAndSign
                  formType="company_policies"
                  title="Company Policy Acknowledgment"
                  formData={{
                    companyPoliciesInitials,
                    eeoInitials,
                    sexualHarassmentInitials,
                    acknowledgmentChecked,
                    ...formData
                  }}
                  signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
                  signerTitle={employee?.position}
                  onSign={handleSignature}
                  acknowledgments={[
                    'I have read and understand all company policies',
                    'I agree to the terms of employment',
                    'I have provided my initials on required sections'
                  ]}
                  language={language}
                  usePDFPreview={Boolean(pdfGenerationEndpoint)}
                  pdfEndpoint={pdfGenerationEndpoint || undefined}
                />
              )}

              {/* Prompt to re-sign if step is complete but no PDF */}
              {isSigned && !remotePdfUrl && !documentMetadata?.signed_url && !inlinePdfData && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="space-y-2">
                      <p className="font-medium">
                        {language === 'es'
                          ? 'El documento firmado no está disponible. Por favor, vuelva a firmar las políticas.'
                          : 'The signed document is not available. Please sign the policies again.'}
                      </p>
                      <button
                        onClick={() => {
                          setIsSigned(false)
                          setCurrentSection(5)
                          sessionStorage.removeItem(`onboarding_${currentStep.id}_data`)
                        }}
                        className="text-sm text-yellow-700 underline hover:text-yellow-800"
                      >
                        {language === 'es' ? 'Haga clic aquí para volver a firmar' : 'Click here to re-sign'}
                      </button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Show signed PDF preview */}
              {isSigned && (remotePdfUrl || documentMetadata?.signed_url || inlinePdfData) && (
                <div className="space-y-6">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="space-y-2">
                        <p className="font-medium">
                          {language === 'es'
                            ? 'Las políticas de la empresa han sido firmadas y guardadas exitosamente.'
                            : 'Company policies have been signed and saved successfully.'}
                        </p>
                        {signatureData && (
                          <div className="text-sm space-y-1">
                            {signatureData.signedAt && (
                              <p>{language === 'es' ? 'Firmado el:' : 'Signed on:'} {new Date(signatureData.signedAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        {documentMetadata && (
                          <div className="text-xs text-gray-600 space-y-1">
                            {documentMetadata.filename && (
                              <p>Stored file: {documentMetadata.filename}</p>
                            )}
                            {documentMetadata.generated_at && (
                              <p>Generated: {new Date(documentMetadata.generated_at).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        {metadataError && (
                          <p className="text-xs text-amber-600">{metadataError}</p>
                        )}
                        {metadataLoading && !metadataError && (
                          <p className="text-xs text-gray-500">Refreshing stored document link...</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  <PDFViewer
                    pdfUrl={remotePdfUrl || documentMetadata?.signed_url || undefined}
                    pdfData={!remotePdfUrl && !documentMetadata?.signed_url ? inlinePdfData ?? undefined : undefined}
                    height="600px"
                    title="Signed Company Policies"
                  />
                </div>
              )}

              {/* Instructions for incomplete form */}
              {(!allSectionsComplete || !isFormComplete) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <ScrollText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-medium text-gray-900 mb-1">{t.incompleteTitle}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{t.toProceeed}</p>
                        <ul className="text-left inline-block space-y-1">
                          {!allSectionsComplete && (
                            <li>• Complete all policy sections</li>
                          )}
                          {validateInitials(companyPoliciesInitials, 'Company Policies') !== true && (
                            <li>• Provide valid initials for Company Policies section</li>
                          )}
                          {validateInitials(eeoInitials, 'EEO') !== true && (
                            <li>• Provide valid initials for Equal Employment Opportunity Policy</li>
                          )}
                          {validateInitials(sexualHarassmentInitials, 'Sexual Harassment') !== true && (
                            <li>• Provide valid initials for Sexual Harassment Policy</li>
                          )}
                          {(allSectionsComplete && 
                            validateInitials(companyPoliciesInitials, 'Company Policies') === true &&
                            validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true && 
                            validateInitials(eeoInitials, 'EEO') === true && 
                            !acknowledgmentChecked) && (
                            <li>• Check the acknowledgment agreement</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {!isStepComplete && (
          <div className="mt-6 text-xs text-blue-700 text-center">
            Complete all five sections, provide required initials, and sign to continue.
          </div>
        )}
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
