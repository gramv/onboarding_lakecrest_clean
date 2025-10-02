import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DigitalSignatureCapture from '@/components/DigitalSignatureCapture'
import ReviewAndSign from '@/components/ReviewAndSign'
import { CheckCircle, Building, FileText, ScrollText, PenTool, Check, Shield, Briefcase, Lock, Heart, ArrowRight, ArrowLeft } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { companyPoliciesValidator } from '@/utils/stepValidators'
import { scrollToTop } from '@/utils/scrollHelpers'

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
  language = 'en',
  employee,
  property
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
      await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    // Load saved data first
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
        setIsSigned(parsed.isSigned || false)
        // Restore completion states - these are the important ones for navigation
        setSection1Complete(parsed.section1Complete || false)
        setSection2Complete(parsed.section2Complete || false)
        setSection3Complete(parsed.section3Complete || false)
        setSection4Complete(parsed.section4Complete || false)
        setSection5Complete(parsed.section5Complete || false)
      } catch (e) {
        console.warn('Failed to parse saved company policies data:', e)
      }
    } else if (progress.completedSteps.includes(currentStep.id)) {
      // Only set all complete if no saved data exists but step is marked complete
      setIsSigned(true)
      setSection5Complete(true)
      setSection4Complete(true)
      setSection3Complete(true)
      setSection2Complete(true)
      setSection1Complete(true)
      setCurrentSection(5)
    }
  }, [currentStep.id, progress.completedSteps])

  // Handle section navigation
  const handleSectionContinue = () => {
    switch (currentSection) {
      case 1:
        // Validate initials for section 1
        if (validateInitials(companyPoliciesInitials, 'Company Policies') === true) {
          setSection1Complete(true)
          setCurrentSection(2)
        } else {
          alert('Please provide valid initials for the Company Policies section')
          return
        }
        break
      case 2:
        // Validate initials for section 2
        if (validateInitials(eeoInitials, 'EEO') === true) {
          setSection2Complete(true)
          setCurrentSection(3)
        } else {
          alert('Please provide valid initials for the Equal Employment Opportunity section')
          return
        }
        break
      case 3:
        // Validate initials for section 3
        if (validateInitials(sexualHarassmentInitials, 'Sexual Harassment') === true) {
          setSection3Complete(true)
          setCurrentSection(4)
        } else {
          alert('Please provide valid initials for the Sexual Harassment section')
          return
        }
        break
      case 4:
        setSection4Complete(true)
        setCurrentSection(5)
        break
      case 5:
        setSection5Complete(true)
        break
    }
    scrollToTop()
  }

  // Handle going back to previous section
  const handleSectionBack = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1)
      scrollToTop()
    }
  }

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
        signatureData: signature,
        isSigned: true,
        completedAt: new Date().toISOString()
      }
      // Save progress first to ensure data is stored
      await saveProgress(currentStep.id, completeData)
      // Then mark as complete
      await markStepComplete(currentStep.id, completeData)
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
  
  const isStepComplete = isFormComplete && isSigned && section5Complete
  const allSectionsComplete = section1Complete && section2Complete && section3Complete && section4Complete

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
      confidentialHotlineTitle: 'Línea Directa Confidencial del Asociado',
      acknowledgmentSectionTitle: 'RECONOCIMIENTO DE RECIBO'
    }
  }

  const t = translations[language]

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

  return (
    <StepContainer errors={errors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3, 4, 5].map((num) => {
            const isComplete = (num === 1 && section1Complete) || 
                             (num === 2 && section2Complete) || 
                             (num === 3 && section3Complete) || 
                             (num === 4 && section4Complete) || 
                             (num === 5 && section5Complete)
            const isClickable = num < currentSection || isComplete
            
            return (
              <div key={num} className="flex items-center">
                <div 
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    num === currentSection ? 'border-blue-600 bg-blue-50' :
                    isComplete ? 'border-green-600 bg-green-50' :
                    'border-gray-300 bg-gray-50'
                  } ${isClickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                  onClick={() => {
                    if (isClickable) {
                      setCurrentSection(num)
                      scrollToTop()
                    }
                  }}
                >
                  <span className={`text-sm font-medium ${
                    num === currentSection ? 'text-blue-600' :
                    isComplete ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {isComplete ? '✓' : num}
                  </span>
                </div>
                {num < 5 && (
                  <div className={`w-12 h-0.5 ml-2 ${
                    (num === 1 && section1Complete) || 
                    (num === 2 && section2Complete) || 
                    (num === 3 && section3Complete) || 
                    (num === 4 && section4Complete) 
                    ? 'bg-green-300' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
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

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSectionContinue}
                    className="px-6 py-2"
                  >
                    <span>{t.continue}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
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
                    onClick={handleSectionBack}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span>{t.back}</span>
                  </Button>
                  <Button 
                    onClick={handleSectionContinue}
                    className="px-6 py-2"
                  >
                    <span>{t.continue}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Sexual and Other Unlawful Harassment */}
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
                      <Label htmlFor="sh-initials" className="text-sm">
                        {t.initialsLabel}
                      </Label>
                      <Input
                        id="sh-initials"
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
                    onClick={handleSectionBack}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span>{t.back}</span>
                  </Button>
                  <Button 
                    onClick={handleSectionContinue}
                    className="px-6 py-2"
                  >
                    <span>{t.continue}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
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
                    onClick={handleSectionBack}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span>{t.back}</span>
                  </Button>
                  <Button 
                    onClick={handleSectionContinue}
                    className="px-6 py-2"
                  >
                    <span>{t.continue}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
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
                        onCheckedChange={(checked) => setAcknowledgmentChecked(checked as boolean)}
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
                  formTitle="Company Policy Acknowledgment"
                  formData={{
                    companyPoliciesInitials,
                    eeoInitials,
                    sexualHarassmentInitials,
                    acknowledgmentChecked,
                    ...formData
                  }}
                  documentName="Company Policy Acknowledgment"
                  signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
                  signerTitle={employee?.position}
                  onSign={handleSignature}
                  acknowledgments={[
                    'I have read and understand all company policies',
                    'I agree to the terms of employment',
                    'I have provided my initials on required sections'
                  ]}
                  language={language}
                  usePDFPreview={true}
                  pdfEndpoint={`${import.meta.env.VITE_API_URL || '/api'}/api/onboarding/${employee?.id || 'test-employee'}/company-policies/generate-pdf`}
                />
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

              <div className="flex justify-start">
                <Button 
                  onClick={handleSectionBack}
                  variant="outline"
                  className="px-6 py-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>{t.back}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}