import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import './App.css'

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

// Lazy load layouts
const HRDashboardLayout = lazy(() => import('@/components/layouts/HRDashboardLayout').then(m => ({ default: m.HRDashboardLayout })))
const ManagerDashboardLayout = lazy(() => import('@/components/layouts/ManagerDashboardLayout').then(m => ({ default: m.ManagerDashboardLayout })))

// Lazy load dashboard components
const PropertiesTab = lazy(() => import('@/components/dashboard/PropertiesTab'))
const ManagersTab = lazy(() => import('@/components/dashboard/ManagersTab'))
const EmployeesTab = lazy(() => import('@/components/dashboard/EmployeesTab').then(m => ({ default: m.EmployeesTab })))
const ApplicationsTab = lazy(() => import('@/components/dashboard/ApplicationsTab').then(m => ({ default: m.ApplicationsTab })))
const AnalyticsTab = lazy(() => import('@/components/dashboard/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })))

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const HRDashboard = lazy(() => import('./pages/HRDashboard'))
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'))
const EnhancedManagerDashboard = lazy(() => import('./pages/EnhancedManagerDashboard'))
const JobApplicationFormV2 = lazy(() => import('./pages/JobApplicationFormV2'))
const OnboardingFlowPortal = lazy(() => import('./pages/OnboardingFlowPortal'))
const OnboardingComplete = lazy(() => import('./pages/OnboardingComplete'))
const OnboardingFlowTest = lazy(() => import('./pages/OnboardingFlowTest'))
const ExtractI9Fields = lazy(() => import('./pages/ExtractI9Fields'))
const TestEnhancedUI = lazy(() => import('./pages/TestEnhancedUI'))

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
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
                <Route index element={<Navigate to="/hr/properties" replace />} />
                <Route path="properties" element={<PropertiesTab onStatsUpdate={() => {}} />} />
                <Route path="managers" element={<ManagersTab onStatsUpdate={() => {}} />} />
                <Route path="employees" element={<EmployeesTab userRole="hr" onStatsUpdate={() => {}} />} />
                <Route path="applications" element={<ApplicationsTab userRole="hr" onStatsUpdate={() => {}} />} />
                <Route path="analytics" element={<AnalyticsTab userRole="hr" />} />
              </Route>
              
              {/* Manager Dashboard Routes with nested routing */}
              <Route path="/manager" element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerDashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/manager/applications" replace />} />
                <Route path="applications" element={<ApplicationsTab userRole="manager" onStatsUpdate={() => {}} />} />
                <Route path="employees" element={<EmployeesTab userRole="manager" onStatsUpdate={() => {}} />} />
                <Route path="analytics" element={<AnalyticsTab userRole="manager" />} />
              </Route>
              
              {/* Legacy routes for backward compatibility */}
              <Route path="/hr-old" element={
                <ProtectedRoute requiredRole="hr">
                  <HRDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manager-old" element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manager-enhanced" element={
                <ProtectedRoute requiredRole="manager">
                  <EnhancedManagerDashboard />
                </ProtectedRoute>
              } />
              
              {/* Job application route */}
              <Route path="/apply/:propertyId" element={<JobApplicationFormV2 />} />
              
              {/* Onboarding completion page */}
              <Route path="/onboarding-complete" element={<OnboardingComplete />} />
              
              {/* New Flow-Based Onboarding Portal */}
              <Route path="/onboard" element={<OnboardingFlowPortal />} />
              <Route path="/onboard-flow" element={<OnboardingFlowPortal />} />
              <Route path="/onboard-flow-test" element={<OnboardingFlowPortal testMode={true} />} />
              
              {/* Component Test Page */}
              <Route path="/test-components" element={<OnboardingFlowTest />} />
              
              {/* I-9 Field Extraction Tool */}
              <Route path="/extract-i9-fields" element={<ExtractI9Fields />} />
              
              {/* Enhanced UI Test Page */}
              <Route path="/test-enhanced-ui" element={<TestEnhancedUI />} />
              </Routes>
            </Suspense>
            <Toaster />
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
