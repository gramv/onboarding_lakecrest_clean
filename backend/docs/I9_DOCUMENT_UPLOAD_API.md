# I-9 Document Upload API Documentation

## Overview

This API provides endpoints for uploading and validating I-9 supporting documents for employee verification, specifically designed for single-step invitation workflows. The implementation ensures full federal compliance with USCIS requirements per 8 U.S.C. § 1324a.

## Federal Compliance Requirements

### Document Lists

Per USCIS Form I-9 requirements, employees must provide documents that establish both:
1. **Identity** - Who the person is
2. **Employment Authorization** - Legal right to work in the United States

### Acceptable Document Combinations

Employees must provide **EITHER**:
- **One List A document** (establishes both identity AND employment authorization), OR
- **One List B document** (establishes identity) AND **One List C document** (establishes employment authorization)

### List A Documents
Documents that establish both identity and employment authorization:
- U.S. Passport (unexpired or expired)
- U.S. Passport Card
- Permanent Resident Card (Form I-551)
- Employment Authorization Document (Form I-766)
- Foreign passport with I-551 stamp or temporary I-551 printed notation
- Foreign passport with Form I-94 containing an endorsement of nonimmigrant status

### List B Documents
Documents that establish identity only:
- Driver's license issued by a state or outlying possession of the U.S.
- State-issued ID card
- School ID with photograph
- Voter registration card
- U.S. military card or draft record
- Military dependent's ID card
- U.S. Coast Guard Merchant Mariner Document
- Native American tribal document
- Canadian driver's license (for Canadian citizens)

### List C Documents
Documents that establish employment authorization only:
- Social Security card (unless marked "NOT VALID FOR EMPLOYMENT")
- Certification of Birth Abroad (FS-545 or DS-1350)
- Birth certificate issued by state, county, municipal authority, or outlying possession of the U.S.
- U.S. Citizen ID Card (Form I-197)
- ID Card for use of Resident Citizen (Form I-179)
- Employment authorization document issued by DHS (other than Form I-766)

## API Endpoints

### 1. Upload I-9 Documents

**Endpoint:** `POST /api/onboarding/{employee_id}/i9-documents`

**Description:** Upload supporting documents for I-9 verification. Supports single-step invitations with temporary employee IDs.

**Parameters:**
- `employee_id` (path) - Employee ID (can be temp_xxx for single-step invitations)
- `files` (form) - One or more document files (JPEG, PNG, or PDF)
- `document_type` (form) - Type of document (e.g., "us_passport", "drivers_license", "social_security_card")
- `document_list` (form) - Which list the document belongs to ("list_a", "list_b", or "list_c")
- `document_number` (form, optional) - Document number/ID
- `issuing_authority` (form, optional) - Issuing authority (e.g., "U.S. Department of State")
- `issue_date` (form, optional) - Issue date (YYYY-MM-DD format)
- `expiration_date` (form, optional) - Expiration date (YYYY-MM-DD format)

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/onboarding/temp_001/i9-documents" \
  -F "files=@passport.jpg" \
  -F "document_type=us_passport" \
  -F "document_list=list_a" \
  -F "document_number=P123456789" \
  -F "issuing_authority=U.S. Department of State" \
  -F "expiration_date=2030-01-15"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded_documents": [{
      "id": "doc-uuid",
      "document_type": "us_passport",
      "document_list": "list_a",
      "status": "uploaded"
    }],
    "validation": {
      "is_valid": true,
      "list_a_satisfied": true,
      "list_b_satisfied": false,
      "list_c_satisfied": false
    },
    "compliance_status": "compliant"
  },
  "message": "Successfully uploaded 1 document(s)"
}
```

### 2. Get I-9 Documents

**Endpoint:** `GET /api/onboarding/{employee_id}/i9-documents`

**Description:** Retrieve all uploaded I-9 documents for an employee.

**Parameters:**
- `employee_id` (path) - Employee ID
- `document_list` (query, optional) - Filter by list type ("list_a", "list_b", or "list_c")

**Example Request:**
```bash
curl "http://localhost:8000/api/onboarding/temp_001/i9-documents?document_list=list_a"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [{
      "id": "doc-uuid",
      "document_type": "us_passport",
      "document_list": "list_a",
      "file_name": "passport.jpg",
      "status": "uploaded",
      "uploaded_at": "2025-09-10T18:00:00Z"
    }],
    "validation": {
      "is_valid": true,
      "list_a_satisfied": true,
      "list_b_satisfied": false,
      "list_c_satisfied": false
    },
    "compliance_status": "compliant"
  },
  "message": "Found 1 document(s)"
}
```

### 3. Validate I-9 Documents

**Endpoint:** `POST /api/onboarding/{employee_id}/i9-documents/validate`

**Description:** Validate that uploaded documents meet federal compliance requirements.

**Parameters:**
- `employee_id` (path) - Employee ID

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/onboarding/temp_001/i9-documents/validate"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "federal_validation": {
      "is_valid": true,
      "errors": [],
      "warnings": [],
      "compliance_notes": [
        "I-9 Document validation: List A document provided (establishes both identity and employment authorization)",
        "I-9 document combination meets federal USCIS requirements"
      ]
    },
    "document_status": {
      "is_valid": true,
      "list_a_satisfied": true,
      "list_b_satisfied": false,
      "list_c_satisfied": false,
      "documents": {
        "list_a": [{"document_type": "us_passport"}],
        "list_b": [],
        "list_c": []
      }
    },
    "compliance_status": "compliant"
  },
  "message": "I-9 document validation completed"
}
```

