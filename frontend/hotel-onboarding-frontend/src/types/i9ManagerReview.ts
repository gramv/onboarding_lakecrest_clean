/**
 * I-9 Manager Review Types
 * Types for manager review of I-9 Section 2
 */

export interface I9Section1Data {
  lastName: string;
  firstName: string;
  middleInitial: string;
  otherNames: string;
  address: string;
  aptNumber: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
  phone: string;
  citizenshipStatus: 'citizen' | 'noncitizen_national' | 'permanent_resident' | 'authorized_alien';
  alienRegistrationNumber?: string;
  uscisNumber?: string;
  i94Number?: string;
  foreignPassportNumber?: string;
  countryOfIssuance?: string;
  workAuthorizationExpiration?: string;
  signature: string;
  signedAt: string;
}

export type I9DocumentType = 
  | 'drivers_license'
  | 'state_id'
  | 'passport'
  | 'permanent_resident_card'
  | 'employment_authorization_document'
  | 'ssn_card'
  | 'birth_certificate'
  | 'other';

export type I9DocumentList = 'A' | 'B' | 'C';

export interface I9UploadedDocument {
  id: string;
  employeeId: string;
  documentType: I9DocumentType;
  documentList: I9DocumentList;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  ocrData: {
    document_number?: string;
    issuing_authority?: string;
    expiration_date?: string;
    full_name?: string;
    date_of_birth?: string;
    address?: string;
    ssn?: string;
  };
  ocrConfidence: number;
  uploadedAt: string;
}

export interface I9DocumentVerification {
  title: string;
  issuingAuthority: string;
  documentNumber: string;
  expirationDate: string; // MM/DD/YYYY or "N/A"
}

export interface I9Section2Data {
  // Document verification (up to 3 documents)
  document1: I9DocumentVerification;
  document2?: I9DocumentVerification;
  document3?: I9DocumentVerification;
  
  // Employment information
  firstDayOfEmployment: string; // MM/DD/YYYY
  additionalInfo?: string;
  
  // Employer attestation
  employerName: string;
  employerTitle: string;
  businessName: string;
  businessAddress: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Signature
  signature: SignatureData;
  signatureDate: string; // MM/DD/YYYY
}

export interface SignatureData {
  dataUrl: string; // Base64 encoded image
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmployerProfile {
  id: string;
  propertyId: string;
  i9EmployerName: string;
  i9EmployerTitle: string;
  i9BusinessName: string;
  i9BusinessAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface I9ReviewData {
  employeeId: string;
  section1Data: I9Section1Data;
  uploadedDocuments: I9UploadedDocument[];
  section2Data?: I9Section2Data;
  employerProfile?: EmployerProfile;
  employeeStartDate: string;
  i9Deadline: string;
  isOverdue: boolean;
}

export interface I9CompletionRequest {
  section2Data: I9Section2Data;
  updateEmployerProfile: boolean;
  employerProfileData?: Partial<EmployerProfile>;
}

export interface I9CompletionResponse {
  success: boolean;
  finalPdfUrl: string;
  nextDocument: 'w4' | 'direct_deposit' | 'health_insurance' | null;
  message: string;
}

// Helper function to get document title from type
export const getDocumentTitle = (type: I9DocumentType): string => {
  const titles: Record<I9DocumentType, string> = {
    drivers_license: "Driver's License",
    state_id: "State ID Card",
    passport: "U.S. Passport",
    permanent_resident_card: "Permanent Resident Card",
    employment_authorization_document: "Employment Authorization Document",
    ssn_card: "Social Security Card",
    birth_certificate: "Birth Certificate",
    other: "Other Document"
  };
  return titles[type] || "Unknown Document";
};

// Helper function to get issuing authority from document type
export const getIssuingAuthority = (type: I9DocumentType, state?: string): string => {
  switch (type) {
    case 'drivers_license':
      return state ? `${state} DMV` : 'State DMV';
    case 'state_id':
      return state ? `State of ${state}` : 'State Government';
    case 'passport':
      return 'U.S. Department of State';
    case 'permanent_resident_card':
      return 'U.S. Citizenship and Immigration Services';
    case 'employment_authorization_document':
      return 'U.S. Citizenship and Immigration Services';
    case 'ssn_card':
      return 'Social Security Administration';
    case 'birth_certificate':
      return state ? `State of ${state}` : 'State Government';
    default:
      return '';
  }
};

// US States for dropdown
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

