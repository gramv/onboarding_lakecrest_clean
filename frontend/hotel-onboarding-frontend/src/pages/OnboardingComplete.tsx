import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  PartyPopper, 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  ArrowRight,
  FileText,
  Home
} from 'lucide-react'

export default function OnboardingComplete() {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
  }

  const handleContactHR = () => {
    // Navigate to HR contact page or open email
    window.location.href = 'mailto:hr@company.com?subject=Onboarding Complete - Next Steps'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Banner */}
        <div className="text-center mb-8">
          <PartyPopper className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Congratulations!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You have successfully completed the employee onboarding process. 
            Welcome to our team!
          </p>
        </div>

        {/* Completion Summary */}
        <Card className="shadow-lg border-green-200 bg-green-50 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-800 flex items-center justify-center space-x-2">
              <CheckCircle className="h-6 w-6" />
              <span>Onboarding Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-700">11</div>
                <div className="text-sm text-green-600">Steps Completed</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-700">100%</div>
                <div className="text-sm text-green-600">Progress</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-700">
                  {new Date().toLocaleDateString()}
                </div>
                <div className="text-sm text-green-600">Completion Date</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Calendar className="h-5 w-5" />
                <span>Next Steps</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Manager Review</h3>
                    <p className="text-sm text-gray-600">
                      Your manager will review and approve your onboarding documents within 2 business days.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">First Day Orientation</h3>
                    <p className="text-sm text-gray-600">
                      Attend your scheduled orientation session to receive job-specific training and meet your team.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Badge & Equipment</h3>
                    <p className="text-sm text-gray-600">
                      Receive your employee badge, uniform, and any necessary equipment for your role.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <FileText className="h-5 w-5" />
                <span>Important Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Remember:</strong> Your direct deposit will begin with your first paycheck. 
                  Health insurance coverage starts according to your selected plan's effective date.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">Work Location</h4>
                    <p className="text-sm text-gray-600">Check your offer letter for your assigned work location and reporting instructions.</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">HR Contact</h4>
                    <p className="text-sm text-gray-600">Contact HR if you have any questions about your onboarding or employment.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleGoHome}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>Return to Home</span>
          </Button>
          
          <Button 
            onClick={handleContactHR}
            size="lg"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <span>Contact HR</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome to Our Team!
          </h3>
          <p className="text-gray-600">
            We're excited to have you join us. If you have any questions during your first days, 
            don't hesitate to reach out to your manager or HR team. We're here to support your success.
          </p>
        </div>
      </div>
    </div>
  )
}