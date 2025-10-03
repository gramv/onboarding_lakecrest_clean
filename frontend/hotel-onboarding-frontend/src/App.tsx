import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { HealthInsuranceErrorBoundary } from './components/HealthInsuranceErrorBoundary'
import './App.css'

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

// Lazy load layouts
const HRDashboardLayout = lazy(() => import('@/components/layouts/HRDashboardLayout').then(m => ({ default: m.HRDashboardLayout })))

// Lazy load dashboard components
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'))
const ManagerReviewEmployee = lazy(() => import('./pages/ManagerReviewEmployee'))
const PropertiesOverviewTab = lazy(() => import('@/components/dashboard/PropertiesOverviewTab'))
const PropertiesTab = lazy(() => import('@/components/dashboard/PropertiesTab'))
const ManagersTab = lazy(() => import('@/components/dashboard/ManagersTab'))
const EmployeesTab = lazy(() => import('@/components/dashboard/EmployeesTab').then(m => ({ default: m.EmployeesTab })))
const ApplicationsTab = lazy(() => import('@/components/dashboard/ApplicationsTab').then(m => ({ default: m.ApplicationsTab })))
const SystemApplicationsTab = lazy(() => import('@/components/dashboard/SystemApplicationsTab').then(m => ({ default: m.SystemApplicationsTab })))
const AnalyticsTab = lazy(() => import('@/components/dashboard/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })))
const StepInvitationsTab = lazy(() => import('@/components/dashboard/StepInvitationsTab'))
const NotificationCenter = lazy(() => import('@/components/notifications/NotificationCenter'))

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const JobApplicationFormV2 = lazy(() => import('./pages/JobApplicationFormV2'))
const OnboardingFlowPortal = lazy(() => import('./pages/OnboardingFlowPortal'))
const OnboardingComplete = lazy(() => import('./pages/OnboardingComplete'))
// Test pages removed for production build
// const OnboardingFlowTest = lazy(() => import('./pages/OnboardingFlowTest'))
const ExtractI9Fields = lazy(() => import('./pages/ExtractI9Fields'))
// const TestEnhancedUI = lazy(() => import('./pages/TestEnhancedUI'))
// const TestOnboardingSteps = lazy(() => import('./pages/TestOnboardingSteps'))
// const TestHealthInsurancePDF = lazy(() => import('./pages/TestHealthInsurancePDF')) // Page doesn't exist
// const HealthInsuranceTest = lazy(() => import('./pages/HealthInsuranceTest'))

const OnboardingTokenRedirect = () => {
  const { token } = useParams()

  if (!token) {
    return <Navigate to="/onboarding" replace />
  }

  return <Navigate to={`/onboarding?token=${encodeURIComponent(token)}`} replace />
}

// Component to handle /onboard route and preserve query parameters
const OnboardRedirect = () => {
  const location = useLocation()
  // Preserve the query string when redirecting
  return <Navigate to={`/onboarding${location.search}`} replace />
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <HealthInsuranceErrorBoundary language="en">
          <Router>
            <div className="min-h-screen bg-gray-50">
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* HR Dashboard Routes with nested routing */}
              <Route path="/hr" element={
                <ProtectedRoute requiredRole="hr">
                  <HRDashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/hr/overview" replace />} />
                <Route path="overview" element={<PropertiesOverviewTab onStatsUpdate={() => {}} />} />
                <Route path="properties" element={<PropertiesTab onStatsUpdate={() => {}} />} />
                <Route path="managers" element={<ManagersTab onStatsUpdate={() => {}} />} />
                <Route path="employees" element={<EmployeesTab userRole="hr" onStatsUpdate={() => {}} />} />
                <Route path="applications" element={<ApplicationsTab userRole="hr" onStatsUpdate={() => {}} />} />
                <Route path="invitations" element={<StepInvitationsTab />} />
                <Route path="system-applications" element={<SystemApplicationsTab onStatsUpdate={() => {}} />} />
                <Route path="analytics" element={<AnalyticsTab userRole="hr" />} />
                <Route path="notifications" element={<NotificationCenter />} />
              </Route>
              
              {/* Manager Dashboard Routes */}
              <Route path="/manager" element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manager/review/:employeeId" element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerReviewEmployee />
                </ProtectedRoute>
              } />
              
              
              {/* Job application route */}
              <Route path="/apply/:propertyId" element={<JobApplicationFormV2 />} />
              
              {/* Onboarding completion page */}
              <Route path="/onboarding-complete" element={<OnboardingComplete />} />
              
              {/* New Flow-Based Onboarding Portal */}
              <Route path="/onboarding" element={<OnboardingFlowPortal />} />
              <Route path="/onboarding/:token" element={<OnboardingTokenRedirect />} />
              <Route path="/onboard" element={<OnboardRedirect />} />
              <Route path="/onboard-flow" element={<Navigate to="/onboarding" replace />} />
              <Route path="/onboard-flow-test" element={<OnboardingFlowPortal testMode={true} />} />
              
              {/* I-9 Field Extraction Tool */}
              <Route path="/extract-i9-fields" element={<ExtractI9Fields />} />
              {/* <Route path="/test-health-insurance-pdf" element={<TestHealthInsurancePDF />} /> */}
              {/* <Route path="/test-health-insurance" element={<HealthInsuranceTest />} */}
              </Routes>
            </Suspense>
            <Toaster />
            </div>
          </Router>
        </HealthInsuranceErrorBoundary>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
