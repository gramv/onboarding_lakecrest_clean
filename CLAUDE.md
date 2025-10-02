# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hotel Employee Onboarding System - A comprehensive digital platform for hotel employee onboarding with federal compliance (I-9, W-4) and multi-language support (English/Spanish).

**Development Stats**: Built by a single developer in under 2 months for $5K - demonstrating exceptional efficiency and technical skill in delivering enterprise-grade software with federal compliance requirements.

## Development Commands

### Frontend (React + TypeScript)
```bash
cd frontend/hotel-onboarding-frontend

# Development
npm run dev                    # Start Vite dev server on port 3000

# Building
npm run build                  # Build for production (TypeScript check + Vite build)

# Testing
npm run test                   # Run all tests with Jest
npm run test -- --watch        # Run tests in watch mode
npm run test -- ComponentName  # Run specific test file

# Code Quality
npm run lint                   # Run ESLint
npm run type-check             # Run TypeScript compiler check
```

### Backend (FastAPI + Python)
```bash
cd backend

# Development
uvicorn app.main_enhanced:app --reload --port 8000

# Testing
pytest                         # Run all tests
pytest tests/test_file.py      # Run specific test file
pytest -v                      # Verbose output
pytest --cov=app               # Run with coverage
```

## Architecture Overview

### Project Structure
- **Monorepo**: Separate `/frontend` and `/backend` directories
- **Frontend**: React 18 + TypeScript 5 + Vite 6 + Tailwind CSS
- **Backend**: FastAPI + Python 3.12 + Supabase (PostgreSQL)
- **Real-time**: WebSocket support for live dashboard updates

### Key Architectural Patterns

#### Frontend Architecture
- **Component Pattern**: Each onboarding step follows `StepProps` interface:
  ```typescript
  interface StepProps {
    currentStep: any
    progress: any
    markStepComplete: (stepId: string, data?: any) => void
    saveProgress: (stepId: string, data?: any) => void
    language: 'en' | 'es'
    employee?: any
    property?: any
  }
  ```
- **State Management**: React Context (AuthContext, LanguageContext)
- **Form Management**: React Hook Form + Zod validation
- **Code Splitting**: Lazy loading with React.lazy() for performance
- **i18n**: Complete Spanish/English translation system

#### Backend Architecture
- **Service Layer**: Business logic in service modules
- **Repository Pattern**: Database operations in `supabase_service_enhanced.py`
- **Federal Compliance**: Built-in I-9/W-4 validation and deadline tracking
- **Multi-tenancy**: Property-based data isolation with RLS
- **Audit Trail**: Comprehensive logging of all PII operations

### Critical Implementation Details

#### Federal Compliance Requirements
- **I-9 Section 1**: Must be completed by/before first day of work
- **I-9 Section 2**: Must be completed within 3 business days
- **Digital Signatures**: Capture timestamp, IP, user agent, consent
- **Document Retention**: 3 years after hire or 1 year after termination

#### PDF Generation
- Frontend generators define signature coordinates (source of truth)
- Backend must match frontend coordinates exactly
- Standard signature positions documented in code comments

#### Security & Data Protection
- Field-level encryption for SSN, bank accounts
- Session timeout after 24 hours
- Role-based access control (Employee/Manager/HR)
- Property-based data isolation

### Testing Strategy
- **Frontend**: Jest + React Testing Library for components
- **Backend**: pytest with asyncio for API endpoints
- **Federal Compliance**: Custom test suite for I-9/W-4 validation
- **Coverage Target**: 80% for critical paths

### Common Development Tasks

#### Adding a New Onboarding Step
1. Create component in `/frontend/src/components/onboarding/steps/`
2. Follow StepProps interface pattern
3. Add to step registry in `OnboardingFlow.tsx`
4. Implement corresponding backend endpoint if needed
5. Add tests for both frontend and backend

#### Modifying PDF Templates
1. Update frontend generator in `/frontend/src/utils/pdfGenerators/`
2. Match coordinates in backend generator `/backend/app/generators/`
3. Test signature positioning thoroughly
4. Verify federal compliance requirements maintained

#### Adding Translations
1. Update translation files in `/frontend/src/i18n/locales/`
2. Use consistent key naming: `componentName.section.field`
3. Test both languages thoroughly
4. Ensure federal forms maintain legal accuracy

### Environment Variables

Frontend (`.env`):
- `VITE_API_URL`: Backend API URL
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase public key

Backend (`.env`):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key
- `JWT_SECRET`: JWT signing secret
- `GROQ_API_KEY`: Groq API for OCR processing

### Performance Considerations
- Frontend bundles are code-split by route and component type
- Implement lazy loading for heavy components
- Use React.memo() for expensive renders
- Backend uses connection pooling (50 max connections)
- Implement pagination for all list endpoints

### Deployment Notes
- Frontend: Deployed to Vercel (configuration in `.vercel/`)
- Backend: Docker-ready with Gunicorn for production
- Database: Supabase managed PostgreSQL with RLS policies
- File Storage: Supabase Storage for documents and signatures