## Error Responses

### Invalid Document Combination
```json
{
  "success": false,
  "data": {
    "federal_validation": {
      "is_valid": false,
      "errors": [
        {
          "field": "documents",
          "message": "FEDERAL COMPLIANCE VIOLATION: List C document required when not using List A",
          "legal_code": "USCIS-I9-NO-LIST-C",
          "severity": "error"
        }
      ]
    },
    "compliance_status": "non_compliant"
  }
}
```

### Expired Document
```json
{
  "success": false,
  "data": {
    "federal_validation": {
      "is_valid": false,
      "errors": [
        {
          "field": "documents",
          "message": "List A document is expired (expired: 2020-01-15)",
          "legal_code": "USCIS-I9-EXPIRED-DOC",
          "severity": "error"
        }
      ]
    }
  }
}
```

## Database Setup

Before using these endpoints, create the `i9_documents` table in your Supabase database:

```sql
-- Run the migration script:
-- migrations/create_i9_documents_table.sql
```

## Single-Step Invitation Support

These endpoints fully support single-step invitations where employees may not have permanent IDs yet:

1. **Temporary Employee IDs**: Endpoints accept IDs like `temp_xxx` for employees who haven't completed registration
2. **No Authentication Required**: Endpoints use optional authentication to allow document upload before account creation
3. **Document Persistence**: Documents are stored and linked to temporary IDs, then transferred when permanent employee record is created

## Security Considerations

1. **File Size Limit**: Maximum 10MB per file
2. **File Types**: Only JPEG, PNG, and PDF files accepted
3. **Storage**: Files are encrypted and stored in Supabase Storage with signed URLs
4. **Access Control**: Row Level Security (RLS) policies ensure employees can only view their own documents
5. **Audit Trail**: All document operations are logged for compliance

## Testing

Use the provided test script to verify implementation:

```bash
python test_i9_documents.py
```

This will test:
- List A document upload
- List B + C document combination
- Document retrieval
- Validation logic
- Invalid combination detection

## Compliance Notes

- Documents must be retained for 3 years after hire date or 1 year after termination (whichever is later)
- Expired documents cannot be accepted (except expired U.S. passports in some cases)
- Social Security cards marked "NOT VALID FOR EMPLOYMENT" are not acceptable List C documents
- Receipts for replacement documents are temporary and actual documents must be provided within 90 days